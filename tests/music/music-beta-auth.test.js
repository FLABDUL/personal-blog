const test = require("node:test")
const assert = require("node:assert/strict")
const { createHash } = require("node:crypto")
const { createAuthService } = require("../../api/_music-beta/auth-service")
const {
  requireOwnerSession,
  requireCsrf,
  SESSION_COOKIE,
  TRANSACTION_COOKIE,
} = require("../../api/_music-beta/http")
const { createStartHandler } = require("../../api/music-portrait-auth-start")
const {
  createCallbackHandler,
} = require("../../api/music-portrait-auth-callback")
const { run } = require("../../scripts/music/create-beta-invite")
const { createMusicBetaStore } = require("../../api/_music-beta/store")
const {
  hashCapability,
  decryptSecret,
  encryptSecret,
  verifySession,
  createSession,
  createCsrfToken,
} = require("../../api/_music-beta/security")

const NOW = Date.parse("2090-01-01T00:00:00.000Z")
const WEEK = 7 * 24 * 60 * 60 * 1000
const tokenKey = Buffer.alloc(32, 7)
const sessionKey = Buffer.alloc(32, 8)
const siteOrigin = "https://portrait.example"
const callbackUri = `${siteOrigin}/api/music-portrait-auth-callback`

function setup() {
  const data = new Map()
  const blob = {
    failOwnerWrite: false,
    async get(path) {
      return data.has(path)
        ? { statusCode: 200, stream: new Response(data.get(path)).body }
        : null
    },
    async put(path, body, options) {
      if (this.failOwnerWrite && path.startsWith("music-beta/owners/"))
        throw new Error("sensitive storage failure")
      if (data.has(path) && !options.allowOverwrite) throw new Error("exists")
      data.set(path, body)
    },
    async list({ prefix }) {
      return {
        blobs: [...data.keys()]
          .filter(p => p.startsWith(prefix))
          .map(pathname => ({ pathname })),
        hasMore: false,
      }
    },
    async del(path) {
      data.delete(path)
    },
  }
  const calls = []
  const diagnostics = []
  let currentTime = NOW
  const deps = {
    store: createMusicBetaStore(blob),
    siteOrigin,
    clientId: "fixture-client",
    clientSecret: "fixture-secret",
    tokenKey,
    sessionKey,
    now: () => currentTime,
    diagnostic: event => diagnostics.push(event),
    fetchImpl: async (url, options) => {
      calls.push({ url, options })
      if (url.endsWith("/api/token")) {
        const code = options.body.get("code")
        if (code === "upstream-failure")
          throw new Error("sensitive upstream payload")
        return Response.json({
          access_token: code,
          refresh_token: `refresh-${code}`,
          token_type: "Bearer",
          expires_in: 3600,
          scope: "user-top-read",
        })
      }
      return Response.json({
        id: options.headers.Authorization.slice(7),
        display_name: "Fixture listener",
      })
    },
  }
  return {
    deps,
    data,
    blob,
    calls,
    diagnostics,
    auth: createAuthService(deps),
    setTime: value => {
      currentTime = value
    },
  }
}

function request(query = {}, cookie = "") {
  return { method: "GET", query, headers: { cookie } }
}

async function invoke(handler, req) {
  const res = {
    headers: {},
    statusCode: 200,
    body: undefined,
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value
    },
    status(code) {
      this.statusCode = code
      return this
    },
    json(body) {
      this.body = body
      return this
    },
    end() {
      return this
    },
  }
  await handler(req, res)
  return res
}

const cookiePair = value => value.split(";")[0]
const cookieValue = value => cookiePair(value).slice(value.indexOf("=") + 1)

async function begin(context) {
  const url = await context.auth.createInvite("Fixture friend")
  const invite = new URL(url).searchParams.get("invite")
  const response = await invoke(
    createStartHandler(context.deps),
    request({ invite }),
  )
  assert.equal(response.statusCode, 302)
  return {
    invite,
    state: new URL(response.headers.location).searchParams.get("state"),
    cookie: cookiePair(response.headers["set-cookie"]),
    response,
  }
}

const finish = (context, started, code = "listener-one") =>
  invoke(
    createCallbackHandler(context.deps),
    request({ code, state: started.state }, started.cookie),
  )

test("invite script requires exactly one label, stores only hash and seven-day expiry and prints one URL", async () => {
  const ctx = setup()
  for (const args of [[], ["one", "two"], [" "]])
    await assert.rejects(
      run(args, ctx.deps, () => assert.fail("must not print")),
    )
  const printed = []
  await run(["Fixture friend"], ctx.deps, value => printed.push(value))
  assert.equal(printed.length, 1)
  const url = new URL(printed[0])
  assert.equal(url.origin + url.pathname, `${siteOrigin}/music/create/`)
  const raw = url.searchParams.get("invite")
  const saved = JSON.parse(
    ctx.data.get(`music-beta/invites/${hashCapability(raw)}.json`),
  )
  assert.deepEqual(saved, {
    inviteHash: hashCapability(raw),
    expiresAt: new Date(NOW + WEEK).toISOString(),
  })
  assert.ok(!JSON.stringify([...ctx.data]).includes(raw))
  assert.ok(!JSON.stringify([...ctx.data]).includes("Fixture friend"))
})

test("start checks missing, malformed, unknown, expired and consumed invites", async () => {
  const ctx = setup()
  const handler = createStartHandler(ctx.deps)
  for (const invite of [
    undefined,
    "bad",
    Buffer.alloc(32, 1).toString("base64url"),
    ["one", "two"],
  ]) {
    const res = await invoke(handler, request({ invite }))
    assert.equal(res.statusCode, 400)
    assert.deepEqual(res.body, { error: "Unable to authorise music portrait" })
  }
  const started = await begin(ctx)
  ctx.setTime(NOW + WEEK)
  assert.equal(
    (await invoke(handler, request({ invite: started.invite }))).statusCode,
    400,
  )
  ctx.setTime(NOW)
  assert.equal((await finish(ctx, started)).statusCode, 302)
  assert.equal(
    (await invoke(handler, request({ invite: started.invite }))).statusCode,
    400,
  )
})

test("start binds exact callback URI, only user-top-read and secure seven-day transaction cookie", async () => {
  const ctx = setup()
  const { response, invite } = await begin(ctx)
  const url = new URL(response.headers.location)
  assert.equal(
    url.origin + url.pathname,
    "https://accounts.spotify.com/authorize",
  )
  assert.equal(url.searchParams.get("redirect_uri"), callbackUri)
  assert.equal(url.searchParams.get("scope"), "user-top-read")
  assert.equal(url.searchParams.get("code_challenge_method"), "S256")
  const cookie = response.headers["set-cookie"]
  assert.ok(cookie.startsWith(`${TRANSACTION_COOKIE}=`))
  for (const flag of [
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Path=/",
    "Max-Age=604800",
    `Expires=${new Date(NOW + WEEK).toUTCString()}`,
  ])
    assert.ok(cookie.includes(flag))
  assert.ok(!cookie.includes(invite))
  assert.equal(response.headers["cache-control"], "no-store")
  assert.equal(response.headers["referrer-policy"], "no-referrer")
})

test("callback validates transaction, state, expiry and PKCE before any upstream call", async () => {
  const ctx = setup()
  const started = await begin(ctx)
  const callback = createCallbackHandler(ctx.deps)
  for (const req of [
    request({ code: "secret-code", state: started.state }),
    request({ code: "secret-code", state: "wrong" }, started.cookie),
    request(
      { code: "secret-code", state: [started.state, started.state] },
      started.cookie,
    ),
    request({ error: "secret-error", state: started.state }, started.cookie),
    request(
      { code: "secret-code", state: started.state },
      `${started.cookie}broken`,
    ),
  ]) {
    const res = await invoke(callback, req)
    assert.equal(res.statusCode, 400)
    assert.deepEqual(res.body, { error: "Unable to authorise music portrait" })
  }
  const encrypted = JSON.parse(
    Buffer.from(cookieValue(started.cookie), "base64url").toString(),
  )
  const transaction = JSON.parse(decryptSecret(encrypted, { 1: tokenKey }))
  transaction.codeVerifier = "bad"
  const forged = Buffer.from(
    JSON.stringify(encryptSecret(JSON.stringify(transaction), tokenKey, 1)),
  ).toString("base64url")
  assert.equal(
    (
      await invoke(
        callback,
        request(
          { code: "secret-code", state: started.state },
          `${TRANSACTION_COOKIE}=${forged}`,
        ),
      )
    ).statusCode,
    400,
  )
  ctx.setTime(NOW + WEEK)
  assert.equal((await finish(ctx, started)).statusCode, 400)
  assert.equal(ctx.calls.length, 0)
})

test("callback binds account, encrypts refresh token, consumes invite and signs owner session", async () => {
  const ctx = setup()
  const started = await begin(ctx)
  const res = await finish(ctx, started)
  assert.equal(res.statusCode, 302)
  assert.equal(res.headers.location, "/music/create/")
  const sessionCookie = res.headers["set-cookie"].find(value =>
    value.startsWith(`${SESSION_COOKIE}=`),
  )
  for (const flag of [
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Path=/",
    "Max-Age=604800",
  ])
    assert.ok(sessionCookie.includes(flag))
  assert.ok(
    res.headers["set-cookie"].some(
      value =>
        value.startsWith(`${TRANSACTION_COOKIE}=`) &&
        value.includes("Max-Age=0"),
    ),
  )
  const session = verifySession(cookieValue(sessionCookie), sessionKey, NOW)
  assert.equal(session.expiresAt, NOW + WEEK)
  const owner = await ctx.deps.store.readOwner(session.ownerId)
  assert.equal(owner.spotifyUserId, "listener-one")
  assert.equal(owner.inviteHash, hashCapability(started.invite))
  assert.equal(
    decryptSecret(owner.encryptedRefreshToken, { 1: tokenKey }),
    "refresh-listener-one",
  )
  assert.equal(owner.boundUserNumber, 1)
  assert.equal(owner.sessionVersion, 1)
  assert.equal(await ctx.deps.store.readInvite(started.invite, NOW), null)
  const exchange = ctx.calls[0].options.body
  assert.equal(exchange.get("redirect_uri"), callbackUri)
  const url = new URL(started.response.headers.location)
  assert.equal(
    createHash("sha256")
      .update(exchange.get("code_verifier"))
      .digest("base64url"),
    url.searchParams.get("code_challenge"),
  )
  const persisted = JSON.stringify([...ctx.data])
  for (const secret of [
    started.invite,
    "refresh-listener-one",
    exchange.get("code_verifier"),
  ])
    assert.ok(!persisted.includes(secret))
})

test("replay and a different Spotify account cannot reuse an invite or drift capacity, even after deletion", async () => {
  const ctx = setup()
  const started = await begin(ctx)
  const res = await finish(ctx, started)
  for (const account of ["listener-one", "listener-two"])
    assert.equal((await finish(ctx, started, account)).statusCode, 400)
  assert.equal(await ctx.deps.store.countActiveOwners(), 1)
  const ownerId = verifySession(
    cookieValue(res.headers["set-cookie"][0]),
    sessionKey,
    NOW,
  ).ownerId
  await ctx.deps.store.deleteOwnerData(ownerId)
  assert.equal((await finish(ctx, started, "listener-two")).statusCode, 400)
  assert.equal(await ctx.deps.store.countActiveOwners(), 0)
})

test("concurrent callbacks from separate services cannot bind one invite twice", async () => {
  const ctx = setup()
  const started = await begin(ctx)
  const other = {
    ...ctx,
    deps: { ...ctx.deps, store: createMusicBetaStore(ctx.blob) },
  }
  const results = await Promise.all([
    finish(ctx, started, "listener-a"),
    finish(other, started, "listener-b"),
  ])
  assert.equal(results.filter(res => res.statusCode === 302).length, 1)
  assert.equal(await ctx.deps.store.countActiveOwners(), 1)
})

test("five-owner cap survives concurrent admission and refuses new invite creation", async () => {
  const ctx = setup()
  for (let i = 0; i < 4; i++)
    assert.equal(
      (await finish(ctx, await begin(ctx), `listener-${i}`)).statusCode,
      302,
    )
  const first = await begin(ctx)
  const second = await begin(ctx)
  const other = {
    ...ctx,
    deps: { ...ctx.deps, store: createMusicBetaStore(ctx.blob) },
  }
  const results = await Promise.all([
    finish(ctx, first, "listener-4"),
    finish(other, second, "listener-5"),
  ])
  assert.equal(results.filter(res => res.statusCode === 302).length, 1)
  assert.equal(await ctx.deps.store.countActiveOwners(), 5)
  await assert.rejects(ctx.auth.createInvite("Another friend"))
  const rejected = results[0].statusCode === 302 ? second : first
  assert.equal((await finish(ctx, rejected, "listener-six")).statusCode, 400)
  assert.equal(await ctx.deps.store.countActiveOwners(), 5)
})

test("existing Spotify account is not overwritten by a second invite", async () => {
  const ctx = setup()
  await finish(ctx, await begin(ctx))
  const second = await begin(ctx)
  assert.equal((await finish(ctx, second)).statusCode, 400)
  assert.equal(await ctx.deps.store.countActiveOwners(), 1)
  assert.ok(await ctx.deps.store.readInvite(second.invite, NOW))
  assert.ok(ctx.diagnostics.some(event => event.category === "already_bound"))
})

test("reserved admission lease cannot collide with an owner derived from the same Spotify text", async () => {
  const ctx = setup()
  const res = await finish(
    ctx,
    await begin(ctx),
    "music-beta-system:admission:v1",
  )
  assert.equal(res.statusCode, 302)
  const session = verifySession(
    cookieValue(res.headers["set-cookie"][0]),
    sessionKey,
    NOW,
  )
  assert.match(session.ownerId, /^spotify-owner:[a-f0-9]{64}$/)
  assert.notEqual(session.ownerId, "music-beta-system:admission:v1")
  assert.ok(
    ![...ctx.data.keys()].some(path => path.startsWith("music-beta/leases/")),
  )
})

test("separate transactions cannot swap OAuth state and all callback exits clear the transaction cookie", async () => {
  const ctx = setup()
  const first = await begin(ctx)
  const second = await begin(ctx)
  const handler = createCallbackHandler(ctx.deps)
  const attempts = [
    request({ code: "fixture", state: first.state }, second.cookie),
    { ...request(), method: "POST" },
    request({ error: "access_denied", state: first.state }, first.cookie),
    request({ code: "upstream-failure", state: first.state }, first.cookie),
    request({ code: "listener-new", state: first.state }, first.cookie),
  ]
  for (const req of attempts) {
    const res = await invoke(handler, req)
    assert.ok(
      res.headers["set-cookie"].some(
        value =>
          value.startsWith(`${TRANSACTION_COOKIE}=`) &&
          value.includes("Max-Age=0"),
      ),
    )
  }
  assert.equal(await ctx.deps.store.countActiveOwners(), 1)
})

test("partial storage failure fails closed without a session or reusable spent invite", async () => {
  const ctx = setup()
  const started = await begin(ctx)
  ctx.blob.failOwnerWrite = true
  const res = await finish(ctx, started)
  assert.equal(res.statusCode, 400)
  assert.ok(
    !res.headers["set-cookie"].some(value =>
      value.startsWith(`${SESSION_COOKIE}=`),
    ),
  )
  assert.equal(await ctx.deps.store.countActiveOwners(), 0)
  assert.equal(await ctx.deps.store.readInvite(started.invite, NOW), null)
})

test("HTTP guards enforce current signed session and exact-session CSRF with same-origin requests", async () => {
  const ctx = setup()
  const res = await finish(ctx, await begin(ctx))
  const pair = cookiePair(res.headers["set-cookie"][0])
  const req = request({}, pair)
  const session = await requireOwnerSession(req, ctx.deps)
  const csrf = createCsrfToken(cookieValue(pair), sessionKey)
  req.method = "POST"
  req.headers.origin = siteOrigin
  req.headers["x-csrf-token"] = csrf
  assert.doesNotThrow(() => requireCsrf(req, session, ctx.deps))
  delete req.headers.origin
  assert.throws(() =>
    requireCsrf(req, session, { ...ctx.deps, siteOrigin: undefined }),
  )
  assert.throws(() => requireCsrf(req, session, ctx.deps))
  req.headers.origin = "https://attacker.example"
  assert.throws(() => requireCsrf(req, session, ctx.deps))
  req.headers.origin = siteOrigin
  req.headers["x-csrf-token"] = "bad"
  assert.throws(() => requireCsrf(req, session, ctx.deps))
  const replacement = createSession(
    {
      ...verifySession(cookieValue(pair), sessionKey, NOW),
      expiresAt: NOW + WEEK - 1,
    },
    sessionKey,
  )
  req.headers.cookie = `${SESSION_COOKIE}=${replacement}`
  req.headers["x-csrf-token"] = csrf
  assert.throws(() => requireCsrf(req, session, ctx.deps))
  for (const cookie of ["", `${pair}tampered`, `${pair}; ${pair}`])
    await assert.rejects(requireOwnerSession(request({}, cookie), ctx.deps))
  ctx.setTime(NOW + WEEK)
  await assert.rejects(requireOwnerSession(request({}, pair), ctx.deps))
  ctx.setTime(NOW)
  const owner = await ctx.deps.store.readOwner(session.ownerId)
  await ctx.deps.store.writeOwner({ ...owner, sessionVersion: 2 })
  await assert.rejects(requireOwnerSession(request({}, pair), ctx.deps))
  await ctx.deps.store.deleteOwnerData(owner.ownerId)
  await assert.rejects(requireOwnerSession(request({}, pair), ctx.deps))
})

test("method and upstream failures expose only generic errors and allowlisted diagnostics", async () => {
  const ctx = setup()
  for (const factory of [createStartHandler, createCallbackHandler]) {
    const res = await invoke(factory(ctx.deps), {
      ...request(),
      method: "POST",
    })
    assert.equal(res.statusCode, 405)
    assert.equal(res.headers.allow, "GET")
  }
  const started = await begin(ctx)
  const res = await finish(ctx, started, "upstream-failure")
  assert.equal(res.statusCode, 400)
  assert.deepEqual(res.body, { error: "Unable to authorise music portrait" })
  assert.ok(ctx.diagnostics.length > 0)
  for (const event of ctx.diagnostics) {
    assert.deepEqual(Object.keys(event).sort(), ["category", "operation"])
    assert.ok(["start", "callback", "invite"].includes(event.operation))
    assert.equal(event.category, "authorisation_failed")
  }
  assert.ok(!JSON.stringify(ctx.diagnostics).includes(started.invite))
})

for (const kind of [
  "revoked proxy",
  "forged AuthError prototype",
  "throwing category getter",
  "modified category property",
]) {
  test(`auth boundaries sanitise a ${kind} without inspecting the rejection`, async () => {
    for (const operation of ["invite", "start", "callback"]) {
      const ctx = setup()
      const started = await begin(ctx)
      let genuine
      await ctx.auth.start(request()).catch(error => {
        genuine = error
      })
      let reads = 0
      let hostile
      if (kind === "revoked proxy") {
        const revocable = Proxy.revocable({}, {})
        hostile = revocable.proxy
        revocable.revoke()
      } else if (kind === "forged AuthError prototype") {
        hostile = Object.create(Object.getPrototypeOf(genuine))
        hostile.category = "private-forged-category"
      } else if (kind === "throwing category getter") {
        hostile = Object.create(Object.getPrototypeOf(genuine))
        Object.defineProperty(hostile, "category", {
          get() {
            reads++
            throw new Error("private-getter-error")
          },
        })
      } else {
        hostile = genuine
        hostile.category = "private-modified-category"
        hostile.message = "private-modified-message"
      }
      const reject = async () => {
        throw hostile
      }
      const deps = {
        ...ctx.deps,
        store: {
          ...ctx.deps.store,
          readInvite: reject,
          withOwnerLease: reject,
        },
      }
      const auth = createAuthService(deps)
      const req =
        operation === "callback"
          ? request(
              { code: "fixture-code", state: started.state },
              started.cookie,
            )
          : request({ invite: started.invite })
      ctx.diagnostics.length = 0
      let sanitised
      await (
        operation === "invite"
          ? auth.createInvite("Fixture friend")
          : auth[operation](req)
      ).catch(error => {
        sanitised = error
      })
      assert.ok(sanitised)
      assert.notEqual(sanitised, hostile)
      assert.equal(sanitised.message, "Unable to authorise music portrait")
      assert.deepEqual(Object.keys(sanitised), ["category"])
      assert.equal(sanitised.category, "authorisation_failed")
      assert.equal(reads, 0)
      assert.deepEqual(ctx.diagnostics, [
        { operation, category: "authorisation_failed" },
      ])

      ctx.diagnostics.length = 0
      if (operation === "invite") {
        await assert.rejects(
          run(["Fixture friend"], deps, () => assert.fail("must not print")),
          {
            message: "Unable to authorise music portrait",
            category: "authorisation_failed",
          },
        )
      } else {
        const factory =
          operation === "start" ? createStartHandler : createCallbackHandler
        const response = await invoke(factory(deps), req)
        assert.equal(response.statusCode, 400)
        assert.deepEqual(response.body, {
          error: "Unable to authorise music portrait",
        })
        assert.equal(response.headers["cache-control"], "no-store")
        if (operation === "callback")
          assert.ok(response.headers["set-cookie"][0].includes("Max-Age=0"))
      }
      assert.equal(reads, 0)
      assert.deepEqual(ctx.diagnostics, [
        { operation, category: "authorisation_failed" },
      ])
    }
  })
}

test("private metadata preserves already_bound when its public category is replaced by a throwing getter", async () => {
  const ctx = setup()
  const started = await begin(ctx)
  await finish(ctx, started)
  const second = await begin(ctx)
  let genuine
  await ctx.auth
    .callback(
      request({ code: "listener-one", state: second.state }, second.cookie),
    )
    .catch(error => {
      genuine = error
    })
  assert.equal(genuine.category, "already_bound")
  let reads = 0
  Object.defineProperty(genuine, "category", {
    get() {
      reads++
      throw new Error("private-category-error")
    },
  })
  const deps = {
    ...ctx.deps,
    store: {
      readInvite: async () => {
        throw genuine
      },
    },
  }
  ctx.diagnostics.length = 0
  let sanitised
  await createAuthService(deps)
    .start(request({ invite: second.invite }))
    .catch(error => {
      sanitised = error
    })
  assert.notEqual(sanitised, genuine)
  assert.equal(sanitised.message, "Unable to authorise music portrait")
  assert.deepEqual(Object.keys(sanitised), ["category"])
  assert.equal(sanitised.category, "already_bound")
  assert.equal(reads, 0)
  assert.deepEqual(ctx.diagnostics, [
    { operation: "start", category: "already_bound" },
  ])
})
