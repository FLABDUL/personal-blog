const { createOwnerApiHandler } = require("./_music-beta/owner-service")
const createLinkHandler = deps => createOwnerApiHandler("link", deps)
module.exports = createLinkHandler()
module.exports.createLinkHandler = createLinkHandler
