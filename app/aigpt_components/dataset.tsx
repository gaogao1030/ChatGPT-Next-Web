"use client";

require("../polyfill");
import Locale from "../locales";
import { ErrorBoundary } from "../components/error";
import styles from "./dataset.module.scss";
import { useState, useEffect, useRef } from "react";
import { Path, UPLOAD_FILE_MAX_SIZE } from "../constant";
import { useNavigate } from "react-router-dom";
import { Dataset, useDatasetStore } from "../store/dataset";
import { useChatStore } from "../store/chat";
import { IconButton } from "../components/button";
import CloseIcon from "../icons/close.svg";
import EyeIcon from "../icons/eye.svg";
import ClearIcon from "../icons/clear.svg";
import UploadIcon from "../icons/upload.svg";
import LoadingIcon from "../icons/loading.svg";
import ThreeDotIcon from "../icons/three-dots.svg";
import ChatIcon from "../icons/chat.svg";
import { showToast, showConfirm, showModal } from "../components/ui-lib";
import { EditSchema } from "./_dataset_modal";

import { showNotify } from "./ui-lib";

import dynamic from "next/dynamic";

const Markdown = dynamic(
  async () => (await import("../components/markdown")).Markdown,
  {
    loading: () => <LoadingIcon />,
  },
);

function DatasetItem(props: { dataset: Dataset }) {
  const { dataset } = props;
  const store = useDatasetStore();
  const chatStore = useChatStore();
  const navigate = useNavigate();
  const current_session = chatStore.currentSession();
  const current_dataset = current_session.dataset;
  const d = dataset;
  const fileExtension = ".csv";
  const regex = new RegExp(`\\${fileExtension}$`, "i");
  const is_csv = regex.test(d.name);

  function toggle(dataset: Dataset) {
    if (inUse(dataset)) {
      chatStore.updateCurrentSession(
        (session) => ((session.dataset = undefined), (session.mode = "chat")),
      );
      showToast(Locale.Dataset.ToastCancleText(dataset.name));
      // navigate(Path.Chat);
    } else {
      chatStore.updateCurrentSession(
        (session) => (
          (session.dataset = dataset), (session.mode = "qa_for_dataset")
        ),
      );
      store.push_to_sorted_collection_names(dataset.collection_name);
      showToast(Locale.Dataset.ToastUseText(dataset.name));
      navigate(Path.Chat);
    }
  }

  function deleteItem(dataset: Dataset) {
    (async () => {
      if (dataset.collection_name === current_dataset?.collection_name) {
        chatStore.updateCurrentSession(
          (session) => ((session.dataset = undefined), (session.mode = "chat")),
        );
      }
      await store.delete(dataset.collection_name);
    })();
  }

  function inUse(dataset: Dataset) {
    if (
      current_dataset &&
      current_dataset.collection_name == dataset.collection_name
    ) {
      return true;
    }
    return false;
  }

  function isTaskDone(dataset: Dataset) {
    const status = dataset?.status ?? "pending";
    if (status == "success" || status == "failure") {
      return true;
    }
    return false;
  }

  return (
    <div
      className={inUse(d) ? styles["use-dataset-item"] : styles["dataset-item"]}
    >
      {isTaskDone(d) ? (
        <>
          <div className={styles["dataset-header"]}>
            <div className={styles["dataset-title"]}>
              <div className={styles["dataset-name"]}>{d.name}</div>
              <div className={styles["dataset-info"]}>
                <p>{Locale.Dataset.CreatedAt(d.created_at)}</p>
                {is_csv && (
                  <p>
                    {Locale.Dataset.FieldSchema}: &nbsp;
                    <a
                      href="#"
                      onClick={async (e) => {
                        e.preventDefault();
                        showModal({
                          title: Locale.Dataset.FieldSchema,
                          children: <EditSchema dataset={d}></EditSchema>,
                        });
                      }}
                    >
                      {Locale.Dataset.View}
                    </a>
                  </p>
                )}
                {/* <p>{Locale.Dataset.CostToken(d.total_tokens)}</p> */}
                {d.status !== "success" && (
                  <p>{Locale.Dataset.Status(d.status)}</p>
                )}
              </div>
            </div>
          </div>
          <div className={styles["dataset-actions"]}>
            {d.status == "failure" ? (
              <>
                <div className={styles["dataset-action"]}>
                  <IconButton
                    icon={<EyeIcon />}
                    text={Locale.Dataset.ViewError}
                    onClick={() => {
                      showModal({
                        title: Locale.Dataset.ViewErrorDetail,
                        children: (
                          <div className={styles["text-select"]}>
                            <Markdown
                              content={d.error_message}
                              loading={
                                d.error_message == undefined ||
                                d.error_message.length === 0
                              }
                            />
                          </div>
                        ),
                      });
                    }}
                  />
                </div>
              </>
            ) : (
              <div className={styles["dataset-action"]}>
                <IconButton
                  icon={<ChatIcon />}
                  className={inUse(d) ? styles["use-icon-button"] : undefined}
                  text={inUse(d) ? Locale.Dataset.Cancel : Locale.Dataset.Use}
                  onClick={() => {
                    setTimeout(() => {
                      toggle(d);
                    }, 10);
                  }}
                />
              </div>
            )}
            <div className={styles["dataset-action"]}>
              <IconButton
                icon={<ClearIcon />}
                className={inUse(d) ? styles["use-icon-button"] : undefined}
                text={Locale.Dataset.Delete}
                onClick={async () => {
                  if (await showConfirm(Locale.Dataset.ConfirmDelete)) {
                    deleteItem(d);
                  }
                }}
              />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className={styles["dataset-header"]}>
            <div className={styles["dataset-title"]}>
              <div className={styles["dataset-name"]}>{d.name}</div>
              <div className={styles["dataset-info"]}>
                <p>{Locale.Dataset.Status(d.status)}</p>
              </div>
            </div>
          </div>
          <div className={styles["dataset-actions"]}>
            <IconButton icon=<LoadingIcon /> text={Locale.Dataset.Analyzing} />
            {/* <IconButton */}
            {/*   icon={<ClearIcon />} */}
            {/*   className={inUse(d) ? styles["use-icon-button"] : undefined} */}
            {/*   text={Locale.Dataset.Delete} */}
            {/*   onClick={async () => { */}
            {/*     if (await showConfirm(Locale.Dataset.ConfirmDelete)) { */}
            {/*       deleteItem(d); */}
            {/*     } */}
            {/*   }} */}
            {/* /> */}
          </div>
        </>
      )}
    </div>
  );
}

export function DatasetPage() {
  const [loadingList, setLoadingList] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const store = useDatasetStore();
  const navigate = useNavigate();
  const { datasets } = store;

  function scrollDomToTop() {
    const dom = scrollRef.current;
    if (dom) {
      requestAnimationFrame(() => {
        dom.scrollTo(0, 0);
      });
    }
  }

  async function update_status(collection_name: string) {
    const _t = setTimeout(async () => {
      clearTimeout(_t);
      await store.update_status([collection_name]);
      const d = await store.read(collection_name);
      if (d.status !== "success" && d.status !== "failure") {
        update_status(collection_name);
      }
    }, 3000);
  }

  async function fetchList() {
    setLoadingList(true);
    const [status, datasets, detail] = await store.list();
    setLoadingList(false);
    if (status !== 200 && detail) {
      showToast(detail.toString());
    } else {
      const list = datasets as Dataset[];
      list.forEach((d: Dataset) => {
        if (d.status !== "success" && d.status !== "failure") {
          update_status(d.collection_name);
        }
      });
    }
  }

  function uploadFile() {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept =
      ".md, .docx, .pdf, .json, .txt, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/pdf, text/plain, application/json, text/markdown, .csv";

    fileInput.onchange = async (event: any) => {
      const file = event.target.files[0];
      if (file.size > UPLOAD_FILE_MAX_SIZE) {
        showToast(Locale.Dataset.MaxFileSize(UPLOAD_FILE_MAX_SIZE));
      } else {
        const closeModal = showNotify({
          title: Locale.Dataset.Notify,
          children: (
            <div>
              <ThreeDotIcon />
              <span style={{ marginLeft: "10px" }}>
                {Locale.Dataset.Uploading}
              </span>
            </div>
          ),
        });
        const [_, detail] = await store.create(file);
        scrollDomToTop();
        fetchList();
        closeModal();
        showToast(detail.toString());
      }
    };

    fileInput.click();
  }

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ErrorBoundary>
      <div className={styles["dataset-page"]}>
        <div className="window-header">
          <div className="window-header-title">
            <div className="window-header-main-title">
              {Locale.Dataset.Title}
            </div>
            <div className="window-header-submai-title">
              {Locale.Dataset.MaxCount(datasets.length, 20)}
            </div>
          </div>

          <div className="window-actions">
            <div className="window-action-button">
              <IconButton
                icon={<UploadIcon />}
                text={Locale.Dataset.Upload}
                bordered
                onClick={() => uploadFile()}
              />
            </div>
            <div className="window-action-button">
              <IconButton
                icon={<CloseIcon />}
                bordered
                onClick={() => navigate(Path.Chat)}
              />
            </div>
          </div>
        </div>
        <div className={styles["dataset-page-body"]} ref={scrollRef}>
          {datasets.map((d) => (
            <DatasetItem key={d.collection_name} dataset={d} />
          ))}
        </div>
      </div>
    </ErrorBoundary>
  );
}
