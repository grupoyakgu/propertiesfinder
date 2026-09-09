import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";
import { SESSION_COOKIE } from "@/lib/session-cookie";

export { SESSION_COOKIE };
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const userId = await verifySessionToken(token);
  if (!userId) return null;

  const { data: user, error } = await supabase
    .from("users")
    .select("id, name, email, created_at, is_admin, is_active, permissions, map_locked, show_all_on_map")
    .eq("id", userId)
    .single();

  if (error || !user) return null;

  // A disabled user is treated as logged out everywhere this is called — every
  // route/page already gates on `if (!user) ...`, so this alone is enough to
  // deny them without a separate revocation check at each call site. We can't
  // also clear their session cookie here since this runs from Server Component
  // render paths too, where Next.js forbids writing cookies; they'll simply
  // fail auth on every subsequent request and can't log back in (see the login
  // route's isActive check) until re-enabled.
  if (!user.is_active) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.created_at,
    isAdmin: user.is_admin,
    isActive: user.is_active,
    permissions: user.permissions,
    mapLocked: user.map_locked,
    showAllOnMap: user.show_all_on_map,
  };
}

export async function setSessionCookie(userId: string) {
  const token = await createSessionToken(userId);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
