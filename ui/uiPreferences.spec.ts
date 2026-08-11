import { describe, expect, it } from "vitest";
import {
  LEGACY_LOCALE_COOKIE_NAME,
  SHARED_LOCALE_COOKIE_NAME,
  createThemeBootstrapScript,
  readCookie,
  resolveUiPreferences,
  serializeLocalePreferenceCookies,
  serializeUiPreferenceCookie,
} from "./uiPreferences";

describe("readCookie", () => {
  it("matches an exact cookie name and decodes its value", () => {
    const header =
      "locale_backup=ignored; locale=en; kandora_locale_v1=fr%20CA";

    expect(readCookie(header, LEGACY_LOCALE_COOKIE_NAME)).toBe("en");
    expect(readCookie(header, SHARED_LOCALE_COOKIE_NAME)).toBe("fr CA");
  });

  it("returns null for missing or malformed values", () => {
    expect(readCookie("locale=en", "theme")).toBe(null);
    expect(readCookie("locale=%E0%A4%A", "locale")).toBe(null);
  });
});

describe("resolveUiPreferences", () => {
  it("prefers valid shared cookies when sharing is enabled", () => {
    const result = resolveUiPreferences(
      "locale=fr; theme=dark; kandora_locale_v1=en; kandora_theme_v1=light",
      true
    );

    expect(result).toEqual({
      locale: "en",
      theme: "light",
      hasSharedLocale: true,
      hasSharedTheme: true,
    });
  });

  it("falls back to legacy cookies during migration", () => {
    const result = resolveUiPreferences("locale=en; theme=light", true);

    expect(result).toEqual({
      locale: "en",
      theme: "light",
      hasSharedLocale: false,
      hasSharedTheme: false,
    });
  });

  it("ignores retained shared cookies when sharing is disabled", () => {
    const result = resolveUiPreferences(
      "locale=fr; theme=dark; kandora_locale_v1=en; kandora_theme_v1=light",
      false
    );

    expect(result).toEqual({
      locale: "fr",
      theme: "dark",
      hasSharedLocale: false,
      hasSharedTheme: false,
    });
  });

  it("uses application defaults for unsupported values", () => {
    expect(
      resolveUiPreferences(
        "locale=de; theme=sepia; kandora_locale_v1=es; kandora_theme_v1=blue",
        true
      )
    ).toEqual({
      locale: "fr",
      theme: "dark",
      hasSharedLocale: false,
      hasSharedTheme: false,
    });
  });
});

describe("serializeUiPreferenceCookie", () => {
  it("serializes a host-only cookie by default", () => {
    expect(serializeUiPreferenceCookie("locale", "fr CA")).toBe(
      "locale=fr%20CA; Path=/; Max-Age=31536000; SameSite=Lax"
    );
  });

  it("adds the configured parent domain and Secure attribute", () => {
    expect(
      serializeUiPreferenceCookie("kandora_locale_v1", "en", {
        domain: " .tnt-sessions.com ",
        secure: true,
      })
    ).toBe(
      "kandora_locale_v1=en; Path=/; Max-Age=31536000; SameSite=Lax; Domain=.tnt-sessions.com; Secure"
    );
  });
});

describe("serializeLocalePreferenceCookies", () => {
  it("returns only the legacy cookie without a shared domain", () => {
    expect(serializeLocalePreferenceCookies("fr")).toEqual([
      "locale=fr; Path=/; Max-Age=31536000; SameSite=Lax",
    ]);
  });

  it("returns distinct legacy and parent-domain cookies", () => {
    expect(
      serializeLocalePreferenceCookies("en", {
        domain: ".tnt-sessions.com",
        secure: true,
      })
    ).toEqual([
      "locale=en; Path=/; Max-Age=31536000; SameSite=Lax; Secure",
      "kandora_locale_v1=en; Path=/; Max-Age=31536000; SameSite=Lax; Domain=.tnt-sessions.com; Secure",
    ]);
  });
});

describe("createThemeBootstrapScript", () => {
  it("checks the shared theme before the legacy theme when enabled", () => {
    expect(createThemeBootstrapScript(true)).toContain(
      '["kandora_theme_v1","theme"]'
    );
  });

  it("ignores retained shared cookies when sharing is disabled", () => {
    const script = createThemeBootstrapScript(false);

    expect(script).toContain('["theme"]');
    expect(script).not.toContain("kandora_theme_v1");
  });
});