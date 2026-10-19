const { createOwnerApiHandler } = require("./_music-beta/owner-service")
const createOwnerHandler = deps => createOwnerApiHandler("owner", deps)
module.exports = createOwnerHandler()
module.exports.createOwnerHandler = createOwnerHandler
