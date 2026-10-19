const { createOAuthHandler } = require("./_music-beta/http")

const createCallbackHandler = deps => createOAuthHandler("callback", deps)

module.exports = createCallbackHandler()
module.exports.createCallbackHandler = createCallbackHandler
