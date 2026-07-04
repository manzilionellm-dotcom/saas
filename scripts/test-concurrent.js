// Test : deux membres de la famille regardent DEUX chaînes différentes EN MÊME TEMPS.
const { chromium } = require("playwright");

const CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const BASE = process.env.BASE_URL || "http://localhost:3103";

// Tokens signés récupérés depuis la page d'accueil.
async function tokensFromHome(browser) {
  const page = await browser.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const tokens = await page.$$eval("body", () => {
    const html = document.documentElement.outerHTML;
    const set = new Set(html.match(/[0-9]{1,2}-[0-9a-f]{32}/g) || []);
    return [...set];
  });
  await page.close();
  const byId = {};
  for (const t of tokens) byId[parseInt(t.split("-")[0], 10)] = t;
  return byId;
}

async function openMember(browser, token, channelUrl, label) {
  // Contexte isolé = appareil/navigateur distinct (localStorage séparé).
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${BASE}/watch/${token}`, { waitUntil: "networkidle" });
  await page.fill('input[type="text"]', channelUrl);
  await page.click('button[type="submit"]');
  const video = page.locator("video");
  await video.waitFor({ state: "visible" });
  // Attendre que la lecture démarre réellement.
  await page.waitForFunction(
    () => {
      const v = document.querySelector("video");
      return v && v.readyState >= 2 && v.currentTime > 0.1 && !v.paused;
    },
    { timeout: 15000 },
  );
  return { context, page, video, label };
}

function assert(cond, msg) {
  if (!cond) throw new Error("ÉCHEC: " + msg);
  console.log("  ✅ " + msg);
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME });
  const tokens = await tokensFromHome(browser);
  assert(Object.keys(tokens).length === 15, "15 tokens signés sur la page d'accueil");

  const ch1 = `${BASE}/test-channels/ch1.webm`;
  const ch2 = `${BASE}/test-channels/ch2.webm`;

  console.log("\n▶ Ouverture simultanée de 2 membres sur 2 chaînes différentes...");
  const [m1, m2] = await Promise.all([
    openMember(browser, tokens[1], ch1, "Membre 1 → CH1 rouge"),
    openMember(browser, tokens[7], ch2, "Membre 7 → CH2 bleu"),
  ]);

  // 1. Les deux ont une source, et ce sont deux sources DIFFÉRENTES.
  const src1 = await m1.video.evaluate((v) => v.currentSrc);
  const src2 = await m2.video.evaluate((v) => v.currentSrc);
  console.log("\n▶ Vérifications:");
  assert(src1.includes("ch1.webm"), "Membre 1 lit bien la chaîne 1");
  assert(src2.includes("ch2.webm"), "Membre 7 lit bien la chaîne 2");
  assert(src1 !== src2, "Les deux membres regardent des chaînes DIFFÉRENTES");

  // 2. Les deux lisent EN MÊME TEMPS : currentTime avance sur les deux dans la même fenêtre.
  const t1a = await m1.video.evaluate((v) => v.currentTime);
  const t2a = await m2.video.evaluate((v) => v.currentTime);
  await new Promise((r) => setTimeout(r, 1500));
  const t1b = await m1.video.evaluate((v) => v.currentTime);
  const t2b = await m2.video.evaluate((v) => v.currentTime);
  assert(t1b > t1a, `Membre 1 progresse (${t1a.toFixed(2)}s → ${t1b.toFixed(2)}s)`);
  assert(t2b > t2a, `Membre 7 progresse (${t2a.toFixed(2)}s → ${t2b.toFixed(2)}s)`);
  assert(
    t1b > t1a && t2b > t2a,
    "Les deux avancent SIMULTANÉMENT (lecture concurrente confirmée)",
  );

  // 3. Isolation : le choix d'un membre n'affecte pas l'autre (localStorage séparé).
  const ls1 = await m1.page.evaluate(() => localStorage.getItem("restream-url-1"));
  const ls2 = await m2.page.evaluate(() => localStorage.getItem("restream-url-7"));
  const cross = await m2.page.evaluate(() => localStorage.getItem("restream-url-1"));
  assert(ls1 === ch1, "Membre 1 mémorise sa chaîne dans son propre navigateur");
  assert(ls2 === ch2, "Membre 7 mémorise sa chaîne dans son propre navigateur");
  assert(cross === null, "Aucune contamination entre les deux membres (isolation)");

  await browser.close();
  console.log("\n✅✅ TOUS LES TESTS PASSENT : 2 membres peuvent regarder 2 chaînes différentes en même temps.\n");
})().catch((e) => {
  console.error("\n❌ " + e.message + "\n");
  process.exit(1);
});
