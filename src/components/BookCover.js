import React, { useEffect, useRef, useState } from "react"

export default function BookCover({ book, detail = false }) {
  const [failedCover, setFailedCover] = useState(null)
  const image = useRef(null)
  useEffect(() => {
    // A server-rendered image can fail before React attaches its error handler.
    if (image.current?.complete && image.current.naturalWidth === 0) {
      setFailedCover(book.cover)
    }
  }, [book.cover])
  if (!book.cover || failedCover === book.cover) {
    return (
      <span className="book-cover-fallback" aria-hidden="true">
        <small>Cover unavailable</small>
        <strong>{book.title}</strong>
        <span>{book.author}</span>
      </span>
    )
  }
  return (
    <img
      ref={image}
      src={book.cover}
      alt={detail ? `Cover of ${book.title}` : ""}
      loading={detail ? "eager" : "lazy"}
      decoding="async"
      width={detail ? 420 : 280}
      height={detail ? 630 : 420}
      onError={() => setFailedCover(book.cover)}
    />
  )
}
