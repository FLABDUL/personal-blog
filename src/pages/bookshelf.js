import React from "react";
import Layout from "../components/Layout";
import { books } from "../data/books";

export default function BookshelfPage() {
  return (
    <Layout>
      <h1>Bookshelf</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "1.5rem" }}>
        {books.map((book, idx) => (
          <div key={idx} style={{ textAlign: "center" }}>
            <img src={book.cover} alt={book.title} style={{ width: "100%", borderRadius: "6px" }} />
            <p style={{ marginTop: "0.5rem" }}>
              <strong>{book.title}</strong><br /><small>{book.author}</small>
            </p>
          </div>
        ))}
      </div>
    </Layout>
  );
}
