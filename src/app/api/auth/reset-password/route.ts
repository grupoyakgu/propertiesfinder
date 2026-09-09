import { NextResponse } from "next/server";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { hashPassword } from "@/lib/auth";

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { token, password } = parsed.data;

  try {
    const { data: resetToken } = await supabase
      .from("password_resets")
      .select("*")
      .eq("token", token)
      .single();

    if (!resetToken) {
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
    }

    // Check if token has expired
    if (new Date() > new Date(resetToken.expires_at)) {
      await supabase
        .from("password_resets")
        .delete()
        .eq("id", resetToken.id);
      return NextResponse.json({ error: "Reset link has expired" }, { status: 400 });
    }

    // Get the user
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("id", resetToken.user_id)
      .single();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update password
    const passwordHash = await hashPassword(password);
    await supabase
      .from("users")
      .update({ password_hash: passwordHash })
      .eq("id", user.id);

    // Delete the reset token
    await supabase
      .from("password_resets")
      .delete()
      .eq("id", resetToken.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Password reset failed:", error);
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}
