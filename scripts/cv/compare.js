const fs = require("fs")
const path = require("path")
const mammoth = require("mammoth")
const pdfParse = require("pdf-parse")
const {
  collectContentStrings,
  readMasterCv,
  reportsDirectory,
  root,
} = require("./lib")

const supportedExtensions = new Set([".docx", ".md", ".pdf", ".txt"])
const maximumFileSize = 25 * 1024 * 1024

const normalize = value =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9+#.%]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()

const tokens = value =>
  new Set(normalize(value).split(" ").filter(token => token.length > 2))

const similarity = (left, right) => {
  const leftTokens = tokens(left)
  const rightTokens = tokens(right)
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0

  let intersection = 0
  for (const token of leftTokens) {
    if (rightTokens.has(token)) intersection += 1
  }

  return intersection / Math.min(leftTokens.size, rightTokens.size)
}

const splitCandidates = text =>
  text
    .replace(/\r/g, "")
    .split(/\n+|(?<=[.!?])\s+(?=[A-Z0-9])/)
    .map(line => line.replace(/^[\s•●▪◦\-–—*]+/, "").trim())
    .filter(line => line.length >= 35 && line.length <= 600)

const collectFiles = inputPath => {
  const stats = fs.statSync(inputPath)
  if (stats.isFile()) return [inputPath]

  const files = []
  const visit = directory => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name.startsWith("~$")) continue
      const entryPath = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        visit(entryPath)
      } else if (supportedExtensions.has(path.extname(entry.name).toLowerCase())) {
        files.push(entryPath)
      }
    }
  }
  visit(inputPath)
  return files
}

const extractText = async filePath => {
  const extension = path.extname(filePath).toLowerCase()
  const stats = fs.statSync(filePath)
  if (stats.size > maximumFileSize) {
    throw new Error("file exceeds the 25 MB safety limit")
  }

  if (extension === ".docx") {
    const result = await mammoth.extractRawText({ path: filePath })
    return result.value
  }

  if (extension === ".pdf") {
    const result = await pdfParse(fs.readFileSync(filePath))
    return result.text
  }

  return fs.readFileSync(filePath, "utf8")
}

const escapeTableCell = value => value.replace(/\|/g, "\\|")

const main = async () => {
  const input = process.argv.slice(2).find(argument => !argument.startsWith("-"))
  if (!input) {
    throw new Error(
      'Provide a CV file or folder, for example: npm run cv:compare -- "C:\\path\\to\\career"'
    )
  }

  const inputPath = path.resolve(input)
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input does not exist: ${inputPath}`)
  }

  const masterFragments = collectContentStrings(readMasterCv()).filter(
    fragment => fragment.length >= 20
  )
  const files = collectFiles(inputPath)
  const findings = []
  const skipped = []

  for (const filePath of files) {
    try {
      const text = await extractText(filePath)
      const candidates = splitCandidates(text)

      for (const candidate of candidates) {
        const bestScore = masterFragments.reduce(
          (best, fragment) => Math.max(best, similarity(candidate, fragment)),
          0
        )

        if (bestScore < 0.72) {
          findings.push({
            source: path.relative(inputPath, filePath) || path.basename(filePath),
            score: bestScore,
            candidate,
          })
        }
      }
    } catch (error) {
      skipped.push({
        source: path.relative(inputPath, filePath) || path.basename(filePath),
        reason: error.message,
      })
    }
  }

  const deduplicated = Array.from(
    new Map(findings.map(finding => [normalize(finding.candidate), finding])).values()
  )
    .sort((left, right) => left.score - right.score)
    .slice(0, 250)

  const report = [
    "# CV comparison report",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Input: ${inputPath}`,
    `Files inspected: ${files.length}`,
    "",
    "> Review only: this report never edits the master CV or publishes anything. A candidate may be new, differently worded, or intentionally omitted.",
    "",
    "## Candidate additions or conflicts",
    "",
    deduplicated.length
      ? "| Source | Match | Candidate text |\n| --- | ---: | --- |\n" +
        deduplicated
          .map(
            finding =>
              `| ${escapeTableCell(finding.source)} | ${Math.round(
                finding.score * 100
              )}% | ${escapeTableCell(finding.candidate)} |`
          )
          .join("\n")
      : "No substantial unmatched text was found.",
    "",
    "## Skipped files",
    "",
    skipped.length
      ? skipped
          .map(item => `- ${item.source}: ${item.reason}`)
          .join("\n")
      : "None.",
  ].join("\n")

  fs.mkdirSync(reportsDirectory, { recursive: true })
  const reportPath = path.join(reportsDirectory, "latest.md")
  fs.writeFileSync(reportPath, `${report.trim()}\n`)

  console.log(
    `Compared ${files.length} file(s); wrote ${deduplicated.length} review candidate(s) to ${path.relative(
      root,
      reportPath
    )}.`
  )
}

main().catch(error => {
  console.error(`CV comparison failed: ${error.message}`)
  process.exitCode = 1
})
