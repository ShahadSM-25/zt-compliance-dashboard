# ZT Saudi Security Controls — Compliance Dashboard TODO

## Phase 1: Database & Backend Foundation
- [x] Database schema: scans, scan_results, scan_logs tables
- [x] DB helpers: createScan, updateScan, getScanById, listScans, saveScanResult
- [x] tRPC router: scan.create, scan.start, scan.status, scan.list, scan.getById, scan.delete
- [x] tRPC router: results.getByScanId
- [x] tRPC router: admin.listAllScans, admin.listAllUsers
- [x] Mock compliance engine runner (simulate scan execution with fake results)
- [x] Controls metadata endpoint (95 controls with pillar/severity/standard)

## Phase 2: Landing Page & Scan Configuration
- [x] Landing page: hero section with ZT framework intro
- [x] Landing page: 5 pillars overview cards (Identity, Devices, Networks, Applications, Cross-Cutting)
- [x] Landing page: CTA to start new scan
- [x] Landing page: stats bar (84 controls, 3 cloud providers, 3 standards)
- [x] Multi-step form: Step 1 — System Information (name, description, environment)
- [x] Multi-step form: Step 2 — Cloud Provider (OCI/AWS/Azure credentials)
- [x] Multi-step form: Step 3 — HIS Application API (base URL, auth method, credentials)
- [x] Multi-step form: Step 4 — Target Hosts (dynamic list with IP, port, agent type)
- [x] Multi-step form: Step 5 — Review & Launch
- [x] Form validation with Zod
- [x] Save draft scan configuration to DB on submit

## Phase 3: Scan Progress & Results Dashboard
- [x] Scan progress page: 3-step visual stepper (Configure → Scan → Results)
- [x] Real-time log streaming via polling tRPC endpoint
- [x] Terminal-style log viewer (dark background, monospace font)
- [x] Scan status indicators (running/completed/failed)
- [x] Results dashboard: overall compliance percentage ring chart
- [x] Results dashboard: breakdown by pillar (bar chart)
- [x] Results dashboard: breakdown by severity
- [x] Results dashboard: pass/fail pie chart
- [x] Filterable control list table (filter by pillar, severity, status)
- [x] Control detail dialog with violation messages and remediation guidance
- [x] Pass/Fail badges per control

## Phase 4: Scan History, Export & Admin
- [x] Dashboard page: list of all past scans with status
- [x] Export: JSON raw results download
- [ ] Export: PDF report generation (coming soon placeholder)
- [ ] Scan comparison side-by-side (coming soon)
- [x] Admin view: list all users' scans
- [x] Admin view: user list panel
- [x] Role-based route guards (admin vs user)

## Phase 5: Polish & Delivery
- [x] Global navigation with auth state
- [x] Responsive design (mobile-friendly)
- [x] Loading states for all data-heavy pages
- [x] Empty states for no scans / no results
- [x] Error boundaries and toast notifications
- [x] Vitest unit tests passing
- [x] Final checkpoint and delivery

## Branding Update
- [x] Rename app title from "ZT Compliance" to "HealthComply" across all pages and metadata
