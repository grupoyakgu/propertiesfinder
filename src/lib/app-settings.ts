import { prisma } from "@/lib/prisma";

const SINGLETON_ID = "singleton";

// The AppSettings row is created lazily on first read rather than via a seed
// script, so a fresh database (or one predating this feature) still works
// without a migration data-fix.
export async function getAppSettings() {
  return prisma.appSettings.upsert({
    where: { id: SINGLETON_ID },
    update: {},
    create: { id: SINGLETON_ID },
  });
}

export async function setMaxAnalysisPlots(maxAnalysisPlots: number) {
  return prisma.appSettings.upsert({
    where: { id: SINGLETON_ID },
    update: { maxAnalysisPlots },
    create: { id: SINGLETON_ID, maxAnalysisPlots },
  });
}

// `customPrompt` null clears the override (falls back to the built-in
// prompt) — see AppSettings.customPrompt's schema comment.
export async function setCustomPrompt(customPrompt: string | null) {
  return prisma.appSettings.upsert({
    where: { id: SINGLETON_ID },
    update: { customPrompt },
    create: { id: SINGLETON_ID, customPrompt },
  });
}
