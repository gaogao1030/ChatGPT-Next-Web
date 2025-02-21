"use client";

require("../polyfill");

import { useNavigate } from "react-router-dom";
import Locale from "../locales";
import { Path } from "../constant";

import { List, ListItem } from "../components/ui-lib";

import { IconButton } from "../components/button";
import LeftIcon from "../icons/left.svg";
import styles from "./balance.module.scss";

import LoadingIcon from "../icons/three-dots.svg";
import ReloadIcon from "../icons/reload.svg";
import { useState, useEffect } from "react";
import { useBalanceStore, BalanceStore, usePlatformStore } from "../store";

function PayForUsage(props: { store: BalanceStore }) {
  const { code, plan, usage } = props.store;
  return (
    <List>
      <ListItem title={Locale.Balance.PlanDesc}>
        <div className={styles["text"]}>{plan?.description ?? "[?]"}</div>
      </ListItem>
      <ListItem title={Locale.Balance.PlanType}>
        <div>{Locale.Balance.PayForToken}</div>
      </ListItem>
      <ListItem title={Locale.Balance.SupportModels}>
        <div>{plan?.list_type_for_model ?? "[?]"}</div>
      </ListItem>
      <ListItem title={Locale.Balance.UsageQuota}>
        <div>
          ${usage?.total_cost ?? "[?]"}/${plan?.quota_for_money ?? "[?]"}
        </div>
      </ListItem>
      <ListItem title={Locale.Balance.CodeStatus}>
        <div>{code?.state ?? "[?]"}</div>
      </ListItem>
      <ListItem title={Locale.Balance.CodeActivateAt}>
        <div>{code?.actived_at ?? "[?]"}</div>
      </ListItem>
    </List>
  );
}

function MonthlyForUsage(props: { store: BalanceStore }) {
  const { code, plan, usage } = props.store;
  return (
    <List>
      <ListItem title={Locale.Balance.PlanDesc}>
        <div className={styles["text"]}>{plan?.description ?? "[?]"}</div>
      </ListItem>
      <ListItem title={Locale.Balance.PlanType}>
        <div>{Locale.Balance.PayForMonthly}</div>
      </ListItem>
      <ListItem title={Locale.Balance.SupportModels}>
        <div>{plan?.list_type_for_model ?? "[?]"}</div>
      </ListItem>
      <ListItem title={Locale.Balance.UsageCount}>
        <div>
          {Locale.Balance.Item(usage?.total_count ?? "[?]")}/
          {Locale.Balance.Item(plan?.quota_for_count ?? "[?]")}
        </div>
      </ListItem>
      <ListItem title={Locale.Balance.CodeStatus}>
        <div>{code?.state ?? "[?]"}</div>
      </ListItem>
      <ListItem title={Locale.Balance.CodeActivateAt}>
        <div>{code?.actived_at ?? "[?]"}</div>
      </ListItem>
      <ListItem title={Locale.Balance.CodeExpiredAt}>
        <div>{code?.expired_at ?? "[?]"}</div>
      </ListItem>
    </List>
  );
}

export function BalancePage() {
  const navigate = useNavigate();
  const balanceStore = useBalanceStore();
  const platformStore = usePlatformStore();
  const [loadingUsage, setLoadingUsage] = useState(false);

  const { code, plan } = balanceStore;
  const { recharge_link, usage_help_link } = platformStore.platformConfig;

  let Usage = PayForUsage;

  const utm_source = code?.utm_source ?? "";
  const isCanBuy = utm_source == "00000";

  if (plan?.plan_type == "monthly") {
    Usage = MonthlyForUsage;
  }

  function checkUsage(force = false) {
    setLoadingUsage(true);
    balanceStore.updateUsage(force).then(() => {
      setTimeout(() => {
        setLoadingUsage(false);
      }, 100);
    });
  }

  useEffect(() => {
    checkUsage(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles["balance"]}>
      <div className={styles["balance-header"]}>
        <IconButton
          icon={<LeftIcon />}
          text={Locale.NewChat.Return}
          onClick={() => navigate(Path.Home)}
        ></IconButton>
      </div>
      <div className={styles["title"]}>{Locale.Balance.Title}</div>
      <IconButton
        className={styles["reset-btn"]}
        icon={loadingUsage ? <LoadingIcon /> : <ReloadIcon />}
        disabled={loadingUsage ? true : false}
        text={Locale.Settings.Usage.Check}
        onClick={() => checkUsage(true)}
      />
      <div className={styles["usage"]}>
        <Usage store={balanceStore} />
      </div>

      <div className={styles["btn-group"]}>
        {isCanBuy ? (
          <IconButton
            className={styles["renew-btn"]}
            onClick={() => {
              window.open(recharge_link, "_blank");
            }}
            text={Locale.Balance.Buy}
            bordered
          />
        ) : null}
        <IconButton
          className={styles["usage-help-link-btn"]}
          onClick={() => {
            window.open(
              process.env.NEXT_PUBLIC_HELP_LINK || usage_help_link,
              "_blank",
            );
          }}
          text={Locale.Balance.UsageHelp}
          bordered
        />
      </div>
    </div>
  );
}
