import React, { useEffect, useId, useState } from "react"

export default function PlanetArtwork({ imageUrl, initials, size, variant }) {
  const clipId = `${variant}-artwork-${useId().replaceAll(":", "")}`
  const [failedUrl, setFailedUrl] = useState(null)
  const failed = imageUrl && failedUrl === imageUrl

  useEffect(() => {
    if (!imageUrl) return undefined
    const probe = new window.Image()
    probe.onerror = () => setFailedUrl(imageUrl)
    probe.src = imageUrl
    return () => {
      probe.onerror = null
    }
  }, [imageUrl])

  const artworkSize = variant === "home" ? size * 0.8 : size * 0.72
  const half = artworkSize / 2

  return imageUrl && !failed ? (
    <>
      <defs>
        <clipPath id={clipId}>
          {variant === "home" ? (
            <circle r={half} />
          ) : (
            <rect
              x={-half}
              y={-half}
              width={artworkSize}
              height={artworkSize}
              rx={2}
            />
          )}
        </clipPath>
      </defs>
      <image
        href={imageUrl}
        x={-half}
        y={-half}
        width={artworkSize}
        height={artworkSize}
        preserveAspectRatio={
          variant === "home" ? "xMidYMid slice" : "xMidYMid meet"
        }
        clipPath={`url(#${clipId})`}
        aria-hidden="true"
        pointerEvents="none"
        onError={() => setFailedUrl(imageUrl)}
      />
    </>
  ) : (
    <text
      aria-hidden="true"
      data-artwork-fallback="true"
      fill="#fff4c7"
      fontFamily="Arial, sans-serif"
      fontSize={variant === "catalogue" ? 36 : 24}
      fontWeight="700"
      pointerEvents="none"
      textAnchor="middle"
      dominantBaseline="central"
    >
      {initials}
    </text>
  )
}
