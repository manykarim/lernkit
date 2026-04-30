---
id: index
title: Runtime — overview
sidebar_label: Overview
sidebar_position: 1
---

# Runtime

:::info Phase 1 stub

This section will document the `LernkitScorm12` browser runtime in detail —
API discovery, `pagehide` semantics, the `cmi.*` mappings, diagnostics
(`lastError()`, `setDebug()`, `getApiVersion()`), and how
`<ClientRouter />` integration keeps the SCORM session alive across SPA
navigation.

:::

For now, the runtime is documented inline at:

- **[`packages/packagers/src/scorm12/assets/scorm12-runtime.js`](https://github.com/manykarim/lernkit/blob/main/packages/packagers/src/scorm12/assets/scorm12-runtime.js)**
  — the full IIFE source with comments.
- **[`packages/tracker/src/adapters/scorm12.ts`](https://github.com/manykarim/lernkit/blob/main/packages/tracker/src/adapters/scorm12.ts)**
  — the typed `LernkitScorm12Runtime` interface that adapters consume.

Related:

- **[Topology](/packaging/topology)** — single-SCO + ClientRouter integration.
- **[Adapters](/tracking/adapters)** — Tracker → SCORM 1.2 wire mapping.
