import React from "react"
import Layout from "../components/Layout"
import { artworks } from "../data/artworks"

export default function StudioPage() {
  return (
    <Layout>
      <h1>Studio</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1.5rem" }}>
        {artworks.map((item, idx) => (
          <div key={idx}>
            <img src={item.img} alt={item.title} style={{ width: "100%", borderRadius: "8px" }} />
            <p style={{ textAlign: "center", marginTop: "0.5rem" }}>{item.title}</p>
          </div>
        ))}
      </div>
    </Layout>
  )
}
