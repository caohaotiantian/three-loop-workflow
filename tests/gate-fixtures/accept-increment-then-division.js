export const meta = { name: "x", description: "an increment before a division is not a regex literal" }
let i = 2
const r = i++ / 2 / 2
log(r)
