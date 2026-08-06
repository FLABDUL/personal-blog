const fs = require("fs")
const path = require("path")
const { spawnSync } = require("child_process")
const { root } = require("./lib")

const getArgument = (name, fallback) => {
  const index = process.argv.indexOf(name)
  return index === -1 ? fallback : process.argv[index + 1]
}

const variantId = getArgument("--variant", "swe")
const variantPath = path.join(
  root,
  "content",
  "cv",
  "variants",
  `${variantId}.json`
)
const variant = JSON.parse(fs.readFileSync(variantPath, "utf8"))
const texPath = path.join(
  root,
  "cv-exports",
  "latex",
  `${variant.outputFile}.tex`
)
const outputDirectory = path.join(root, "output", "pdf")
const bundledTectonic = path.join(root, ".tools", "tectonic", "tectonic.exe")
const compiler =
  process.env.TECTONIC_BIN ||
  (fs.existsSync(bundledTectonic) ? bundledTectonic : "tectonic")

fs.mkdirSync(outputDirectory, { recursive: true })

const result = spawnSync(
  compiler,
  ["-X", "compile", texPath, "--outdir", outputDirectory, "--keep-logs"],
  {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32" && compiler === "tectonic",
  }
)

if (result.error && result.error.code === "ENOENT") {
  console.error(
    "Tectonic is not installed. Run npm run cv:setup-pdf, then retry npm run cv:pdf."
  )
  process.exitCode = 1
} else if (result.status !== 0) {
  console.error(result.stdout || "")
  console.error(result.stderr || "")
  process.exitCode = result.status || 1
} else {
  const pdfPath = path.join(outputDirectory, `${variant.outputFile}.pdf`)
  if (!fs.existsSync(pdfPath)) {
    throw new Error(`Tectonic completed without creating ${pdfPath}`)
  }
  console.log(result.stdout.trim())
  console.log(`Created ${path.relative(root, pdfPath)}`)
}
