const environment = (
  process.env.SMOKE_ENV ||
  process.env.VERCEL_ENV ||
  (process.env.BASE_URL ? "" : "preview")
).toLowerCase()

if (!["preview", "production"].includes(environment)) {
  throw new Error(
    "Set SMOKE_ENV=preview or SMOKE_ENV=production for deployment checks.",
  )
}

const reviewEnabled =
  environment === "preview" &&
  require("../../../config/design-review.json").enabled
const reviewPaths = [
  "/review/",
  "/review/logos/",
  "/review/about-table/",
  "/review/studio-daylight/",
]

module.exports = { reviewEnabled, reviewPaths }
