import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function getResetTokenExpiry(): Date {
  // Token expires in 1 hour
  return new Date(Date.now() + 60 * 60 * 1000);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const { email } = parsed.data;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      // Return success even if user doesn't exist (security best practice)
      return NextResponse.json({ success: true });
    }

    // Delete any existing reset tokens for this user
    await prisma.passwordReset.deleteMany({ where: { userId: user.id } });

    // Generate new reset token
    const token = generateResetToken();
    const expiresAt = getResetTokenExpiry();

    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    // TODO: Send email with reset link
    // const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
    // await sendPasswordResetEmail(user.email, resetLink, user.name);

    console.log(`Password reset requested for ${email}. Token: ${token}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Password reset request failed:", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
