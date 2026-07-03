# StreamCast Server — guide d'installation (VPS Hetzner)

Serveur de restreaming familial basé sur [MediaMTX](https://github.com/bluenviron/mediamtx) :
il tire chaque chaîne **une seule fois** depuis sa source et la redistribue à tous les
profils de la famille, **à la demande** (une chaîne non regardée ne consomme rien).
Un catalogue de 15 000 chaînes tient ainsi sur un VPS à ~5 €/mois pour 5 spectateurs
simultanés en Full HD.

> ⚠️ **Légal** : ne rediffusez que des flux que vous possédez ou que vous êtes
> explicitement autorisé à redistribuer (ex. accord écrit avec la chaîne, comme RTNB).
> Rediffuser des chaînes TV ou un abonnement IPTV sans accord est illégal.

> 💡 **Quel serveur selon l'audience ?** Voir [`ACHAT-VPS-1000.md`](./ACHAT-VPS-1000.md) :
> section 0 pour **~200 spectateurs** (1 dédié 1 Gbit/s illimité, ~40-50 €/mois),
> sections suivantes pour la montée à 1000 (port 10G / CDN).

## 1. Commander le serveur

**Pour la famille (quelques spectateurs)** : un petit VPS **Hetzner CX22**
(2 vCPU, 4 Go, ~5 €/mois) suffit — 5 spectateurs Full HD ≈ 40 Mbit/s.

**Pour ~200 spectateurs** : un **dédié Hetzner, port 1 Gbit/s à trafic illimité**
(Server Auction ~39-45 €/mois, ou AX41/EX44 ~49 €). En HD 720p, 200 spectateurs
≈ 800 Mbit/s, ça tient sur 1 Gbit/s. Détails et cahier des charges :
[`ACHAT-VPS-1000.md`](./ACHAT-VPS-1000.md) (section 0).

Ensuite, pour les deux cas :
1. Créez un compte sur [hetzner.com](https://www.hetzner.com).
2. Image : **Ubuntu 24.04**. Ajoutez votre clé SSH.
3. Notez l'adresse IP publique du serveur (appelée `<IP-VPS>` ci-dessous).

## 2. Installer MediaMTX

Connectez-vous au serveur (`ssh root@<IP-VPS>`) puis :

```bash
# Télécharger la dernière version de MediaMTX (binaire unique, sans dépendances)
cd /opt
VERSION=$(curl -s https://api.github.com/repos/bluenviron/mediamtx/releases/latest | grep -oP '"tag_name": "\K[^"]+')
curl -L -o mediamtx.tar.gz "https://github.com/bluenviron/mediamtx/releases/download/${VERSION}/mediamtx_${VERSION}_linux_amd64.tar.gz"
mkdir -p /opt/mediamtx && tar -xzf mediamtx.tar.gz -C /opt/mediamtx && rm mediamtx.tar.gz
```

Copiez ensuite le fichier `mediamtx.yml` de ce dossier à la place de celui d'origine :

```bash
# depuis votre machine :
scp streaming-server/mediamtx.yml root@<IP-VPS>:/opt/mediamtx/mediamtx.yml
```

## 3. Déclarer vos chaînes (automatique depuis le panel)

1. Ouvrez le panel de l'app (`/panel`), connectez-vous, ajoutez vos sources
   (M3U, Xtream Codes ou chaînes directes).
2. Toujours connecté, téléchargez **`/api/panel/export/mediamtx`** : vous obtenez
   la section `paths:` complète, une entrée par chaîne, déjà en mode à la demande.
3. Remplacez la section `paths:` de `/opt/mediamtx/mediamtx.yml` par ce contenu.

À chaque modification de vos chaînes dans le panel, re-téléchargez l'export et
remplacez la section (puis `systemctl restart mediamtx`).

## 4. Lancer au démarrage (systemd)

```bash
cat > /etc/systemd/system/mediamtx.service <<'EOF'
[Unit]
Description=MediaMTX (StreamCast Server)
After=network.target

[Service]
ExecStart=/opt/mediamtx/mediamtx /opt/mediamtx/mediamtx.yml
Restart=always
RestartSec=3
User=root

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now mediamtx
systemctl status mediamtx   # doit afficher "active (running)"
```

## 5. Ouvrir le pare-feu

Seul le port HLS (8888) doit être accessible de l'extérieur :

```bash
ufw allow OpenSSH
ufw allow 8888/tcp
ufw enable
```

(L'API MediaMTX écoute sur 127.0.0.1 uniquement — elle n'est pas exposée.)

## 6. Regarder

Chaque chaîne est lisible à l'adresse :

```
http://<IP-VPS>:8888/<chemin>/index.m3u8
```

Le `<chemin>` de chaque chaîne figure dans l'export de l'étape 3 (ex. `rtnb-mr3n…`).

Pour que toute la famille en profite via l'app : ajoutez ces URLs comme
« chaînes directes » dans le panel `/panel` (ou remplacez les URLs sources par
celles du VPS). La playlist `/playlist/all` distribue alors le bouquet complet —
chaque profil zappe librement, en simultané, la source n'étant tirée qu'une fois.

## 7. Vérifications & entretien

```bash
# Suivre les journaux (démarrage/arrêt des chaînes à la demande)
journalctl -u mediamtx -f

# Chaînes actives à l'instant T (depuis le VPS)
curl -s http://127.0.0.1:9997/v3/paths/list | head

# Mettre à jour MediaMTX : re-télécharger le binaire (étape 2) puis
systemctl restart mediamtx
```

## Dépannage rapide

| Symptôme | Cause probable | Solution |
|---|---|---|
| La chaîne met ~5 s à démarrer | Normal : démarrage à la demande | Réduire `sourceOnDemandCloseAfter` si zapping fréquent |
| Erreur au zapping | Source hors ligne ou URL expirée | Tester l'URL source dans VLC ; re-exporter depuis le panel |
| Coupures avec beaucoup de spectateurs | Port 1 Gbit/s saturé | Vérifier `vnstat` ; au-delà de ~200 spectateurs, ajouter un CDN |
