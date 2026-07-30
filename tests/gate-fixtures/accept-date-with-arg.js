export const meta = { name: "x", description: "a timestamp passed in via args is fine" }
const d = new Date(args.ts)
log(String(d))
