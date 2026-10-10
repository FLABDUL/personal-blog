function loadMusicPortrait(value, { allowDraft = false } = {}) {
  if (
    !value ||
    value.schemaVersion !== 2 ||
    !["draft", "published"].includes(value.status)
  ) {
    throw new Error("Music portrait is invalid")
  }
  return value.status === "published" || allowDraft ? value : null
}
module.exports = { loadMusicPortrait }
