import React from "react";
import Layout from "../components/Layout";
import Seo from "../components/Seo";

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
                    Hi, I'm Abdul Hakim NORAZMAN — a technology consultant at Detillens, contracted to Morgan Stanley as a software engineer in Client Fund Services Technology. I enjoy solving problems that sit at the intersection of technology and finance.
                </p>

                <p>
                    I studied Electrical and Mechanical Engineering at the University of Edinburgh, where I was fortunate to work on some pretty cool things — including developing Hyperloop pod technology with the <a href="https://hyp-ed.com" target="_blank" rel="noopener noreferrer">HYPED</a> team at SpaceX, and mentoring makers at the <a href="https://ucreate.ed.ac.uk/" target="_blank" rel="noopener noreferrer">uCreate Studio</a>.
                </p>

                <p>
                    Outside of work, I spend much of my time cycling, coding, and playing the electric guitar. These hobbies keep me grounded and remind me that progress — whether in fitness, music, or software — is usually incremental and earned over time.
                </p>

                <p>
                    If you're into tech, finance, or just want to chat, feel free to connect with me on{" "}
                    <a href="https://linkedin.com/in/flabdul" target="_blank" rel="noopener noreferrer">LinkedIn</a>, check out my work on{" "}
                    <a href="https://github.com/FLABDUL" target="_blank" rel="noopener noreferrer">GitHub</a>, or follow my activities on{" "}
                    <a href="https://www.strava.com/athletes/88805607" target="_blank" rel="noopener noreferrer">Strava</a>.
                </p>
            </section>
        </Layout>
    );
}

export const Head = ({ location }) => (
    <Seo title="About" pathname={location.pathname} />
);
