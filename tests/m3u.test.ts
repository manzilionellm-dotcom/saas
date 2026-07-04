import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET as connectionsRoute } from "@/app/api/connections/route";
import { GET as m3uRoute } from "@/app/api/m3u/route";
import {
  GET as channelsGet,
  POST as channelsPost,
} from "@/app/api/channels/route";
import { GET as streamRoute } from "@/app/api/stream/[id]/route";
import { POST as loginRoute } from "@/app/api/auth/login/route";
import { POST as registerRoute } from "@/app/api/auth/register/route";
import type { NextRequest } from "next/server";

const BASE = "http://localhost";
const PASSWORD = "correct-horse-battery";

let userCounter = 0;

function uniqueEmail(): string {
  userCounter += 1;
  return `m3u-user${userCounter}@example.com`;
}

function jsonPost(path: string, body: unknown, token?: string): Request {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }
  return new Request(`${BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function authedGet(path: string, token: string): Request {
  return new Request(`${BASE}${path}`, {
    method: "GET",
    headers: { authorization: `Bearer ${token}` },
  });
}

async function newUserToken(): Promise<string> {
  const email = uniqueEmail();
  const reg = await registerRoute(
    jsonPost("/api/auth/register", { email, password: PASSWORD })
  );
  expect(reg.status).toBe(201);
  const res = await loginRoute(
    jsonPost("/api/auth/login", { email, password: PASSWORD })
  );
  expect(res.status).toBe(200);
  const { token } = await res.json();
  return token as string;
}

async function login(email: string) {
  const res = await loginRoute(
    jsonPost("/api/auth/login", { email, password: PASSWORD })
  );
  expect(res.status).toBe(200);
  return res.json();
}

async function addChannel(token: string, name: string, url: string) {
  const res = await channelsPost(
    jsonPost("/api/channels", { name, url, group: "Family" }, token)
  );
  expect(res.status).toBe(201);
  const { channel } = await res.json();
  return channel;
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

describe("M3U playlist generation", () => {
  it("builds a valid EXTM3U playlist pointing at the stream endpoint", async () => {
    const token = await newUserToken();
    const channel = await addChannel(token, "Channel One", "https://src.example/one.ts");

    const res = await m3uRoute(authedGet("/api/m3u", token));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/x-mpegurl");

    const body = await res.text();
    expect(body.startsWith("#EXTM3U")).toBe(true);
    expect(body).toContain('group-title="Family"');
    expect(body).toContain("Channel One");
    expect(body).toContain(`/api/stream/${channel.id}`);
  });

  it("requires authentication", async () => {
    const res = await m3uRoute(new Request(`${BASE}/api/m3u`));
    expect(res.status).toBe(401);
  });

  it("scopes channels to their owner", async () => {
    const tokenA = await newUserToken();
    const tokenB = await newUserToken();
    await addChannel(tokenA, "A only", "https://src.example/a.ts");

    const listB = await channelsGet(authedGet("/api/channels", tokenB));
    const { channels } = await listB.json();
    expect(channels).toHaveLength(0);
  });
});

describe("concurrent stream connections (detection disabled by default)", () => {
  it("lets multiple sessions stream the same channel at once without blocking", async () => {
    const email = uniqueEmail();
    const reg = await registerRoute(
      jsonPost("/api/auth/register", { email, password: PASSWORD })
    );
    expect(reg.status).toBe(201);

    const first = await login(email);
    const second = await login(email);
    const channel = await addChannel(first.token, "Shared", "https://src.example/s.ts");

    const streamCtx = { params: Promise.resolve({ id: channel.id }) };
    const openFirst = await streamRoute(
      authedGet(`/api/stream/${channel.id}`, first.token) as NextRequest,
      streamCtx
    );
    const openSecond = await streamRoute(
      authedGet(`/api/stream/${channel.id}`, second.token) as NextRequest,
      { params: Promise.resolve({ id: channel.id }) }
    );

    expect(openFirst.status).toBe(200);
    expect(openSecond.status).toBe(200);
    const bodyFirst = await openFirst.json();
    expect(bodyFirst.url).toBe("https://src.example/s.ts");

    const connRes = await connectionsRoute(
      authedGet("/api/connections", first.token)
    );
    const { connections } = await connRes.json();
    expect(connections).toHaveLength(2);
  });

  it("returns 404 for a channel the user does not own", async () => {
    const tokenA = await newUserToken();
    const tokenB = await newUserToken();
    const channel = await addChannel(tokenA, "A only", "https://src.example/a.ts");

    const res = await streamRoute(
      authedGet(`/api/stream/${channel.id}`, tokenB) as NextRequest,
      { params: Promise.resolve({ id: channel.id }) }
    );
    expect(res.status).toBe(404);
  });
});

describe("SIMULTANEOUS_LOGIN_DETECTION_ENABLED=true (opt-in enforcement)", () => {
  it("closes other connections when a new stream opens", async () => {
    const email = uniqueEmail();
    const reg = await registerRoute(
      jsonPost("/api/auth/register", { email, password: PASSWORD })
    );
    expect(reg.status).toBe(201);

    const first = await login(email);
    const second = await login(email);
    const channel = await addChannel(first.token, "Shared", "https://src.example/s.ts");

    await streamRoute(
      authedGet(`/api/stream/${channel.id}`, first.token) as NextRequest,
      { params: Promise.resolve({ id: channel.id }) }
    );

    process.env.SIMULTANEOUS_LOGIN_DETECTION_ENABLED = "true";
    await streamRoute(
      authedGet(`/api/stream/${channel.id}`, second.token) as NextRequest,
      { params: Promise.resolve({ id: channel.id }) }
    );

    const connRes = await connectionsRoute(
      authedGet("/api/connections", second.token)
    );
    const { connections } = await connRes.json();
    expect(connections).toHaveLength(1);
  });
});
