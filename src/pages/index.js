import React from "react";
import Layout from "../components/Layout";

export default function HomePage() {
    return (
        <Layout>
            <section style={{ textAlign: "center" }}>
                <img
                    src="/profile.jpg"
                    alt="Abdul Hakim Norazman"
                    style={{ borderRadius: "50%", width: "150px", marginBottom: "1rem" }}
                />
                <h1>About Me</h1>
            </section>

            <section style={{ lineHeight: "1.8", marginTop: "2rem" }}>
                <p>
                    Hi, I'm Abdul Hakim NORAZMAN — a software engineer currently working in Research Technology at JPMorgan Chase & Co., where I build quantitative tools and infrastructure. I enjoy solving problems that sit at the intersection of technology and finance.
                </p>

                <p>
                    I studied Electrical and Mechanical Engineering at the University of Edinburgh, where I was fortunate to work on some pretty cool things — including developing Hyperloop pod technology with the <a href="https://hyp-ed.com" target="_blank" rel="noopener noreferrer">HYPED</a> team at SpaceX, and mentoring makers at the <a href="https://ucreate.ed.ac.uk/" target="_blank" rel="noopener noreferrer">uCreate Studio</a>.
                </p>

                <p>
                    Outside of work, I’m a budding triathlete — which means I spend my free time swimming, cycling, running, and learning how to pace myself (still a work in progress). Training helps me stay grounded and reminds me that progress rarely comes instantly — in fitness or in code.
                </p>

                <p>
                    I also have an appreciation for the creative side of life. I play piano, enjoy oil painting, and like to unwind with a good book — especially anything that challenges how I think or lets me see things from a different angle.
                </p>

                <p>
                    If you're into tech, art, or endurance sports — or just want to chat — feel free to connect with me on{" "}
                    <a href="https://linkedin.com/in/flabdul" target="_blank" rel="noopener noreferrer">LinkedIn</a>, check out my work on{" "}
                    <a href="https://github.com/FLABDUL" target="_blank" rel="noopener noreferrer">GitHub</a>, or follow me on{" "}
                    <a href="https://www.strava.com/athletes/abdulhakim" target="_blank" rel="noopener noreferrer">Strava</a>.
                </p>
            </section>
        </Layout>
    );
}
