import { create } from "zustand";
import { persist } from "zustand/middleware";
import { StoreKey } from "../constant";
import { PlatformConfig, aigpt_api } from "../client/platforms/aigpt";

export interface PlatformStore {
  lastVersion: String;
  platformConfig: PlatformConfig;

  updatePlatformConfig: (force?: boolean) => Promise<void>;
}

export const usePlatformStore = create<PlatformStore>()(
  persist(
    (set, get) => ({
      lastVersion: "" as String,
      platformConfig: {} as PlatformConfig,

      async updatePlatformConfig(force = false) {
        try {
          const platform = process.env.NEXT_PUBLIC_PLATFORM || "aigpt";
          const platformConfig = await aigpt_api.platform_config(platform);
          const isSameVersion = get().lastVersion == platformConfig.version;
          if (isSameVersion && !force) return;
          if (platformConfig) {
            set(() => ({
              lastVersion: platformConfig.version,
              platformConfig: platformConfig,
            }));
          }
        } catch (e) {
          console.error((e as Error).message);
        }
      },
    }),
    {
      name: StoreKey.Platform,
      version: 1,
    },
  ),
);
