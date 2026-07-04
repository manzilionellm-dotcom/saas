import Link from "next/link";
import BusinessForm from "../../BusinessForm";

export const dynamic = "force-dynamic";

export default function NewBusinessPage() {
  return (
    <div className="min-h-full bg-zinc-50 font-sans dark:bg-zinc-950">
      <main className="mx-auto max-w-3xl px-6 py-12">
        <Link href="/studio" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
          ← Studio
        </Link>
        <h1 className="mt-4 mb-6 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Nouveau business
        </h1>
        <BusinessForm />
      </main>
    </div>
  );
}
