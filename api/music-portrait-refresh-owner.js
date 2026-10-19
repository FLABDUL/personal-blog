const { createOwnerApiHandler } = require("./_music-beta/owner-service")
const createRefreshOwnerHandler = deps => createOwnerApiHandler("refresh", deps)
module.exports = createRefreshOwnerHandler()
module.exports.createRefreshOwnerHandler = createRefreshOwnerHandler
