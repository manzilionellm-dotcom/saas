#!/usr/bin/env bash
# Diagnostic d'une source IPTV : dit en 10 secondes si le probleme vient du
# User-Agent (corrigeable par nous) ou du compte/fournisseur (pas corrigeable par du code).
#
# Usage : ./check-source.sh "http://fournisseur.example/live/user/pass/12345.m3u8"
set -euo pipefail

URL="${1:-}"
[ -n "$URL" ] || { echo "Usage : $0 <URL_SOURCE>"; exit 1; }

UA_VLC="VLC/3.0.20 LibVLC/3.0.20"

code_default="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "$URL" || echo "ERR")"
code_vlc="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 -A "$UA_VLC" "$URL" || echo "ERR")"

echo "Sans User-Agent particulier : HTTP $code_default"
echo "Avec User-Agent VLC        : HTTP $code_vlc"
echo

case "$code_vlc" in
  200|206|302|301)
    if [ "$code_default" = "456" ] || [ "$code_default" = "403" ]; then
      echo "VERDICT : le fournisseur bloque le User-Agent par defaut mais accepte VLC."
      echo "=> Le restream via ffmpeg (deja configure par ce kit) regle le probleme."
    else
      echo "VERDICT : la source repond correctement."
      echo "=> Si mediamtx echoue quand meme, le compte etait sature au moment du test"
      echo "   (connexions max) : fermez les autres lecteurs/appareils et reessayez."
    fi
    ;;
  456)
    echo "VERDICT : 456 meme avec le User-Agent VLC et une seule connexion."
    echo "=> Limite de connexions du compte atteinte, compte expire, ou IP bannie."
    echo "   AUCUN code ne peut contourner ca : fermez les autres appareils qui"
    echo "   utilisent ce compte, ou contactez le fournisseur."
    ;;
  ERR)
    echo "VERDICT : la source ne repond pas du tout (timeout/DNS)."
    echo "=> URL morte ou fournisseur injoignable depuis ce serveur."
    ;;
  *)
    echo "VERDICT : reponse inattendue HTTP $code_vlc — verifiez l'URL (identifiants ?)."
    ;;
esac
