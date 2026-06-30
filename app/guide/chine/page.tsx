import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Guide du marché chinois — sourcing, livraison, prix, pièges",
  description:
    "Tout ce qu'il faut savoir pour acheter en Chine : usine vs société commerciale, modes de livraison, Incoterms, obtenir les meilleurs prix et éviter les pièges.",
  alternates: { canonical: "/guide/chine" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2>
      <div className="mt-3 space-y-3 text-zinc-700 dark:text-zinc-300">{children}</div>
    </section>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return <li className="leading-7">{children}</li>;
}

export default function GuideChinePage() {
  return (
    <div className="min-h-full bg-zinc-50 font-sans dark:bg-zinc-950">
      <main className="mx-auto max-w-3xl px-6 py-12">
        <Link href="/" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
          ← Retour au catalogue
        </Link>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          🇨🇳 Guide du marché chinois
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Tout ce qu&apos;il faut savoir pour acheter en Chine au meilleur prix, en
          toute confiance : livraison, usine vs société commerciale, négociation et
          pièges à éviter.
        </p>

        <Section title="1. Usine vs société commerciale (la différence clé)">
          <p>C&apos;est LA distinction qui change le prix. Beaucoup d&apos;« usines » sont en fait des intermédiaires.</p>
          <ul className="ml-5 list-disc">
            <Li><strong>Usine (factory)</strong> : fabrique elle-même → <strong>prix le plus bas</strong>, mais MOQ (quantité minimum) souvent élevé, parfois faible en anglais et en paperasse export.</Li>
            <Li><strong>Société commerciale (trading company / agent)</strong> : revend → <strong>+10 à 30 %</strong>, mais MOQ flexible, gère l&apos;export, la qualité et la logistique, propose plusieurs produits.</Li>
            <Li><strong>Comment reconnaître une vraie usine</strong> : demande la <em>business license</em> (营业执照) et son périmètre, une vidéo de la chaîne, le numéro de TVA export ; une usine ne vend en général qu&apos;<em>une seule catégorie</em> de produits.</Li>
            <Li><strong>1688 vs Alibaba</strong> : 1688 = marché domestique chinois (usines/grossistes, le moins cher, en chinois) ; Alibaba = version export (anglais, plus chère). Souvent la <em>même</em> usine est sur les deux.</Li>
          </ul>
        </Section>

        <Section title="2. La livraison (le poste qui fait mal si on ignore)">
          <p>Choisis le mode selon le poids/volume et l&apos;urgence :</p>
          <ul className="ml-5 list-disc">
            <Li><strong>Express (DHL/FedEx/UPS)</strong> : 3–7 jours, cher, idéal &lt; 50–100 kg, dédouanement inclus.</Li>
            <Li><strong>Aérien (air freight)</strong> : 5–10 jours, intermédiaire, bon pour 100–500 kg.</Li>
            <Li><strong>Maritime</strong> : <em>LCL</em> (groupage) ou <em>FCL</em> (conteneur complet), 25–45 jours, le <strong>moins cher au kilo</strong> pour les gros volumes.</Li>
            <Li><strong>Train Chine–Europe</strong> : ~18–25 jours, entre l&apos;aérien et le maritime.</Li>
            <Li><strong>Agent / consolidation</strong> (Superbuy, CSSBuy) : regroupe plusieurs commandes en <strong>un seul colis</strong> → grosse économie de port.</Li>
          </ul>
          <p className="font-semibold">Incoterms à connaître absolument :</p>
          <ul className="ml-5 list-disc">
            <Li><strong>EXW</strong> : tu gères tout depuis l&apos;usine (risqué pour un débutant).</Li>
            <Li><strong>FOB</strong> : le vendeur livre au port chinois, tu paies le reste (le plus courant).</Li>
            <Li><strong>CIF</strong> : le vendeur paie le fret maritime jusqu&apos;à ton port.</Li>
            <Li><strong>DDP</strong> : livré chez toi, droits et TVA payés (le plus simple). ⚠️ vérifie qui déclare la TVA — une sous-déclaration, c&apos;est <em>toi</em> le responsable.</Li>
          </ul>
          <p>⏱️ <strong>Délai réel</strong> = temps de <em>production</em> (souvent 7–30 jours) <em>+</em> transport. Ne l&apos;oublie jamais.</p>
        </Section>

        <Section title="3. Obtenir les meilleurs prix">
          <ul className="ml-5 list-disc">
            <Li>Compare le <strong>prix usine 1688</strong> (via agent) au prix retail AliExpress : souvent 2 à 4× moins cher.</Li>
            <Li><strong>Le volume baisse le prix</strong> : négocie le MOQ et le prix unitaire par palier.</Li>
            <Li>Demande toujours un <strong>échantillon</strong> avant une grosse commande.</Li>
            <Li>Mets <strong>3 à 5 fournisseurs en concurrence</strong> ; ne prends pas le moins cher les yeux fermés.</Li>
            <Li>Négocie l&apos;ensemble : prix, MOQ, délai, mode de paiement, échantillon offert.</Li>
            <Li>Timing : profite du <strong>11.11 / 6.18</strong>, mais <strong>évite le Nouvel An chinois</strong> (usines fermées 2–4 semaines).</Li>
            <Li>Paie via <strong>escrow / Alibaba Trade Assurance</strong> ; évite Western Union ou un virement direct à un inconnu.</Li>
          </ul>
        </Section>

        <Section title="4. Les pièges (à éviter absolument)">
          <ul className="ml-5 list-disc">
            <Li><strong>Acompte puis disparition</strong> : ne paie jamais 100 % d&apos;avance à un nouveau fournisseur — préfère 30 % / 70 % via escrow.</Li>
            <Li><strong>« Quality fade »</strong> : échantillon parfait, production dégradée → fais <strong>inspecter avant l&apos;expédition</strong> (QC tiers type SGS, ou via l&apos;agent).</Li>
            <Li><strong>Faux « Gold Supplier »</strong> et avis gonflés sur Alibaba : croise les sources, demande des références.</Li>
            <Li><strong>Intermédiaire déguisé en usine</strong> : vérifie la business license (voir §1).</Li>
            <Li><strong>Sous-déclaration de valeur en DDP</strong> : marchandise saisie possible — et c&apos;est toi le responsable légal.</Li>
            <Li><strong>Contrefaçons / marques</strong> : saisie à la douane UE + risque juridique. Reste sur des produits authentiques.</Li>
            <Li><strong>Frais cachés</strong> de dernière minute (« port oublié ») : exige un devis tout compris (landed cost).</Li>
            <Li><strong>Certifications falsifiées</strong> (CE/RoHS auto-déclarées sans test) : demande les rapports de test.</Li>
          </ul>
          <p className="rounded-xl bg-emerald-50 px-4 py-3 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            ✅ <strong>Le bon réflexe</strong> : échantillon → petite commande test → inspection tierce → paiement échelonné via escrow → Incoterm clair → business license vérifiée.
          </p>
        </Section>

        <div className="mt-10 rounded-2xl border border-indigo-200 bg-indigo-50 p-5 dark:border-indigo-900 dark:bg-indigo-950/40">
          <p className="text-indigo-900 dark:text-indigo-100">
            🐉 SilkRoute applique déjà une partie de ce guide (prix usine, coût
            d&apos;atterrissage, vérifié/UE, risque contrefaçon).{" "}
            <Link href="/silkroute" className="font-semibold underline">Essayer une recherche →</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
