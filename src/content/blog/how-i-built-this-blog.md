---
title: "How I Built This Blog"
date: "2025-06-05"
slug: "how-i-built-this-blog"
description: "How a Gatsby experiment became my personal portfolio, blog, and a place to keep learning in public."
---

This blog began as an exploration into building static sites with React + Gatsby + MDX, and turned into a personal portfolio and learning space for all my creative and technical work.

<em>This post uses Markdown, but allows React too!</em>

---

## 👨‍🎓 Learning Journey

Earlier this year, I attended an in-depth frontend course at [Trivera Tech](https://www.triveratech.training/course/tt4190-250602-jpmc) that gave me hands-on experience with modern JavaScript frameworks, TypeScript, and UI libraries. This laid the foundation for a deeper dive into React-based site generation and performance optimization.

---

## 🔧 Phase 1: Gatsby + MDX Blog Prototype

The first iteration of this site used **Gatsby.js** with **MDX** for combining Markdown content with interactive React components.

### Key Technologies

- **Gatsby.js** – SEO-optimized static site generator  
- **MDX** – Combine Markdown with live React components  
- **React Icons** – For scalable iconography  
- **Vercel** – Fast deployment and custom domain hosting  
- **Vanilla CSS** – Simple inline styles for fast iteration  

### Features

- Interactive blog posts using embedded components  
- Dynamic header/footer that hides on scroll  
- Sections for writing, projects, bookshelf, and art  
- Fully responsive layout with semantic HTML  

```bash
npm install -g vercel
vercel
```

Deployed to Vercel with GitHub integration and a custom domain.

---

## 🔁 Phase 2: Vite + Tailwind React Portfolio (Inspired by Brittany Chiang)

To explore a leaner, developer-centric stack, I created a second version using **Vite**, **React**, **TypeScript**, and **Tailwind CSS**:

### 🏗️ Project Setup

```bash
npm create vite@latest my-new-site -- --template react-ts
cd my-new-site
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

- **Routing:** React Router DOM with multi-page support (Home, About, Experience, Projects)  
- **Layout:** Grid-based layout with a fixed sidebar  

```tsx
<main className="grid grid-cols-[200px_1fr] h-screen">
  <aside className="fixed left-0 top-0 p-6 text-teal-400">...</aside>
  <section className="ml-[200px] overflow-y-auto">...</section>
</main>
```

### ✨ Features

- About section with personal background and tech stack  
- Projects showcased using card layouts  
- Experience timeline via `react-vertical-timeline-component`  
- Deep navy theme with teal accents  
- Fully responsive with Tailwind utilities  
- Deployed to [my-personal-site-tan-zeta.vercel.app](https://my-personal-site-tan-zeta.vercel.app)

[Source Code](https://github.com/FLABDUL/my-new-site)

---

## 🧩 Final Site: Personal Portfolio Blog

Eventually, I merged the best of both approaches into a single cohesive site: a blog + portfolio built with Gatsby and styled for clarity, responsiveness, and elegance.

### Pages & Features

| Page       | Purpose                                         |
|------------|--------------------------------------------------|
| **About**      | Biography, contact info, and personal story       |
| **Blog**       | MDX-based posts with optional React embeds       |
| **Projects**   | Interactive cards for coding tools and experiments |
| **Bookshelf**  | Visual grid of favorite books with covers        |
| **Studio**     | Gallery for art, paintings, and photos           |
| **Footer**     | Social icons: Gmail, LinkedIn, GitHub, Strava    |

---

## 📦 Key Features

- Dynamic header/footer that show/hide on scroll  
- Custom About page with photo and styled layout  
- MDX support for interactive blog components  
- Card/grid/gallery layouts for each content type  
- Mobile responsive layout out of the box  
- Fast deploy pipeline via Vercel CLI  

---

## 🚀 How I Deployed It

```bash
npm install -g vercel
vercel
```

- Custom domain setup and HTTPS via Vercel dashboard  
- GitHub integration for CI/CD  
- Configured `vercel.json` for clean routing with Vite  

---

## ✅ Live Demo

- 🌍 [Live Site](https://my-personal-site-tan-zeta.vercel.app)  
- 🧑‍💻 [GitHub Repo](https://github.com/FLABDUL/personal-blog)

---

Let me know what you think! I'm continuing to iterate on accessibility, animations, and content structure. Feel free to fork, remix, or get inspired.
