import { StoreKey } from "../constant";
import { createPersistStore } from "../utils/store";
import { dataset_api, Message } from "../client/platforms/dataset";
import { sortItems } from "../aigpt_utils";

export interface Dataset {
  id: string;
  name: string;
  collection_name: string;
  message: string;
  schema_prompt: string;
  error_message: string;
  status: string;
  source_type: string;
  model_name: string;
  total_tokens: number;
  created_at: string;
  updated_at: string;
  gen_schema_prompt: string;
  gen_schema_status: boolean;
}

// const ONE_MINUTE = 60 * 1000;

export const useDatasetStore = createPersistStore(
  {
    datasets: [] as Dataset[],
    sorted_collection_names: [] as string[],
    schema_prompt: "",
    gen_schema_prompt: "",
    gen_schema_status: false,
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
      this.resort_by_sorted_collection_names();
      const [status, res] = await dataset_api.list();
      if (status == 200 && Array.isArray(res)) {
        let datasets = res as Dataset[];
        const sort_ids = get().sorted_collection_names;
        datasets = sortItems(datasets, "collection_name", sort_ids);
        const _datasets = get().datasets;
        for (const d of _datasets) {
          datasets = datasets.map((item) => {
            if (item.collection_name == d.collection_name) {
              item.gen_schema_status = d.gen_schema_status;
            }
            return item;
          });
        }
        set(() => ({ datasets: datasets }));
        return [status, datasets, undefined];
      } else {
        set(() => ({ datasets: [] }));
        const msg = res as Message;
        return [status, [], msg.detail];
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
              item.schema_prompt = status.schema_prompt;
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
      const [status, _] = await dataset_api.delete(collection_name);
      if (status == 200) {
        const datasets = get().datasets.filter((item) => {
          return item.collection_name !== collection_name;
        });
        set(() => ({ datasets }));
        this.sync_sort_by_collection_name_by_datasets(datasets);
      }
    },

    async create(file: File) {
      const [status, notify] = await dataset_api.create(file);
      let datasets = get().datasets;
      if (status == 201) {
        const { name, collection_name, status } = notify;
        datasets.unshift({
          name: name,
          collection_name: collection_name,
          status: status,
          total_tokens: 0,
        } as Dataset);
        const sorted_collection_name =
          this.push_to_sorted_collection_names(collection_name);
        datasets = sortItems(
          datasets,
          "collection_name",
          sorted_collection_name,
        );
        set(() => ({ datasets }));
        this.sync_sort_by_collection_name_by_datasets(datasets);
        return [true, notify.detail];
      } else {
        return [false, notify.detail];
      }
    },

    async gen_schema(collection_name: string) {
      const _update = (collection_name: string, callback: Function) => {
        const datasets = get().datasets.map((item) => {
          if (item.collection_name == collection_name) {
            item = callback(item);
          }
          return item;
        });
        set(() => ({ datasets }));
      };
      _update(collection_name, (d: Dataset) => {
        d.gen_schema_status = true;
        return d;
      });
      const [status, res] = await dataset_api.gen_schema(collection_name);
      if (status == 200) {
        _update(collection_name, (d: Dataset) => {
          d.gen_schema_prompt = res.schema_prompt;
          d.gen_schema_status = false;
          return d;
        });
        return [status, res.schema_prompt];
      }
      _update(collection_name, (d: Dataset) => {
        d.gen_schema_status = false;
        return d;
      });
      return [status, "Generate Failed"];
    },

    async save_schema(collection_name: string, schema: string) {
      await dataset_api.save_schema(collection_name, schema);
      const datasets = get().datasets.map((item) => {
        if (item.collection_name == collection_name) {
          item.schema_prompt = schema;
        }
        return item;
      });
      set(() => ({ datasets }));
    },

    find_dataset(collection_name: string) {
      return get().datasets.find((item) => {
        return item.collection_name == collection_name;
      });
    },

    sync_sort_by_collection_name_by_datasets(datasets: Dataset[]) {
      const sorted_collection_names = datasets.map((d) => {
        return d.collection_name;
      });
      set(() => ({ sorted_collection_names }));
    },

    push_to_sorted_collection_names(item: string) {
      const arr = get().sorted_collection_names;
      const index = arr.indexOf(item);
      if (index !== -1) {
        arr.splice(index, 1);
        arr.unshift(item);
      } else {
        arr.unshift(item);
      }
      set(() => ({ sorted_collection_names: arr }));
      return arr;
    },

    resort_by_sorted_collection_names() {
      const sorted_collection_names = get().sorted_collection_names;
      let datasets = get().datasets;
      if (datasets.length !== 0 && sorted_collection_names.length !== 0) {
        const sorted_collection_names = get().sorted_collection_names;
        datasets = sortItems(
          datasets,
          "collection_name",
          sorted_collection_names,
        );
        set(() => ({ datasets: datasets }));
      }
    },
  }),
  {
    name: StoreKey.Dataset,
    version: 1,
  },
);
