---
status: accepted
date: 2026-04-20
deciders: core team
consulted: Many (RF expertise)
informed: future engineering team
---
# 0008 — Execute server-side code on FastAPI + Docker with gVisor (runsc)

## Context and Problem Statement

In-browser runtimes (Pyodide in ADR 0006, Sandpack/iframe in ADR 0007) cover the easy cases. Everything else — CPython beyond Pyodide's reach, polyglot
languages (Go/Rust/Java), Robot Framework with real browsers (ADR 0009), code-grading challenges, anything that needs real filesystem or network — must
execute on a trusted server under strict isolation. Running learner-submitted code on our infrastructure is the highest-risk surface of the entire product
(research §10 Risk #3). A single missed `--network=none` or broken seccomp profile is a kernel exploit away from a breach.

## Decision Drivers

- **Isolation strength.** Docker's shared kernel is weak against kernel exploits; untrusted code execution needs a second layer of isolation.
- **Latency.** Interactive "Run" clicks must feel immediate (warm container pool); batch grading can tolerate cold starts.
- **Operational complexity.** The isolation mechanism must be compatible with our deployment target (Coolify on Hetzner dedicated — ADR 0018) and not require
  nested virtualization unavailable on shared hardware.
- **Multi-language support.** One architecture should cover Python, Node, Robot Framework, and future languages without per-language rearchitecture.
- **Cost.** Warm-pool overhead and per-execution cost must fit the ~$500-700/month self-hosting budget for 1,000 MAU / 40K executions/month (research §4.6).

## Considered Options

| Sandbox | Startup | Overhead | Isolation | Verdict |
|---------|---------|----------|-----------|---------|
| Docker alone | 50 ms | Low | Weak (shared kernel) | Insufficient |
| **gVisor (runsc)** | +few ms | 10–30% I/O | Strong (user-space kernel) | **Default** |
| Firecracker | 125 ms | Very low | Hardware KVM microVM | Self-host opt-in for abuse-prone deployments |
| Kata Containers | 200 ms | Moderate | K8s RuntimeClass microVM | If already on K8s |
| nsjail / bubblewrap | Fast | Low | Namespaces + seccomp | Layer inside containers |
| Wasmtime / WASI | µs | Low | Capability-based | Limited I/O |

## Decision Outcome

Chosen option: **FastAPI orchestrator + Docker + gVisor (runsc) runtime as the default sandbox, with a warm container pool per language image.** Firecracker
is the documented self-host opt-in for operators running abuse-prone deployments (public training catalogs open to the internet, hostile learner pools).
Kata, nsjail, and Wasmtime are not adopted as primary sandboxes in the default tier. (Framing narrowed 2026-04-21 per ADR 0022: the substrate is
single-tenant, so Firecracker is a per-deployment hardening choice, not a multi-tenant escape.)

### Architecture

```
FastAPI (auth, rate-limit, quota, queue)
    │
    ▼
Runner Pool (warm Docker+runsc workers per-language image)
    │
    ▼
Result Collector → Postgres (results) + Redis (state) + xAPI proxy → LRS
```

- **Warm container pool** per language image (python:3.13-slim, node:20-slim, rf-mcp:latest, rf-mcp-vnc, optional judge0) for interactive latency.
- **Per-request ephemeral containers** for batch grading.
- **Redis** stores per-user per-day execution quotas and rate-limit tokens.
- **Postgres** stores job metadata, results, and xAPI statement batches pending emit.
- **WebSocket / SSE** streams stdout/stderr to the browser during execution.

### Hardening checklist (every container, enforced by the runner's container launch code; a missing flag fails the launch)

```
--runtime=runsc
--network=none
--read-only
--tmpfs /tmp:rw,size=64m,noexec
--memory=256m
--cpus=0.5
--pids-limit=64
--cap-drop=ALL
--security-opt=no-new-privileges
--security-opt seccomp=<profile.json>
--user <non-root>
```

Plus:

- **Wall-clock timeout enforced at the orchestrator**, never trusted in-container.
- **Output byte cap** — truncate / kill at 1 MB to prevent log-flood DoS.
- **Destroy after every job**; refill pool from a golden image. No state leaks between learners.
- **Image scanning in CI** (Trivy or Grype) on every runner image build.
- **Per-user per-day execution quota in Redis**, checked *before* the container is launched.
- **Path-traversal validation** on all file inputs — learner-submitted paths are normalized and rejected if they escape the working directory.

### Consequences

- **Security, good:** gVisor's user-space kernel (runsc) is the established defense-in-depth layer for untrusted code execution; it intercepts syscalls in
  user space and exposes a drastically reduced attack surface to the host kernel.
- **Security, good:** checklist is exhaustive and the container launcher enforces every flag — misconfiguration is not an option.
- **Performance, mixed:** gVisor adds 10–30% I/O overhead; acceptable for lesson-grade workloads. File-heavy workloads (e.g. pandas reads a 500 MB CSV) will
  feel this.
- **Performance, good:** warm pool keeps interactive latency under ~200 ms cold-to-first-byte on a reused worker.
- **Portability, good:** Docker + runsc runs on any modern Linux host; Hetzner AX/CX dedicated hosts support it without nested virtualization.
- **Portability, bad:** gVisor requires Linux; macOS/Windows dev requires falling back to Docker-alone locally (documented as a dev-only exception).
- **Cost, controlled:** per-execution cost ~$0.01–0.03 on gVisor, aligning with the $500–700/month budget for 1,000 MAU / 40K executions.
- **Functionality, good:** one architecture handles every language; adding a new language image is a Dockerfile + registry entry.
- **Clarity, good:** the isolation model is documented as a checklist; code review can mechanically verify it on every runner change.

## Pros and Cons of the Options

### Docker alone

- Good: simplest; fastest startup.
- Bad: **shared-kernel vulnerability is the entire reason this ADR exists.** Insufficient for untrusted code.

### gVisor (runsc) — chosen

- Good: strong user-space-kernel isolation; production-tested at Google; no nested virtualization.
- Good: drop-in as a Docker runtime (`--runtime=runsc`).
- Bad: 10–30% I/O overhead.
- Bad: does not emulate 100% of the Linux syscall surface — a few exotic syscalls fail; we document these (ptrace, some io\_uring features).

### Firecracker

- Good: microVM with near-native performance; stronger isolation than gVisor (hardware KVM).
- Good: AWS-grade pedigree (backs Fargate and Lambda).
- Bad: 125 ms startup adds friction to warm-pool management.
- Bad: requires KVM on the host — not available on all Hetzner shared offerings.
- Verdict: **documented self-host opt-in for abuse-prone deployments**, not the default.

### Kata Containers

- Good: K8s-native (`RuntimeClass`), microVM-backed isolation.
- Bad: assumes a K8s operational model — adoption-gated on ADR 0018 (Coolify-on-Hetzner single-tenant default).
- Verdict: not adopted; ADR 0018 keeps the project on Coolify single-box with no K8s on the roadmap per ADR 0022.

### nsjail / bubblewrap alone

- Bad: namespaces + seccomp are not sufficient against kernel exploits without a user-space-kernel layer.
- Good: **useful as a belt-and-braces layer inside the gVisor container** (we may adopt for defense-in-depth on high-risk images).

### Wasmtime / WASI

- Good: fastest startup; strongest capability-based isolation for WASI-targeted code.
- Bad: Python/Node support in WASI is incomplete; Robot Framework has no WASI story.
- Verdict: not viable for our language set in 2026.

### Self-hosted Judge0

- Good: 60+ languages out of the box; permissively supports being called behind our FastAPI gateway.
- Bad: GPLv3 — a copyleft concern only if we modify and redistribute; calling it over HTTP from our own code is fine **but get legal review** (research §4.3).
- Verdict: **optional add-on for multi-language breadth**, behind the same FastAPI API; not replacing gVisor.

### Piston

- Bad: public API tightened to non-commercial tokens in Feb 2026 — must self-host.
- Good: MIT; lighter than Judge0.
- Verdict: alternative to Judge0 if chosen.

## Multi-tenant upgrade trigger

Promote Firecracker from "documented upgrade" to "default" when any of the following becomes true:

- We host paid tiers with untrusted code from different tenants sharing a host.
- We enable a public course marketplace where any learner can run a public course's arbitrary code.
- We observe gVisor CVEs that require blanket patching too frequently to operate reliably.

## Validation

- **Launch flag enforcement:** a unit test constructs the launch arguments for every runner request and asserts every hardening flag is present.
- **Escape tests:** the runner CI includes a suite of known container-escape payloads (network egress, `/sys` writes, `ptrace`, fork bombs) verified to fail.
- **Quota tests:** Redis-backed per-user limit rejects the 41st execution within a 24-hour window (sample quota value) before the container is even launched.
- **Output cap:** a `while True: print(...)` cell is truncated at 1 MB and the container is killed within the wall-clock budget.
- **Image scanning in CI:** Trivy / Grype blocks merge on HIGH/CRITICAL CVEs in any runner base image.
- **Load test:** 40K executions / month distributed across the day stays within the budgeted 2× 4 vCPU runner capacity.

## More Information

- Research §4.3 "Server-side sandbox — FastAPI + Docker with gVisor".
- Research §10 Risk #3 (security) and Risk #7 (RF browser automation specifics).
- gVisor docs: https://gvisor.dev/.
- Firecracker docs: https://firecracker-microvm.github.io/.
- Related ADRs: 0006 (Pyodide), 0007 (Sandpack), 0009 (rf-mcp base image), 0018 (Coolify/Hetzner deployment).
- Open question: Judge0 vs Piston for multi-language breadth — deferred; either works behind our FastAPI gateway.
