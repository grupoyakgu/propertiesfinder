import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
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
    // Find the password reset token
    const resetToken = await prisma.passwordReset.findUnique({ where: { token } });

    if (!resetToken) {
      return NextResponse.json({ error: "Invalid or expired reset link" }, { status: 400 });
    }

    // Check if token has expired
    if (new Date() > resetToken.expiresAt) {
      await prisma.passwordReset.delete({ where: { id: resetToken.id } });
      return NextResponse.json({ error: "Reset link has expired" }, { status: 400 });
    }

    // Get the user
    const user = await prisma.user.findUnique({ where: { id: resetToken.userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update password
    const passwordHash = await hashPassword(password);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Delete the reset token
    await prisma.passwordReset.delete({ where: { id: resetToken.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Password reset failed:", error);
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}
