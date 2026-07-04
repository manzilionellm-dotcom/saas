#!/usr/bin/env bash
# Installation complete de StreamCast sur le serveur, en une commande :
#   sudo bash deploy/install.sh
#
# Ce script est idempotent : on peut le relancer sans risque.
# Il fait :
#   1. installe les dependances (jq, curl, ffmpeg, python3-yaml)
#   2. arrete les instances Next.js lancees a la main (source des EADDRINUSE)
#   3. build le panel et l'installe comme service systemd (demarrage auto, restart auto)
#   4. installe le watchdog anti-456 (timer systemd, toutes les minutes)
#   5. convertit les sources HLS de mediamtx en tirage ffmpeg deguise en VLC
#      et active l'API mediamtx, puis redemarre mediamtx
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/saas}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log()  { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m/!\\ %s\033[0m\n' "$*"; }

[ "$(id -u)" -eq 0 ] || { echo "Ce script doit etre lance en root (sudo)."; exit 1; }

# --- 1. Dependances ----------------------------------------------------------
log "Installation des dependances (jq, curl, ffmpeg, python3-yaml)"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq || warn "apt-get update a echoue, on continue avec le cache"
apt-get install -y -qq jq curl ffmpeg python3 python3-yaml >/dev/null

command -v node >/dev/null || { echo "Node.js introuvable. Installez Node >= 20 puis relancez."; exit 1; }
NODE_BIN="$(command -v node)"
NPM_BIN="$(command -v npm)"
log "Node detecte : $NODE_BIN ($(node --version))"

# --- 2. Arreter les instances lancees a la main ------------------------------
log "Arret des instances Next.js orphelines (cause des EADDRINUSE)"
systemctl stop streamcast-panel 2>/dev/null || true
pkill -f 'next-server' 2>/dev/null || true
pkill -f 'next start'  2>/dev/null || true
sleep 2

port_pids() { ss -ltnpH 'sport = :3000' 2>/dev/null | grep -oP 'pid=\K[0-9]+' | sort -u | tr '\n' ' '; }

PIDS="$(port_pids)"
if [ -n "${PIDS// /}" ]; then
  warn "Le port 3000 est encore occupe (PID: $PIDS), arret force"
  kill $PIDS 2>/dev/null || true
  sleep 2
  PIDS="$(port_pids)"
  if [ -n "${PIDS// /}" ]; then
    kill -9 $PIDS 2>/dev/null || true
    sleep 1
  fi
fi

PIDS="$(port_pids)"
if [ -n "${PIDS// /}" ]; then
  warn "Impossible de liberer le port 3000 : quelque chose relance le processus."
  warn "Processus et parent (le parent est le superviseur a desactiver) :"
  for p in $PIDS; do
    ps -o pid=,ppid=,cmd= -p "$p" 2>/dev/null || true
    pp="$(ps -o ppid= -p "$p" 2>/dev/null | tr -d ' ')"
    if [ -n "$pp" ] && [ "$pp" != "1" ]; then
      ps -o pid=,ppid=,cmd= -p "$pp" 2>/dev/null || true
    fi
  done
  warn "Desactivez ce superviseur (ex: pm2 delete <app> ; systemctl disable --now <service>) puis relancez ce script."
  exit 1
fi

# --- 3. Build + service systemd du panel -------------------------------------
log "Build du panel dans $APP_DIR"
[ -f "$APP_DIR/package.json" ] || { echo "$APP_DIR/package.json introuvable. Ajustez APP_DIR."; exit 1; }
cd "$APP_DIR"
"$NPM_BIN" ci
"$NODE_BIN" node_modules/next/dist/bin/next build

log "Installation du service systemd streamcast-panel"
sed -e "s|__APP_DIR__|$APP_DIR|g" -e "s|__NODE_BIN__|$NODE_BIN|g" \
  "$SCRIPT_DIR/streamcast-panel.service" > /etc/systemd/system/streamcast-panel.service
systemctl daemon-reload
systemctl enable --now streamcast-panel
sleep 4
if curl -fsS -o /dev/null http://127.0.0.1:3000; then
  log "Panel OK : il repond sur le port 3000"
else
  warn "Le panel ne repond pas encore. Verifiez : journalctl -u streamcast-panel -n 50"
fi

# --- 4. Watchdog anti-456 -----------------------------------------------------
log "Installation du watchdog anti-456"
install -m 755 "$SCRIPT_DIR/streamcast-watchdog.sh" /usr/local/bin/streamcast-watchdog.sh
cp "$SCRIPT_DIR/streamcast-watchdog.service" /etc/systemd/system/
cp "$SCRIPT_DIR/streamcast-watchdog.timer"   /etc/systemd/system/
mkdir -p /var/lib/streamcast/watchdog /var/lib/streamcast/status
systemctl daemon-reload
systemctl enable --now streamcast-watchdog.timer

# --- 5. mediamtx : sources HLS -> ffmpeg + API activee ------------------------
log "Configuration de mediamtx"
MTX_CONF=""
for c in /usr/local/etc/mediamtx.yml /etc/mediamtx/mediamtx.yml /etc/mediamtx.yml \
         /opt/mediamtx/mediamtx.yml "$APP_DIR/mediamtx.yml"; do
  [ -f "$c" ] && { MTX_CONF="$c"; break; }
done
if [ -n "$MTX_CONF" ]; then
  log "Config mediamtx trouvee : $MTX_CONF"
  python3 "$SCRIPT_DIR/convert-sources.py" "$MTX_CONF"
  if systemctl list-unit-files 2>/dev/null | grep -q '^mediamtx\.service'; then
    systemctl restart mediamtx
    log "mediamtx redemarre"
  else
    log "mediamtx ne tourne pas sous systemd : migration automatique"
    # retrouver le binaire : via le processus en cours, sinon emplacements habituels
    MTX_PID="$(pgrep -x mediamtx 2>/dev/null | head -1 || true)"
    MTX_BIN=""
    [ -n "$MTX_PID" ] && MTX_BIN="$(readlink -f "/proc/$MTX_PID/exe" 2>/dev/null || true)"
    if [ -z "$MTX_BIN" ]; then
      for b in /usr/local/bin/mediamtx /usr/bin/mediamtx /opt/mediamtx/mediamtx; do
        [ -x "$b" ] && { MTX_BIN="$b"; break; }
      done
    fi
    if [ -n "$MTX_BIN" ]; then
      sed -e "s|__MTX_BIN__|$MTX_BIN|g" -e "s|__MTX_CONF__|$MTX_CONF|g" \
        "$SCRIPT_DIR/mediamtx.service" > /etc/systemd/system/mediamtx.service
      systemctl daemon-reload
      # arreter l'ancienne instance (screen/nohup/manuelle) avant de lancer le service
      pkill -x mediamtx 2>/dev/null || true
      sleep 2
      pkill -9 -x mediamtx 2>/dev/null || true
      systemctl enable --now mediamtx
      log "mediamtx migre sous systemd (binaire : $MTX_BIN) et redemarre avec la nouvelle config"
    else
      warn "Binaire mediamtx introuvable : redemarrez mediamtx manuellement pour appliquer la config."
      warn "Puis creez le service : sed -e 's|__MTX_BIN__|/chemin/mediamtx|' -e 's|__MTX_CONF__|$MTX_CONF|' \\"
      warn "  $SCRIPT_DIR/mediamtx.service > /etc/systemd/system/mediamtx.service && systemctl enable --now mediamtx"
    fi
  fi
else
  warn "mediamtx.yml introuvable aux emplacements habituels."
  warn "Lancez manuellement : python3 $SCRIPT_DIR/convert-sources.py /chemin/vers/mediamtx.yml"
fi

# --- Resume -------------------------------------------------------------------
log "Installation terminee"
cat <<'EOF'
Etat des services :
  systemctl status streamcast-panel --no-pager -l | head -5
  systemctl status streamcast-watchdog.timer --no-pager | head -5

A partir de maintenant :
  - NE PLUS lancer "next start" a la main. Redemarrage : systemctl restart streamcast-panel
  - Les chaines en erreur 456 repetee sont mises en pause 15 min automatiquement
    (etat visible dans /var/lib/streamcast/status/)
  - Pour diagnostiquer une source qui refuse : deploy/check-source.sh "<URL_SOURCE>"
EOF
