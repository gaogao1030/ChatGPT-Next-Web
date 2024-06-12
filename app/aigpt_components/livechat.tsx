"use client";
import dynamic from "next/dynamic";

const LiveChatWidget = dynamic(
  () => import("@livechat/widget-react").then((mod) => mod.LiveChatWidget),
  { ssr: false },
);

const LiveChat = () => {
  return <LiveChatWidget license="18116016" visibility="minimized" />;
};

export default LiveChat;
