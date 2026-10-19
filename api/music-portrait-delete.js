const { createOwnerApiHandler } = require("./_music-beta/owner-service")
const createDeleteHandler = deps => createOwnerApiHandler("delete", deps)
module.exports = createDeleteHandler()
module.exports.createDeleteHandler = createDeleteHandler
