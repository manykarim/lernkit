---
id: quickstart
title: Quickstart
sidebar_position: 2
---

# Quickstart

This walks through cloning Lernkit, running the dev server, packaging a SCORM
zip, and importing it into SCORM Cloud's free-tier sandbox. ~5 minutes if you
already have Node 22 and pnpm 9.

## Prerequisites

- **Node 22+**. Check: `node --version`.
- **pnpm 9+**. Install: `npm install -g pnpm` if you don't have it.
- A GitHub or SCORM Cloud account for the import test (optional).

## 1. Clone and install

```bash
git clone https://github.com/manykarim/lernkit.git
cd lernkit
pnpm install
```

`pnpm install` runs `copy-pyodide.mjs` and `download-rf-libdocs.mjs` as
post-install steps; expect ~30 seconds extra the first time. The Pyodide
runtime self-hosts under `apps/docs/public/pyodide/`, and Robot Framework
libdocs land at `apps/docs/public/rf-libdocs/`.

## 2. Run the dev server

```bash
pnpm --filter=@lernkit/docs dev
```

This serves the existing rf-training course (an Astro / Starlight site) at
`http://localhost:4321/rf-training/`. Click around — there are quizzes,
runnable Python cells, and runnable Robot Framework cells.

## 3. Package as SCORM 1.2

In a second terminal:

```bash
pnpm --filter=@lernkit/docs build
COURSE_ROOT_DIR=rf-training \
  COURSE_ID=rf-training \
  COURSE_TITLE="Robot Framework Training" \
  INCLUDE_PYODIDE_RUNTIME=1 \
  node apps/docs/scripts/package-scorm12.mjs
```

This writes `apps/docs/dist-packages/scorm12/rf-training-0.0.0-scorm12.zip` —
a single-SCO SCORM 1.2 package with the Pyodide runtime and Robot Framework
wheel bundled in.

## 4. Import into SCORM Cloud

1. Sign up at [cloud.scorm.com](https://cloud.scorm.com) (free tier — 100 MB,
   10 registrations).
2. **My Courses → Add Content → Upload**.
3. Drop the zip from step 3.
4. Click the course → **Launch**.
5. Click around: quizzes submit, code editor runs `Run suite`, log.html opens.

If you hit a snag, see [LMS deployment troubleshooting](/lms-deployment/) — the
common issues (CSS MIME refusals, `pyodide.mjs` MIME, log.html sandbox) are
all handled by the v10 packager, but knowing the failure modes helps when a
new LMS variant turns up.

## 5. (Optional) Make a change

Edit `apps/docs/src/content/docs/rf-training/section-1-getting-started/1-1-install-python.mdx`,
save, and the dev server hot-reloads. Repackage with step 3 to ship the
updated zip.

## Where to go next

- **Author a new course** → [Authoring](/authoring/).
- **Customize the packager** → [SCORM 1.2 packaging](/packaging/scorm12).
- **Pick the right Tracker** → [Tracking](/tracking/interface).
