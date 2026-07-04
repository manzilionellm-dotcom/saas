import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://saas-suite.example.com"),
  title: "SaaS Suite — 30 outils pour votre entreprise",
  description: "Catalogue de 30 outils SaaS : ventes, marketing, support, développement et plus.",
  openGraph: {
    title: "SaaS Suite — la suite d'outils IA pour votre entreprise",
    description: "Plus de 50 outils SaaS, dont Versailles, l'agent IA qui pilote vos sites en SEO, GEO et AEO.",
    type: "website",
    images: ["/globe.svg"],
  },
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "SaaS Suite",
  url: "https://saas-suite.example.com",
  description:
    "Suite de plus de 50 outils SaaS, dont Versailles, l'agent IA qui pilote vos sites en SEO, GEO et AEO.",
};

const siteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "SaaS Suite",
  url: "https://saas-suite.example.com",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteJsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
