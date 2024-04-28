"use client";

require("../polyfill");

import { useState, useEffect } from "react";

import styles from "./home.module.scss";

import BotIcon from "../icons/bot.svg";
import LoadingIcon from "../icons/three-dots.svg";

import { getCSSVar, useMobileScreen } from "../utils";

import dynamic from "next/dynamic";
import { Path, SlotID } from "../constant";
import { ErrorBoundary } from "./error";

import { getISOLang, getLang } from "../locales";

import {
  HashRouter as Router,
  Routes,
  Route,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import { SideBar } from "./sidebar";
import { useAppConfig } from "../store/config";
import { AuthPage } from "./auth";
import { getClientConfig } from "../config/client";
import { aigpt_api } from "../client/platforms/aigpt";
import { getDefaultModel } from "../aigpt_utils";
import {
  useAccessStore,
  useChatStore,
  usePlatformStore,
  ModalConfigValidator,
} from "../store";

import { useMaskStore } from "../store/mask";

export function Loading(props: { noLogo?: boolean }) {
  return (
    <div className={styles["loading-content"] + " no-dark"}>
      {!props.noLogo && <BotIcon />}
      <LoadingIcon />
    </div>
  );
}

const Artifacts = dynamic(async () => (await import("./artifacts")).Artifacts, {
  loading: () => <Loading noLogo />,
});

const AIGPT_Settings = dynamic(
  async () => (await import("../aigpt_components/settings")).Settings,
  {
    loading: () => <Loading noLogo />,
  },
);

const Chat = dynamic(async () => (await import("./chat")).Chat, {
  loading: () => <Loading noLogo />,
});

const NewChat = dynamic(async () => (await import("./new-chat")).NewChat, {
  loading: () => <Loading noLogo />,
});

const MaskPage = dynamic(async () => (await import("./mask")).MaskPage, {
  loading: () => <Loading noLogo />,
});

const PluginPage = dynamic(async () => (await import("./plugin")).PluginPage, {
  loading: () => <Loading noLogo />,
});

const SearchChat = dynamic(
  async () => (await import("./search-chat")).SearchChatPage,
  {
    loading: () => <Loading noLogo />,
  },
);

const Sd = dynamic(async () => (await import("./sd")).Sd, {
  loading: () => <Loading noLogo />,
});
const DatasetPage = dynamic(
  async () => (await import("../aigpt_components/dataset")).DatasetPage,
  {
    loading: () => <Loading noLogo />,
  },
);

const BalancePage = dynamic(
  async () => (await import("../aigpt_components/balance")).BalancePage,
  {
    loading: () => <Loading noLogo />,
  },
);

export function useSwitchTheme() {
  const config = useAppConfig();

  useEffect(() => {
    document.body.classList.remove("light");
    document.body.classList.remove("dark");

    if (config.theme === "dark") {
      document.body.classList.add("dark");
    } else if (config.theme === "light") {
      document.body.classList.add("light");
    }

    const metaDescriptionDark = document.querySelector(
      'meta[name="theme-color"][media*="dark"]',
    );
    const metaDescriptionLight = document.querySelector(
      'meta[name="theme-color"][media*="light"]',
    );

    if (config.theme === "auto") {
      metaDescriptionDark?.setAttribute("content", "#151515");
      metaDescriptionLight?.setAttribute("content", "#fafafa");
    } else {
      const themeColor = getCSSVar("--theme-color");
      metaDescriptionDark?.setAttribute("content", themeColor);
      metaDescriptionLight?.setAttribute("content", themeColor);
    }
  }, [config.theme]);
}

function useHtmlLang() {
  useEffect(() => {
    const lang = getISOLang();
    const htmlLang = document.documentElement.lang;

    if (lang !== htmlLang) {
      document.documentElement.lang = lang;
    }
  }, []);
}

const useHasHydrated = () => {
  const [hasHydrated, setHasHydrated] = useState<boolean>(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  return hasHydrated;
};

const loadAsyncGoogleFont = () => {
  const linkEl = document.createElement("link");
  const proxyFontUrl = "/google-fonts";
  const remoteFontUrl = "https://fonts.googleapis.com";
  const googleFontUrl =
    getClientConfig()?.buildMode === "export" ? remoteFontUrl : proxyFontUrl;
  linkEl.rel = "stylesheet";
  linkEl.href =
    googleFontUrl +
    "/css2?family=" +
    encodeURIComponent("Noto Sans:wght@300;400;700;900") +
    "&display=swap";
  document.head.appendChild(linkEl);
};

export function WindowContent(props: { children: React.ReactNode }) {
  return (
    <div className={styles["window-content"]} id={SlotID.AppBody}>
      {props?.children}
    </div>
  );
}

function Screen() {
  const config = useAppConfig();
  const location = useLocation();
  const isArtifact = location.pathname.includes(Path.Artifacts);
  const isHome = location.pathname === Path.Home;
  const isAuth = location.pathname === Path.Auth;
  const isSd = location.pathname === Path.Sd;
  const isSdNew = location.pathname === Path.SdNew;

  const isMobileScreen = useMobileScreen();
  const shouldTightBorder =
    getClientConfig()?.isApp || (config.tightBorder && !isMobileScreen);
  const accessStore = useAccessStore();
  const chatStore = useChatStore();
  const [searchParams, setSearchParams] = useSearchParams();
  let Settings: any;

  Settings = AIGPT_Settings;
  useEffect(() => {
    const preHandler = async () => {
      const code = searchParams.get("code");
      const utm_source = searchParams.get("utm_source");

      if (code) {
        chatStore.updateCurrentSession((session) => {
          session.dataset = undefined;
          return session;
        });

        // accessStore.updateCode(code)
        accessStore.update((access) => {
          access.accessCode = code;
          return access;
        });

        try {
          const models = await aigpt_api.models();
          const default_model = getDefaultModel(models);
          config.modelConfig.model = ModalConfigValidator.model(default_model);
          config.mergeModels(models);
        } catch (error) {
          console.error("Error fetching models:", error);
        }
      }

      if (utm_source) {
        aigpt_api.save_utm_source(utm_source);
      }

      loadAsyncGoogleFont();

      if (code || utm_source) {
        searchParams.delete("code");
        searchParams.delete("utm_source");
        setSearchParams(searchParams);
      }
    };

    setTimeout(preHandler, 500);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  if (isArtifact) {
    return (
      <Routes>
        <Route path="/artifacts/:id" element={<Artifacts />} />
      </Routes>
    );
  }
  const renderContent = () => {
    if (isAuth) return <AuthPage />;
    if (isSd) return <Sd />;
    if (isSdNew) return <Sd />;
    return (
      <>
        <SideBar className={isHome ? styles["sidebar-show"] : ""} />
        <WindowContent>
          <Routes>
            <Route path={Path.Home} element={<Chat />} />
            <Route path={Path.NewChat} element={<NewChat />} />
            <Route path={Path.Masks} element={<MaskPage />} />
            <Route path={Path.Plugins} element={<PluginPage />} />
            <Route path={Path.SearchChat} element={<SearchChat />} />
            <Route path={Path.Chat} element={<Chat />} />
            <Route path={Path.Settings} element={<Settings />} />
            <Route path={Path.Balance} element={<BalancePage />} />
            <Route path={Path.Dataset} element={<DatasetPage />} />
          </Routes>
        </WindowContent>
      </>
    );
  };

  return (
    <div
      className={`${styles.container} ${
        shouldTightBorder ? styles["tight-container"] : styles.container
      } ${getLang() === "ar" ? styles["rtl-screen"] : ""}`}
    >
      {renderContent()}
    </div>
  );
}

export function useLoadData() {
  const config = useAppConfig();
  const platformStore = usePlatformStore();
  const maskStore = useMaskStore();

  useEffect(() => {
    (async () => {
      platformStore.updatePlatformConfig();
      const models = await aigpt_api.models();
      const default_model = getDefaultModel(models);
      config.modelConfig.model = ModalConfigValidator.model(default_model);
      config.mergeModels(models);
      const platform = process.env.NEXT_PUBLIC_PLATFORM || "aigpt";
      const _masks = await aigpt_api.get_masks(platform);
      maskStore.reset();
      _masks.forEach((m) => {
        maskStore.create(m, true);
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export function Home() {
  useSwitchTheme();
  useHtmlLang();
  useLoadData();

  useEffect(() => {
    console.log("[Config] got config from build time", getClientConfig());
    useAccessStore.getState().fetch();
  }, []);

  if (!useHasHydrated()) {
    return <Loading />;
  }

  return (
    <ErrorBoundary>
      <Router>
        <Screen />
      </Router>
    </ErrorBoundary>
  );
}
