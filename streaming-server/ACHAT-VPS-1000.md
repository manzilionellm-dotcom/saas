# Serveur de rediffusion — dimensionnement honnête (200 pour démarrer, 1000 plus tard)

Guide + « cahier des charges » prêt à copier-coller. **Vérifié sur les offres
réelles.** Commence par la **section 0 (200 spectateurs)** — c'est le point de
départ recommandé, simple et pas cher. Les sections 1+ traitent la montée à 1000.

## 0. POUR DÉMARRER : ~200 spectateurs = 1 seul serveur, ~40-50 €/mois

À 200 spectateurs, tout **rentre dans un port 1 Gbit/s** — donc pas besoin de 10G
ni de CDN. Le calcul :

| Qualité | Débit/spectateur | 200 spectateurs | Tient sur 1 Gbit/s ? |
|---|---|---|---|
| SD ~576p | 2 Mbit/s | 400 Mbit/s | ✅ large |
| **HD 720p** | 4 Mbit/s | **800 Mbit/s** | ✅ oui (garde le 720p) |
| Full HD 1080p | 6 Mbit/s | 1,2 Gbit/s | ❌ dépasse 1 Gbit/s |

➡️ **En HD 720p, 200 spectateurs = ~800 Mbit/s, ça passe sur un port 1 Gbit/s.**
Pour rester confortable, vise le **720p** (le 1080p pour 200 simultanés
dépasserait le port ; dans ce cas, limite le nombre ou prends plus de débit).

**LE bon choix : un serveur dédié Hetzner, port 1 Gbit/s à trafic ILLIMITÉ.**
Point vérifié : sur les dédiés Hetzner, le **port standard 1 Gbit/s inclut le
trafic illimité et gratuit** (le plafond de 20 To ne concernait QUE l'option 10G).
Donc aucune inquiétude de volume, même en direct plusieurs heures/jour.

| Hébergeur | Offre | Réseau | Prix/mois (HT) |
|---|---|---|---|
| **Hetzner Server Auction** | machine d'occasion 4c/16-32 Go, mêmes DC EU | 1 Gbit/s **illimité** | **~30-45 €** (le moins cher) |
| **Hetzner AX41** | Ryzen 5 3600, 6c/12t, 64 Go, 2×512 Go NVMe | 1 Gbit/s **illimité** | **59 €** (57,30 + 1,70 IPv4), setup 0 € |

Matériel : n'importe quel **4 cœurs+, 16 Go RAM, SSD** suffit largement (pas de
réencodage). L'AX41 est même surdimensionné (6c/64 Go) — le Server Auction permet
de descendre à ~30-45 € avec le **même port 1 Gbit/s illimité**. DC : Falkenstein
(DE) ou Helsinki (FI), Ubuntu 24.04 en installation directe, root SSH.

> ⚠️ **OVH : piège du « inclus ».** Sur les serveurs OVH Advance, le 1 Gbit/s
> « inclus » est en réalité **plafonné à 25 To/mois** ; le vrai 1 Gbit/s illimité
> est une option à **+400 €/mois**, et les modèles d'entrée de gamme sont souvent
> **indisponibles en Europe** (stock APAC, où l'illimité n'est pas offert).
> → Pour un 1 Gbit/s réellement illimité et abordable en EU, **Hetzner** est le choix.

### Cahier des charges « 200 » (copier-coller)

> Bonjour,
> Je cherche un **serveur dédié en Europe** pour de la **rediffusion vidéo en
> direct HLS (sans réencodage)** avec MediaMTX. Besoin :
> - **~200 spectateurs simultanés en HD 720p** (~800 Mbit/s sortant au pic) ;
> - **port 1 Gbit/s avec trafic ILLIMITÉ inclus** (confirmez qu'il n'y a pas de
>   plafond de To ni de bridage sur ce port) ;
> - **4 cœurs+, 16 Go RAM, ~200 Go SSD, Ubuntu 24.04, accès root SSH** ;
> - datacenter **européen**.
> Quelle offre correspond et à quel tarif mensuel tout compris ? Merci.

Quand tu voudras dépasser ~250 simultanés en HD, reviens aux sections ci-dessous
(port 10G ou CDN). **Mais pour lancer à 200, la section 0 suffit.**

---

## 1. Le calcul (le point que tout le monde oublie)

Le mode « à la demande » économise l'**entrée** (chaque chaîne n'est tirée qu'une
fois). Mais **chaque spectateur reçoit sa propre copie en sortie**. Donc :

> **Débit sortant = nombre de spectateurs × débit d'une chaîne**
> (indépendant du nombre de chaînes au catalogue — 15 000 ou 50, c'est pareil.)

Pour aller **au-delà** (~1000 spectateurs), à cette échelle le coût n'est PAS le
matériel, c'est le **trafic sortant soutenu**. Lis la section 2.

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
