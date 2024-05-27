"use client";

require("../polyfill");
import Locale from "../locales";
import { ErrorBoundary } from "../components/error";
import styles from "./dataset.module.scss";
import { useState, useEffect } from "react";
import { Path } from "../constant";
import { useNavigate } from "react-router-dom";
import { Dataset, useDatasetStore } from "../store/dataset";
import { useChatStore } from "../store/chat";
import { IconButton } from "../components/button";
import CloseIcon from "../icons/close.svg";
import EyeIcon from "../icons/eye.svg";
import ClearIcon from "../icons/clear.svg";
import UploadIcon from "../icons/upload.svg";
import ReloadIcon from "../icons/reload.svg";
import LoadingIcon from "../icons/loading.svg";
import ThreeDotIcon from "../icons/three-dots.svg";
import ChatIcon from "../icons/chat.svg";
import { showToast, showConfirm, showModal } from "../components/ui-lib";

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
  const [loading, setLoading] = useState(false);
  const current_session = chatStore.currentSession();
  const current_dataset = current_session.dataset;
  const d = dataset;

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

  function updateStatus(collection_name: string) {
    (async () => {
      store.update_status([collection_name]);
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
              <div className={styles["dataset-info"] + " one-line"}>
                {d.created_at +
                  "|" +
                  Locale.Dataset.CostToken +
                  ": " +
                  d.total_tokens +
                  "|" +
                  Locale.Dataset.Status +
                  ": " +
                  d.status}
              </div>
            </div>
          </div>
          <div className={styles["dataset-actions"]}>
            {d.status == "failure" ? (
              <>
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
                <IconButton
                  icon={<ChatIcon />}
                  disabled={true}
                  text={Locale.Dataset.Use}
                />
              </>
            ) : (
              <IconButton
                icon={<ChatIcon />}
                className={inUse(d) ? styles["use-icon-button"] : undefined}
                text={inUse(d) ? Locale.Dataset.Cancel : Locale.Dataset.Use}
                onClick={() => {
                  setTimeout(() => {
                    toggle(d);
                  }, 10);
                  // console.log(chatStore.currentSession())
                }}
              />
            )}
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
        </>
      ) : (
        <>
          <div className={styles["dataset-header"]}>
            <div className={styles["dataset-title"]}>
              <div className={styles["dataset-name"]}>{d.name}</div>
              <div className={styles["dataset-info"] + " one-line"}>
                {Locale.Dataset.Status + ": " + d.status}
              </div>
            </div>
          </div>
          <div className={styles["dataset-actions"]}>
            <IconButton
              icon={loading ? <LoadingIcon /> : <ReloadIcon />}
              disabled={loading}
              onClick={() => {
                setLoading(true);
                setTimeout(() => {
                  updateStatus(d.collection_name);
                  setLoading(false);
                }, 1000);
              }}
            />
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
        </>
      )}
    </div>
  );
}

export function DatasetPage() {
  const [loadingList, setLoadingList] = useState(false);
  const datasetStore = useDatasetStore();
  const navigate = useNavigate();
  const { datasets } = datasetStore;

  async function fetchList() {
    setLoadingList(true);
    const [status, detail] = await datasetStore.list();
    setLoadingList(false);
    if (status !== 200 && detail) {
      showToast(detail.toString());
    }
  }

  function uploadFile() {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept =
      "application/json," +
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document," +
      "application/pdf, text/*," +
      ".md, application/msword, .docx";

    fileInput.onchange = async (event: any) => {
      const file = event.target.files[0];
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
      const [_, detail] = await datasetStore.create(file);
      closeModal();
      showToast(detail.toString());
      // setTimeout(() => {
      //   closeModal()
      // }, 3000)
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
              {Locale.Dataset.Maxcount(datasets.length, 10)}
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
        <div className={styles["dataset-page-body"]}>
          {datasets.map((d) => (
            <DatasetItem key={d.collection_name} dataset={d} />
          ))}
        </div>
      </div>
    </ErrorBoundary>
  );
}
