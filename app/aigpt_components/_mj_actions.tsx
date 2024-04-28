import styles from "../components//chat.module.scss";

import { ChatAction } from "../components/chat";

import { ChatMessage } from "../store";

export function MjChatActions(props: {
  message: ChatMessage;
  callback: Function;
}) {
  const { message, callback } = props;

  return (
    message.model == "midjourney" &&
    message.attr?.finished &&
    message.attr?.taskId &&
    ["VARIATION", "IMAGINE", "BLEND"].includes(message.attr?.action) && (
      <div
        className={[styles["chat-message-actions"], styles["column-flex"]].join(
          " ",
        )}
      >
        <div
          style={{ marginTop: "6px" }}
          className={styles["chat-input-actions"]}
        >
          {[1, 2, 3, 4].map((i) => (
            <ChatAction
              key={i}
              text={`U${i}`}
              onClick={() =>
                callback(`/mj UPSCALE::${i}::${message.attr.taskId}`)
              }
            />
          ))}
        </div>
        <div
          style={{ marginTop: "6px", marginBottom: "6px" }}
          className={styles["chat-input-actions"]}
        >
          {[1, 2, 3, 4].map((i) => (
            <ChatAction
              key={i}
              text={`V${i}`}
              onClick={() =>
                callback(`/mj VARIATION::${i}::${message.attr.taskId}`)
              }
            />
          ))}
        </div>
      </div>
    )
  );
}
