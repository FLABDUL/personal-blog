const portrait = require("../../content/music/portrait.json")
const { validateMusicPortrait } = require("./portrait")

const result = validateMusicPortrait(portrait)

if (!result.valid) {
  console.error("Music portrait validation failed:")
  result.errors.forEach(error => console.error(`- ${error}`))
  process.exitCode = 1
} else {
  console.log(
    `Music portrait validation passed: ${Object.keys(portrait.artists).length} artists and ${Object.keys(portrait.tracks).length} tracks checked.`,
  )
}
