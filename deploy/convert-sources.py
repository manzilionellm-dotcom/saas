#!/usr/bin/env python3
"""Convertit les paths mediamtx dont la source est HLS/HTTP en tirage ffmpeg.

Pourquoi : mediamtx ne permet pas de changer le User-Agent de sa source HLS et
beaucoup de fournisseurs IPTV bloquent son UA par defaut (erreur 456/403).
On remplace donc `source: http://...` par un `runOnDemand` ffmpeg deguise en VLC.

Active aussi l'API mediamtx (api: yes), requise par le watchdog et le panel.

Usage : python3 convert-sources.py /chemin/vers/mediamtx.yml
Une sauvegarde <fichier>.bak-<horodatage> est creee avant toute modification.
"""
import sys
import time
import shutil

try:
    import yaml
except ImportError:
    sys.exit("PyYAML manquant : apt-get install -y python3-yaml")

USER_AGENT = "VLC/3.0.20 LibVLC/3.0.20"
RTSP_PORT = 8554


def build_pull_command(source_url: str) -> str:
    return (
        "ffmpeg -hide_banner -loglevel warning "
        f"-user_agent '{USER_AGENT}' "
        "-reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 10 "
        f"-i '{source_url}' "
        f"-c copy -f rtsp rtsp://localhost:{RTSP_PORT}/$MTX_PATH"
    )


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit(f"Usage : {sys.argv[0]} /chemin/vers/mediamtx.yml")
    conf_path = sys.argv[1]

    with open(conf_path, "r", encoding="utf-8") as f:
        conf = yaml.safe_load(f) or {}

    changed = False

    if conf.get("api") is not True:
        conf["api"] = True
        changed = True
        print("api: yes active dans la config")

    # 'sourceOnDemand' sans 'source' (= publisher) est une erreur FATALE pour
    # mediamtx recent : le service refuse de demarrer. On purge ces orphelins.
    cleaned = 0
    candidates = [conf.get("pathDefaults")] + list((conf.get("paths") or {}).values())
    for path_conf in candidates:
        if not isinstance(path_conf, dict):
            continue
        source = path_conf.get("source", "publisher")
        if source in ("publisher", None, "") and "sourceOnDemand" in path_conf:
            path_conf.pop("sourceOnDemand")
            cleaned += 1
            changed = True
    if cleaned:
        print(f"{cleaned} 'sourceOnDemand' orphelin(s) supprime(s) (paths sans source)")

    converted = []
    paths = conf.get("paths") or {}
    for name, path_conf in paths.items():
        if not isinstance(path_conf, dict):
            continue
        source = path_conf.get("source", "")
        if not isinstance(source, str) or not source.startswith(("http://", "https://")):
            continue
        path_conf.pop("source", None)
        path_conf.pop("sourceOnDemand", None)
        path_conf["runOnDemand"] = build_pull_command(source)
        path_conf["runOnDemandRestart"] = True
        path_conf["runOnDemandCloseAfter"] = "30s"
        converted.append(name)
        changed = True

    if not changed:
        print("Rien a changer : aucune source HTTP dans les paths et l'API est deja active.")
        return

    backup = f"{conf_path}.bak-{time.strftime('%Y%m%d-%H%M%S')}"
    shutil.copy2(conf_path, backup)
    print(f"Sauvegarde : {backup}")

    with open(conf_path, "w", encoding="utf-8") as f:
        yaml.safe_dump(conf, f, default_flow_style=False, allow_unicode=True, sort_keys=False, width=10000)

    if converted:
        print(f"{len(converted)} path(s) converti(s) en tirage ffmpeg :")
        for name in converted:
            print(f"  - {name}")
    print("Redemarrez mediamtx pour appliquer (systemctl restart mediamtx).")


if __name__ == "__main__":
    main()
