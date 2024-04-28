import fetch from "node-fetch"
import https from "https"
import { createParser } from "eventsource-parser";

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const agent = new https.Agent({
  rejectUnauthorized: false,
});


const ask = process.argv.slice(2).reduce((acc, cur) => {
  return acc = acc + " " + cur
}, "") || "你好啊"
console.log(ask)

async function  request(prompt) {
  //const userid = Date.now().toString()
  const userid = new Date("2023-04-05T22:33:23.505Z").getTime().toString()
  return fetch("https://cbjtestapi.binjie.site:7777/api/generateStream", {
    agent,
    "headers": {
      "accept": "application/json",
      "content-type": "application/json",
      "sec-ch-ua": "\"Google Chrome\";v=\"111\", \"Not(A:Brand\";v=\"8\", \"Chromium\";v=\"111\"",
      "sec-ch-ua-platform": "\"macOS\"",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "path": "/api/generateStream",
      "authority": "cbjtestapi.binjie.site:7777",
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36",
      "referrer": "https://chat11.yqcloud.top/",
      "origin": "https://chat11.yqcloud.top'"
    },
    body: JSON.stringify({prompt ,userId:`#/chat/${userid}`,network: true}),
    method: "POST",
  });
}

async function printStreamRequest(response) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const res = await response;

  const contentType = res.headers.get("Content-Type") ?? "";
  if (!contentType.includes("stream")) {
    const content = res.text()
    console.log("[Stream] error ", content);
    return "```json\n" + content + "```";
  }


  for await (const chunk of res.body) {
    const text = decoder.decode(chunk)
    process.stdout.write(text)
  }
  console.log(res.body._readableState.ended)

}

(async function () {
  printStreamRequest(request(ask))
})()




//非常抱歉地告诉您，根据我的分析，您现在正在访问的网站可能是盗用了AI接口的站点。为保证您的数据安全和获得更好的使用体验，请您访问官方免费且无限制的来源网站：https://chat1.yqcloud.top 或者 https://chat1.binjie.site:7777。希望这可以帮助您获得更好的服务，感谢您^C
