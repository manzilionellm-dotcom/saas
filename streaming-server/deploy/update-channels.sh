#!/usr/bin/env bash
# =============================================================================
# streamcast-update-channels — synchronise les chaînes du panel vers MediaMTX
# =============================================================================
# Télécharge /api/panel/export/mediamtx (en local, authentifié via
# APP_PASSWORD), remplace la section `paths:` de /opt/mediamtx/mediamtx.yml,
# puis redémarre MediaMTX — avec sauvegarde et retour arrière automatique
# si MediaMTX ne redémarre pas.
#
# À lancer après chaque ajout/suppression de chaînes dans le panel :
#     streamcast-update-channels
# =============================================================================
set -euo pipefail

ENV_FILE=${ENV_FILE:-/etc/streamcast/streamcast.env}
MTX_CONF=${MTX_CONF:-/opt/mediamtx/mediamtx.yml}
APP_URL=${APP_URL:-http://127.0.0.1:3000}

die() { printf 'ERREUR : %s\n' "$*" >&2; exit 1; }

[ -f "$ENV_FILE" ] || die "fichier d'environnement introuvable : $ENV_FILE"
[ -f "$MTX_CONF" ] || die "config MediaMTX introuvable : $MTX_CONF"

# shellcheck disable=SC1090
source "$ENV_FILE"
APP_PASSWORD=${APP_PASSWORD:-}

# Le cookie du panel est le SHA-256 de "streamcast:<mot de passe>"
# (voir app/lib/panel-auth.ts) : on peut donc s'authentifier sans navigateur.
TOKEN=$(printf 'streamcast:%s' "$APP_PASSWORD" | sha256sum | cut -d' ' -f1)

EXPORT=$(mktemp)
NEWCONF=$(mktemp)
trap 'rm -f "$EXPORT" "$NEWCONF"' EXIT

curl -fsS -H "Cookie: panel_auth=$TOKEN" \
  "$APP_URL/api/panel/export/mediamtx" -o "$EXPORT" \
  || die "export impossible — l'app tourne-t-elle ? (systemctl status streamcast-app)"
grep -q '^paths:' "$EXPORT" || die "export inattendu (pas de section paths:) — APP_PASSWORD correct ?"

# Nouvelle config = tout ce qui précède `paths:` dans la config actuelle,
# suivi de l'export du panel (qui contient sa propre section `paths:`).
sed '/^paths:/,$d' "$MTX_CONF" > "$NEWCONF"
cat "$EXPORT" >> "$NEWCONF"

if cmp -s "$NEWCONF" "$MTX_CONF"; then
  echo "Aucun changement — MediaMTX est déjà à jour."
  exit 0
fi

cp "$MTX_CONF" "${MTX_CONF}.bak"
install -m 644 -o streamcast -g streamcast "$NEWCONF" "$MTX_CONF"
systemctl restart mediamtx
sleep 2
if ! systemctl is-active --quiet mediamtx; then
  echo "MediaMTX ne redémarre pas — retour à la configuration précédente." >&2
  cp "${MTX_CONF}.bak" "$MTX_CONF"
  systemctl restart mediamtx
  die "mise à jour annulée ; voir : journalctl -u mediamtx -n 50"
fi

COUNT=$(grep -c '^  [a-z0-9-]*:$' "$EXPORT" || true)
echo "OK — ${COUNT} chaîne(s) synchronisée(s), MediaMTX redémarré."
