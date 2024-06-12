import { StoreKey } from "../constant";
import { createPersistStore } from "../utils/store";
import { dataset_api, Message, RefDoc } from "../client/platforms/dataset";

export interface Dataset {
  id: string;
  name: string;
  collection_name: string;
  message: string;
  error_message: string;
  status: string;
  source_type: string;
  model_name: string;
  total_tokens: number;
  created_at: string;
  updated_at: string;
}

// const ONE_MINUTE = 60 * 1000;

export const useDatasetStore = createPersistStore(
  {
    datasets: [] as Dataset[],
  },
  (set, get) => ({
    async read(collection_name: string) {
      const [status, dataset] = await dataset_api.read(collection_name);
      if (status == 200) {
        const datasets = get().datasets.map((item) => {
          return item.collection_name == collection_name ? dataset : item;
        });
        set(() => ({ datasets }));
      }
      return dataset;
    },

    async list() {
      const [status, res] = await dataset_api.list();
      if (status == 200 && Array.isArray(res)) {
        set(() => ({ datasets: res as Dataset[] }));
        return [status, undefined];
      } else {
        set(() => ({ datasets: [] }));
        const msg = res as Message;
        return [status, msg.detail];
      }
    },

    async update_status(list_collection_name: string[]) {
      const [status, list_status] =
        await dataset_api.list_status(list_collection_name);
      if (status == 200) {
        const datasets = get().datasets;
        for (const status of list_status) {
          const updated = datasets.map((item) => {
            if (item.collection_name == status.collection_name) {
              item.status = status.status;
              item.total_tokens = status.total_tokens;
              item.created_at = status.created_at;
              item.updated_at = status.updated_at;
              item.error_message = status.error_message;
            }
            return item;
          });
          set(() => ({ datasets: updated }));
        }
      }
    },

    async delete(collection_name: string) {
      const [status, notify] = await dataset_api.delete(collection_name);
      if (status == 200) {
        const datasets = get().datasets.filter((item) => {
          return item.collection_name !== collection_name;
        });
        set(() => ({ datasets }));
      }
    },

    async create(file: File) {
      const [status, notify] = await dataset_api.create(file);
      const datasets = get().datasets;
      if (status == 201) {
        datasets.unshift({
          name: notify.name,
          collection_name: notify.collection_name,
          status: notify.status,
          total_tokens: 0,
        } as Dataset);
        set(() => ({ datasets }));
        return [true, notify.detail];
      } else {
        return [false, notify.detail];
      }
    },
  }),
  {
    name: StoreKey.Dataset,
    version: 1,
  },
);
