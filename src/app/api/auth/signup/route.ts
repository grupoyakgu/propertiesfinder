import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { supabase } from "@/lib/supabase";
import { hashPassword, setSessionCookie } from "@/lib/auth";

const signupSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(200),
});

const INITIAL_ADMIN_EMAIL = "koby.ram1@gmail.com";

function generateId(): string {
  return randomBytes(12).toString("hex");
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { name, email, password } = parsed.data;

  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("email", email)
    .single();

  if (existing) {
    return NextResponse.json({ error: "An account with that email already exists" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const userId = generateId();

  const { data: user, error } = await supabase
    .from("users")
    .insert({
      id: userId,
      name,
      email,
      password_hash: passwordHash,
      is_admin: email === INITIAL_ADMIN_EMAIL,
    })
    .select("id, name, email")
    .single();

  if (error || !user) {
    return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
  }

  await setSessionCookie(user.id);

  return NextResponse.json({ user }, { status: 201 });
}
