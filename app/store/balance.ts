import { create } from "zustand";
import { persist } from "zustand/middleware";
import { StoreKey } from "../constant";
import {
  aigpt_api,
  CodeTotalUsage,
  Plan,
  Code,
} from "../client/platforms/aigpt";
import { formatDate } from "../utils/format";
import Locale from "../locales";

export interface BalanceStore {
  lastUpdateUsage: number;
  code?: Code;
  usage?: CodeTotalUsage;
  plan?: Plan;

  updateUsage: (force?: boolean, update_callback?: Function) => Promise<void>;
}

const ONE_MINUTE = 60 * 1000;

export const useBalanceStore = create<BalanceStore>()(
  persist(
    (set, get) => ({
      lastUpdateUsage: 0,
      code: undefined,
      usage: undefined,
      plan: undefined,

      async updateUsage(force = false) {
        const overOneMinute = Date.now() - get().lastUpdateUsage >= ONE_MINUTE;
        if (!overOneMinute && !force) return;

        set(() => ({
          lastUpdateUsage: Date.now(),
        }));
        try {
          const data = await aigpt_api.total_usage();
          if (data) {
            const { plan, code, code_usage } = data;
            const codeStateAlias: any = {
              active: `${Locale.Balance.CodeActive}`,
              inactive: `${Locale.Balance.CodeInactive}`,
              deactive: `${Locale.Balance.CodeDeative}`,
            };
            code.state = codeStateAlias[code.state];
            code.actived_at = formatDate(code.actived_at);
            code.expired_at = formatDate(code.expired_at);
            code.deactived_at = formatDate(code.deactived_at);
            set(() => ({
              plan: plan,
              code: code,
              usage: code_usage,
            }));
          }
        } catch (e) {
          set(() => ({
            plan: undefined,
            code: undefined,
            usage: undefined,
          }));
          console.error((e as Error).message);
        }
      },
    }),
    {
      name: StoreKey.Balance,
      version: 1,
    },
  ),
);
