import React, { useState } from "react"

const Counter = () => {
  const [count, setCount] = useState(0)

  return (
    <div style={{ textAlign: "center", margin: "2rem 0" }}>
      <h3>React Counter 🔢</h3>
      <p style={{ fontSize: "1.5rem" }}>{count}</p>
      <button onClick={() => setCount(count + 1)} style={{
        padding: "0.5rem 1rem",
        backgroundColor: "#4fc3f7",
        border: "none",
        borderRadius: "4px",
        color: "#000",
        cursor: "pointer"
      }}>
        Increment
      </button>
    </div>
  )
}

export default Counter
