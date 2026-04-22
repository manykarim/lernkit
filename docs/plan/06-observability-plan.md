# 06 — Observability Plan

> OpenTelemetry-based traces, metrics, and logs across the FastAPI service, the Node build pipeline, and the runner pool. SLIs/SLOs with numeric targets per service; Grafana dashboards; alerting policy; log retention and PII scrubbing. Cross-references ADR 0018, ADR 0021, ADR 0022, [`PRODUCT-SHAPE.md`](./PRODUCT-SHAPE.md), [`00-quality-attribute-goals.md`](./00-quality-attribute-goals.md) §3 *Performance* and §4 *Security*, [`05-security-model.md`](./05-security-model.md), and [`08-team-and-raci.md`](./08-team-and-raci.md) for on-call ownership.

> **Self-host-first 2026-04-21 per [ADR 0021](../adr/0021-self-host-first-infrastructure-principle.md).** Every observability service below runs on the same Coolify + Hetzner box as the application (per [ADR 0018](../adr/0018-coolify-on-hetzner-for-self-hosting-default.md)). No error traces, logs, metrics, or stdout from sandboxed learner code leave the box. SaaS adoption requires an explicit exception paragraph per ADR 0021 §Policy.

## 1. Stack

- **Instrumentation:** OpenTelemetry SDK — Python (`opentelemetry-instrumentation-fastapi`, `opentelemetry-instrumentation-sqlalchemy`, `opentelemetry-instrumentation-redis`), Node (`@opentelemetry/auto-instrumentations-node` for build pipeline).
- **Collector:** OpenTelemetry Collector (contrib) deployed as a sidecar on each Coolify service.
- **Traces backend:** Grafana Tempo (self-hosted on the same Hetzner box for P1–P4; dedicated Coolify service from P5).
- **Logs backend:** Grafana Loki.
- **Metrics backend:** Grafana Mimir (or Prometheus if Mimir is overkill for P1 — decision captured in an ADR if it changes).
- **Error tracking (Self-host-first 2026-04-21 per ADR 0021):** **GlitchTip self-hosted** on the Coolify box (~3 containers: web, worker, Postgres — the Postgres instance is shared with the rest of the stack per the "reuse shared infra" rule in ADR 0021 §Policy). GlitchTip implements the Sentry API, so SDKs below are the stock Sentry SDKs with the DSN pointed at the GlitchTip instance:
  - Browser: `@sentry/browser`.
  - Node (build pipeline, FastAPI sidecars): `@sentry/node`.
  - Python (FastAPI): `sentry-sdk` with the FastAPI + SQLAlchemy integrations.
  - Scrubbing is applied **before** the SDK transmits (`beforeSend` / `before_send` hooks strip PII per §5.2 rules); no PII leaves the Coolify box.
  - **Capacity migration note.** If error volume ever exceeds GlitchTip's comfortable capacity, the migration path is **self-hosted Sentry** on the same box (same SDKs, DSN swap only). We never move error tracking off-box.
- **Dashboards + alerting UI:** Grafana.
- **Alert routing:** email + Mattermost webhooks (Mattermost self-hosted per [ADR 0021](../adr/0021-self-host-first-infrastructure-principle.md)). No PagerDuty subscription — scope narrowed 2026-04-21 per [ADR 0022](../adr/0022-oss-single-tenant-framework-scope.md). Critical alerts additionally trigger SMS via Twilio on the on-call rotation.

## 2. SLIs and SLOs per service

### 2.1 FastAPI API — `api.lernkit.example`

| SLI | SLO | Error budget | Measurement |
|---|---|---|---|
| Availability (non-5xx on non-`/exec` routes) | 99.9% monthly | 43.2 min/month | OTel trace status_code counts |
| `/healthz` latency | p99 < 50 ms | 0.1% violation budget | OTel span duration |
| `/progress` latency | p99 < 500 ms | 1% budget | OTel span duration |
| `/xapi` proxy POST latency | p99 < 200 ms | 1% budget | OTel span duration |
| `/login` (OIDC callback) end-to-end | p99 < 2 s | 1% budget | Custom metric |

### 2.2 `/exec` endpoint (runner orchestration)

| SLI | SLO | Notes |
|---|---|---|
| Availability | 99% monthly (lower — queued executions can retry) | Interactive UX can tolerate retries |
| End-to-end latency (client → result), warm pool | p99 < 1 s; p50 < 500 ms | Per [`00-quality-attribute-goals.md`](./00-quality-attribute-goals.md) §3 |
| Queue time (request → runner acquired) | p95 < 200 ms at warm pool | Redis queue depth metric |
| Container startup time (cold) | p95 < 2 s | gVisor cold-start |
| Code execution wall-clock (hello-world Python) | p50 < 500 ms, p99 < 1.5 s | Baseline regression-tracked |

### 2.3 `/rf` endpoint (Robot Framework orchestration)

| SLI | SLO | Notes |
|---|---|---|
| Availability | 99% monthly | Queued RF runs tolerate retries |
| Batch-mode end-to-end (write → graded) | p99 < 30 s for basic libraries | RF grading is long-running; timeout at 60 s |
| Tutorial-mode MCP server availability | 99% during session | Short-lived per-learner server |

### 2.4 LRS (Yet Analytics SQL LRS)

| SLI | SLO | Notes |
|---|---|---|
| Availability | 99.5% monthly | In the critical path for analytics; brief downtime deferrable via proxy queue |
| Statement write latency | p99 < 500 ms per statement | Batch endpoint preferred |
| Statement read latency (dashboard query) | p99 < 3 s for < 10k-statement scope | Larger scopes use materialized views |

### 2.5 Build pipeline (Astro)

| SLI | SLO | Notes |
|---|---|---|
| Full site build (500 lessons, CI cold) | p95 < 6 min | Regression tracked monthly |
| Preview deploy (Coolify branch) | p95 < 8 min from push to URL | [`00-quality-attribute-goals.md`](./00-quality-attribute-goals.md) §3 |
| PDF build (100-lesson course) | p95 < 90 s | Playwright run duration |

## 3. Dashboards

### 3.1 `Runtime Health` (primary on-call dashboard)

- Request rate per route (stacked area).
- 5xx rate per route (alert at > 1% over 5 min).
- p99 latency per route (alert on SLO breach).
- Runner pool occupancy (gauge 0–100%; alert at > 85%).
- Runner pool p99 queue depth.
- Active WebSocket connections.
- Error rate from GlitchTip (cross-link). Self-host-first 2026-04-21 per ADR 0021.

### 3.2 `ExecutionLatencyByLanguage`

- p50 / p95 / p99 `/exec` end-to-end by language (python, node, rf-batch).
- Cold vs warm-pool split.
- Queue time vs execution time stacked.
- Per-user quota utilization heatmap.

### 3.3 `SandboxEscapeAttempts`

- Rate of container `exit_code != 0` grouped by exit reason (timeout, OOM, pids-limit, signal-kill, cap-violation).
- Suspicious syscalls (from gVisor audit log): mount, ptrace, unshare, clone(CLONE_NEWNS) attempts.
- Egress attempts on `--network=none` containers.
- Alert: any confirmed syscall violation (Critical); per-minute anomaly in `exit_reason=signal_kill` (Warning).

### 3.4 `SCORM Package Import Success Rate`

- % of CI conformance runs green per standard (SCORM 1.2 / 2004 4th / cmi5 / xAPI).
- Nightly LMS smoke status grid (Moodle / TalentLMS / Docebo).
- Import time per standard trend.
- Alert: any standard < 95% green over 7-day rolling window.

### 3.5 `xAPI Statement Drop Rate`

- Statements submitted vs accepted by LRS.
- Proxy queue depth.
- Batch size p50/p99.
- Per-course statement volume (top 10 courses by activity).
- Alert: drop rate > 0.5% over 10 min (Warning); > 2% over 10 min (Critical).

### 3.6 `Pyodide Cold-Start p50/p95`

- Cold-start duration from Playwright tracing in CI (nightly + per-merge) and RUM (P4+ opt-in only).
- Service Worker cache hit rate.
- wasm download size trend.
- Alert: p95 regression > 20% over 7-day baseline.

<!-- §3.7 Tenant Isolation dashboard removed 2026-04-21 per ADR 0022: single-tenant substrate, no cross-tenant isolation surface to monitor. -->


## 4. Alerting policy

### 4.1 Severity levels

- **Critical** — user-facing outage or security incident. Page on-call immediately; acknowledge < 5 min business hours / < 30 min off-hours.
- **Warning** — SLO at risk or performance regression. Email + Mattermost (self-hosted per ADR 0021); triage within 4 business hours.
- **Info** — interesting but not actionable. Mattermost-only.

### 4.2 Canonical alerts

| Alert | Severity | Trigger | Runbook |
|---|---|---|---|
| `api_5xx_rate_high` | Critical | 5xx > 1% for 5 min on `api.lernkit.example` | `runbooks/api-5xx.md` |
| `exec_slo_breach` | Critical | `/exec` p99 > 2 s for 10 min | `runbooks/exec-slow.md` |
| `runner_pool_saturated` | Warning | pool occupancy > 85% for 10 min | `runbooks/runner-saturation.md` |
| `sandbox_syscall_violation` | Critical | any confirmed seccomp-denied syscall | `runbooks/sandbox-escape.md` |
| `lrs_availability_low` | Critical | LRS availability < 99% over 1 h | `runbooks/lrs-outage.md` |
| `xapi_drop_rate_high` | Critical | drop rate > 2% over 10 min | `runbooks/xapi-drops.md` |
| `scorm_conformance_red` | Critical | CI conformance red on main for any standard | `runbooks/scorm-conformance.md` |
| `pyodide_coldstart_regression` | Warning | p95 regression > 20% over 7d baseline | `runbooks/pyodide-coldstart.md` |
| `cve_critical_high` | Critical | new Critical/High CVE in dependency tree | `runbooks/dependency-cve.md` |
| `cert_expiring_soon` | Warning | TLS cert expiring < 14 days | `runbooks/tls-renewal.md` |

### 4.3 On-call

- Rotating weekly between FE-1, FE-2, BE-1. Email + SMS (via Twilio) alert channel for Critical; Mattermost channel for Warning. Manual escalation to Many for sandbox-escape or RF-specific incidents.
- Scope narrowed 2026-04-21 per ADR 0022: no PagerDuty subscription, no dedicated SEC on-call. Security-tagged alerts route to the same rotation with Many as the secondary for sandbox-class incidents.
- Incident commander role rotates independent of on-call; any incident classified Critical triggers ICR within 15 min.

## 5. Log retention and PII scrubbing

### 5.1 Retention

| Log class | Retention | Storage |
|---|---|---|
| API access logs | 30 days | Loki |
| API error logs (GlitchTip) | 90 days | GlitchTip (self-hosted, on-box) |
| Runner audit logs (`/exec` invocations) | 90 days | Loki + archived to S3 after 30 days |
| LRS raw xAPI statements | 365 days (operator-configurable in `lernkit.config.ts`) | Postgres LRS DB |
| LRS aggregated statements | indefinite | Postgres LRS DB |
| Immutable audit log (admin actions, secret rotations) | 1 year | Loki + S3 with object-lock |
| Security event logs | 1 year | Loki + S3 with object-lock |

### 5.2 PII scrubbing (in-log)

Log pipeline strips or pseudonymizes before ingestion:

- **Email addresses** → `email:<sha256(email):8>`
- **Actor IFI** (xAPI) → `actor:<sha256(ifi):8>` (matches LRS pseudonymization)
- **IP addresses** → `/24` truncation for IPv4, `/64` for IPv6 (retained for rate-limit and fraud detection)
- **Auth tokens** → redacted (`[REDACTED_TOKEN]`)
- **Session IDs** → last 4 chars only
- **Code submissions** → content-hash only in access logs; full source only in the runner audit log (separate retention)

Scrubbing implemented via OTel collector `attributes` processor with regex rules; regression-tested by shipping a fixture log line and asserting no PII survives.

### 5.3 Log-based detection rules

- 10+ failed login attempts per IP /24 in 1 min → alert + temporary IP throttle.
- OIDC callback with unknown issuer → alert.
- Any SQL statement in log matching `DROP|TRUNCATE|ALTER` without a known migration ID → Critical alert.
- Any log line containing a known-secret pattern (AWS key, API token, SSH key, etc.) even post-scrub → Critical alert (scrubbing failure).

## 6. Tracing conventions

- **Span naming:** `<bounded-context>.<operation>` — e.g. `code-execution.warm-pool-acquire`, `packaging.scorm12.write-manifest`, `tracking.xapi.post-statement`.
- **Attributes required on every span:** `user.id` (pseudonymized), `route.name`, `lesson.id` (if applicable), `course.id` (if applicable). (Scope narrowed 2026-04-21 per ADR 0022: single-tenant substrate means no `tenant.id` span attribute or baggage.)
- **Sampling:** head-sampling at 10% by default; tail-sampling elevated to 100% on errors and p99 outliers.

## 7. Synthetic monitoring

From P3 onward:

- **Synthetic learner journey** every 15 min: open sample course → answer one MCQ → run one Python cell → verify xAPI statement appears in LRS.
- **Synthetic author journey** every 1 h: Keystatic login → edit draft → publish → verify preview URL.
- **External uptime probes** from at least three geographic regions (EU, US-East, APAC).

## 8. Observability onboarding

Every engineer, in first week:

- Read this document.
- Deploy a trivial FastAPI route with correct OTel instrumentation.
- Write one Grafana dashboard panel.
- Shadow an on-call rotation for one week.

## 9. Phase rollout

- **P0:** OTel SDK wired in FastAPI and Node build. GlitchTip self-hosted on the Coolify box (Self-host-first 2026-04-21 per ADR 0021). No dashboards yet.
- **P1:** Runtime Health dashboard live. Error-tracking via GlitchTip (Sentry SDK-compatible).
- **P3:** all 6 primary dashboards live (§3.1–§3.6). Alerting via email active.
- **P4:** synthetic monitoring.
- **P5:** Conformance & Polish. Public SCORM Cloud conformance dashboard (exposed from the LMS compatibility matrix). Formal SLO reports published to the repo's `/status` page. (Scope narrowed 2026-04-21 per ADR 0022: no PagerDuty, no multi-tenant dashboard.)
