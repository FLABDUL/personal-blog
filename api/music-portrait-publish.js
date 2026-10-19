const { createOwnerApiHandler } = require("./_music-beta/owner-service")
const createPublishHandler = deps => createOwnerApiHandler("publish", deps)
module.exports = createPublishHandler()
module.exports.createPublishHandler = createPublishHandler
