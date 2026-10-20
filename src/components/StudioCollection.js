import React, { useEffect, useState } from "react"
import Modal from "./Modal"
import manifest from "../../content/studio/items.json"

export const publishedArt = manifest.items.filter(
  item => item.status === "published",
)

export function ArtImage({ item, priority = false }) {
  return (
    <img
      src={`/design/art/${item.title}.webp`}
      srcSet={`/design/art/${item.title}-480.webp 480w, /design/art/${item.title}-720.webp 720w, /design/art/${item.title}.webp 1000w`}
      sizes="(max-width: 480px) 90vw, (max-width: 760px) 45vw, 600px"
      width={item.media.width}
      height={item.media.height}
      alt={item.alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
    />
  )
}

export default function StudioCollection({ variant = "exhibition" }) {
  const [selected, setSelected] = useState(null)
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(true), [])
  const hero = publishedArt.find(item => item.id === "painting-inferno")
  const works =
    variant === "exhibition"
      ? publishedArt.filter(item => item.id !== hero.id)
      : publishedArt
  const selectedItem = publishedArt.find(item => item.id === selected)
  const move = direction => {
    const index = publishedArt.findIndex(item => item.id === selected)
    setSelected(
      publishedArt[
        (index + direction + publishedArt.length) % publishedArt.length
      ].id,
    )
  }
  const renderWork = (item, featured = false) => (
    <figure
      className={featured ? "studio-feature" : "studio-work"}
      key={item.id}
    >
      <button
        type="button"
        className="art-button"
        disabled={!ready}
        onClick={() => setSelected(item.id)}
        aria-label={`View ${item.title}`}
        aria-haspopup="dialog"
      >
        <ArtImage item={item} priority={featured} />
        <span className="art-button__hint" aria-hidden="true">
          View {item.title} ↗
        </span>
      </button>
      <figcaption>
        <span className="art-number">
          {String(publishedArt.indexOf(item) + 1).padStart(2, "0")}
        </span>
        <h2>{item.title}</h2>
        <span>
          Painting{item.provenance !== "human" ? " · AI-generated" : ""}
        </span>
      </figcaption>
    </figure>
  )
  return (
    <div className={`studio-collection studio-collection--${variant}`}>
      {variant === "exhibition" && (
        <section className="studio-opening" aria-label="Featured painting">
          <div className="studio-opening__copy">
            <p className="eyebrow">Painting / 04</p>
            <p className="studio-statement">
              Colour.
              <br />
              Texture.
              <br />
              <em>Room to look.</em>
            </p>
            <p>Nine paintings by Abdul Hakim Norazman.</p>
            <a className="underlined-link" href="#all-paintings">
              Walk through the collection ↓
            </a>
          </div>
          {renderWork(hero, true)}
        </section>
      )}
      <section id="all-paintings" aria-label="Painting collection">
        <div className="studio-collection__label">
          <span className="eyebrow">
            {variant === "exhibition"
              ? "Continue the exhibition"
              : "The complete collection"}
          </span>
          <span>01—09 / Select a work to look closer</span>
        </div>
        <div className="studio-grid">{works.map(item => renderWork(item))}</div>
      </section>
      {selectedItem && (
        <Modal
          labelId="art-detail-title"
          onClose={() => setSelected(null)}
          className="art-dialog"
        >
          <div
            className="art-dialog__content"
            onKeyDown={event => {
              if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                event.preventDefault()
                move(event.key === "ArrowLeft" ? -1 : 1)
              }
            }}
          >
            <ArtImage item={selectedItem} priority />
            <div className="art-dialog__caption" aria-live="polite">
              <div>
                <p className="eyebrow">
                  Painting · {publishedArt.indexOf(selectedItem) + 1} of{" "}
                  {publishedArt.length}
                </p>
                <h2 id="art-detail-title">{selectedItem.title}</h2>
                {selectedItem.provenance !== "human" && (
                  <p>{selectedItem.aiDisclosure || "AI-generated"}</p>
                )}
              </div>
              <div className="art-controls">
                <button onClick={() => move(-1)} aria-label="Previous painting">
                  ←
                </button>
                <button onClick={() => move(1)} aria-label="Next painting">
                  →
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
