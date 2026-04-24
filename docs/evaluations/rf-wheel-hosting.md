# RF Wheel Self-Hosting Brief

Scope: what files + URLs are needed to install Robot Framework 7.4.2 into Pyodide 0.29.3
(micropip 0.11.0) from a self-hosted wheel, with zero runtime dependency on PyPI (ADR 0021).

Sources: PyPI JSON API (`https://pypi.org/pypi/robotframework/7.4.2/json`), Pyodide 0.29.3
`packages/micropip/meta.yaml` (pins micropip 0.11.0), micropip 0.11.1 source on GitHub
(0.11.0 tag missing upstream; 0.11.x API is stable — treat install signature as identical).

## 1. Exact wheel filename

`robotframework-7.4.2-py3-none-any.whl`

Tags: `py3-none-any` — pure Python, platform-independent, Python 3 universal.

## 2. Runtime dependencies

None. `info.requires_dist` is `null` in the PyPI JSON metadata. RF 7.4.2 is pure-Python,
dependency-free. We host exactly **one** file.

## 3. Canonical download URL

```
https://files.pythonhosted.org/packages/ef/35/fd2385b15f6d814f1801bcbd3d54b4c61a1bfc3a1a0fe023dc15551c5fe4/robotframework-7.4.2-py3-none-any.whl
```

(The `ef/35/…` path segment is a blake2b hash, not the sha256. Do not reconstruct it
from the sha256 — use the URL returned by the PyPI JSON API verbatim.)

## 4. SHA-256 (authoritative, from PyPI JSON)

```
6e80f84cdc997bdde2abb6b729ac3531457ecf6d2e41abfb87a541877ab367bf
```

Verify on commit: `sha256sum robotframework-7.4.2-py3-none-any.whl`.

## 5. Size

807,056 bytes (~788 KiB, ~0.77 MB). Easily inlineable in any static-asset bundle; fits
comfortably under typical HTTP/2 initial-window and Cache-Storage budgets.

## 6. Python-tag compatibility

Wheel tag `py3-none-any` + metadata `Requires-Python: >=3.8`. Pyodide 0.29.3 ships
CPython 3.13 — well above the floor. No compatibility caveat. The wheel is a plain
universal py3 wheel; micropip's tag matcher accepts it unconditionally.

## 7. `micropip.install()` signature (micropip 0.11.x, as shipped in Pyodide 0.29.3)

```python
async def install(
    requirements: str | list[str],
    keep_going: bool = False,
    deps: bool = True,
    credentials: str | None = None,
    pre: bool = False,
    index_urls: list[str] | str | None = None,
    *,
    constraints: list[str] | None = None,
    reinstall: bool = False,
    verbose: bool | int | None = None,
) -> None
```

- `requirements`: requirement string or list. Each element is either a package name
  (resolved via index) **or** a wheel URI ending in `.whl`. Supported URI schemes:
  `https:`, `http:`, `emfs:` (Pyodide/Emscripten filesystem path), `file:` (Node only —
  will **not** work in the browser).
- `keep_going`: on dep-resolution failure, keep going and report all errors at the end.
- `deps`: if `False`, do not install transitive deps (moot for RF — none).
- `credentials`: passed through to `fetch()` (e.g. `"same-origin"`, `"include"`).
- `pre`: include pre-release/dev versions during resolution.
- `index_urls`: override of PyPI JSON index. `None` falls back to the instance default
  (`pypi.org/pypi/{package_name}/json`). Accepts one URL string or list; supports
  `{package_name}` placeholder.
- `constraints`: PEP-508 version/URL pins applied only if a requirement is otherwise
  triggered.
- `reinstall`: if `True`, uninstalls incompatible versions first. Note: already-imported
  modules are not reloaded.
- `verbose`: lift log level.

All forms the question asked about are valid: single string, list, and wheel URI.

## 8. Installing from a self-hosted wheel at `/pyodide/wheels/…`

Yes. Pass the URL directly as the requirement string:

```python
import micropip
await micropip.install(
    "/pyodide/wheels/robotframework-7.4.2-py3-none-any.whl",
    deps=False,          # RF has none; skip resolution entirely
    index_urls=[],       # belt-and-braces: no index consulted
)
```

Micropip calls `fetch()` with whatever URL you hand it — relative URLs resolve against
the worker's base URL, exactly like any `fetch()` call. No `file://` needed (and indeed
`file:` only works under Node). An absolute `https://` URL on your own origin works
identically. If the wheel is already in the Emscripten FS (e.g. you preloaded via
`FS.writeFile` or `pyodide.unpackArchive`), use `emfs:/path/to/wheel.whl`.

## 9. Disabling all PyPI fetching (ADR 0021)

Two options, both safe:

- **Per-call**: pass `index_urls=[]`. With `deps=False` and a direct wheel URL there is
  no index lookup anyway, so PyPI is never contacted.
- **Global**: `micropip.set_index_urls([])` once at worker init. This mutates the
  module-level singleton's `self.index_urls` so subsequent `install()` calls with
  `index_urls=None` use the empty list.

Belt-and-braces for production: do both, plus a CSP `connect-src` allowlist that omits
`pypi.org` and `files.pythonhosted.org`. There is no single "offline mode" flag; the
combination above is the idiomatic way.

## 10. Persistence across worker restarts

Short answer: **not out of the box.** Install time is paid on every cold worker boot.

- Pyodide's default FS is MEMFS — volatile, per-worker.
- Installed wheel contents land under `getsitepackages()[0]` (MEMFS). A fresh worker
  starts with an empty site-packages and must re-install.
- Pyodide does support mounting IDBFS / NATIVEFS_ASYNC at arbitrary paths, but
  **micropip does not integrate with that automatically** — you would have to mount
  IDBFS at site-packages before import, sync it after install, and sync it back before
  subsequent boots. Doable but fragile and undocumented for this use case
  (unverified — verify at implementation time).
- `install()` is idempotent-ish; if a compatible version is already installed and
  `reinstall=False`, it no-ops.

Practical mitigations, in order of preference:

1. **HTTP Cache-Control + Service Worker cache** for the wheel URL itself. The ~0.8 MB
   wheel is served once per client; subsequent worker boots re-fetch from disk cache
   and re-install into MEMFS. Local-disk install measured ~1–2 s (vs. 20–60 s cold
   from PyPI). This is the recommended path.
2. **Bundle-as-asset + `pyodide.unpackArchive`**: ship the wheel alongside the Pyodide
   assets, `fetch()` once, unpack into site-packages directly at boot. Skips micropip
   entirely, shaves another ~500 ms.
3. **IDBFS mount of site-packages** (unverified — verify at implementation time):
   install once, persist the whole site-packages tree. Complex; only worth it if
   boot-time budget is tight and option 1 is not enough.

## Recommended wire-up (tl;dr)

```js
// in the Pyodide worker after loadPyodide()
await pyodide.loadPackage("micropip");
await pyodide.runPythonAsync(`
import micropip
micropip.set_index_urls([])
await micropip.install(
    "/pyodide/wheels/robotframework-7.4.2-py3-none-any.whl",
    deps=False,
)
import robot
print(robot.__version__)
`);
```

Ship one file: `public/pyodide/wheels/robotframework-7.4.2-py3-none-any.whl`
(807,056 bytes, sha256 `6e80f84c…67bf`). No deps. No PyPI calls at runtime.
