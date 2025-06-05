export const onClientEntry = () => {
  const unwantedPaths = ["/en-GB", "/en-GB/account", "/account/login"]

  const { pathname } = window.location

  if (unwantedPaths.some(p => pathname.startsWith(p))) {
    console.warn("🚫 Redirect blocked:", pathname)
    window.location.replace("/")
  }
}
