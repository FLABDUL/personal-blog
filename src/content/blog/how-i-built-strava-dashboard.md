---
title: "How I Built My Strava Dashboard 🚴‍♂️"
date: "2025-07-17"
slug: "how-i-built-strava-dashboard"
---

# How I Built My Strava Dashboard 📈

This project started as a way to visualize my endurance training data from Strava — running, cycling, swimming, and more — in a personalized, privacy-respecting dashboard. I wanted an app that not only pulled in activity data, but also gave meaningful breakdowns like distance over time, summaries by activity type, and weekly/monthly stats.

What began as a simple integration experiment became a full-stack project that taught me a lot about OAuth flows, API rate limits, PostgreSQL data modeling, and React performance optimization.

---

## 🛠️ Why I Built It

As an athlete, I enjoy tracking my training but found Strava’s default dashboard too rigid. I wanted:

- A cleaner view of weekly and monthly summaries  
- A breakdown by activity type  
- A timeline view to monitor consistency  
- Full control over how and where my data lives  
- And of course, I wanted to build it myself.

---

## 🔐 OAuth 2.0 + Strava API

Getting started meant registering a Strava app and setting up the OAuth 2.0 authorization flow. After authentication, the app exchanges a code for a short-lived access token and refresh token.

The backend is responsible for:

- Persisting tokens securely in PostgreSQL  
- Automatically refreshing expired tokens  
- Making authenticated requests to fetch `/athlete/activities`

Despite reading the Strava API docs thoroughly, getting this OAuth flow to work in production was far more finicky than expected. I hit several walls:

- Scope strings had to be space-separated (`read activity:read`), not comma-separated.  
- Tokens would sometimes work locally, but fail in Railway deployments.  
- Strava errors are often opaque (`code: "invalid"` with no deeper reason).  
- I had to deploy dozens of backend variations just to log the failure reasons.

📉 Here's what debugging that looked like:

![OAuth failure logs](/blog/error.png)

---

## 🧰 Key Stack Choices

- **Node.js + Express** – REST API and OAuth token handling  
- **PostgreSQL** – Data storage via Railway  
- **React + Vite** – Fast and modern frontend  
- **Vercel** – Frontend hosting + GitHub CI/CD  
- **dotenv** – Multi-environment secrets  
- **CORS + Proxying** – For seamless frontend-backend communication

---

## ⚙️ Backend Architecture

The backend has two major roles:

1. Handle OAuth authorization and token management at `/auth`  
2. Serve activity data via `/api/activities`, filtered by type or date

Tokens are stored securely in the DB and automatically refreshed. Data is fetched from Strava’s API, transformed, and sent to the frontend.

Sample route:

```http
GET /api/activities?type=ride
```

---

## 💻 Frontend UX

The React frontend dashboard provides summaries, filters, and a distance chart.

### Features

- Filter by activity type (Run, Ride, Swim, etc.)  
- Weekly and monthly summaries  
- Activity list with toggleable maps  
- Distance over time chart  

![Dashboard Overview](/blog/strava-dashboard.png)

---

### Filtered Views

You can filter your activities by type using a simple dropdown menu.

![Filter dropdown](/blog/filter.png)  
![Ride summary](/blog/filtered.png)

---

### Interactive Maps per Activity

Each activity entry includes a "Show map" button powered by Leaflet, displaying the GPS route from Strava.

![Activity maps](/blog/maps.png)

---

## 🧪 Local & Prod Environments

Environment variables are managed via `.env` and `.env.production` files. This allows the frontend to use local APIs in development and the deployed backend in production.

```bash
# .env
VITE_API_BASE=http://localhost:5000

# .env.production
VITE_API_BASE=https://strava-dashboard-production.up.railway.app
```
The backend is hosted on Railway, and the frontend on Vercel, with automatic deployments triggered by GitHub pushes.
![Vercel and Railway Deployments](/blog/deployments.png)

---

## 🔐 Strava Dev Portal View

Here’s a peek at how the app is configured on the [Strava API Developer Portal](https://www.strava.com/settings/api), including rate limits and token access:

![Strava Dev Dashboard](/blog/strava-api.png)

---

## 🧩 What’s Next?

- Add charts using `recharts` or `chart.js`  
- Let users set personal goals and track progress  
- Add a light/dark mode toggle  
- Improve activity search and tagging  
- UI polish and accessibility improvements

---

## 💡 Reflections

This dashboard became a true full-stack workout — pun intended. Here’s what I learned:

- Strava’s OAuth flow is fragile in production and requires very precise config  
- Observability and logging are critical when something “just doesn’t work”  
- Managing tokens (expiry, refresh, DB persistence) is non-trivial  
- CORS and environment setup need care across Railway and Vercel  
- Logs are gold when debugging anything OAuth-related

Even with the OAuth bugs, the core dashboard works beautifully once tokens are seeded manually — and seeing my training history visualized like this is incredibly satisfying.

---

## ✅ Live Demo

🌍 [strava-dashboard-zeta.vercel.app](https://strava-dashboard-zeta.vercel.app)  
💻 [github.com/yourname/strava-dashboard](https://github.com/yourname/strava-dashboard)

Thanks for reading! Feel free to fork or contribute — especially if you’ve fought the same OAuth battles 🙃
