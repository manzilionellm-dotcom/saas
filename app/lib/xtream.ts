// Client Xtream Codes (API player_api.php) : récupère la liste des chaînes
// live d'un compte et construit leurs URLs de lecture HLS.
// À utiliser uniquement avec un compte dont vous détenez les droits d'usage.

export type XtreamAccount = {
  server: string; // http(s)://hote:port
  username: string;
  password: string;
};

export type XtreamChannel = {
  name: string;
  url: string;
  logo?: string;
  group?: string;
};

const TIMEOUT_MS = 15000;
// Garde-fou : certains comptes exposent des dizaines de milliers de chaînes.
export const XTREAM_MAX_CHANNELS = 30000;

export function normalizeServer(raw: string): string {
  let s = raw.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(s)) s = `http://${s}`;
  return s;
}

async function apiCall(account: XtreamAccount, action: string): Promise<unknown> {
  const { server, username, password } = account;
  const url = `${server}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=${action}`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { "User-Agent": "StreamCast/1.0" },
  });
  if (!res.ok) throw new Error(`Serveur Xtream : HTTP ${res.status}`);
  return res.json();
}

// Vérifie les identifiants (player_api.php sans action renvoie user_info).
export async function checkXtreamAccount(account: XtreamAccount): Promise<void> {
  const data = (await apiCall(account, "get_account_info")) as {
    user_info?: { auth?: number | string };
  };
  const auth = data?.user_info?.auth;
  if (auth === 0 || auth === "0") throw new Error("Identifiants Xtream refusés par le serveur.");
}

export async function fetchXtreamChannels(account: XtreamAccount): Promise<XtreamChannel[]> {
  // Catégories -> noms de groupes lisibles.
  const groups = new Map<string, string>();
  try {
    const cats = (await apiCall(account, "get_live_categories")) as Array<{
      category_id?: string | number;
      category_name?: string;
    }>;
    if (Array.isArray(cats)) {
      for (const c of cats) {
        if (c?.category_id != null && c?.category_name) {
          groups.set(String(c.category_id), String(c.category_name));
        }
      }
    }
  } catch {
    // Catégories indisponibles : les chaînes seront importées sans groupe.
  }

  const raw = (await apiCall(account, "get_live_streams")) as Array<{
    name?: string;
    stream_id?: number | string;
    stream_icon?: string;
    category_id?: string | number;
  }>;
  if (!Array.isArray(raw)) throw new Error("Réponse Xtream inattendue (liste de chaînes).");

  const { server, username, password } = account;
  return raw
    .filter((s) => s?.stream_id != null && s?.name)
    .slice(0, XTREAM_MAX_CHANNELS)
    .map((s) => ({
      name: String(s.name),
      url: `${server}/live/${encodeURIComponent(username)}/${encodeURIComponent(password)}/${s.stream_id}.m3u8`,
      logo: s.stream_icon ? String(s.stream_icon) : undefined,
      group: s.category_id != null ? groups.get(String(s.category_id)) : undefined,
    }));
}
