import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as loginRoute } from "@/app/api/auth/login/route";
import { POST as logoutRoute } from "@/app/api/auth/logout/route";
import { GET as meRoute } from "@/app/api/auth/me/route";
import { POST as refreshRoute } from "@/app/api/auth/refresh/route";
import { POST as registerRoute } from "@/app/api/auth/register/route";
import { GET as sessionsRoute } from "@/app/api/auth/sessions/route";

const BASE = "http://localhost";
const PASSWORD = "correct-horse-battery";

let userCounter = 0;

function uniqueEmail(): string {
  userCounter += 1;
  return `user${userCounter}@example.com`;
}

function jsonRequest(path: string, body: unknown): Request {
  return new Request(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function authedRequest(path: string, token: string, method = "GET"): Request {
  return new Request(`${BASE}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}` },
  });
}

async function registerUser(email: string): Promise<void> {
  const res = await registerRoute(
    jsonRequest("/api/auth/register", { email, password: PASSWORD })
  );
  expect(res.status).toBe(201);
}

async function login(email: string) {
  const res = await loginRoute(
    jsonRequest("/api/auth/login", { email, password: PASSWORD })
  );
  expect(res.status).toBe(200);
  return res.json();
}

const originalFlag = process.env.SIMULTANEOUS_LOGIN_DETECTION_ENABLED;

beforeEach(() => {
  delete process.env.SIMULTANEOUS_LOGIN_DETECTION_ENABLED;
});

afterEach(() => {
  if (originalFlag === undefined) {
    delete process.env.SIMULTANEOUS_LOGIN_DETECTION_ENABLED;
  } else {
    process.env.SIMULTANEOUS_LOGIN_DETECTION_ENABLED = originalFlag;
  }
});

describe("simultaneous sessions (detection disabled by default)", () => {
  it("allows multiple sessions for the same user to coexist", async () => {
    const email = uniqueEmail();
    await registerUser(email);

    const first = await login(email);
    const second = await login(email);
    const third = await login(email);

    for (const session of [first, second, third]) {
      const res = await meRoute(authedRequest("/api/auth/me", session.token));
      expect(res.status).toBe(200);
    }

    const listRes = await sessionsRoute(
      authedRequest("/api/auth/sessions", first.token)
    );
    expect(listRes.status).toBe(200);
    const { sessions } = await listRes.json();
    expect(sessions).toHaveLength(3);
  });

  it("does not invalidate existing sessions on a new login", async () => {
    const email = uniqueEmail();
    await registerUser(email);

    const first = await login(email);
    const before = await meRoute(authedRequest("/api/auth/me", first.token));
    expect(before.status).toBe(200);

    await login(email);

    const after = await meRoute(authedRequest("/api/auth/me", first.token));
    expect(after.status).toBe(200);
    const body = await after.json();
    expect(body.user.email).toBe(email);
  });

  it("triggers no disconnect or warning on repeated logins", async () => {
    const email = uniqueEmail();
    await registerUser(email);

    const first = await login(email);
    const second = await login(email);

    // The login response carries no warning or conflict signal.
    for (const session of [first, second]) {
      expect(Object.keys(session).sort()).toEqual([
        "expiresAt",
        "refreshToken",
        "token",
        "user",
      ]);
    }

    // Logging out one session leaves the other untouched.
    const logoutRes = await logoutRoute(
      authedRequest("/api/auth/logout", second.token, "POST")
    );
    expect(logoutRes.status).toBe(204);

    const stillActive = await meRoute(
      authedRequest("/api/auth/me", first.token)
    );
    expect(stillActive.status).toBe(200);

    const revoked = await meRoute(authedRequest("/api/auth/me", second.token));
    expect(revoked.status).toBe(401);
  });

  it("keeps other sessions intact when one session refreshes its tokens", async () => {
    const email = uniqueEmail();
    await registerUser(email);

    const first = await login(email);
    const second = await login(email);

    const refreshRes = await refreshRoute(
      jsonRequest("/api/auth/refresh", { refreshToken: second.refreshToken })
    );
    expect(refreshRes.status).toBe(200);
    const rotated = await refreshRes.json();

    // Rotated token works; the old refresh token is single-use.
    const meRes = await meRoute(authedRequest("/api/auth/me", rotated.token));
    expect(meRes.status).toBe(200);
    const replayRes = await refreshRoute(
      jsonRequest("/api/auth/refresh", { refreshToken: second.refreshToken })
    );
    expect(replayRes.status).toBe(401);

    // The other session is unaffected.
    const firstRes = await meRoute(authedRequest("/api/auth/me", first.token));
    expect(firstRes.status).toBe(200);
  });
});

describe("unrelated authentication checks still work", () => {
  it("rejects a wrong password", async () => {
    const email = uniqueEmail();
    await registerUser(email);

    const res = await loginRoute(
      jsonRequest("/api/auth/login", { email, password: "wrong-password" })
    );
    expect(res.status).toBe(401);
  });

  it("rejects an unknown user", async () => {
    const res = await loginRoute(
      jsonRequest("/api/auth/login", {
        email: "nobody@example.com",
        password: PASSWORD,
      })
    );
    expect(res.status).toBe(401);
  });

  it("rejects missing or invalid tokens", async () => {
    const missing = await meRoute(new Request(`${BASE}/api/auth/me`));
    expect(missing.status).toBe(401);

    const invalid = await meRoute(
      authedRequest("/api/auth/me", "not-a-real-token")
    );
    expect(invalid.status).toBe(401);
  });

  it("rejects duplicate registration", async () => {
    const email = uniqueEmail();
    await registerUser(email);

    const res = await registerRoute(
      jsonRequest("/api/auth/register", { email, password: PASSWORD })
    );
    expect(res.status).toBe(409);
  });

  it("rejects invalid registration input", async () => {
    const badEmail = await registerRoute(
      jsonRequest("/api/auth/register", {
        email: "not-an-email",
        password: PASSWORD,
      })
    );
    expect(badEmail.status).toBe(400);

    const shortPassword = await registerRoute(
      jsonRequest("/api/auth/register", {
        email: uniqueEmail(),
        password: "short",
      })
    );
    expect(shortPassword.status).toBe(400);
  });

  it("rejects an invalid refresh token", async () => {
    const res = await refreshRoute(
      jsonRequest("/api/auth/refresh", { refreshToken: "bogus" })
    );
    expect(res.status).toBe(401);
  });
});

describe("SIMULTANEOUS_LOGIN_DETECTION_ENABLED=true (opt-in enforcement)", () => {
  it("revokes previous sessions on a new login when explicitly enabled", async () => {
    process.env.SIMULTANEOUS_LOGIN_DETECTION_ENABLED = "true";

    const email = uniqueEmail();
    await registerUser(email);

    const first = await login(email);
    const second = await login(email);

    const firstRes = await meRoute(authedRequest("/api/auth/me", first.token));
    expect(firstRes.status).toBe(401);

    const secondRes = await meRoute(
      authedRequest("/api/auth/me", second.token)
    );
    expect(secondRes.status).toBe(200);
  });
});
