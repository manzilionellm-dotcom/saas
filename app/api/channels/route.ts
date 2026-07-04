import { getSessionFromRequest, readJsonBody, unauthorized } from "@/lib/auth";
import { addChannel, listChannels, validateChannelInput } from "@/lib/channels";

export async function GET(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return unauthorized();
  }
  return Response.json(
    { channels: listChannels(session.userId) },
    { status: 200 }
  );
}

export async function POST(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return unauthorized();
  }

  const body = await readJsonBody(request);
  if (!body) {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const validationError = validateChannelInput(body);
  if (validationError) {
    return Response.json({ error: validationError }, { status: 400 });
  }

  const channel = addChannel(session.userId, {
    name: body.name as string,
    url: body.url as string,
    group: (body.group as string | undefined) ?? null,
    logo: (body.logo as string | undefined) ?? null,
  });

  return Response.json({ channel }, { status: 201 });
}
