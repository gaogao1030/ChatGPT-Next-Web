export function handleSeachMessage(message: string) {
  return message
    .replace(/\[\[([cC])itation/g, "[citation")
    .replace(/[cC]itation:(\d+)]]/g, "citation:$1]")
    .replace(/\[\[([cC]itation:\d+)]](?!])/g, `[$1]`)
    .replace(/\[[cC]itation:(\d+)]/g, "[citation]($1)")
    .replace(/\[(\d+)\]/g, "[citation]($1)")
    .replace(/\[引用:(\d+)\]/g, "[citation]($1)");
}
