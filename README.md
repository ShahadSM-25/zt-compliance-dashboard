# 🛡️ HealthComply — Zero Trust Compliance Dashboard

**HealthComply** is a full-stack compliance assessment platform that evaluates healthcare IT systems against **98 Zero Trust security controls** spanning 6 pillars, mapped to **CCC**, **HIPAA**, and **Saudi SeHE** standards.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![Node.js](https://img.shields.io/badge/Node.js-22-339933)
![React](https://img.shields.io/badge/React-19-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)

---

## Architecture

This repository is the **Dashboard layer** of the HealthComply platform. It works in conjunction with [`cloud-compliance-automation`](https://github.com/ShahadSM-25/cloud-compliance-automation) (the compliance engine).

```
zt-compliance-dashboard/         ← This repository
├── client/                      ← React + TypeScript frontend (Vite)
├── server/                      ← Node.js backend (tRPC + Express)
│   ├── engine.ts                ← Orchestrates the compliance engine
│   └── routers.ts               ← API routes
├── shared/
│   ├── controls.ts              ← 98 control definitions
│   └── types.ts                 ← Shared TypeScript types
├── drizzle/                     ← MySQL schema & migrations
└── docker-compose.yml           ← Runs the full stack
```

## Quick Start

### Prerequisites
- Docker + Docker Compose
- Git

### 1. Clone both repositories side by side

```bash
git clone https://github.com/ShahadSM-25/zt-compliance-dashboard.git
git clone https://github.com/ShahadSM-25/cloud-compliance-automation.git
```

Both directories **must** be siblings (same parent folder).

### 2. Set up the offline pnpm store (first time only)

```bash
cd zt-compliance-dashboard
chmod +x setup-pnpm-store.sh
./setup-pnpm-store.sh
```

> This downloads all Node.js packages once and caches them locally so Docker builds work without internet access.

### 3. Start the platform

```bash
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000)

---

## Controls Coverage

| Pillar | Controls |
|--------|----------|
| Identity | 22 |
| Applications & Workloads | 29 |
| Visibility & Analytics | 20 |
| Data | 17 |
| Devices | 5 |
| Networks | 5 |
| **Total** | **98** |

| Standard | Controls |
|----------|----------|
| CCC (NCA Cloud Controls Catalog) | 51 |
| SeHE (Saudi Health eHealth) | 29 |
| HIPAA | 18 |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, TailwindCSS, Recharts |
| Backend | Node.js 22, tRPC, Express |
| Database | MySQL 8.0 (Drizzle ORM) |
| Compliance Engine | Python 3.11, OPA (Open Policy Agent) |
| Infrastructure | Docker Compose |

---

## Optional: Enable OS Monitoring

To collect OS-level metrics via Node Exporter:

```bash
docker compose --profile monitoring up --build
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `COMPLIANCE_ENGINE_PATH` | `/engine` | Path to cloud-compliance-automation |
| `USE_REAL_ENGINE` | `true` | Use real engine vs mock mode |
| `HIS_MOCK_URL` | `http://nginx:8080` | HIS application URL |
| `NODE_EXPORTER_URL` | *(unset)* | Node Exporter URL (optional) |
| `DATABASE_URL` | mysql://... | MySQL connection string |
