import { getHeaders, useGetMidjourneySelfProxyUrl } from "../api";
import { ChatControllerPool } from "../controller";
import Locale from "../../locales";
import { ChatMessage } from "../../store/chat";

const ChatFetchTaskPool: Record<string, any> = {};

export class MidjourneyApi {
  fetchMidjourneyStatus(
    botMessage: ChatMessage,
    set: CallableFunction,
    extAttr?: any,
  ) {
    const taskId = botMessage?.attr?.taskId;
    if (
      !taskId ||
      ["SUCCESS", "FAILURE"].includes(botMessage?.attr?.status) ||
      ChatFetchTaskPool[taskId]
    )
      return;
    ChatFetchTaskPool[taskId] = setTimeout(async () => {
      ChatFetchTaskPool[taskId] = null;
      const statusRes = await fetch(`/api/midjourney/mj/task/${taskId}/fetch`, {
        method: "GET",
        headers: getHeaders(),
      });
      const statusResJson = await statusRes.json();
      if (statusRes.status < 200 || statusRes.status >= 300) {
        botMessage.content =
          Locale.Midjourney.TaskStatusFetchFail +
            ": " +
            (statusResJson?.error || statusResJson?.description) ||
          Locale.Midjourney.UnknownReason;
      } else {
        let isFinished = false;
        let content;
        const prefixContent = Locale.Midjourney.TaskPrefix(
          statusResJson.prompt,
          taskId,
        );
        switch (statusResJson?.status) {
          case "SUCCESS":
            content = statusResJson.imageUrl;
            isFinished = true;
            if (statusResJson.imageUrl) {
              let imgUrl = useGetMidjourneySelfProxyUrl(statusResJson.imageUrl);
              botMessage.attr.imgUrl = imgUrl;
              botMessage.content =
                prefixContent + `[![${taskId}](${imgUrl})](${imgUrl})`;
            }
            if (statusResJson.action === "DESCRIBE" && statusResJson.prompt) {
              botMessage.content += `\n${statusResJson.prompt}`;
            }
            break;
          case "FAILURE":
            content =
              statusResJson.failReason || Locale.Midjourney.UnknownReason;
            isFinished = true;
            botMessage.content =
              prefixContent +
              `**${
                Locale.Midjourney.TaskStatus
              }:** [${new Date().toLocaleString()}] - ${content}`;
            break;
          case "NOT_START":
            content = Locale.Midjourney.TaskNotStart;
            break;
          case "IN_PROGRESS":
            content = Locale.Midjourney.TaskProgressTip(statusResJson.progress);
            break;
          case "SUBMITTED":
            content = Locale.Midjourney.TaskRemoteSubmit;
            break;
          default:
            content = statusResJson.status;
        }
        botMessage.attr.status = statusResJson.status;
        if (isFinished) {
          botMessage.attr.finished = true;
        } else {
          botMessage.content =
            prefixContent +
            `**${
              Locale.Midjourney.TaskStatus
            }:** [${new Date().toLocaleString()}] - ${content}`;
          if (
            statusResJson.status === "IN_PROGRESS" &&
            statusResJson.imageUrl
          ) {
            let imgUrl = useGetMidjourneySelfProxyUrl(statusResJson.imageUrl);
            botMessage.attr.imgUrl = imgUrl;
            botMessage.content += `\n[![${taskId}](${imgUrl})](${imgUrl})`;
          }
          this.fetchMidjourneyStatus(botMessage, set, extAttr);
        }
        set(() => ({}));
        if (isFinished) {
          extAttr?.setAutoScroll(true);
        }
      }
    }, 3000);
  }

  async handleMJForCommand(
    botMessage: ChatMessage,
    content: string,
    set: CallableFunction,
    get: CallableFunction,
    extAttr?: any,
  ) {
    botMessage.model = "midjourney";
    const startFn = async () => {
      const prompt = content.substring(3).trim();
      let action: string = "IMAGINE";
      console.log(action);
      const firstSplitIndex = prompt.indexOf("::");
      if (firstSplitIndex > 0) {
        action = prompt.substring(0, firstSplitIndex);
      }
      if (
        ![
          "UPSCALE",
          "VARIATION",
          "IMAGINE",
          "DESCRIBE",
          "BLEND",
          "REROLL",
        ].includes(action)
      ) {
        botMessage.content = Locale.Midjourney.TaskErrUnknownType;
        botMessage.streaming = false;
        return;
      }
      botMessage.attr.action = action;
      let actionIndex: any = null;
      let actionUseTaskId: any = null;
      if (action === "VARIATION" || action == "UPSCALE" || action == "REROLL") {
        actionIndex = parseInt(
          prompt.substring(firstSplitIndex + 2, firstSplitIndex + 3),
        );
        actionUseTaskId = prompt.substring(firstSplitIndex + 5);
      }
      try {
        let res = null;
        const reqFn = (path: string, method: string, body?: any) => {
          return fetch("/api/midjourney/mj/" + path, {
            method: method,
            headers: getHeaders(),
            body: body,
          });
        };
        switch (action) {
          case "IMAGINE": {
            res = await reqFn(
              "submit/imagine",
              "POST",
              JSON.stringify({
                prompt: prompt,
                base64: extAttr?.useImages?.[0]?.base64 ?? null,
              }),
            );
            break;
          }
          case "DESCRIBE": {
            res = await reqFn(
              "submit/describe",
              "POST",
              JSON.stringify({
                base64: extAttr.useImages[0].base64,
              }),
            );
            break;
          }
          case "BLEND": {
            const base64Array = extAttr.useImages.map((ui: any) => ui.base64);
            res = await reqFn(
              "submit/blend",
              "POST",
              JSON.stringify({ base64Array }),
            );
            break;
          }
          case "UPSCALE":
          case "VARIATION":
          case "REROLL": {
            res = await reqFn(
              "submit/change",
              "POST",
              JSON.stringify({
                action: action,
                index: actionIndex,
                taskId: actionUseTaskId,
              }),
            );
            break;
          }
          default:
        }
        if (res == null) {
          botMessage.content = Locale.Midjourney.TaskErrNotSupportType(action);
          botMessage.streaming = false;
          return;
        }
        if (!res.ok) {
          const text = await res.text();
          throw new Error(
            `\n${Locale.Midjourney.StatusCode(
              res.status,
            )}\n${Locale.Midjourney.RespBody(text || Locale.Midjourney.None)}`,
          );
        }
        const resJson = await res.json();
        if (
          res.status < 200 ||
          res.status >= 300 ||
          (resJson.code != 1 && resJson.code != 22)
        ) {
          botMessage.content = Locale.Midjourney.TaskSubmitErr(
            resJson?.msg ||
              resJson?.error ||
              resJson?.description ||
              Locale.Midjourney.UnknownError,
          );
        } else {
          const taskId: string = resJson.result;
          const prefixContent = Locale.Midjourney.TaskPrefix(prompt, taskId);
          botMessage.content =
            prefixContent +
              `[${new Date().toLocaleString()}] - ${
                Locale.Midjourney.TaskSubmitOk
              }: ` +
              resJson?.description || Locale.Midjourney.PleaseWait;
          botMessage.attr.taskId = taskId;
          botMessage.attr.status = resJson.status;
          this.fetchMidjourneyStatus(botMessage, set, extAttr);
        }
      } catch (e: any) {
        console.error(e);
        botMessage.content = Locale.Midjourney.TaskSubmitErr(
          e?.error || e?.message || Locale.Midjourney.UnknownError,
        );
      } finally {
        const messageIndex = get().currentSession().messages.length + 1;
        const sessionId = get().currentSession().id;
        ChatControllerPool.remove(sessionId, botMessage.id ?? messageIndex);
        botMessage.streaming = false;
      }
    };
    await startFn();
    get().onNewMessage(botMessage);
    set(() => ({}));
    extAttr?.setAutoScroll(true);
  }
}

export const mj_api = new MidjourneyApi();
