import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PasskeyForm } from "./passkey-form";

export default async function LoginPage() {
  // Already signed in → go home.
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <main className="flex w-full max-w-sm flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Connexion
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Authentifie-toi avec l&apos;empreinte digitale de ton appareil
            (Touch&nbsp;ID, Windows&nbsp;Hello, empreinte du téléphone).
          </p>
        </div>
        <PasskeyForm />
      </main>
    </div>
  );
}
