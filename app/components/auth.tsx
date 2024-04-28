import styles from "./auth.module.scss";
import { IconButton } from "./button";

import { getDefaultModel } from "../aigpt_utils";
import { aigpt_api } from "../client/platforms/aigpt";

import { useNavigate } from "react-router-dom";
import { Path } from "../constant";
import {
  useAccessStore,
  useChatStore,
  useAppConfig,
  ModalConfigValidator,
} from "../store";
import Locale from "../locales";

import BotIcon from "../icons/bot.svg";
import { useEffect } from "react";
import { getClientConfig } from "../config/client";

export function AuthPage() {
  const navigate = useNavigate();
  const accessStore = useAccessStore();
  const chatStore = useChatStore();
  const config = useAppConfig();

  const goHome = async () => {
    const models = await aigpt_api.models();
    const default_model = getDefaultModel(models);
    chatStore.updateCurrentSession((session) => (session.dataset = undefined));
    config.modelConfig.model = ModalConfigValidator.model(default_model);
    config.mergeModels(models);
    navigate(Path.Home);
  };
  const goChat = async () => {
    const models = await aigpt_api.models();
    const default_model = getDefaultModel(models);
    chatStore.updateCurrentSession((session) => (session.dataset = undefined));
    config.modelConfig.model = ModalConfigValidator.model(default_model);
    config.mergeModels(models);
    navigate(Path.Chat);
  };
  const resetAccessCode = async () => {
    accessStore.update((access) => {
      access.openaiApiKey = "";
      access.accessCode = "";
    });
  }; // Reset access code to empty string

  useEffect(() => {
    if (getClientConfig()?.isApp) {
      navigate(Path.Settings);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles["auth-page"]}>
      <div className={`no-dark ${styles["auth-logo"]}`}>
        <BotIcon />
      </div>

      <div className={styles["auth-title"]}>{Locale.Auth.Title}</div>
      <div className={styles["auth-tips"]}>{Locale.Auth.Tips}</div>

      <input
        className={styles["auth-input"]}
        type="password"
        placeholder={Locale.Auth.Input}
        value={accessStore.accessCode}
        onChange={(e) => {
          accessStore.update(async (access) => {
            access.accessCode = e.currentTarget.value;
          });
        }}
      />
      {!accessStore.hideUserApiKey ? (
        <>
          <div className={styles["auth-tips"]}>{Locale.Auth.SubTips}</div>
          <input
            className={styles["auth-input"]}
            type="password"
            placeholder={Locale.Settings.Access.OpenAI.ApiKey.Placeholder}
            value={accessStore.openaiApiKey}
            onChange={(e) => {
              accessStore.update(
                (access) => (access.openaiApiKey = e.currentTarget.value),
              );
            }}
          />
          <input
            className={styles["auth-input"]}
            type="password"
            placeholder={Locale.Settings.Access.Google.ApiKey.Placeholder}
            value={accessStore.googleApiKey}
            onChange={(e) => {
              accessStore.update(
                (access) => (access.googleApiKey = e.currentTarget.value),
              );
            }}
          />
        </>
      ) : null}

      <div className={styles["auth-actions"]}>
        <IconButton
          text={Locale.Auth.Confirm}
          type="primary"
          onClick={goChat}
        />
        <IconButton
          text={Locale.Auth.Later}
          onClick={() => {
            resetAccessCode();
            goHome();
          }}
        />
      </div>
    </div>
  );
}
