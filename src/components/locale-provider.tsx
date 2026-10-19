"use client";

import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import {
  defaultLocale,
  getLocale,
  setLocale,
  subscribeLocale,
  type Locale,
} from "@/i18n";

const LOCALE_KEY = "locale";
const LOCALES: Locale[] = ["fr", "ar"];

function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as string[]).includes(value);
}

function getServerLocale(): Locale {
  return defaultLocale;
}

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue>({
  locale: defaultLocale,
  setLocale: () => {},
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore(subscribeLocale, getLocale, getServerLocale);

  // Adopt the stored preference once, on mount (client-only).
  useEffect(() => {
    const stored = window.localStorage.getItem(LOCALE_KEY);
    if (isLocale(stored) && stored !== getLocale()) setLocale(stored);
  }, []);

  // Reflect the active locale on <html> only — never persist here, otherwise
  // the default (fr) render would overwrite the stored preference on mount.
  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  // Persist only when the user explicitly switches.
  const change = useCallback((next: Locale) => {
    window.localStorage.setItem(LOCALE_KEY, next);
    setLocale(next);
  }, []);

  const value = useMemo(() => ({ locale, setLocale: change }), [locale, change]);

  return (
    <LocaleContext.Provider value={value}>
      <Fragment key={locale}>{children}</Fragment>
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
