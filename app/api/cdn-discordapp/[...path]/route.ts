import { NextRequest } from "next/server";

async function handle(req: NextRequest) {
  const reqPath = `${req.nextUrl.pathname}`.replaceAll(
    "/api/cdn-discordapp/",
    "",
  );

  let fetchUrl = `https://cdn.discordapp.com/${reqPath}`;
  console.log("[MJ CDN URL] ", fetchUrl);
  return await fetch(fetchUrl, {
    method: req.method,
    body: req.body,
    cache: "no-store",
  });
}

export const GET = handle;
