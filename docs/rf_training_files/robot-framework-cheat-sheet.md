# Robot Framework — Recap / Cheat Sheet

A quick reference for common Robot Framework tasks, shown side-by-side for both the standard **pip + venv** workflow and the modern **uv** workflow.

| Task | pip + venv | uv |
|---|---|---|
| Install Robot Framework | `pip install robotframework` | `uv add robotframework` |
| Verify installation | `robot --version` | `uv run robot --version` |
| Run a test file | `robot <file.robot>` | `uv run robot <file.robot>` |
| Run all tests in a folder | `robot <folder>` | `uv run robot <folder>` |
| Add the Browser library | `pip install robotframework-browser` | `uv add robotframework-browser` |
| Save project dependencies | `pip freeze > requirements.txt` | *(automatic in `uv.lock`)* |
| Reproduce environment | `pip install -r requirements.txt` | `uv sync` |

---

💡 **Tip:** When using `pip + venv`, remember to activate your virtual environment before running any of these commands. With `uv`, activation is handled automatically by `uv run`.
