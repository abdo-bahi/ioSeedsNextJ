import {
  messages,
  defaultLocale,
  type Locale,
} from "./messages.generated";

// ── Types ─────────────────────────────────────────────────────────
type Primitive = string | number | boolean | null | undefined;

type Messages = (typeof messages)[Locale];

type DeepKeys<T> = T extends object
  ? {
      [K in keyof T]-?: K extends string
        ? T[K] extends string
          ? K
          : K | `${K}.${DeepKeys<T[K]>}`
        : never;
    }[keyof T]
  : never;

export type { Locale };
export type I18nKey = DeepKeys<Messages>;

export type I18nParams = Record<string, Primitive>;

// ── Current locale (single-locale default; setLocale for switching) ──
let currentLocale: Locale = defaultLocale;

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

// ── Core translator ───────────────────────────────────────────────
export function translate(locale: Locale, key: string, params?: I18nParams): string {
  const node = key.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[part];
    return undefined;
  }, messages[locale]);

  const template =
    typeof node === "string" ? node : key in (messages[defaultLocale] as object)
      ? translate(defaultLocale, key, params)
      : key;

  return interpolate(template, params);
}

export function t(key: I18nKey, params?: I18nParams): string {
  return translate(currentLocale, key, params);
}

export function createTranslator(locale: Locale) {
  return (key: I18nKey, params?: I18nParams) => translate(locale, key, params);
}

function interpolate(template: string, params?: I18nParams): string {
  if (!params) return template;
  return template.replace(
    /\{\{(\w+)\}\}/g,
    (_, name: string) =>
      params[name] === undefined || params[name] === null
        ? `{{${name}}}`
        : String(params[name])
  );
}

// ── Relative-time helpers (built on common.ago) ───────────────────
export function formatRelative(
  date: Date | string | null | undefined,
  fallback = "—"
): string {
  if (!date) return fallback;
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return t("common.ago.seconds", { n: diff });
  if (diff < 3600) return t("common.ago.minutes", { n: Math.floor(diff / 60) });
  if (diff < 86400) return t("common.ago.hours", { n: Math.floor(diff / 3600) });
  return t("common.ago.days", { n: Math.floor(diff / 86400) });
}