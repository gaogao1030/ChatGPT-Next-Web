import { createRoot } from "react-dom/client";
import styles from "./ui-lib.module.scss";
import React, { HTMLProps, useEffect, useState } from "react";
interface NotifyProps {
  title: string;
  children?: any;
  actions?: React.ReactNode[];
  defaultMax?: boolean;
  footer?: React.ReactNode;
  onClose?: () => void;
}

export function Notify(props: NotifyProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        props.onClose?.();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles["modal-container"]}>
      <div className={styles["modal-content"]}>{props.children}</div>
    </div>
  );
}

export function showNotify(props: NotifyProps) {
  const div = document.createElement("div");
  div.className = "modal-mask";
  document.body.appendChild(div);

  const root = createRoot(div);
  const closeModal = () => {
    props.onClose?.();
    root.unmount();
    div.remove();
  };

  // div.onclick = (e) => {
  //   if (e.target === div) {
  //     closeModal();
  //   }
  // };

  root.render(<Notify {...props} onClose={closeModal}></Notify>);

  return closeModal;
}
