import { createHmac, timingSafeEqual } from "crypto";

export const MEMBER_COUNT = 15;

const SECRET = process.env.LINK_SECRET ?? "restream-famille-secret";

function signature(id: number): string {
  return createHmac("sha256", SECRET).update(String(id)).digest("hex").slice(0, 32);
}

export function createToken(id: number): string {
  return `${id}-${signature(id)}`;
}

export function verifyToken(token: string): number | null {
  const match = /^(\d{1,2})-([0-9a-f]{32})$/.exec(token);
  if (!match) return null;

  const id = Number(match[1]);
  if (id < 1 || id > MEMBER_COUNT) return null;

  const expected = Buffer.from(signature(id));
  const received = Buffer.from(match[2]);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return null;
  }

  return id;
}
