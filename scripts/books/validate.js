const Ajv = require("ajv")
const fs = require("fs")
const path = require("path")

const root = path.resolve(__dirname, "..", "..")
const booksPath = path.join(root, "content", "books.json")
const schemaPath = path.join(root, "content", "books.schema.json")
const coversDirectory = path.join(root, "static", "books")

const readJson = filePath => JSON.parse(fs.readFileSync(filePath, "utf8"))
const books = readJson(booksPath)
const schema = readJson(schemaPath)
const ajv = new Ajv({ allErrors: true, jsonPointers: true, format: "full" })
const validate = ajv.compile(schema)
const errors = []
const warnings = []

if (!validate(books)) {
  errors.push(
    ...validate.errors.map(
      error =>
        `${error.dataPath || "/"} ${error.message}${
          error.params?.missingProperty
            ? `: ${error.params.missingProperty}`
            : ""
        }`
    )
  )
}

const seenIds = new Set()
const seenBooks = new Set()
const referencedCovers = new Set()
const availableCovers = new Set(fs.readdirSync(coversDirectory))

for (const book of books) {
  if (seenIds.has(book.id)) errors.push(`Duplicate book id: ${book.id}`)
  seenIds.add(book.id)

  const identity = `${book.title}\u0000${book.author}`.toLocaleLowerCase()
  if (seenBooks.has(identity)) {
    errors.push(`Duplicate book: ${book.title} by ${book.author}`)
  }
  seenBooks.add(identity)

  if (!book.cover) {
    warnings.push(`${book.title} has no cover and will use the text fallback.`)
    continue
  }

  const filename = book.cover.replace("/books/", "")
  referencedCovers.add(filename)
  if (!availableCovers.has(filename)) {
    errors.push(`Missing cover for ${book.title}: ${book.cover}`)
  }
}

for (const filename of availableCovers) {
  if (!referencedCovers.has(filename)) {
    warnings.push(`Unreferenced file in static/books: ${filename}`)
  }
}

for (const warning of warnings) console.warn(`Bookshelf warning: ${warning}`)

if (errors.length > 0) {
  console.error(`Bookshelf validation failed:\n- ${errors.join("\n- ")}`)
  process.exitCode = 1
} else {
  console.log(
    `Bookshelf validation passed: ${books.length} books and ${referencedCovers.size} covers checked.`
  )
}
