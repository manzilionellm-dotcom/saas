import { readJsonBody } from "@/lib/auth";
import { createUser, validateCredentialsInput } from "@/lib/users";

export async function POST(request: Request) {
  const body = await readJsonBody(request);
  if (!body) {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { email, password } = body;
  const validationError = validateCredentialsInput(email, password);
  if (validationError) {
    return Response.json({ error: validationError }, { status: 400 });
  }

  const user = createUser(email as string, password as string);
  if (!user) {
    return Response.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  return Response.json(
    { user: { id: user.id, email: user.email } },
    { status: 201 }
  );
}
