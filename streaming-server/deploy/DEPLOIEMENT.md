# StreamCast — runbook de déploiement production (Hetzner, ~200 spectateurs)

Ce dossier automatise le déploiement complet décrit dans
[`../README.md`](../README.md) : MediaMTX + application Next.js + HTTPS +
pare-feu, sur **un seul dédié Hetzner** (port 1 Gbit/s illimité, Ubuntu 24.04).

> ⚠️ **Légal** : ne rediffusez que des flux que vous possédez ou êtes
> explicitement autorisé à redistribuer (accord écrit). À l'échelle de
> 200 spectateurs, un accord de distribution est indispensable.

## Contenu

| Fichier | Rôle |
|---|---|
| `install.sh` | Installation/mise à jour complète, idempotente (relançable) |
| `update-channels.sh` | Synchronise les chaînes du panel → MediaMTX (installé en `streamcast-update-channels`) |
| `Caddyfile` | Reverse proxy HTTPS (panel + HLS), certificats automatiques |
| `streamcast-app.service` | Service systemd de l'app Next.js (port local 3000) |
| `mediamtx.service` | Service systemd de MediaMTX (utilisateur non-root, durci) |
| `streamcast.env.example` | Modèle de `/etc/streamcast/streamcast.env` (`APP_PASSWORD`…) |

## Architecture retenue

```
Internet ──443──> Caddy (HTTPS auto) ──┬──> 127.0.0.1:3000  app Next.js  (panel.exemple.com)
                                       └──> 127.0.0.1:8888  MediaMTX HLS (hls.exemple.com)
Pare-feu : SSH + 80 + 443 uniquement. Les ports 3000/8888/9997 restent internes.
```

**Pourquoi le HLS passe par Caddy plutôt que d'ouvrir le port 8888** (le
README historique ouvrait 8888) :

1. le cookie du panel est `secure` en production → le panel **exige** HTTPS ;
2. le lecteur web (`/watch`) servi en HTTPS ne peut pas lire un flux
   `http://IP:8888/...` — les navigateurs bloquent le « contenu mixte ».
   Le HLS doit donc être servi en HTTPS lui aussi ;
3. moins de ports ouverts, certificats gérés automatiquement, et le jour où
   un CDN est ajouté (cap 500-1000 spectateurs), il se branche devant
   `hls.exemple.com` sans rien changer d'autre.

Le proxy ne réencode rien : Caddy relaie les segments tels quels
(`flush_interval -1`), le coût CPU est négligeable à 1 Gbit/s.

## Prérequis (à fournir par le propriétaire du projet)

1. **Serveur** : dédié Hetzner (Server Auction 1 Gbit/s illimité ou AX41),
   Ubuntu 24.04, avec votre clé SSH — voir [`../ACHAT-VPS-1000.md`](../ACHAT-VPS-1000.md)
   section 0 pour le choix exact.
2. **Deux noms de domaine (ou sous-domaines)** pointant vers l'IP du serveur
   (enregistrements A/AAAA), ex. `panel.exemple.com` et `hls.exemple.com`.
   N'importe quel registrar fait l'affaire (~10 €/an).
3. **Accès en lecture au dépôt GitHub** depuis le serveur : une
   [clé de déploiement](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)
   en lecture seule (recommandé) ou un fine-grained token `Contents: read`.
4. **Les sources des chaînes** (M3U / Xtream / URLs) et l'URL EPG — saisies
   dans le panel à la fin, par vous ou l'ingénieur.

## Déploiement (30 min environ)

```bash
# 1. Sur le serveur neuf, en root :
git clone <URL-du-dépôt> /root/saas-src        # avec la clé de déploiement
cd /root/saas-src/streaming-server/deploy

# 2. Lancer l'installation (remplacez domaines/emails) :
DOMAIN_PANEL=panel.exemple.com \
DOMAIN_HLS=hls.exemple.com \
ACME_EMAIL=vous@exemple.com \
REPO_URL=git@github.com:manzilionellm-dotcom/saas.git \
REPO_BRANCH=main \
bash install.sh
```

Le script affiche à la fin le **mot de passe panel généré** (stocké dans
`/etc/streamcast/streamcast.env`).

### Brancher les chaînes (5-10 min)

1. Ouvrez `https://panel.exemple.com/panel`, connectez-vous.
2. Importez vos sources (M3U multiple, Xtream, ou chaînes directes) ;
   renseignez l'URL EPG dans les réglages si vous en avez une.
3. **Réglages → « Serveur de diffusion »** : saisissez l'URL HLS de votre VPS,
   `https://hls.exemple.com`, puis Enregistrer. **Étape essentielle** : sans
   elle, le lecteur web et les playlists enverraient chaque spectateur
   directement sur la source d'origine (qui limite souvent le nombre de
   connexions simultanées). Avec elle, tout passe par MediaMTX : la source
   n'est tirée qu'une fois et redistribuée → plusieurs profils regardent des
   chaînes différentes en même temps sans jamais saturer la source.
4. **Panel → « Restreamer toutes les chaînes »** (bouton vert) : pousse tout le
   catalogue vers MediaMTX, qui recharge sa config automatiquement. Aucun SSH,
   aucun redémarrage. **À relancer après chaque ajout/suppression de chaînes.**
   (Équivalent en ligne de commande, pour un cron : `streamcast-update-channels`.)

### Vérification de bout en bout

```bash
systemctl status mediamtx streamcast-app caddy   # les 3 "active (running)"
curl -s http://127.0.0.1:9997/v3/paths/list | head   # chemins déclarés
```

1. **Flux direct** : `https://hls.exemple.com/<chemin>/index.m3u8` dans VLC
   (le `<chemin>` figure dans l'export, ex. `rtnb-mr3n…`).
2. **Lecteur web** : `https://panel.exemple.com/watch` — zapping, logos, EPG.
3. **Playlists** : `https://panel.exemple.com/playlist/all` dans VLC/TiviMate,
   et un lien profil `/playlist/profile/<token>` créé depuis le panel.
4. **Charge** : ouvrir la même chaîne sur 3-4 appareils → une seule connexion
   sortante vers la source (`journalctl -u mediamtx -f`).

## Exploitation

| Tâche | Commande |
|---|---|
| Chaînes modifiées dans le panel | `streamcast-update-channels` |
| Mettre à jour l'app (nouveau code) | relancer `install.sh` (mêmes variables) |
| Journaux streaming | `journalctl -u mediamtx -f` |
| Journaux app | `journalctl -u streamcast-app -f` |
| Trafic réseau (capacité 1 Gbit/s) | `vnstat -l` |
| Chaînes actives à l'instant T | `curl -s http://127.0.0.1:9997/v3/paths/list` |

**Sauvegardes** : tout l'état applicatif tient dans deux fichiers —
`/opt/streamcast/app/.data/streams.json` (chaînes, profils, réglages) et
`/etc/streamcast/streamcast.env`. Une copie quotidienne hors serveur suffit :

```bash
crontab -e   # sur le serveur
0 4 * * * tar -czf /root/backup-streamcast-$(date +\%u).tar.gz /opt/streamcast/app/.data /etc/streamcast
```

**Synchronisation automatique des chaînes** (optionnel — sinon lancez-la à la main) :

```bash
17 * * * * /usr/local/bin/streamcast-update-channels >/dev/null
```

## Montée en charge (rappel des décisions)

- **~200 spectateurs 720p ≈ 800 Mbit/s** : tient sur le port 1 Gbit/s.
  Surveiller `vnstat -l` aux heures de pointe ; au-delà de ~85 % soutenus,
  passer à l'étape suivante.
- **500 → 1000** : ajouter l'option port 10G Hetzner **ou** un CDN devant
  `hls.exemple.com` (`hlsAllowOrigin` déjà configuré). Rien à recoder.

## Dépannage

| Symptôme | Piste |
|---|---|
| Certificat non émis | DNS pas encore propagé vers l'IP ? `dig +short panel.exemple.com` ; ports 80/443 ouverts ? |
| Panel : mot de passe refusé | `APP_PASSWORD` dans `/etc/streamcast/streamcast.env`, puis `systemctl restart streamcast-app` |
| `streamcast-update-channels` : 401 | même cause — le script lit `APP_PASSWORD` du même fichier |
| Chaîne noire / erreur au zap | source hors ligne ou URL expirée : tester l'URL source dans VLC, ré-importer depuis le panel |
| Coupures en soirée | port saturé : `vnstat -l` ; réduire le débit source ou passer au 10G/CDN |
| MediaMTX ne démarre plus après une synchro | le script restaure seul l'ancienne config ; voir `journalctl -u mediamtx -n 50` |
