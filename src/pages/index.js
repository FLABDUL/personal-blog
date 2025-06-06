import React from "react"
import Layout from "../components/Layout"

export default function AboutPage() {
  return (
    <Layout>
      <img
        src="/me.jpg"
        alt="Abdul Hakim Norazman"
        style={{
          width: 180,
          borderRadius: "50%",
          display: "block",
          margin: "2rem auto"
        }}
      />

      <h2 style={{ textAlign: "center", fontSize: "2rem", marginBottom: "1.5rem" }}>
        About Me
      </h2>

      <p>
        Hi, I'm Abdul Hakim NORAZMAN — a software engineer currently working in Research Technology at JPMorgan Chase & Co., where I build quantitative tools and infrastructure. I enjoy solving problems that sit at the intersection of technology and finance.
      </p>
      <p>
        I studied Electrical and Mechanical Engineering at the University of Edinburgh, where I was fortunate to work on some pretty cool things — including developing Hyperloop pod technology with the {" "}
        <a href="https://www.hyp-ed.com/" target="_blank" rel="noopener noreferrer" style={{ color: "#4fc3f7" }}>
          HYPED
        </a> team at SpaceX, and mentoring makers at the <a href="https://www.ucreatestudio.is.ed.ac.uk/" target="_blank" rel="noopener noreferrer" style={{ color: "#4fc3f7" }}>
          uCreate Studio
        </a>.
      </p>
      <p>
        Outside of work, I’m a budding triathlete — which means I spend my free time swimming, cycling, running, and learning how to pace myself (still a work in progress). Training helps me stay grounded and reminds me that progress rarely comes instantly — in fitness or in code.
      </p>
      <p>
        I also have an appreciation for the creative side of life. I play piano, enjoy oil painting, and like to unwind with a good book — especially anything that challenges how I think or lets me see things from a different angle.
      </p>
      <p>
        If you're into tech, art, or endurance sports — or just want to chat — feel free to connect with me on{" "}
        <a href="https://www.linkedin.com/in/abdulhakimnorazman/" target="_blank" rel="noopener noreferrer" style={{ color: "#4fc3f7" }}>
          LinkedIn
        </a>, check out my work on{" "}
        <a href="https://github.com/FLABDUL" target="_blank" rel="noopener noreferrer" style={{ color: "#4fc3f7" }}>
          GitHub
        </a>, or follow me on{" "}
        <a href="https://www.strava.com/athletes/88805607" style={{ color: "#4fc3f7" }}>
          Strava
        </a>.
      </p>
    </Layout>
  )
}
