import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { randomBytes } from "crypto";
import { supabase } from "@/lib/supabase";

const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function getResetTokenExpiry(): string {
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  return expiresAt.toISOString();
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const { email } = parsed.data;

  try {
    const { data: user } = await supabase
      .from("users")
      .select("id, is_active")
      .eq("email", email)
      .single();

    if (!user || !user.is_active) {
      return NextResponse.json({ success: true });
    }

    // Delete any existing reset tokens for this user
    await supabase
      .from("password_resets")
      .delete()
      .eq("user_id", user.id);

    // Generate new reset token
    const token = generateResetToken();
    const expiresAt = getResetTokenExpiry();
    const tokenId = randomBytes(12).toString("hex");

    await supabase
      .from("password_resets")
      .insert({
        id: tokenId,
        user_id: user.id,
        token,
        expires_at: expiresAt,
      });

    console.log(`Password reset requested for ${email}. Token: ${token}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Password reset request failed:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
