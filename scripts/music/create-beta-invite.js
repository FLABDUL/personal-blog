const { createAuthService } = require("../../api/_music-beta/auth-service")
const { runtimeDependencies } = require("../../api/_music-beta/http")

async function run(args, deps, print = console.log) {
  if (args.length !== 1) throw new Error("Provide exactly one friend label")
  const url = await createAuthService(
    deps || runtimeDependencies(),
  ).createInvite(args[0])
  print(url)
}

if (require.main === module) {
  run(process.argv.slice(2)).catch(() => {
    console.error(
      "Unable to create invite. Supply one friend label and check server configuration and capacity.",
    )
    process.exitCode = 1
  })
}

module.exports = { run }
