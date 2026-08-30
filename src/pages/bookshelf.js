import React, { useState } from "react"
import Layout from "../components/Layout"
import Seo from "../components/Seo"
import books from "../../content/books.json"

const booksByNewest = [...books].sort((first, second) =>
  second.added.localeCompare(first.added)
)
const categories = [
  "All",
  "Software Engineering",
  "Technology",
  "Finance",
  "Health & Science",
  "Personal Growth",
  "Other",
]

export default function BookshelfPage() {
  const [activeCategory, setActiveCategory] = useState("All")
  const visibleBooks =
    activeCategory === "All"
      ? booksByNewest
      : booksByNewest.filter(book => book.category === activeCategory)

  return (
    <Layout wide>
      <header className="bookshelf-header">
        <p className="bookshelf-eyebrow">Reading archive</p>
        <h1>Bookshelf</h1>
        <p>Books I have read and wanted to keep within reach.</p>
      </header>

      <nav className="bookshelf-filters" aria-label="Filter books by category">
        {categories.map(category => (
          <button
            className="bookshelf-filter"
            type="button"
            key={category}
            aria-pressed={activeCategory === category}
            onClick={() => setActiveCategory(category)}
          >
            {category}
          </button>
        ))}
      </nav>

      <p className="bookshelf-count" aria-live="polite">
        {visibleBooks.length} {visibleBooks.length === 1 ? "book" : "books"}
        {activeCategory === "All" ? "" : ` in ${activeCategory}`}
      </p>

      <div className="bookshelf-grid">
        {visibleBooks.map(book => (
          <article className="book-card" key={book.id}>
            <div className="book-card__cover">
              {book.cover ? (
                <img
                  src={book.cover}
                  alt={`Cover of ${book.title}`}
                  loading="lazy"
                  decoding="async"
                  width="420"
                  height="630"
                />
              ) : (
                <div className="book-card__fallback" aria-hidden="true">
                  <span>{book.title}</span>
                  <small>{book.author}</small>
                </div>
              )}
            </div>
            <h2>{book.title}</h2>
            <p>{book.author}</p>
            <p className="book-card__category">{book.category}</p>
          </article>
        ))}
      </div>
    </Layout>
  )
}

export const Head = ({ location }) => (
  <Seo title="Bookshelf" pathname={location.pathname} />
)
