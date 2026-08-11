export const LEGACY_LOCALE_COOKIE_NAME = "locale";
export const LEGACY_THEME_COOKIE_NAME = "theme";
export const SHARED_LOCALE_COOKIE_NAME = "kandora_locale_v1";
export const SHARED_THEME_COOKIE_NAME = "kandora_theme_v1";

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

export type UiLocale = "en" | "fr";
export type UiTheme = "light" | "dark";

export interface ResolvedUiPreferences {
  locale: UiLocale;
  theme: UiTheme;
  hasSharedLocale: boolean;
  hasSharedTheme: boolean;
}

export interface UiPreferenceCookieOptions {
  domain?: string | null;
  secure?: boolean;
}

export function readCookie(
  cookieHeader: string,
  name: string
): string | null {
  for (const part of cookieHeader.split(";")) {
    const separatorIndex = part.indexOf("=");
    if (separatorIndex < 0) {
      continue;
    }

    const cookieName = part.slice(0, separatorIndex).trim();
    if (cookieName !== name) {
      continue;
    }

    try {
      return decodeURIComponent(part.slice(separatorIndex + 1));
    } catch {
      return null;
    }
  }

  return null;
}

export function asUiLocale(value: string | null): UiLocale | null {
  return value === "en" || value === "fr" ? value : null;
}

export function asUiTheme(value: string | null): UiTheme | null {
  return value === "light" || value === "dark" ? value : null;
}

export function resolveUiPreferences(
  cookieHeader: string,
  sharedCookiesEnabled: boolean
): ResolvedUiPreferences {
  const sharedLocale = sharedCookiesEnabled
    ? asUiLocale(readCookie(cookieHeader, SHARED_LOCALE_COOKIE_NAME))
    : null;
  const sharedTheme = sharedCookiesEnabled
    ? asUiTheme(readCookie(cookieHeader, SHARED_THEME_COOKIE_NAME))
    : null;
  const legacyLocale = asUiLocale(
    readCookie(cookieHeader, LEGACY_LOCALE_COOKIE_NAME)
  );
  const legacyTheme = asUiTheme(
    readCookie(cookieHeader, LEGACY_THEME_COOKIE_NAME)
  );

  return {
    locale: sharedLocale ?? legacyLocale ?? "fr",
    theme: sharedTheme ?? legacyTheme ?? "dark",
    hasSharedLocale: sharedLocale !== null,
    hasSharedTheme: sharedTheme !== null,
  };
}

export function serializeUiPreferenceCookie(
  name: string,
  value: string,
  options: UiPreferenceCookieOptions = {}
): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    `Max-Age=${ONE_YEAR_SECONDS}`,
    "SameSite=Lax",
  ];
  const domain = options.domain?.trim();

  if (domain) {
    parts.push(`Domain=${domain}`);
  }
  if (options.secure) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

export function serializeLocalePreferenceCookies(
  locale: UiLocale,
  options: UiPreferenceCookieOptions = {}
): string[] {
  const cookies = [
    serializeUiPreferenceCookie(LEGACY_LOCALE_COOKIE_NAME, locale, {
      secure: options.secure,
    }),
  ];
  const domain = options.domain?.trim();

  if (domain) {
    cookies.push(
      serializeUiPreferenceCookie(SHARED_LOCALE_COOKIE_NAME, locale, {
        domain,
        secure: options.secure,
      })
    );
  }

  return cookies;
}

export function createThemeBootstrapScript(
  sharedCookiesEnabled: boolean
): string {
  const cookieNames = sharedCookiesEnabled
    ? [SHARED_THEME_COOKIE_NAME, LEGACY_THEME_COOKIE_NAME]
    : [LEGACY_THEME_COOKIE_NAME];

  return `
(function() {
  try {
    var cookieNames = ${JSON.stringify(cookieNames)};
    var cookies = document.cookie.split(';');
    var theme = null;
    for (var nameIndex = 0; nameIndex < cookieNames.length; nameIndex++) {
      var prefix = cookieNames[nameIndex] + '=';
      for (var cookieIndex = 0; cookieIndex < cookies.length; cookieIndex++) {
        var cookie = cookies[cookieIndex].trim();
        if (cookie.indexOf(prefix) === 0) {
          var value = decodeURIComponent(cookie.slice(prefix.length));
          if (value === 'light' || value === 'dark') {
            theme = value;
            break;
          }
        }
      }
      if (theme) break;
    }
    if (!theme) {
      var savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'light' || savedTheme === 'dark') {
        theme = savedTheme;
      }
    }
    if (theme !== 'light') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  } catch(e) {}
})()
`;
}