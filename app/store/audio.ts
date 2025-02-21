import { StoreKey } from "../constant";
import { createPersistStore } from "../utils/store";
import { aigpt_api } from "../client/platforms/aigpt";

import md5 from "spark-md5";

export interface BlobAudioUrl {
  hash_name: string;
  url: string;
}

export const useAudioStore = createPersistStore(
  {
    blobAudioUrls: [] as BlobAudioUrl[],
  },
  (set, get) => ({
    async read(text: string, signal: AbortSignal) {
      const hash_name = md5.hash(text);

      let blobAudioUrls = get().blobAudioUrls;

      const blobAudioUrl = blobAudioUrls.find((blobAudioUrl) => {
        return blobAudioUrl.hash_name == hash_name;
      });
      if (blobAudioUrl) {
        return new Audio(blobAudioUrl.url);
        // return blobAudioUrl.url;
      } else {
        try {
          const res = await aigpt_api.text2speech(text, signal);
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);

          blobAudioUrls.push({ hash_name, url });

          set({ blobAudioUrls });
          return new Audio(url);
        } catch (err) {
          alert(err);
          return new Audio();
        }
      }
    },

    delete(text: string) {
      const blobAudioUrls = get().blobAudioUrls;
      const hash_name = md5.hash(text);
      const _blobAudioUrls = blobAudioUrls.filter((blobAudioUrl) => {
        return blobAudioUrl.hash_name !== hash_name;
      });
      set(() => ({ blobAudioUrls: _blobAudioUrls }));
    },

    reset() {
      set(() => ({ blobAudioUrls: [] }));
    },
  }),
  {
    name: StoreKey.Audio,
    version: 1,
  },
);
