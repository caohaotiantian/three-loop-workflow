export const meta = { name: "x", description: "a regex literal after return must not be read as division" }
function ref(v) {
  return /^[A-Za-z0-9][A-Za-z0-9._\/-]*$/.test(v) ? v : null
}
const s = "Math.random() is named here on purpose"
log(ref("main"), s)
