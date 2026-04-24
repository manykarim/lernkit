# Section 1 — Getting Started with Robot Framework

> **Learning objective:** By the end of this section, you will have Python installed, a project set up with Robot Framework, VS Code configured with the RobotCode extension, and will have executed your first test from the command line — with a working mental model of how all the pieces fit together.

---

## Chapter 1.1 — Install Python and pip

Robot Framework is built with Python, so you need Python installed on your machine. You also need **pip**, Python's package manager, which ships with Python by default. Robot Framework works with Python 3.8 or newer — but we recommend **Python 3.13 or higher** for the best experience with the latest features.

### ▸ Install Python on Windows

1. Go to [python.org/downloads](https://www.python.org/downloads/) and download the latest stable Windows installer.
2. Run the installer.
3. **Important:** Tick the box **"Add python.exe to PATH"** on the first screen.
4. **Important:** Leave **"Use admin privileges when installing py.exe"** unticked — this avoids needing elevated permissions and keeps Python in your user profile.
5. Click **Install Now** and wait for it to finish.

### ▸ Install Python on macOS

Open a terminal and run:

```
brew install python
```

Homebrew will download and install the latest stable Python version and will handle updates for you afterwards.

### ▸ Install Python on Linux (Debian/Ubuntu)

Open a terminal and run:

```
sudo apt update
sudo apt install python3 python3-pip python3-venv
```

### ▸ Verify the installation

Open a new terminal or command prompt and run:

```
python --version
```

On macOS and Linux, you may need to run `python3 --version` instead.

You should see something like:

```
Python 3.13.0
```

Then verify pip is available:

```
pip --version
```

You should see a line like `pip 24.0 from ...`.

💡 If `python --version` returns something older than 3.8, or the command isn't recognised at all, your PATH is likely not set up correctly. On Windows, rerun the installer and make sure **"Add python.exe to PATH"** is ticked.

### Checklist

- ☐ Python 3.8 or higher is installed
- ☐ `python --version` works from any terminal window
- ☐ `pip --version` works from any terminal window

---

## Chapter 1.2 — Virtual environments

A **virtual environment** (or *venv*) is an isolated Python installation that lives inside your project folder. It keeps the packages you install for one project from interfering with any other project — or with your system Python. This is considered a best practice for every Python project, and it's essential for Robot Framework projects where you'll often install many libraries.

Without a venv, running `pip install robotframework` installs it globally. With a venv, the installation lives inside the venv's folder and disappears when you delete the folder.

### ▸ Create a project folder and venv

```
mkdir my-rf-tests
cd my-rf-tests
python -m venv .venv
```

This creates a folder named `.venv` inside your project containing a self-contained Python installation.

### ▸ Activate the virtual environment

**Windows (PowerShell):** `.venv\Scripts\Activate.ps1`
**Windows (cmd.exe):** `.venv\Scripts\activate.bat`
**macOS / Linux:** `source .venv/bin/activate`

When activation succeeds, your terminal prompt gains a `(.venv)` prefix.

### ▸ Confirm the venv is active

Run `which python` (macOS/Linux) or `where python` (Windows) — the path should include your project's `.venv` folder. Also run `pip list` to see only a minimal set of packages, confirming isolation.

💡 To deactivate the venv later, just type `deactivate`. To use the venv again next time, simply re-run the activation command from your project folder.

### Checklist

- ☐ A `.venv` folder exists inside your project folder
- ☐ The virtual environment is activated (you see `(.venv)` in your prompt)
- ☐ `pip list` shows only a handful of packages

---

## Chapter 1.3 — Optional: use `uv` for dependency management

**`uv`** is a modern, very fast tool that handles Python installation, venv creation, and dependency management in a single command. This chapter is **optional** — if you're happy with pip and venv, skip to Chapter 1.4.

### ▸ Install uv

**Windows (PowerShell):**
```
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

**macOS / Linux:**
```
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Verify with `uv --version`.

### ▸ Initialise a project

```
uv init my-rf-tests
cd my-rf-tests
uv python pin 3.13
uv add robotframework
uv run robot --version
```

You **never need to activate** the venv manually — `uv run` handles it for you.

### ▸ uv cheat sheet

| Task | Command |
|---|---|
| Add a package | `uv add <package>` |
| Remove a package | `uv remove <package>` |
| Install everything from lock | `uv sync` |
| Run a command in the env | `uv run <command>` |
| Update uv itself | `uv self update` |

💡 Commit both `pyproject.toml` and `uv.lock` to version control.

### Checklist

- ☐ `uv --version` works
- ☐ `uv init my-rf-tests` created a project folder
- ☐ `uv add robotframework` completed successfully
- ☐ `uv run robot --version` prints the installed Robot Framework version

---

## Chapter 1.4 — Installing Robot Framework

### ▸ Install Robot Framework

Make sure your virtual environment is **activated**.

```
pip install --upgrade pip
pip install robotframework
```

Pin a version for team projects: `pip install robotframework==7.4.2`

💡 **Using uv?** `uv add robotframework` does the equivalent, no activation needed.

### ▸ Verify the installation

```
robot --version
```

You should see: `Robot Framework 7.4.2 (Python 3.13.0 on win32)`

💡 **Using uv?** Run `uv run robot --version` instead.

### ▸ Freeze your dependencies (pip only)

```
pip freeze > requirements.txt
pip install -r requirements.txt    # to reproduce elsewhere
```

💡 **Using uv?** Skip this — `uv.lock` handles it. Reproduce with `uv sync`.

### ▸ Create your first test

Create a file called `first_test.robot`:

```robot
*** Settings ***
Documentation    My very first Robot Framework test

*** Test Cases ***
Say Hello
    Log To Console    Hello, Robot Framework!
    Should Be Equal    ${1 + 1}    ${2}
```

### ▸ Run your first test

```
robot first_test.robot
```

Expected output:

```
==============================================================================
First Test
==============================================================================
Say Hello                                                             Hello, Robot Framework!
| PASS |
------------------------------------------------------------------------------
First Test                                                            | PASS |
1 test, 1 passed, 0 failed
==============================================================================
Output:  /your/project/path/output.xml
Log:     /your/project/path/log.html
Report:  /your/project/path/report.html
```

💡 **Using uv?** `uv run robot first_test.robot`

### ▸ Explore the logs and reports

- **`output.xml`** — machine-readable raw output
- **`log.html`** — detailed log with every keyword, argument, result
- **`report.html`** — high-level summary

### ▸ Install additional libraries (optional)

```
pip install robotframework-browser     # web automation (Playwright-based)
pip install robotframework-requests    # REST API testing
```

💡 **Using uv?** `uv add robotframework-browser`, `uv add robotframework-requests`

### ▸ Recap / Cheat Sheet

| Task | pip + venv | uv |
|---|---|---|
| Install Robot Framework | `pip install robotframework` | `uv add robotframework` |
| Verify installation | `robot --version` | `uv run robot --version` |
| Run a test file | `robot <file.robot>` | `uv run robot <file.robot>` |
| Run all tests in a folder | `robot <folder>` | `uv run robot <folder>` |
| Add the Browser library | `pip install robotframework-browser` | `uv add robotframework-browser` |
| Save project dependencies | `pip freeze > requirements.txt` | *(automatic in `uv.lock`)* |
| Reproduce environment | `pip install -r requirements.txt` | `uv sync` |

### Checklist

- ☐ Virtual environment active (prompt shows `(.venv)`)
- ☐ Robot Framework installed
- ☐ `robot --version` prints the installed version
- ☐ `first_test.robot` created
- ☐ Test executes and passes
- ☐ `log.html` and `report.html` opened in browser

---

## Chapter 1.5 — Set up your IDE

For Robot Framework, the recommended setup is **Visual Studio Code (VS Code)** with the **RobotCode** extension.

### ▸ Why RobotCode?

All-in-one Robot Framework support: syntax highlighting, autocompletion, go-to-definition, hover docs, Test Explorer integration, full debugger, and the Robotidy formatter. It's the actively-maintained successor to older extensions.

### ▸ Install VS Code

1. Download from [code.visualstudio.com](https://code.visualstudio.com) and install
2. macOS alternative: `brew install --cask visual-studio-code`
3. Linux (Debian/Ubuntu): `sudo apt install code`

### ▸ Install the RobotCode extension

1. Open VS Code
2. Open Extensions (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Search for **RobotCode**
4. Click **Install** on the extension by *d-biehl*

💡 RobotCode auto-installs the Python extension as a dependency.

### ▸ Open your project folder

**File → Open Folder…** and select your `my-rf-tests` folder. Opening the folder (not a single file) lets RobotCode read your Python environment and all your `.robot` files correctly.

### ▸ Select the correct Python interpreter

1. Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. **Python: Select Interpreter**
3. Choose the `.venv` interpreter:
   - Windows: `.\.venv\Scripts\python.exe`
   - macOS/Linux: `./.venv/bin/python`

### ▸ Verify syntax highlighting and autocompletion

Open your `first_test.robot` file — you should see coloured keywords, autocompletion when typing, and hover tooltips on `Log To Console` / `Should Be Equal`.

### ▸ Run tests from the Test Explorer

1. Click the flask icon in the sidebar (Testing panel)
2. Click ▶ next to any test to run, or 🐞 to debug

### ▸ Debug with breakpoints

1. Click in the gutter left of a line number (red dot = breakpoint)
2. Click 🐞 on the test in the Testing panel
3. Inspect variables, step through, evaluate expressions in the debugger

### ▸ Format code with Robotidy

- Format on demand: `Shift+Alt+F` / `Shift+Option+F`
- Format on save, add to `settings.json`:

```json
{
    "[robotframework]": {
        "editor.defaultFormatter": "d-biehl.robotcode",
        "editor.formatOnSave": true
    }
}
```

### ▸ Useful keyboard shortcuts

| Action | Windows/Linux | macOS |
|---|---|---|
| Command Palette | `Ctrl+Shift+P` | `Cmd+Shift+P` |
| Go to Definition | `F12` | `F12` |
| Find All References | `Shift+F12` | `Shift+F12` |
| Rename Symbol | `F2` | `F2` |
| Format Document | `Shift+Alt+F` | `Shift+Option+F` |

### ▸ Recommended companion extensions

- **Python** (Microsoft) — auto-installed with RobotCode
- **Even Better TOML** — for `pyproject.toml` editing
- **GitLens** — enhanced Git integration
- **Error Lens** — inline error/warning display

### Checklist

- ☐ VS Code installed
- ☐ RobotCode extension installed and enabled
- ☐ Project folder opened as workspace
- ☐ Python interpreter set to `.venv`
- ☐ Syntax highlighting works on `.robot` files
- ☐ Test Explorer shows your tests
- ☐ ▶ button runs a test with green ✔

---

## Section 1 — Flipcards

| Front | Back |
|---|---|
| Python | The programming language Robot Framework is built on. Install version 3.8 or higher (3.13+ recommended). |
| pip | Python's package manager. Comes with Python by default. Used to install packages like Robot Framework. |
| Virtual environment (`.venv`) | An isolated Python installation inside your project folder. Keeps one project's packages from interfering with another's. |
| `python -m venv .venv` | Command to create a new virtual environment in the current folder. |
| Activate | The step that makes `python` and `pip` inside a terminal point to the venv rather than the system Python. |
| `uv` | A modern, fast Python project manager that handles Python installation, venv creation, and dependency management in a single tool. |
| `uv add <package>` | Add a package to the project. Installs it into the project's venv and records it in `pyproject.toml` + `uv.lock`. |
| `uv run <command>` | Run a command using the project's isolated environment, without manual activation. |
| `pip install robotframework` | The command to install Robot Framework into your active virtual environment using pip. |
| `robot --version` | Command to verify the Robot Framework installation and display the installed version. |
| `.robot` | The standard file extension for Robot Framework test suite files. |
| `*** Settings ***` | Section header used to import libraries, resource files, and define suite-level metadata. |
| `*** Test Cases ***` | Section header that introduces one or more test cases in a `.robot` file. |
| Keyword | A reusable action in Robot Framework, such as `Log To Console` or `Should Be Equal`. |
| `log.html` / `report.html` | Auto-generated files after each test run — detailed log and high-level summary respectively. |
| `requirements.txt` | A file listing your project's Python dependencies. Created with `pip freeze > requirements.txt`. |
| RobotCode | The recommended VS Code extension for Robot Framework. Provides syntax highlighting, autocompletion, debugging, and Test Explorer integration. |
| Python Interpreter | The specific Python executable VS Code uses to run your tests. Must point to the one inside your project's `.venv` folder. |
| Test Explorer | VS Code's built-in Testing panel (flask icon). With RobotCode, lists all your Robot Framework tests and lets you run or debug them. |
| Breakpoint | A marker set on a line of code that pauses test execution there, so you can inspect variables and step through the test. |
| Robotidy | A code formatter for Robot Framework, built into RobotCode. Enforces consistent style across `.robot` files. |

---

**End of Section 1**

> **What's next:** Section 2 — Robot Framework Fundamentals. You'll learn the structure of a `.robot` file, write real test cases with variables and assertions, and get a working grasp of control structures (IF, FOR, TRY).
