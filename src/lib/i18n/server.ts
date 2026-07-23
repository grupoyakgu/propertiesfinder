import { cookies } from "next/headers";
import { isLocale, translate, LOCALE_COOKIE, type Locale } from "@/lib/i18n/translations";

export async function getServerLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : "en";
}

export async function getServerTranslator() {
  const locale = await getServerLocale();
  return {
    locale,
    t: (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars),
  };
}
