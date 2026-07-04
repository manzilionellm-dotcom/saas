#!/usr/bin/env node
/**
 * Test de lecture simultanée de N chaînes d'une playlist M3U (panel Xtream Codes).
 *
 * Usage :
 *   node scripts/test-concurrent.js "<url get.php du M3U>" [--channels id1,id2] [--count 2] [--duration 15]
 *
 * L'URL n'est jamais stockée dans le repo : passez-la en argument ou via la
 * variable d'environnement M3U_URL.
 *
 * Le script :
 *   1. interroge player_api.php pour le statut du compte (max_connections, expiration) ;
 *   2. choisit les chaînes à tester (--channels, sinon les premières de la liste) ;
 *   3. ouvre les flux .ts EN MÊME TEMPS, lit pendant --duration secondes ;
 *   4. affiche par flux : statut HTTP, octets reçus, débit moyen, et le verdict global.
 */

const http = require('http');
const https = require('https');

const USER_AGENT = 'VLC/3.0.20 LibVLC/3.0.20';

function parseArgs() {
  const argv = process.argv.slice(2);
  const opts = { url: process.env.M3U_URL, channels: null, count: 2, duration: 15 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--channels') opts.channels = argv[++i].split(',').map((s) => s.trim());
    else if (argv[i] === '--count') opts.count = parseInt(argv[++i], 10);
    else if (argv[i] === '--duration') opts.duration = parseInt(argv[++i], 10);
    else if (!argv[i].startsWith('--')) opts.url = argv[i];
  }
  if (!opts.url) {
    console.error('Usage: node scripts/test-concurrent.js "<url get.php>" [--channels id1,id2] [--count N] [--duration S]');
    process.exit(1);
  }
  return opts;
}

function parseXtreamUrl(m3uUrl) {
  const u = new URL(m3uUrl);
  const username = u.searchParams.get('username');
  const password = u.searchParams.get('password');
  if (!username || !password) throw new Error('URL M3U invalide : username/password manquants');
  return { base: `${u.protocol}//${u.host}`, username, password };
}

function get(url, { timeout = 30000 } = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https:') ? https : http;
    const req = lib.get(url, { headers: { 'User-Agent': USER_AGENT } }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
    });
    req.setTimeout(timeout, () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

/** Lit un flux pendant `durationMs` et mesure ce qui arrive réellement. */
function readStream(url, label, durationMs) {
  return new Promise((resolve) => {
    const result = { label, url, status: null, bytes: 0, chunks: 0, firstByteMs: null, error: null };
    const start = Date.now();
    const lib = url.startsWith('https:') ? https : http;
    const req = lib.get(url, { headers: { 'User-Agent': USER_AGENT } }, (res) => {
      result.status = res.statusCode;
      // Suivre une éventuelle redirection (les panels Xtream redirigent souvent vers le load balancer)
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.destroy();
        const next = new URL(res.headers.location, url).href;
        readStream(next, label, durationMs - (Date.now() - start)).then((r) => {
          r.redirectedFrom = url;
          resolve(r);
        });
        return;
      }
      res.on('data', (chunk) => {
        if (result.firstByteMs === null) result.firstByteMs = Date.now() - start;
        result.bytes += chunk.length;
        result.chunks++;
      });
      res.on('end', () => finish());
      res.on('error', (e) => { result.error = e.message; finish(); });
      setTimeout(() => { res.destroy(); }, durationMs);
    });
    req.setTimeout(durationMs + 10000, () => req.destroy(new Error('timeout connexion')));
    req.on('error', (e) => { if (!result.error) result.error = e.message; finish(); });

    let done = false;
    function finish() {
      if (done) return;
      done = true;
      result.elapsedMs = Date.now() - start;
      resolve(result);
    }
  });
}

function fmtBitrate(bytes, ms) {
  if (!ms) return 'n/a';
  const kbps = (bytes * 8) / ms; // octets*8 / ms == kbit/s
  return kbps >= 1000 ? `${(kbps / 1000).toFixed(2)} Mbit/s` : `${kbps.toFixed(0)} kbit/s`;
}

async function main() {
  const opts = parseArgs();
  const { base, username, password } = parseXtreamUrl(opts.url);
  const api = (extra = '') =>
    `${base}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}${extra}`;

  console.log(`Serveur : ${base}`);

  // 1. Infos compte
  const info = JSON.parse((await get(api())).body);
  const ui = info.user_info || {};
  console.log(`Compte  : statut=${ui.status}, connexions max=${ui.max_connections}, actives=${ui.active_cons}, expire=${ui.exp_date ? new Date(ui.exp_date * 1000).toISOString() : '?'}`);

  // 2. Chaînes à tester
  let channels;
  if (opts.channels) {
    channels = opts.channels.map((id) => ({ stream_id: id, name: `#${id}` }));
  } else {
    console.log('Récupération de la liste des chaînes…');
    const list = JSON.parse((await get(api('&action=get_live_streams'), { timeout: 120000 })).body);
    channels = list.slice(0, opts.count);
  }
  channels = channels.slice(0, opts.count);
  console.log(`Test de ${channels.length} flux pendant ${opts.duration}s, EN SIMULTANÉ :`);
  channels.forEach((c) => console.log(`  - [${c.stream_id}] ${c.name}`));

  // 3. Lecture simultanée
  const results = await Promise.all(
    channels.map((c) =>
      readStream(`${base}/live/${username}/${password}/${c.stream_id}.ts`, `[${c.stream_id}] ${c.name}`, opts.duration * 1000)
    )
  );

  // 4. Rapport
  console.log('\n=== Résultats ===');
  let ok = 0;
  for (const r of results) {
    const playing = r.status === 200 && r.bytes > 100 * 1024; // >100 Ko reçus = flux réel
    if (playing) ok++;
    console.log(`${playing ? '✅' : '❌'} ${r.label}`);
    console.log(`     HTTP ${r.status ?? '—'}${r.redirectedFrom ? ' (après redirection)' : ''} | ${(r.bytes / 1024 / 1024).toFixed(2)} Mo en ${(r.elapsedMs / 1000).toFixed(1)}s | débit ${fmtBitrate(r.bytes, r.elapsedMs)} | 1er octet: ${r.firstByteMs != null ? r.firstByteMs + ' ms' : '—'}${r.error ? ' | erreur: ' + r.error : ''}`);
  }
  console.log(`\nVerdict : ${ok}/${results.length} flux lus simultanément.`);
  if (ok < results.length && ui.max_connections && Number(ui.max_connections) < results.length) {
    console.log(`Note : le compte est limité à ${ui.max_connections} connexion(s) simultanée(s) (max_connections), ce résultat est donc attendu.`);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error('Erreur :', e.message);
  process.exit(1);
});
