import { createToken, MEMBER_COUNT } from "@/lib/tokens";

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;

  const links = Array.from({ length: MEMBER_COUNT }, (_, i) => {
    const id = i + 1;
    return {
      id,
      name: `Membre ${id}`,
      url: `${origin}/watch/${createToken(id)}`,
    };
  });

  return Response.json({ links });
}
