import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import {
  LEGACY_LOCALE_COOKIE_NAME,
  SHARED_LOCALE_COOKIE_NAME,
  asUiLocale,
  serializeUiPreferenceCookie,
} from "./uiPreferences";

export type Locale = string;

export interface LocaleContextValue<T = unknown> {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: T;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

/**
 * Read the current locale + translations. Callers supply the concrete
 * translations shape via the type parameter — each app owns its own dictionary,
 * e.g. `useLocale<Translations>()` (app) or `useLocale<CoreTranslations>()`
 * (shared UI in kandora-core).
 */
export function useLocale<T = unknown>(): LocaleContextValue<T> {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context as LocaleContextValue<T>;
}

interface LocaleProviderProps {
  children: ReactNode;
  /** Locale → translations dictionary, injected by the host app. */
  dictionaries: Record<string, unknown>;
  initialLocale?: Locale;
  defaultLocale?: Locale;
  sharedCookieDomain?: string | null;
}

function writeLocaleCookies(
  locale: Locale,
  sharedCookieDomain?: string | null
) {
  const secure = window.location.protocol === "https:";
  document.cookie = serializeUiPreferenceCookie(
    LEGACY_LOCALE_COOKIE_NAME,
    locale,
    { secure }
  );

  const sharedLocale = asUiLocale(locale);
  if (sharedCookieDomain && sharedLocale) {
    document.cookie = serializeUiPreferenceCookie(
      SHARED_LOCALE_COOKIE_NAME,
      sharedLocale,
      { domain: sharedCookieDomain, secure }
    );
  }
}

export function LocaleProvider({
  children,
  dictionaries,
  initialLocale,
  defaultLocale = "fr",
  sharedCookieDomain,
}: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(
    initialLocale ?? defaultLocale
  );

  // One-time sync: cookie (initialLocale from server) is authoritative —
  // update localStorage to match so both stores stay in sync.
  useEffect(() => {
    const saved = localStorage.getItem("locale");
    if (saved !== locale) {
      localStorage.setItem("locale", locale);
      document.documentElement.lang = locale;
    }
    if (sharedCookieDomain) {
      writeLocaleCookies(locale, sharedCookieDomain);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("locale", newLocale);
    writeLocaleCookies(newLocale, sharedCookieDomain);
    document.documentElement.lang = newLocale;
  };

  const t = dictionaries[locale] ?? dictionaries[defaultLocale];

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}
