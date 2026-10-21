import React from "react"

export default function BrandIdentity() {
  return (
    <>
      {["light", "dark"].map(tone => (
        <picture className={`brand-mark brand-mark--${tone}`} key={tone}>
          <source
            media="(max-width: 480px)"
            srcSet={`/identity/botanical-seal-${tone}-compact.svg`}
          />
          <img
            src={`/identity/botanical-seal-${tone}.svg`}
            width="64"
            height="64"
            alt=""
          />
        </picture>
      ))}
      <span className="wordmark__name">
        <span>Made by</span> <strong>Hakim</strong>
      </span>
    </>
  )
}
