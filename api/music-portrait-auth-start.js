const { createOAuthHandler } = require("./_music-beta/http")

const createStartHandler = deps => createOAuthHandler("start", deps)

module.exports = createStartHandler()
module.exports.createStartHandler = createStartHandler
