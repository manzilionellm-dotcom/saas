# Serveur pour ~1000 spectateurs simultanés (dimensionnement honnête)

Guide + « cahier des charges » prêt à copier-coller. **Corrigé après vérification
des offres réelles** : à cette échelle, le coût n'est PAS le matériel, c'est le
**trafic sortant soutenu**. Lis la section 2 avant de commander quoi que ce soit.

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

➡️ Un VPS à 1 Gbit/s ne suffit pas. Mais un « 10 Gbit/s illimité pas cher »
**n'existe quasiment pas** — voir ci-dessous.

## 2. La réalité des offres (vérifiée)

Le matériel (8+ cœurs, 16–32 Go, SSD) est trivial et bon marché partout. Le vrai
facteur de coût, c'est l'**egress illimité à haut débit soutenu (4–6 Gbit/s)** :

- **Hetzner** — option 10 Gbit/s à +43 €/mois, **MAIS seulement 20 To/mois inclus**,
  puis 1 €/To. Ce n'est donc pas de l'illimité : à 4 Gbit/s soutenu tu dépasses
  20 To en ~11 h de direct cumulé. Inadapté à un vrai illimité 5 Gbit/s.
  (source : Hetzner Docs — 10G Uplink / Traffic.)
- **OVH** — la gamme **dédiée EU (Rise / bare-metal) est unmetered, tiée à la
  vitesse de port**, ingress/egress gratuits — **sauf Asie-Pacifique** (l'illimité
  n'y est PAS offert). Le piège : garantir 4–6 Gbit/s **soutenus** passe par des
  options de bande passante garantie coûteuses (souvent +300 à +800 €/mois), et
  certains modèles ne sont commandables qu'en stock APAC (donc sans illimité).
  → Vérifier, au moment de commander, le **débit garanti réellement inclus** en
  datacenter **européen**, pas seulement la mention « unmetered ».
- **Scaleway (Dedibox), Cherry Servers, RedSwitches** — proposent du 10 Gbps EU
  avec gros forfaits (ex. Cherry : ~100 To/mois inclus). À comparer selon ton
  volume réel (section 3).

**Conclusion** : pour ~1000 spectateurs qui regardent plusieurs heures/jour, le
« gros dédié 10G illimité à 150 € » est un mythe. Deux voies réalistes :

### Voie A — Origine modeste + CDN (RECOMMANDÉ pour du HLS à 1000+)
Le HLS se met en cache **à merveille** : le serveur d'origine sert chaque segment
(~4 s) **une seule fois** au CDN, qui le rediffuse ensuite à tous les spectateurs.
L'origine peut donc rester un petit VPS à 1 Gbit/s ; c'est le CDN qui encaisse le
fan-out. On paie au Go **réellement diffusé** (pas de bande passante à garantir).
- Bunny.net ≈ 0,005–0,01 €/Go, Cloudflare, etc.
- Plus robuste (multi-POP mondial) et souvent **moins cher** qu'un dédié à bande
  passante garantie, dès que l'audience est un peu dispersée.

### Voie B — Un dédié à bande passante garantie
Un seul serveur, simple, mais il faut **payer le débit garanti** (4–6 Gbit/s).
Réaliste seulement si ton volume mensuel reste sous un forfait raisonnable, ou si
l'hébergeur offre vraiment l'illimité EU à ce débit. Budget réel : **300–800 €/mois**.

## 3. Calculer TON volume (le chiffre qui décide tout)

Le coût dépend des **heures-spectateur/mois**, pas du pic seul :

> **1 heure regardée** = débit × 3600 s
> HD 720p (4 Mbit/s) ≈ **1,8 Go/heure** · Full HD (6 Mbit/s) ≈ **2,7 Go/heure**

**Volume mensuel = (spectateurs moyens) × (heures/jour) × 30 × Go-par-heure**

Exemples en HD720 (1,8 Go/h) :

| Scénario | Calcul | Volume/mois | Coût CDN indicatif (0,007 €/Go) |
|---|---|---|---|
| 1000 pers., 1 h/j | 1000×1×30×1,8 | ~54 To | ~380 € |
| 1000 pers., 3 h/j | 1000×3×30×1,8 | ~162 To | ~1 130 € |
| 200 moy. (pic 1000), 3 h/j | 200×3×30×1,8 | ~32 To | ~225 € |

➡️ **La question déterminante : combien d'heures de direct réellement regardées
par mois ?** Un pic à 1000 mais une moyenne à 200 change tout le budget.

## 4. Cahier des charges à envoyer à l'hébergeur (copier-coller)

> Bonjour,
> Je cherche une solution pour de la **rediffusion vidéo en direct HLS (sans
> réencodage)** avec MediaMTX, pour un **pic de ~1000 spectateurs HD simultanés**
> (4–6 Gbit/s sortant soutenu, ~[À COMPLÉTER] To/mois estimés). Deux devis SVP :
> 1. **Serveur dédié EU** (8 cœurs+, 16–32 Go, 200 Go SSD, Ubuntu 24.04, root SSH)
>    avec le **débit public GARANTI réellement inclus en datacenter européen** et
>    le **volume de trafic mensuel inclus** (préciser le prix au To au-delà).
> 2. **Petit serveur d'origine + votre CDN** (le cas échéant), tarif au Go diffusé.
> Merci de préciser, pour chaque option, le **coût mensuel tout compris** et si
> l'illimité s'applique bien à la **région Europe**.

## 5. Après l'achat

1. Installer MediaMTX + service systemd (voir `README.md` de ce dossier).
2. Dans `mediamtx.yml` : garder `sourceOnDemand: yes` et `hlsAllowOrigin: "*"`
   (indispensable pour le lecteur web `/watch` **et** pour qu'un CDN puisse lire l'origine).
3. Si CDN : pointer le CDN sur l'origine `http://<serveur>:8888`, puis mettre les
   URLs CDN comme « chaînes directes » dans le panel (ou régler l'URL de base).
4. Générer les chaînes : `/api/panel/export/mediamtx`.
5. Surveiller un pic en direct : `vnstat -l` (origine) + tableau de bord du CDN.

## 6. Repères de coût (corrigés)

| Audience | Solution réaliste | Coût/mois |
|---|---|---|
| ~100 simultanés | 1 VPS 1 Gbit/s | 5–15 € |
| **~1000 pic, faible volume** | petit VPS + CDN | **~200–400 €** |
| **~1000, gros volume (3 h/j)** | VPS + CDN, ou dédié garanti | **~800–1 300 €** |
| 2000+ | origine + CDN (obligatoire) | selon volume |

> ⚠️ Les prix évoluent et dépendent de la région : **fais toujours confirmer par
> l'hébergeur le débit garanti EU et le trafic inclus** avant de commander.
>
> ⚠️ Rappel : ne rediffuse que des flux que tu as le droit de redistribuer.
