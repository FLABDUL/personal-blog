import React from "react"
import Layout from "../components/Layout"

export default function AboutPage() {
  return (
    <Layout>
      <img
        src="/avatar.jpg"
        alt="Abdul Hakim Nor Azman"
        style={{
          width: 180,
          borderRadius: "50%",
          display: "block",
          margin: "2rem auto"
        }}
      />
      <h2 style={{ textAlign: "center", fontSize: "2rem", marginBottom: "1.5rem" }}>
        Hi, I'm Abdul Hakim.
      </h2>

      <p><strong>Personally</strong>, I'm a curious tech enthusiast who loves solving problems and understanding how systems work. I’m into coding, performance tuning, and system design. I enjoy sharing knowledge, writing blog posts, and learning from the community.</p>

      <p><strong>Professionally</strong>, I'm a full stack engineer and performance optimization specialist. I focus on building scalable, efficient systems and tuning complex applications to perform at their best.</p>

      <h3>This blog</h3>
      <p>I created this blog to document what I learn in tech, especially around performance tuning, full-stack development, and productivity tools. It’s built with React and Gatsby from scratch and open sourced so others can learn too.</p>

      <h3>Contact</h3>
      <p>
        Feel free to connect with me on{" "}
        <a href="https://www.linkedin.com/in/abdulhakimnorazman/" target="_blank" rel="noopener noreferrer" style={{ color: "#4fc3f7" }}>
          LinkedIn
        </a>
        , or email me at <a href="mailto:abdulhakim@example.com" style={{ color: "#4fc3f7" }}>abdulhakim@example.com</a>.
        You can also follow my work on <a href="https://github.com/abdulhakim" style={{ color: "#4fc3f7" }}>GitHub</a>.
      </p>
    </Layout>
  )
}
