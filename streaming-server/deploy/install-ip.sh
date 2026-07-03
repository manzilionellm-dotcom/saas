#!/usr/bin/env bash
# =============================================================================
# StreamCast — démarrage RAPIDE par IP (sans domaine, sans HTTPS)
# =============================================================================
# À utiliser quand vous n'avez pas encore de nom de domaine : tout devient
# fonctionnel tout de suite, accessible par l'IP publique du serveur, en HTTP.
#   - Application Next.js : http://<IP>:3000  (panel, lecteur, playlists)
#   - Flux HLS MediaMTX    : http://<IP>:8888/<chemin>/index.m3u8
#
# ⚠️ HTTP = non chiffré. Convient pour démarrer / tester en famille. Dès que
#    possible, passez à install.sh (domaines + HTTPS) pour la sécurité.
#
# Usage (en root, sur le serveur) :
#   REPO_URL=git@github.com:manzilionellm-dotcom/saas.git \
#   REPO_BRANCH=claude/hls-streaming-deployment-hf94ng \
#     bash install-ip.sh
#
# ⚠️ LÉGAL : ne rediffusez que des flux que vous êtes autorisé à redistribuer.
# =============================================================================
set -euo pipefail

REPO_URL="${REPO_URL:-}"
REPO_BRANCH="${REPO_BRANCH:-main}"

APP_DIR=/opt/streamcast/app
ENV_FILE=/etc/streamcast/streamcast.env
MTX_DIR=/opt/mediamtx
DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
die() { printf '\033[1;31mERREUR : %s\033[0m\n' "$*" >&2; exit 1; }

[ "$(id -u)" = 0 ] || die "lancez ce script en root (sudo bash install-ip.sh)"

# IP publique du serveur (détectée, sinon passez IP=... en variable).
IP="${IP:-$(curl -fsS https://api.ipify.org || true)}"
[ -n "$IP" ] || die "impossible de détecter l'IP publique ; relancez avec IP=<votre-ip>"

# --- 1. Paquets + Node 22 -----------------------------------------------------
log "Paquets système + Node.js 22"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl git ufw ca-certificates vnstat >/dev/null
if ! command -v node >/dev/null || [ "$(node -e 'console.log(process.versions.node.split(".")[0])' 2>/dev/null || echo 0)" -lt 22 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi

# --- 2. Utilisateur de service ------------------------------------------------
id streamcast >/dev/null 2>&1 || useradd --system --home /opt/streamcast --shell /usr/sbin/nologin streamcast

# --- 3. MediaMTX --------------------------------------------------------------
if [ ! -x "$MTX_DIR/mediamtx" ]; then
  log "MediaMTX (dernière version)"
  VERSION=$(curl -fsS https://api.github.com/repos/bluenviron/mediamtx/releases/latest | grep -oP '"tag_name": "\K[^"]+')
  mkdir -p "$MTX_DIR"
  curl -fsSL "https://github.com/bluenviron/mediamtx/releases/download/${VERSION}/mediamtx_${VERSION}_linux_amd64.tar.gz" \
    | tar -xzf - -C "$MTX_DIR" mediamtx
fi
[ -f "$MTX_DIR/mediamtx.yml" ] || cp "$DEPLOY_DIR/../mediamtx.yml" "$MTX_DIR/mediamtx.yml"
chown -R streamcast:streamcast "$MTX_DIR"

# --- 4. Application -----------------------------------------------------------
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
mkdir -p "$APP_DIR/.data"
chown -R streamcast:streamcast /opt/streamcast

# --- 5. Environnement ---------------------------------------------------------
mkdir -p /etc/streamcast
if [ ! -f "$ENV_FILE" ]; then
  GEN_PW=$(tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 24)
  cat > "$ENV_FILE" <<EOF
APP_PASSWORD=${GEN_PW}
MEDIAMTX_CONFIG=/opt/mediamtx/mediamtx.yml
EOF
  chmod 600 "$ENV_FILE"
  log "Mot de passe panel généré : ${GEN_PW}"
fi
grep -q '^MEDIAMTX_CONFIG=' "$ENV_FILE" || echo 'MEDIAMTX_CONFIG=/opt/mediamtx/mediamtx.yml' >> "$ENV_FILE"

# --- 6. Services systemd ------------------------------------------------------
log "Services systemd"
cp "$DEPLOY_DIR/mediamtx.service" /etc/systemd/system/mediamtx.service
# App exposée sur toutes les interfaces (0.0.0.0) pour l'accès par IP.
sed -e 's#--hostname 127.0.0.1#--hostname 0.0.0.0#' \
    "$DEPLOY_DIR/streamcast-app.service" > /etc/systemd/system/streamcast-app.service
systemctl daemon-reload
systemctl enable --now mediamtx streamcast-app
systemctl restart mediamtx streamcast-app

# --- 7. Pare-feu (IP directe : on ouvre 3000 et 8888) -------------------------
log "Pare-feu (SSH, 3000, 8888)"
ufw allow OpenSSH >/dev/null
ufw allow 3000/tcp >/dev/null
ufw allow 8888/tcp >/dev/null
ufw --force enable >/dev/null

# --- 8. Outil de synchro CLI (optionnel, le bouton du panel suffit) ----------
install -m 755 "$DEPLOY_DIR/update-channels.sh" /usr/local/bin/streamcast-update-channels

# --- Bilan --------------------------------------------------------------------
log "Terminé !"
cat <<EOF

  Panel    : http://${IP}:3000/panel
  Lecteur  : http://${IP}:3000/watch
  Flux HLS : http://${IP}:8888/<chemin>/index.m3u8
  Mot de passe panel : voir APP_PASSWORD dans ${ENV_FILE}

  Étapes suivantes dans le panel :
    1. Connectez-vous, ajoutez vos chaînes.
    2. Réglages → « Serveur de diffusion » = http://${IP}:8888
    3. Réglages → « Restreamer toutes les chaînes » (bouton vert).
    → Chaque profil regarde n'importe quelle chaîne, en simultané.

  ⚠️ HTTP non chiffré : dès que vous avez un domaine, passez à install.sh
     (HTTPS automatique). Rien à refaire côté chaînes/profils.
EOF
