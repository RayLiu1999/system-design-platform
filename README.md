# Senior System Design Learning Platform

A modern, interactive platform built for senior backend engineers to master system design patterns, real-world architectural scenarios, and high-level interview preparation.

---

## Key Features

- **Modular Architecture**: Highly organized data structure under `src/data/topics/`, making it easy to add or update technical modules.
- **Senior-Level Perspective**: Deep dives into complex topics beyond basic terminology:
  - **Messaging**: Exactly-once semantics, Outbox Pattern with CDC, and high-concurrency consumer lag handling strategies (e.g., temporary Topic re-balancing).
  - **Distributed Systems**: Raft safety guarantees (Leader Completeness), ZooKeeper lease mechanisms, and Snowflake ID clock skew solutions.
  - **Security**: OIDC/OAuth2 deep dive (PKCE), IDOR/SSRF practical defense scenarios, and adaptive rate limiting for DDoS protection.
  - **Observability**: High-cardinality monitoring problems, Little's Law for scientific capacity planning, and zero-downtime database migration strategies.
- **Interactive Simulators**: Built-in visual simulators for Load Balancing, Cache Problems (Penetration/Breakdown), Message Queues, and more.
- **Interview-Ready**: Curated Q&A pairs focused on senior backend design challenges and architectural trade-offs.
- **Premium UI/UX**: Clean, responsive, and professional technical documentation feel, optimized for deep reading.

---

## Tech Stack

- **Frontend**: [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **State Management**: React Context / Hooks
- **Localization**: [i18next](https://www.i18next.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

---

## Project Structure

```text
src/
├── components/       # Reusable UI components & Interactive Simulators
├── data/
│   ├── topics/       # Modularized technical content (JS/ESM)
│   │   ├── mq.js
│   │   ├── security.js
│   │   ├── observability.js
│   │   └── index.js  # Main entry for topics
├── hooks/            # Custom React hooks for simulators
└── pages/            # Main application layouts and routing
```

---

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or pnpm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/RayLiu1999/system_design_note_web.git
   ```
2. Install dependencies:
   ```bash
   npm install
   # or
   pnpm install
   ```
3. Create your environment file:
   ```bash
   cp .env.example .env
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

### Docker
1. Configure `HOST_IP` and `PORT` in your `.env` file (default: `127.0.0.1:8080`).
2. Build and run with Docker Compose:
   ```bash
   docker-compose up --build
   ```
3. Access the platform at `http://<HOST_IP>:<PORT>` (e.g., `http://localhost:8080`).

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

[繁體中文版本 (Traditional Chinese)](README.zh-TW.md)
