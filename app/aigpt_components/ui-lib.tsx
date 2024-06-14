import { createRoot } from "react-dom/client";
import { useAudioStore } from "../store/audio";

import Locale from "../locales";

import styles from "./ui-lib.module.scss";
import AudioIcon from "../icons/audio.svg";

import { IconButton } from "../components/button";
import LoadingButtonIcon from "../icons/loading.svg";
import PauseIcon from "../icons/pause.svg";

import React, { useRef, useEffect, useState } from "react";

interface NotifyProps {
  title: string;
  children?: any;
  actions?: React.ReactNode[];
  defaultMax?: boolean;
  footer?: React.ReactNode;
  onClose?: () => void;
}

interface AudioProps {
  text2Audio: string;
  playButton?: any;
}

export function PlayAudio(props: AudioProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioInsRef = useRef(new Audio());
  const controller = useRef(new AbortController());
  const audioStore = useAudioStore();

  let Button = IconButton;
  if (props.playButton) {
    Button = props.playButton;
  }

  useEffect(() => {
    const c = controller;
    const c_audio = audioInsRef;
    return () => {
      c.current.abort();
      if (c_audio.current.src !== "") {
        c_audio.current.pause();
        c_audio.current.currentTime = 0;
        setIsPlaying(false);
        setIsLoading(false);
      }
    };
  }, []);

  const fetchAndPlayAudio = async (isPlaying?: boolean, retry: number = 1) => {
    try {
      const maxCharacter = 500;
      if (retry <= -1) {
        setIsPlaying(false); // Re-enable the button when audio ends
        setIsLoading(false);
        return;
      }
      if (props.text2Audio.length > maxCharacter) {
        alert(Locale.UI.LimitCharacter(maxCharacter));
        setIsPlaying(false); // Re-enable the button when audio ends
        setIsLoading(false);
        return;
      }
      setIsPlaying(isPlaying || true);

      setIsLoading(true);
      const audio = await audioStore.read(
        props.text2Audio,
        controller.current.signal,
      );
      audioInsRef.current = audio;
      setIsLoading(false);

      audioInsRef.current.play().catch((error) => {
        if (error.name == "NotAllowedError") {
          audioStore.reset();
          // alert(Locale.UI.NotAllowedError);
        }
        console.error("Error attempting to play:", error);
        audioStore.delete(props.text2Audio);
        fetchAndPlayAudio(false, retry - 1);
      });

      audioInsRef.current.onended = () => {
        setIsPlaying(false); // Re-enable the button when audio ends
        setIsLoading(false);
      };
    } catch (error) {
      const msg = (error as { message: string }).message;
      console.error("Failed to fetch and play audio:", msg);
      setIsPlaying(false);
      setIsLoading(false);
    }
  };

  const pauseAudio = async () => {
    if (audioInsRef.current.src !== "") {
      audioInsRef.current.pause();
      audioInsRef.current.currentTime = 0;
      setIsPlaying(false);
      setIsLoading(false);
    }
  };

  return (
    <>
      {!isPlaying && !isLoading && (
        <Button
          icon={<AudioIcon />}
          onClick={fetchAndPlayAudio}
          text={Locale.UI.Play}
          bordered
        />
      )}
      {isLoading && isPlaying && (
        <Button
          icon=<LoadingButtonIcon />
          text={Locale.UI.Loading}
          onClick={() => {
            javascript: void 0;
          }}
          bordered
        />
      )}
      {isPlaying && !isLoading && (
        <Button
          icon=<PauseIcon />
          text={Locale.UI.StopPlay}
          onClick={pauseAudio}
          bordered
        />
      )}
    </>
  );
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

  root.render(<Notify {...props} onClose={closeModal}></Notify>);

  return closeModal;
}
