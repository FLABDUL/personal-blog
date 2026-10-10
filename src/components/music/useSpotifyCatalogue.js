import { useEffect, useState } from "react"

import { validateCatalogueSnapshot } from "../../../api/_spotify/catalogue"

async function loadCatalogue(url, signal) {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error("Catalogue unavailable")
  return validateCatalogueSnapshot(await response.json())
}

export default function useSpotifyCatalogue(url, fallbackUrl = null) {
  const [state, setState] = useState({ status: "loading", catalogue: null })

  useEffect(() => {
    const controller = new AbortController()
    loadCatalogue(url, controller.signal)
      .catch(error => {
        if (error.name === "AbortError" || !fallbackUrl) throw error
        return loadCatalogue(fallbackUrl, controller.signal)
      })
      .then(catalogue => setState({ status: "available", catalogue }))
      .catch(error => {
        if (error.name !== "AbortError")
          setState({ status: "unavailable", catalogue: null })
      })
    return () => controller.abort()
  }, [fallbackUrl, url])

  return state
}
