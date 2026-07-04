# Déploiement StreamCast

Kit complet pour faire tourner le panel + le restream mediamtx de façon stable :
plus d'`EADDRINUSE` au démarrage, plus de boucle infinie sur les sources IPTV
en erreur 456, une seule connexion amont par chaîne quel que soit le nombre de
spectateurs.

## Installation (une commande, sur le serveur)

```bash
cd /opt/saas
git fetch origin && git checkout claude/unknown-issue-d2f5zu && git pull
sudo bash deploy/install.sh
```

Si le code du panel est ailleurs que `/opt/saas` :

```bash
sudo APP_DIR=/chemin/vers/le/panel bash deploy/install.sh
```

## Ce que fait l'installation

| Étape | Effet |
|---|---|
| Service `streamcast-panel` | Le panel Next.js démarre au boot, redémarre s'il plante. Plus jamais de `next start` à la main. |
| Conversion mediamtx | Chaque `source: http…` devient un tirage ffmpeg déguisé en VLC (`runOnDemand`), ce qui contourne les blocages de User-Agent (456/403). API mediamtx activée. |
| Watchdog (timer 1 min) | Une chaîne qui accumule ≥ 10 erreurs 456 en 5 min est mise en pause 15 min (anti-ban), son état est écrit dans `/var/lib/streamcast/status/<chaine>`, puis elle est réessayée automatiquement. |

## Diagnostic d'une source qui refuse

```bash
bash deploy/check-source.sh "http://fournisseur.example/live/user/pass/12345.m3u8"
```

Le script dit clairement si le problème est le User-Agent (corrigé par ce kit)
ou le compte chez le fournisseur (limite de connexions / expiration / IP bannie
— rien de corrigeable par du code).

## Côté code du panel

Le module `lib/mediamtx.ts` fournit tout ce qu'il faut pour créer les chaînes
dynamiquement via l'API mediamtx :

- `ensureChannelPath(nom, urlSource)` — crée/répare le path avec le tirage ffmpeg ;
- `getChannelStatus(nom)` — `live` / `idle` / `provider_error` (à afficher dans l'UI) ;
- `publicHlsUrl(hote, nom)` — la seule URL à donner aux spectateurs ;
- l'URL du fournisseur ne doit **jamais** apparaître côté client.

## Commandes utiles

```bash
systemctl status streamcast-panel          # état du panel
journalctl -u streamcast-panel -f          # logs du panel
journalctl -u mediamtx -f                  # logs du restream
systemctl list-timers | grep streamcast    # watchdog actif ?
ls /var/lib/streamcast/status/             # chaînes en erreur fournisseur
```
