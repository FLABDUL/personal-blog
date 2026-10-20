// gatsby-browser.js
import "prismjs/themes/prism-tomorrow.css";
import "./src/styles/global.css";
import "./src/styles/worlds.css";

export const onClientEntry = () => {
  const blockedPaths = new Set([
    "/en-GB",
    "/en-GB/account",
    "/account/login",
  ]);

  const { pathname } = window.location;

  for (const path of blockedPaths) {
    if (pathname.startsWith(path)) {
      console.warn("🚫 Redirect blocked:", pathname);
      window.location.replace("/");
      break;
    }
  }
};
