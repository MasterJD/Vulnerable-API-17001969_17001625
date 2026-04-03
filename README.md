# Vulnerable Node - University Refactoring Program

![License](https://img.shields.io/badge/license-BSD-blue.svg)
![Node](https://img.shields.io/badge/node-19.x-339933?logo=node.js&logoColor=white)
![Architecture](https://img.shields.io/badge/architecture-modular%20monolith-1f6feb)
![DevSecOps](https://img.shields.io/badge/DevSecOps-Trivy%20%2B%20Husky-0ea5e9)

![Logo](https://raw.githubusercontent.com/cr0hn/vulnerable-node/master/images/logo-small.png)

This repository is an academic modernization of the original vulnerable-node project.
It keeps intentionally vulnerable behavior for security education, while introducing
governance, DevSecOps, platform engineering, and architecture strategy deliverables.

## Project Scope

- Base application: intentionally vulnerable Node.js + PostgreSQL shop.
- Refactoring goal: improve quality and delivery practices without changing educational intent.
- Target architecture: modular monolith by bounded components.

## Deliveries Index

- Delivery 1: discovery and reverse engineering
	- [Delivery_1_Discovery_&_Reverse_Engineering/README.md](Delivery_1_Discovery_%26_Reverse_Engineering/README.md)
	- [Delivery_1_Discovery_&_Reverse_Engineering/CONTEXT_MAP.md](Delivery_1_Discovery_%26_Reverse_Engineering/CONTEXT_MAP.md)
- Delivery 2: governance and technical debt audit
	- [Delivery_2_Governance_&_Technical_Debt_Audit/GOVERNANCE_AND_TECH_DEBT_AUDIT.md](Delivery_2_Governance_%26_Technical_Debt_Audit/GOVERNANCE_AND_TECH_DEBT_AUDIT.md)
	- [Delivery_2_Governance_&_Technical_Debt_Audit/CI_GOVERNANCE_LOG.md](Delivery_2_Governance_%26_Technical_Debt_Audit/CI_GOVERNANCE_LOG.md)
- Delivery 3: security hardening (DevSecOps)
	- [Delivery_3_Security_Hardening_(DevSecOps)/Security_Hardening_Report.md](Delivery_3_Security_Hardening_(DevSecOps)/Security_Hardening_Report.md)
- Delivery 4: architecture strategy and DevEx
	- [Delivery_4_Architecture_Strategy_&_DevEx/Architecture_Strategy_DevEx_Report.md](Delivery_4_Architecture_Strategy_%26_DevEx/Architecture_Strategy_DevEx_Report.md)

## Quick Start (One Command)

Prerequisites:

- Docker Desktop (or Docker Engine + Compose plugin)
- Node.js 19+
- npm

Start full environment (app + postgres):

```bash
npm run devex:up
```

Stop environment:

```bash
npm run devex:down
```

Access application:

- URL: http://127.0.0.1:3000/login
- Demo credentials:
	- admin / admin
	- roberto / asdfpiuw981

## Developer Commands

```bash
# Quality and tests
npm run lint
npm test
npm run ci

# Security
npm run security:update
npm run security:sbom
npm run security:scan

# FinOps benchmark
npm run finops:benchmark
```

## Deploy on Vercel

This project can run on Vercel using the included `vercel.json` and `api/index.js`.

### 1) Provision PostgreSQL

Use any managed PostgreSQL provider (Vercel Postgres, Neon, Supabase, Render, Railway, etc.).

### 2) Set Environment Variables in Vercel

At minimum, set one of the following in Project Settings -> Environment Variables:

- `DATABASE_URL` (recommended)
- or `POSTGRES_URL` / `POSTGRES_PRISMA_URL` / `POSTGRES_URL_NON_POOLING`

Notes:

- `config.js` now prefers those variables automatically.
- `ENABLE_DB_BOOTSTRAP` is optional. Keep it unset/false on Vercel to avoid startup seeding on serverless cold starts.

### 3) Deploy

Connect repository in Vercel and deploy normally.

### 4) Images in Vercel

- Local disk uploads are not persistent in serverless environments.
- For production, store images in external object storage (for example Vercel Blob, S3, Cloudinary) and save the public image URL in product `image` field.
- The UI supports both local filenames (for local/docker) and full `http/https` image URLs.

## Security Notes

The project contains intentionally vulnerable flows for educational analysis.
Do not expose this application to production or public internet environments.

## Legacy Screenshots

![Login screen](https://raw.githubusercontent.com/cr0hn/vulnerable-node/master/images/login.jpg)
![Home screen](https://raw.githubusercontent.com/cr0hn/vulnerable-node/master/images/home.jpg)
![Shopping screen](https://raw.githubusercontent.com/cr0hn/vulnerable-node/master/images/shop.jpg)
![Purchased products](https://raw.githubusercontent.com/cr0hn/vulnerable-node/master/images/purchased.jpg)

## References

- https://blog.risingstack.com/node-js-security-checklist/
- https://github.com/substack/safe-regex

## License

BSD.
