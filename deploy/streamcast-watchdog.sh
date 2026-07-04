#!/usr/bin/env bash
# StreamCast watchdog : detecte les sources IPTV qui repondent 456 en boucle,
# les met en pause via l'API mediamtx (pour ne pas se faire bannir l'IP chez le
# fournisseur), et les reactive automatiquement apres un delai de refroidissement.
#
# Lance par streamcast-watchdog.timer toutes les minutes. Idempotent.
set -euo pipefail

MTX_API="${MTX_API:-http://127.0.0.1:9997}"
MTX_UNIT="${MTX_UNIT:-mediamtx}"          # nom de l'unite systemd de mediamtx
WINDOW_MIN="${WINDOW_MIN:-5}"             # fenetre d'analyse des logs (minutes)
THRESHOLD="${THRESHOLD:-10}"              # nb de 456 dans la fenetre avant pause
COOLDOWN_SEC="${COOLDOWN_SEC:-900}"       # duree de pause avant nouvel essai (15 min)
STATE_DIR="${STATE_DIR:-/var/lib/streamcast/watchdog}"
STATUS_DIR="${STATUS_DIR:-/var/lib/streamcast/status}"

mkdir -p "$STATE_DIR" "$STATUS_DIR"

command -v jq >/dev/null || { echo "jq manquant (apt-get install -y jq)"; exit 1; }
command -v curl >/dev/null || { echo "curl manquant"; exit 1; }

api() { # api METHOD PATH [JSON_BODY]
  local method="$1" path="$2" body="${3:-}"
  if [ -n "$body" ]; then
    curl -fsS -X "$method" -H 'Content-Type: application/json' -d "$body" "$MTX_API$path"
  else
    curl -fsS -X "$method" "$MTX_API$path"
  fi
}

# --- 1. Reactiver les paths dont le refroidissement est termine -------------
now="$(date +%s)"
for tsfile in "$STATE_DIR"/*.ts; do
  [ -e "$tsfile" ] || break
  name="$(basename "$tsfile" .ts)"
  paused_at="$(cat "$tsfile")"
  if (( now - paused_at >= COOLDOWN_SEC )); then
    saved="$STATE_DIR/$name.json"
    if [ -f "$saved" ]; then
      if api POST "/v3/config/paths/replace/$name" "$(cat "$saved")" >/dev/null; then
        echo "watchdog: path '$name' reactive apres refroidissement"
        rm -f "$tsfile" "$saved"
        rm -f "$STATUS_DIR/$name"
      else
        echo "watchdog: echec de reactivation de '$name', nouvel essai au prochain passage" >&2
      fi
    else
      rm -f "$tsfile"
    fi
  fi
done

# --- 2. Chercher les paths qui echouent en boucle dans la fenetre -----------
# Deux formats de logs mediamtx selon le type de source :
#   source HLS directe : ERR [path xxx] [HLS source] bad status code: 456
#   tirage ffmpeg      : INF [path xxx] runOnDemand command exited: command exited with code 1
# ("stopped" = arret normal quand le spectateur part, on ne le compte pas)
logs="$(journalctl -u "$MTX_UNIT" --since "-${WINDOW_MIN} min" --no-pager -o cat 2>/dev/null || true)"
[ -n "$logs" ] || exit 0

echo "$logs" \
  | grep -E 'bad status code: 456|runOnDemand command exited' \
  | grep -oP '\[path \K[^]]+' \
  | sort | uniq -c \
  | while read -r count name; do
      (( count >= THRESHOLD )) || continue
      # deja en pause ?
      [ -f "$STATE_DIR/$name.ts" ] && continue

      # sauvegarder la config actuelle du path puis la remplacer par un path vide
      if ! api GET "/v3/config/paths/get/$name" > "$STATE_DIR/$name.json" 2>/dev/null; then
        echo "watchdog: impossible de lire la config du path '$name' (API mediamtx ?)" >&2
        rm -f "$STATE_DIR/$name.json"
        continue
      fi
      # ne garder que les champs de config (l'API renvoie aussi name/confName selon versions)
      jq 'del(.name, .confName)' "$STATE_DIR/$name.json" > "$STATE_DIR/$name.json.tmp" \
        && mv "$STATE_DIR/$name.json.tmp" "$STATE_DIR/$name.json"

      if api POST "/v3/config/paths/replace/$name" '{}' >/dev/null; then
        date +%s > "$STATE_DIR/$name.ts"
        echo "provider_error_456" > "$STATUS_DIR/$name"
        echo "watchdog: path '$name' mis en pause ($count echecs de la source en ${WINDOW_MIN} min), reprise dans $((COOLDOWN_SEC/60)) min"
      else
        echo "watchdog: echec de mise en pause de '$name'" >&2
        rm -f "$STATE_DIR/$name.json"
      fi
    done || true   # aucun echec dans la fenetre = cas normal, ne pas sortir en erreur

exit 0
