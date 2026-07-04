#!/usr/bin/env bash
# =============================================================================
# StreamCast — installation complète sur un serveur Ubuntu 24.04 (Hetzner)
# =============================================================================
# Installe et configure, de façon idempotente (relançable sans casser) :
#   - Node.js 22 LTS + l'application Next.js (build + service systemd)
#   - MediaMTX (restreaming HLS, service systemd, utilisateur dédié)
#   - Caddy (HTTPS automatique Let's Encrypt, reverse proxy panel + HLS)
#   - Pare-feu UFW (SSH, 80, 443 uniquement — le port 8888 reste interne)
#
# Usage (en root, sur le serveur) :
#   DOMAIN_PANEL=panel.example.com DOMAIN_HLS=hls.example.com \
#   REPO_URL=git@github.com:manzilionellm-dotcom/saas.git \
#     bash install.sh
#
# Variables (toutes surchageables par l'environnement) :
#   DOMAIN_PANEL  domaine de l'app/panel (obligatoire)
#   DOMAIN_HLS    domaine des flux HLS   (obligatoire, différent du panel)
#   REPO_URL      URL git du dépôt       (obligatoire au 1er lancement)
#   REPO_BRANCH   branche à déployer     (défaut : main)
#   ACME_EMAIL    email Let's Encrypt    (recommandé)
#
# ⚠️ LÉGAL : ne rediffusez que des flux que vous êtes autorisé à redistribuer.
# =============================================================================
set -euo pipefail

DOMAIN_PANEL="${DOMAIN_PANEL:-}"
DOMAIN_HLS="${DOMAIN_HLS:-}"
REPO_URL="${REPO_URL:-}"
REPO_BRANCH="${REPO_BRANCH:-main}"
ACME_EMAIL="${ACME_EMAIL:-}"

APP_DIR=/opt/streamcast/app
ENV_FILE=/etc/streamcast/streamcast.env
MTX_DIR=/opt/mediamtx
DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log()  { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31mERREUR : %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" = 0 ] || die "lancez ce script en root (sudo bash install.sh)"
[ -n "$DOMAIN_PANEL" ] || die "DOMAIN_PANEL est requis (ex. panel.example.com)"
[ -n "$DOMAIN_HLS" ] || die "DOMAIN_HLS est requis (ex. hls.example.com)"
[ "$DOMAIN_PANEL" != "$DOMAIN_HLS" ] || die "DOMAIN_PANEL et DOMAIN_HLS doivent différer"

# --- 1. Paquets de base -------------------------------------------------------
log "Paquets système"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl git ufw ca-certificates gnupg vnstat >/dev/null

# --- 2. Node.js 22 LTS --------------------------------------------------------
if ! command -v node >/dev/null || [ "$(node -e 'console.log(process.versions.node.split(".")[0])')" -lt 22 ]; then
  log "Node.js 22 (NodeSource)"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
log "Node $(node -v), npm $(npm -v)"

# --- 3. Caddy (HTTPS automatique) ----------------------------------------------
if ! command -v caddy >/dev/null; then
  log "Caddy (dépôt officiel)"
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq && apt-get install -y -qq caddy >/dev/null
fi

# --- 4. Utilisateur de service --------------------------------------------------
id streamcast >/dev/null 2>&1 || useradd --system --home /opt/streamcast --shell /usr/sbin/nologin streamcast

# --- 5. MediaMTX ----------------------------------------------------------------
if [ ! -x "$MTX_DIR/mediamtx" ]; then
  log "MediaMTX (dernière version)"
  VERSION=$(curl -fsS https://api.github.com/repos/bluenviron/mediamtx/releases/latest | grep -oP '"tag_name": "\K[^"]+')
  mkdir -p "$MTX_DIR"
  curl -fsSL "https://github.com/bluenviron/mediamtx/releases/download/${VERSION}/mediamtx_${VERSION}_linux_amd64.tar.gz" \
    | tar -xzf - -C "$MTX_DIR" mediamtx
fi
# Config : on ne l'écrase jamais si elle existe déjà (elle contient vos chaînes).
if [ ! -f "$MTX_DIR/mediamtx.yml" ]; then
  cp "$DEPLOY_DIR/../mediamtx.yml" "$MTX_DIR/mediamtx.yml"
fi
chown -R streamcast:streamcast "$MTX_DIR"

# --- 6. Application Next.js ------------------------------------------------------
log "Application ($REPO_BRANCH)"
mkdir -p /opt/streamcast
if [ ! -d "$APP_DIR/.git" ]; then
  [ -n "$REPO_URL" ] || die "REPO_URL est requis au premier lancement"
  git clone --branch "$REPO_BRANCH" "$REPO_URL" "$APP_DIR"
else
  git -C "$APP_DIR" fetch origin "$REPO_BRANCH"
  git -C "$APP_DIR" checkout "$REPO_BRANCH"
  git -C "$APP_DIR" reset --hard "origin/$REPO_BRANCH"
fi
cd "$APP_DIR"
npm ci
npm run build
mkdir -p "$APP_DIR/.data"                      # chaînes + profils (à sauvegarder !)
chown -R streamcast:streamcast /opt/streamcast

# --- 7. Fichier d'environnement ---------------------------------------------------
mkdir -p /etc/streamcast
if [ ! -f "$ENV_FILE" ]; then
  cp "$DEPLOY_DIR/streamcast.env.example" "$ENV_FILE"
  # Mot de passe panel généré aléatoirement (changez-le si vous préférez).
  GEN_PW=$(tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 24)
  sed -i "s|^APP_PASSWORD=.*|APP_PASSWORD=${GEN_PW}|" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  log "Fichier $ENV_FILE créé — mot de passe panel généré : ${GEN_PW}"
fi

# --- 8. Services systemd -----------------------------------------------------------
log "Services systemd"
cp "$DEPLOY_DIR/mediamtx.service" /etc/systemd/system/mediamtx.service
cp "$DEPLOY_DIR/streamcast-app.service" /etc/systemd/system/streamcast-app.service
systemctl daemon-reload
systemctl enable --now mediamtx streamcast-app
systemctl restart mediamtx streamcast-app

# --- 9. Caddy : reverse proxy HTTPS --------------------------------------------------
log "Caddyfile ($DOMAIN_PANEL + $DOMAIN_HLS)"
sed -e "s|__DOMAIN_PANEL__|$DOMAIN_PANEL|g" \
    -e "s|__DOMAIN_HLS__|$DOMAIN_HLS|g" \
    -e "s|__ACME_EMAIL__|$ACME_EMAIL|g" \
    "$DEPLOY_DIR/Caddyfile" > /etc/caddy/Caddyfile
systemctl enable --now caddy
systemctl reload caddy

# --- 10. Pare-feu ----------------------------------------------------------------------
log "Pare-feu (SSH, 80, 443)"
ufw allow OpenSSH >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null

# --- 11. Outil de synchronisation des chaînes -------------------------------------------
install -m 755 "$DEPLOY_DIR/update-channels.sh" /usr/local/bin/streamcast-update-channels

# --- Bilan -------------------------------------------------------------------------------
log "Terminé !"
cat <<EOF

  Panel      : https://$DOMAIN_PANEL/panel
  Lecteur    : https://$DOMAIN_PANEL/watch
  Flux HLS   : https://$DOMAIN_HLS/<chemin>/index.m3u8
  Mot de passe panel : voir APP_PASSWORD dans $ENV_FILE

  Après avoir ajouté vos chaînes dans le panel, lancez :
      streamcast-update-channels
  pour pousser la liste vers MediaMTX (à relancer après chaque modification).

  Vérifications :
      systemctl status mediamtx streamcast-app caddy
      journalctl -u mediamtx -f
EOF
