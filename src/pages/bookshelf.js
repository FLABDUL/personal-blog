import React, { useEffect, useRef, useState } from "react"
import Layout from "../components/Layout"
import Seo from "../components/Seo"
import Modal from "../components/Modal"
import books from "../../content/books.json"

const booksByNewest = [...books].sort((a, b) => b.added.localeCompare(a.added))
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
  const [category, setCategory] = useState("All")
  const [search, setSearch] = useState("")
  const [view, setView] = useState("covers")
  const [selectedId, setSelectedId] = useState(null)
  const [ready, setReady] = useState(false)
  const openedHere = useRef(false)
  const selectedBook = books.find(book => book.id === selectedId)
  const visibleBooks = booksByNewest.filter(
    book =>
      (category === "All" || book.category === category) &&
      `${book.title} ${book.author}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  )
  useEffect(() => {
    setReady(true)
    const sync = () => {
      openedHere.current = false
      setSelectedId(window.location.hash.slice(1))
    }
    sync()
    window.addEventListener("hashchange", sync)
    window.addEventListener("popstate", sync)
    return () => {
      window.removeEventListener("hashchange", sync)
      window.removeEventListener("popstate", sync)
    }
  }, [])
  const openBook = book => {
    window.history.pushState(null, "", `#${book.id}`)
    openedHere.current = true
    setSelectedId(book.id)
  }
  const closeBook = () => {
    if (openedHere.current) {
      openedHere.current = false
      window.history.back()
      return
    }
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    )
    setSelectedId(null)
  }
  return (
    <Layout wide world="bookshelf">
      <header className="library-header">
        <div>
          <p className="eyebrow">The reading room / {books.length} books</p>
          <h1>
            Bookshelf<span aria-hidden="true">.</span>
          </h1>
        </div>
        <p>
          Books I have read
          <br />
          and wanted to keep within reach.
        </p>
      </header>
      <div className="library-tools">
        <label className="book-search">
          Find a book
          <input
            type="search"
            disabled={!ready}
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Title or author"
          />
        </label>
        <div className="library-view" role="group" aria-label="Bookshelf view">
          <button
            type="button"
            aria-pressed={view === "covers"}
            disabled={!ready}
            onClick={() => setView("covers")}
          >
            Covers
          </button>
          <button
            type="button"
            aria-pressed={view === "index"}
            disabled={!ready}
            onClick={() => setView("index")}
          >
            Index
          </button>
        </div>
      </div>
      <nav className="bookshelf-filters" aria-label="Filter books by category">
        {categories.map(item => (
          <button
            className="bookshelf-filter"
            key={item}
            type="button"
            aria-pressed={category === item}
            disabled={!ready}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </nav>
      <p className="bookshelf-count" aria-live="polite">
        {visibleBooks.length} {visibleBooks.length === 1 ? "book" : "books"}
        {category !== "All" ? ` in ${category}` : ""}
        {search ? ` matching “${search}”` : ""}
      </p>
      <ul className={`library-books library-books--${view}`} aria-label="Books">
        {visibleBooks.map((book, index) => (
          <li key={book.id}>
            <button
              className="library-book"
              disabled={!ready}
              type="button"
              onClick={() => openBook(book)}
              aria-haspopup="dialog"
            >
              <span className="library-book__number" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="library-book__cover">
                <img
                  src={book.cover}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  width="280"
                  height="420"
                />
              </span>
              <span className="library-book__text">
                <strong>{book.title}</strong> <span>{book.author}</span>{" "}
                <small>{book.category}</small>
              </span>
              <span className="library-book__open" aria-hidden="true">
                ↗
              </span>
            </button>
          </li>
        ))}
      </ul>
      {!visibleBooks.length && (
        <div className="library-empty">
          <h2>No books found.</h2>
          <p>Try a different title, author or category.</p>
          <button
            type="button"
            onClick={() => {
              setSearch("")
              setCategory("All")
            }}
          >
            Show all books
          </button>
        </div>
      )}
      {selectedBook && (
        <Modal
          labelId="book-detail-title"
          onClose={closeBook}
          className="book-dialog"
        >
          <div className="book-dialog__content">
            <img
              src={selectedBook.cover}
              alt={`Cover of ${selectedBook.title}`}
              width="420"
              height="630"
            />
            <div>
              <p className="eyebrow">From the shelf</p>
              <h2 id="book-detail-title">{selectedBook.title}</h2>
              <p className="book-dialog__author">{selectedBook.author}</p>
              <dl>
                <div>
                  <dt>Category</dt>
                  <dd>{selectedBook.category}</dd>
                </div>
                <div>
                  <dt>Added to the shelf</dt>
                  <dd>
                    <time dateTime={selectedBook.added}>
                      {new Intl.DateTimeFormat("en-GB", {
                        month: "long",
                        year: "numeric",
                        timeZone: "UTC",
                      }).format(new Date(`${selectedBook.added}T00:00:00Z`))}
                    </time>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  )
}
export const Head = ({ location }) => (
  <Seo title="Bookshelf" pathname={location.pathname} />
)
