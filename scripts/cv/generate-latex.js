const fs = require("fs")
const path = require("path")
const { readMasterCv, root } = require("./lib")

const readJson = filePath => JSON.parse(fs.readFileSync(filePath, "utf8"))

const getArgument = (name, fallback) => {
  const index = process.argv.indexOf(name)
  return index === -1 ? fallback : process.argv[index + 1]
}

const normalizeTypography = value =>
  value
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')

const escapeLatex = value =>
  normalizeTypography(String(value)).replace(
    /[\\{}$&#_%~^]/g,
    character =>
      ({
        "\\": "\\textbackslash{}",
        "{": "\\{",
        "}": "\\}",
        $: "\\$",
        "&": "\\&",
        "#": "\\#",
        _: "\\_",
        "%": "\\%",
        "~": "\\textasciitilde{}",
        "^": "\\textasciicircum{}",
      }[character])
  )

const escapeUrl = value => String(value).replace(/([%#])/g, "\\$1")

const renderText = (value, emphasis) => {
  const source = normalizeTypography(String(value))
  const terms = emphasis
    .filter(term => source.includes(term))
    .sort((left, right) => right.length - left.length)

  if (terms.length === 0) return escapeLatex(source)

  const pattern = new RegExp(
    `(${terms
      .map(term => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|")})`,
    "g"
  )

  return source
    .split(pattern)
    .filter(Boolean)
    .map(part =>
      terms.includes(part)
        ? `\\textbf{${escapeLatex(part)}}`
        : escapeLatex(part)
    )
    .join("")
}

const findById = (items, id, description) => {
  const item = items.find(candidate => candidate.id === id)
  if (!item) throw new Error(`${description} not found: ${id}`)
  return item
}

const ensureIndex = (items, index, description) => {
  if (!Number.isInteger(index) || index < 0 || index >= items.length) {
    throw new Error(`${description} index is invalid: ${index}`)
  }
  return items[index]
}

const resolveReference = (cv, reference) => {
  if (reference.source === "experience") {
    const role = findById(
      cv.professionalExperience,
      reference.roleId,
      "Experience role"
    )
    return ensureIndex(
      role.highlights,
      reference.highlightIndex,
      `${role.id} highlight`
    )
  }

  if (reference.source === "professionalDevelopment") {
    const group = findById(
      cv.professionalDevelopment,
      reference.groupId,
      "Professional-development group"
    )
    return ensureIndex(group.items, reference.itemIndex, `${group.id} item`)
  }

  if (reference.source === "engineeringWork") {
    const group = findById(
      cv.engineeringWork,
      reference.groupId,
      "Engineering-work group"
    )
    return findById(group.items, reference.itemId, "Engineering-work item")
      .description
  }

  if (reference.source === "education") {
    return ensureIndex(
      cv.education.details,
      reference.detailIndex,
      "Education detail"
    )
  }

  if (reference.source === "universityLeadership") {
    return ensureIndex(
      cv.universityLeadership.highlights,
      reference.highlightIndex,
      "University-leadership highlight"
    )
  }

  throw new Error(`Unsupported CV content source: ${reference.source}`)
}

const joinReferences = (cv, references) =>
  references.map(reference => resolveReference(cv, reference)).join(" ")

const getContact = (cv, label) => {
  const contact = cv.profile.contacts.find(item => item.label === label)
  if (!contact) throw new Error(`Profile contact not found: ${label}`)
  return contact.href
}

const variantId = getArgument("--variant", "swe")
const cv = readMasterCv()
const variantPath = path.join(
  root,
  "content",
  "cv",
  "variants",
  `${variantId}.json`
)
const variant = readJson(variantPath)
const privatePath = path.join(root, "content", "cv", "private.local.json")
const privateData = fs.existsSync(privatePath) ? readJson(privatePath) : {}
const mobile = process.env.CV_MOBILE || privateData.mobile || ""

const email = getContact(cv, "Email").replace(/^mailto:/, "")
const linkedIn = getContact(cv, "LinkedIn")
const linkedInLabel = linkedIn
  .replace(/^https?:\/\/(www\.)?/, "")
  .replace(/\/$/, "")
const websiteLabel = variant.website
  .replace(/^https?:\/\/(www\.)?/, "www.")
  .replace(/\/$/, "")

for (const row of variant.skillRows) {
  const skill = findById(cv.skills, row.skillId, "Skill group")
  for (const value of row.values) {
    if (!skill.detail.includes(value)) {
      throw new Error(
        `${value} is no longer present in master skill ${skill.id}`
      )
    }
  }
}

const contactLines = [
  mobile ? `Mobile: ${escapeLatex(mobile)} \\\\` : "",
  `Email: \\href{mailto:${escapeUrl(email)}}{${escapeLatex(email)}} \\\\`,
  `LinkedIn: \\href{${escapeUrl(linkedIn)}}{${escapeLatex(
    linkedInLabel
  )}} \\\\`,
  `Website: \\href{${escapeUrl(variant.website)}}{${escapeLatex(
    websiteLabel
  )}}`,
]
  .filter(Boolean)
  .join("\n")

const skillLines = variant.skillRows
  .map(
    row =>
      `\\textbf{${escapeLatex(row.label)}:} ${row.values
        .map(escapeLatex)
        .join(", ")} \\\\`
  )
  .join("\n")
  .replace(/ \\\\\s*$/, "")

const experienceBlocks = variant.experience
  .map(entry => {
    const bullets = entry.highlights
      .map(
        references =>
          `    \\item ${renderText(
            joinReferences(cv, references),
            variant.emphasis
          )}`
      )
      .join("\n")

    return `\\textbf{${escapeLatex(entry.company)}, ${escapeLatex(
      entry.location
    )}} \\hfill \\textit{${escapeLatex(entry.period)}} \\\\
\\textit{${escapeLatex(entry.role)}} \\\\
\\textit{\\textbf{${escapeLatex(entry.team)}}}
\\begin{itemize}
${bullets}
\\end{itemize}`
  })
  .join("\n\n")

const developmentBullets = variant.development
  .map(
    reference =>
      `    \\item ${renderText(
        resolveReference(cv, reference),
        variant.emphasis
      )}`
  )
  .join("\n")

const educationBullets = variant.educationBullets
  .map(
    references =>
      `    \\item ${renderText(
        joinReferences(cv, references),
        variant.emphasis
      )}`
  )
  .join("\n")

const tex = `\\documentclass[11pt,a4paper]{article}

\\usepackage[margin=1.2cm]{geometry}
\\usepackage[colorlinks=true, linkcolor=black, urlcolor=blue]{hyperref}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage{setspace}
\\usepackage{parskip}

\\pagestyle{empty}
\\setstretch{1.0}
\\emergencystretch=2em
\\hyphenpenalty=10000
\\setlist[itemize]{leftmargin=1.5em, noitemsep, topsep=1pt}
\\titleformat{\\section}{\\bfseries\\uppercase}{}{0em}{}[\\titlerule]
\\titlespacing*{\\section}{0pt}{5pt}{3pt}

\\begin{document}

\\begin{center}
    {\\Large \\textbf{${escapeLatex(cv.profile.name.toUpperCase())}}} \\\\[4pt]
${contactLines
  .split("\n")
  .map(line => `    ${line}`)
  .join("\n")}
\\end{center}

\\section*{Personal Summary}
${renderText(variant.summary, variant.emphasis)}

\\section*{Technologies}
${skillLines}

\\section*{Experience}

${experienceBlocks}

\\section*{Personal Development}
\\begin{itemize}
${developmentBullets}
\\end{itemize}

\\section*{Education}

\\textbf{${escapeLatex(
  cv.education.institution
)}, Edinburgh} \\hfill \\textit{${escapeLatex(cv.education.period)}} \\\\
\\textit{${escapeLatex(cv.education.qualification)}}
\\begin{itemize}
${educationBullets}
\\end{itemize}

\\end{document}
`

const outputDirectory = path.join(root, "cv-exports", "latex")
const outputPath = path.join(outputDirectory, `${variant.outputFile}.tex`)
fs.mkdirSync(outputDirectory, { recursive: true })
fs.writeFileSync(outputPath, tex)

console.log(`Generated ${path.relative(root, outputPath)}`)
console.log(
  mobile
    ? "Included mobile number from private.local.json or CV_MOBILE."
    : "No mobile number supplied; add content/cv/private.local.json or CV_MOBILE."
)
