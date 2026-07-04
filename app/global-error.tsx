"use client";

// Dernier rempart (Keystone) : attrape même les erreurs du layout racine.
// Il doit fournir ses propres <html> et <body> (il remplace le layout).
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Arial, Helvetica, sans-serif",
          background: "#fafafa",
          color: "#18181b",
          margin: 0,
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center", padding: 24 }}>
          <p style={{ fontSize: 48, margin: 0 }}>🛟</p>
          <h1 style={{ fontSize: 22, marginTop: 16 }}>L&apos;application a tenu bon</h1>
          <p style={{ color: "#52525b", marginTop: 8 }}>
            Une erreur sérieuse est survenue, mais Keystone l&apos;a contenue. Rien
            n&apos;a été cassé. Recharge simplement la page.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 24,
              background: "#4f46e5",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "10px 20px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Recharger
          </button>
        </div>
      </body>
    </html>
  );
}
