# Acheter le serveur pour 1000 spectateurs simultanés (confort garanti)

Guide + « cahier des charges » prêt à copier-coller pour commander le bon serveur.

## 1. Le calcul (le point que tout le monde oublie)

Le mode « à la demande » économise l'**entrée** (chaque chaîne n'est tirée qu'une
fois). Mais **chaque spectateur reçoit sa propre copie en sortie**. Donc :

> **Débit sortant = nombre de spectateurs × débit d'une chaîne**
> (indépendant du nombre de chaînes au catalogue — 15 000 ou 50, c'est pareil.)

Pour **1000 spectateurs simultanés** :

| Qualité par chaîne | Débit/spectateur | Sortie totale (1000) |
|---|---|---|
| SD ~576p | 2 Mbit/s | **2 Gbit/s** |
| HD 720p | 4 Mbit/s | **4 Gbit/s** |
| Full HD 1080p | 6 Mbit/s | **6 Gbit/s** |

➡️ **Conséquence : un petit VPS à 1 Gbit/s ne suffit PAS pour 1000 personnes.**
Il faut un port réseau **10 Gbit/s**. Un seul bon serveur 10 Gbit/s pousse
~1500–2000 spectateurs en HD sans transpirer (pas de réencodage = peu de CPU).

Trafic mensuel (si chacun regarde ~3 h/jour, en HD) : ~**160 To/mois**.
→ prendre une offre **trafic illimité / unmetered**, sinon la facture explose.

## 2. Ce qu'il faut acheter (recommandation)

**Option A — Serveur dédié 10 Gbit/s illimité (LE meilleur choix pour 1000)**
Un seul serveur, simple à gérer, coût fixe.

| Hébergeur | Offre type | Réseau | Prix indicatif/mois |
|---|---|---|---|
| **Hetzner** (dédié) | AX42 / AX52 (Ryzen, 64 Go) | 1 Gbit/s inclus, **10 Gbit/s en option** | ~45–70 € + option 10G |
| **OVH** | Advance / Scale | **jusqu'à 10 Gbit/s unmetered** | ~120–250 € |
| **Scaleway** | Dedibox | 10 Gbit/s selon gamme | ~100–200 € |

Pour 1000 spectateurs confortables, vise **8 cœurs+, 16–32 Go RAM, port 10 Gbit/s
unmetered**. Le CPU sert peu (on copie le flux), c'est le **réseau** qui compte.

**Option B — CDN devant un petit serveur (scale infini, zéro gestion réseau)**
Le VPS reste petit ; un CDN (Bunny.net, Cloudflare) encaisse les spectateurs.
- Bunny.net ≈ 0,01 €/Go → ~160 To = **~1 500 €/mois** (cher mais illimité et mondial).
- À réserver si tu vises **bien au-delà** de 1000, ou une audience très dispersée.

➡️ **Pour exactement ~1000 : Option A (dédié 10 Gbit/s).** Meilleur rapport
prix/confort. On passe au CDN seulement si ça dépasse ~2000 simultanés.

## 3. Cahier des charges à envoyer à l'hébergeur (copier-coller)

> Bonjour,
> Je cherche un **serveur dédié** pour de la **rediffusion vidéo en direct (HLS,
> sans réencodage)** avec MediaMTX. Besoin :
> - **~1000 spectateurs simultanés en HD**, soit **4 à 6 Gbit/s de trafic sortant** soutenu ;
> - **port réseau 10 Gbit/s** avec **trafic illimité (unmetered)** ou très gros forfait (≥ 200 To/mois) ;
> - **8 vCPU/cœurs minimum, 16–32 Go de RAM** (pas de transcodage, priorité au réseau) ;
> - disque modeste (100–200 Go SSD suffisent) ;
> - **Ubuntu 24.04**, accès root SSH ;
> - datacenter en **Europe** (audience francophone/diaspora).
> Quelle offre correspond, et à quel tarif mensuel tout compris (port 10G inclus) ?
> Merci.

## 4. Après l'achat

1. Installer MediaMTX et le service systemd (voir `README.md` de ce dossier).
2. Dans `mediamtx.yml`, garder `sourceOnDemand: yes` et `hlsAllowOrigin: "*"`
   (indispensable pour le lecteur web `/watch`).
3. Générer les chaînes depuis le panel : `/api/panel/export/mediamtx`.
4. Vérifier la montée en charge : `vnstat -l` (trafic temps réel) pendant un pic.
   Tant que la sortie reste < ~8 Gbit/s sur un port 10G, tout le monde est à l'aise.

## 5. Repères de coût

| Audience simultanée | Serveur | Coût/mois indicatif |
|---|---|---|
| ~100 | 1 VPS 1 Gbit/s | 5–15 € |
| **~1000** | **1 dédié 10 Gbit/s unmetered** | **80–250 €** |
| 2000+ | dédié 10G + CDN, ou multi-serveurs | 300 €+ |

> ⚠️ Rappel : ne rediffuse que des flux que tu as le droit de redistribuer.
