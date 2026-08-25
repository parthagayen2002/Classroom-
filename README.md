# Partha Pratim Gayen — AI Developer Portfolio

A premium, interactive 3D developer portfolio built with React, Three.js and Tailwind CSS — a dark, neon pink/purple "AI + space" experience: a real orbiting solar system, a physics-driven tech-stack field, a mouse-reactive 3D robot, and cinematic scroll/page transitions, all wrapped around a single continuous-scroll page.

**Live site:** _add your deployed Vercel URL here once deployed_

## Features

- **Interactive 3D Solar System** — eight real, textured, orbiting planets with accurate scale/lighting. Drag to rotate the whole system.
- **Clickable planets with real data** — click any planet for a futuristic info panel (type, distance, diameter, mass, gravity, orbital/rotation period, moons, temperature, description). Toggle-close, click-outside-to-close, and Esc all work; the panel animates in/out and orbits keep running underneath.
- **Interactive Tech Stack field** — a physics-based floating field of technology icons that roam, gently repel each other and the cursor, and can be dragged with momentum on desktop.
- **Mouse-reactive 3D robot** — a procedural robot avatar whose head, neck, spine and eyes track the cursor with natural, clamped, spring-like motion (never a full 360° spin).
- **Particle / space environment** — a shared animated starfield and particle background behind every section.
- **Smooth page & scroll transitions** — Lenis-powered smooth scrolling, cinematic nav-click transitions, and scroll-linked 3D parallax.
- **Premium loading screen** — a one-time-per-session cinematic intro (glowing AI core, starfield, progress bar, status text) before the site reveals itself.
- **Fully responsive** — tuned separately for desktop, tablet and mobile (not just a scaled-down desktop layout), and respects `prefers-reduced-motion` throughout.

## Tech stack

| Category | Technology |
|---|---|
| Framework | [React 19](https://react.dev/) + [Vite](https://vitejs.dev/) |
| 3D | [Three.js](https://threejs.org/), [@react-three/fiber](https://docs.pmnd.rs/react-three-fiber), [@react-three/drei](https://github.com/pmndrs/drei), [@react-three/postprocessing](https://github.com/pmndrs/react-postprocessing) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com/) |
| Motion | [Framer Motion](https://www.framer.com/motion/), [GSAP](https://gsap.com/), [Lenis](https://lenis.darkroom.engineering/) (smooth scroll) |
| Tooling | [oxlint](https://oxc.rs/docs/guide/usage/linter.html) |

## Prerequisites

- Node.js `^20.19.0` or `>=22.12.0` (required by Vite 8)
- npm

## Getting started

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd portfolio-web

# 2. Install dependencies
npm install

# 3. Run the dev server
npm run dev
```

The dev server starts at `http://localhost:5173`.

## Production build

```bash
npm run build     # outputs a static build to ./dist
npm run preview   # serve the production build locally to sanity-check it
```

## Environment variables

None are required to build or run this project as-is — it's a fully static, client-side site with no API keys or backend calls. If you later add something that needs one (e.g. a contact-form service), copy `.env.example` to `.env`, fill in real values there, and never commit `.env` itself (it's already git-ignored).

## Project structure

```
src/
  components/   Shared UI overlays (navigation, cursor, loading screen, transitions...)
  sections/     The page's scroll sections (Home, About, Tech Stack, Projects, Achievements, Contact)
  three/        3D scenes and components (Solar System, Tech Stack field, robot avatar, particles)
  hooks/        Shared React hooks (scroll progress, responsive tier, page transitions...)
  config/       Centralized motion/timing tuning constants
  data/         Site content (copy, project list, skills, links)
public/
  models/       Optional custom robot GLB model (falls back to a built-in procedural robot if absent)
  projects/     Project preview images
```

## Deploying to Vercel

This is a static Vite app, so Vercel's zero-config **Vite** framework preset works out of the box:

1. Push this repository to GitHub (see below).
2. In Vercel, **Add New Project** → import the GitHub repository.
3. Framework preset: **Vite** (auto-detected). Build command: `npm run build`. Output directory: `dist`.
4. Deploy — no environment variables are required for the default setup.

## License

Personal portfolio project. All content and design © Partha Pratim Gayen.
