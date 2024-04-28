import { ChatMessage } from "../store/chat";
import { getMessageTextContent } from "../utils";

export function handleSeachMessage(mode: string = "chat", message: string) {
  if (mode === "chat") {
    return message;
  }
  return message
    .replace(/\[\[([cC])itation/g, "[citation")
    .replace(/[cC]itation:(\d+)]]/g, "citation:$1]")
    .replace(/\[\[([cC]itation:\d+)]](?!])/g, `[\$1]`)
    .replace(/\[?\s*[cC]itation:(\d+)\s*\]?/g, "[citation]($1)")
    .replace(/【\s*[cC]itation:(\d+)\s*】/g, "[citation]($1)");
  // return message
  //   .replace(/\[\[([cC])itation/g, "[citation")
  //   .replace(/[cC]itation:(\d+)]]/g, "citation:$1]")
  //   .replace(/\[\[([cC]itation:\d+)]](?!])/g, `[$1]`)
  //   .replace(/\[[cC]itation:(\d+)]/g, "[citation]($1)")
  //   .replace(/\[(\d+)\]/g, "[citation]($1)")
  //   .replace(/\[引用:(\d+)\]/g, "[citation]($1)");
}

export function handleSendMessages(messages: ChatMessage[]) {
  return messages.map((m) => ({
    ...m,
    content: getMessageTextContent(m),
  }));
}
