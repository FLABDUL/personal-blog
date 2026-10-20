import React, { useEffect, useState } from "react"

export default function ThemeControls({ defaultTheme }) {
  const [choice, setChoice] = useState(null)

  useEffect(() => {
    const saved = document.documentElement.dataset.theme
    if (saved === "light" || saved === "dark") setChoice(saved)
  }, [])

  const choose = theme => {
    document.documentElement.dataset.theme = theme
    setChoice(theme)
    try {
      window.localStorage.setItem("madebyhakim-theme", theme)
    } catch {
      // The choice still works for this visit when browser storage is disabled.
    }
  }

  return (
    <div className="theme-controls" role="group" aria-label="Colour theme">
      {["light", "dark"].map(theme => (
        <button
          key={theme}
          type="button"
          aria-pressed={(choice || defaultTheme) === theme}
          onClick={() => choose(theme)}
        >
          <span aria-hidden="true">{theme === "light" ? "☼" : "◐"}</span>
          {theme === "light" ? "Light" : "Dark"}
        </button>
      ))}
    </div>
  )
}
