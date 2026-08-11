import React, { createContext, useContext, useEffect, useState } from "react";
import { ConfigProvider, theme } from "antd";
import enGB from "antd/es/locale/en_GB";
import frFR from "antd/es/locale/fr_FR";
import dayjs from "dayjs";
import "dayjs/locale/en-gb";
import "dayjs/locale/fr";
import { useLocale } from "./LocaleContext";
import {
  LEGACY_THEME_COOKIE_NAME,
  SHARED_THEME_COOKIE_NAME,
  asUiTheme,
  serializeUiPreferenceCookie,
  type UiTheme,
} from "./uiPreferences";

export type ThemeMode = UiTheme;

export interface CustomTokens {
  logoPathLight: string;
  logoPathDark: string;
  logoPathMobileLight: string;
  logoPathMobileDark: string;
  siderBg: string;
  siderLogoHeight: number;
  siderLogoMaxWidth: number;
  siderCollapsedText: string;
  headerHeight: number;
  headerLogoHeight: number;
  headerLogoMaxWidth: number;
  headerBorderColor: string;
  buttonTextColor: string;
}

export interface ThemeContextValue {
  themeMode: ThemeMode;
  toggleTheme: () => void;
  isDark: boolean;
  customTokens: CustomTokens;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function useAppTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used within a ThemeProvider");
  }
  return context;
}

export interface ThemeProviderProps {
  children: React.ReactNode;
  initialTheme?: ThemeMode;
  sharedCookieDomain?: string | null;
  hasSharedTheme?: boolean;
}

function writeThemeCookies(
  themeMode: ThemeMode,
  sharedCookieDomain?: string | null
) {
  const secure = window.location.protocol === "https:";
  document.cookie = serializeUiPreferenceCookie(
    LEGACY_THEME_COOKIE_NAME,
    themeMode,
    { secure }
  );

  if (sharedCookieDomain) {
    document.cookie = serializeUiPreferenceCookie(
      SHARED_THEME_COOKIE_NAME,
      themeMode,
      { domain: sharedCookieDomain, secure }
    );
  }
}

const antdLocales: Record<string, typeof enGB> = {
  en: enGB,
  fr: frFR,
};

const dayjsLocales: Record<string, string> = {
  en: "en-gb",
  fr: "fr",
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  initialTheme = "dark",
  sharedCookieDomain,
  hasSharedTheme = false,
}) => {
  const { locale } = useLocale();
  dayjs.locale(dayjsLocales[locale] ?? "fr");
  const [themeMode, setThemeMode] = useState<ThemeMode>(initialTheme);
  const isDark = themeMode === "dark";

  useEffect(() => {
    const savedTheme = asUiTheme(
      localStorage.getItem(LEGACY_THEME_COOKIE_NAME)
    );

    if (!sharedCookieDomain) {
      if (savedTheme && savedTheme !== themeMode) {
        setThemeMode(savedTheme);
        writeThemeCookies(savedTheme);
      }
      return;
    }

    const resolvedTheme = hasSharedTheme
      ? themeMode
      : savedTheme ?? themeMode;
    if (resolvedTheme !== themeMode) {
      setThemeMode(resolvedTheme);
    }
    localStorage.setItem(LEGACY_THEME_COOKIE_NAME, resolvedTheme);
    writeThemeCookies(resolvedTheme, sharedCookieDomain);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTheme = () => {
    const newTheme = themeMode === "light" ? "dark" : "light";
    setThemeMode(newTheme);
    localStorage.setItem(LEGACY_THEME_COOKIE_NAME, newTheme);
    writeThemeCookies(newTheme, sharedCookieDomain);
  };

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  const base = import.meta.env.BASE_URL;
  const customTokens: CustomTokens = {
    logoPathLight: `${base}banner/TNT_logo-horizontal-BLACK.png`,
    logoPathDark: `${base}banner/TNT_logo-horizontal-WHITE.png`,
    logoPathMobileLight: `${base}banner/TNT_logo-BLACK.png`,
    logoPathMobileDark: `${base}banner/TNT_logo-WHITE.png`,
    siderBg: isDark ? "#001529" : "#f6f6f6",
    siderLogoHeight: 32,
    siderLogoMaxWidth: 140,
    siderCollapsedText: isDark ? "#ffffff" : "#001529",
    headerHeight: 100,
    headerLogoHeight: 80,
    headerLogoMaxWidth: 280,
    headerBorderColor: isDark ? "#303030" : "#f0f0f0",
    buttonTextColor: isDark ? "#ffffff" : "#000000",
  };

  return (
    <ThemeContext.Provider
      value={{ themeMode, toggleTheme, isDark, customTokens }}
    >
      <ConfigProvider
        locale={antdLocales[locale] ?? frFR}
        theme={{
          algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: {
            colorPrimary: "#1890ff",
            borderRadius: 8,
            colorBgContainer: isDark ? "#141414" : "#ffffff",
            colorBgElevated: isDark ? "#1f1f1f" : "#ffffff",
            colorBgLayout: isDark ? "#000000" : "#f0f2f5",
          },
          components: {
            Layout: {
              siderBg: customTokens.siderBg,
              triggerBg: "#002140",
              headerBg: isDark ? "#141414" : "#ffffff",
            },
            Menu: {
              darkItemBg: "#001529",
              darkItemSelectedBg: "#1890ff",
              darkItemHoverBg: "#112545",
            },
          },
        }}
      >
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
};