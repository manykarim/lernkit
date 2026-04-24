# Section 2 — Robot Framework Fundamentals

> **Learning objective:** By the end of this section, you will understand the structure of a `.robot` file, be able to write and run simple test cases with variables and assertions, and have a working grasp of the most common control structures (IF, FOR, TRY).

---

## Chapter 2.1 — Anatomy of a `.robot` file

A Robot Framework test file is just a plain text file with the extension `.robot`. Inside it, content is organised into **sections**, each introduced by a header that starts and ends with `***`.

You will encounter four sections in nearly every file:

| Section | What it holds |
|---|---|
| `*** Settings ***` | Library imports, file-level documentation, suite setup/teardown |
| `*** Variables ***` | Variables that are available to all tests in the file |
| `*** Test Cases ***` | The actual tests |
| `*** Keywords ***` | Reusable keywords that you define yourself |

Here is a minimal but complete example. Every test suite you write will follow this same skeleton:

```robot
*** Settings ***
Documentation    Minimal example of a Robot Framework test file.
Library          Collections

*** Variables ***
${WAREHOUSE}     Munich Distribution Center

*** Test Cases ***
Welcome To Warehouse
    Greet Warehouse
    Log    Shift is starting

*** Keywords ***
Greet Warehouse
    Log To Console    Hello, ${WAREHOUSE}!
```

Notice how the test case `Welcome To Warehouse` calls the custom keyword `Greet Warehouse` — that's how the four sections fit together: settings configure the file, variables hold reusable values, the test case describes the scenario, and user-defined keywords keep the test readable.

### ▸ The two-space separator rule

Robot Framework separates keywords from their arguments — and arguments from each other — with **at least two spaces**. This is probably the single most common source of beginner confusion.

✅ Correct (two spaces between keyword and argument):

```robot
Log    Hello, world!
```

❌ Wrong (only one space — Robot Framework will think `Log Hello,` is the keyword name):

```robot
Log Hello, world!
```

💡 Most IDEs (including VS Code with RobotCode) highlight this for you automatically. If a keyword turns red or autocomplete stops working, check your spacing first.

### ▸ Comments

Use `#` to add comments. Everything from `#` to the end of the line is ignored by Robot Framework.

```robot
# This whole line is a comment
Log    Hello    # You can also comment at the end of a line
```

### Checklist

- ☐ You can name the four main sections of a `.robot` file
- ☐ You know that section headers must start and end with `***`
- ☐ You understand the two-space separator rule
- ☐ You know how to add a comment with `#`

---

## Chapter 2.2 — Writing test cases

A test case in Robot Framework is simply a **name** followed by a list of **steps**. Each step is a call to a keyword, optionally with arguments.

```robot
*** Test Cases ***
Warehouse Arrival Is Logged
    Log              Shift started at Munich DC
    Log To Console   Ready for dock assignments
```

That's a complete, runnable test. The test name (`Warehouse Arrival Is Logged`) starts at column 1 — no indentation. The steps are indented with at least two spaces.

### ▸ Test settings: Documentation and Tags

Each test can have settings that start with square brackets, placed **immediately after the test name**:

```robot
*** Test Cases ***
Container Weight Is Within Limit
    [Documentation]    Verifies that two containers do not exceed the vessel limit.
    [Tags]             warehouse    smoke
    Log    Checking container weights...
```

- `[Documentation]` — a short description that appears in the log and report
- `[Tags]` — labels you can later use to filter which tests to run (e.g. only `smoke` tests)

💡 Long documentation can span multiple lines using `...` as a continuation marker:

```robot
    [Documentation]    This test verifies that two containers
    ...                do not exceed the vessel weight limit
    ...                of 25,000 kg.
```

### ▸ Your two workhorse logging keywords

Two built-in keywords will appear in almost every test you write:

| Keyword | Where the message goes |
|---|---|
| `Log` | Into `log.html` only (not visible on the console) |
| `Log To Console` | Printed to the terminal immediately, visible as the test runs |

Use `Log` for most diagnostic output — it keeps the terminal clean and makes the log file rich. Use `Log To Console` only when you specifically want to see something in real time while the test runs.

### ▸ Running a single test vs. a whole file

To run everything in a file:

```
robot warehouse.robot
```

To run only one specific test case by name, use `-t`:

```
robot -t "Container Weight Is Within Limit" warehouse.robot
```

To put the log files in a dedicated folder instead of the current directory, use `-d`:

```
robot -d logs warehouse.robot
```

### Checklist

- ☐ You can write a test case with a name and at least one step
- ☐ You know how to add `[Documentation]` and `[Tags]` to a test
- ☐ You know the difference between `Log` and `Log To Console`
- ☐ You can run a single test by name using `-t`

---

## Chapter 2.3 — Variables

Variables let you avoid repetition and write tests that are easier to read and maintain. Robot Framework has three variable types, distinguished by their prefix character:

| Prefix | Type | Example |
|---|---|---|
| `$` | Scalar (single value) | `${warehouse}` |
| `@` | List | `@{containers}` |
| `&` | Dictionary | `&{shipment}` |

### ▸ Declaring variables with `VAR`

The modern way to create a variable inside a test is with the `VAR` keyword:

```robot
VAR    ${warehouse}     Munich DC
VAR    @{containers}    MRKU1234567    TCLU7654321
VAR    &{shipment}      origin=Munich    destination=Amsterdam

Log    Shipping from ${shipment}[origin]
```

You can also declare suite-level variables in the `*** Variables ***` section, so they're available to every test in the file:

```robot
*** Variables ***
${WAREHOUSE}      Munich DC
@{CONTAINERS}     MRKU1234567    TCLU7654321
&{SHIPMENT}       origin=Munich    destination=Amsterdam
```

💡 By convention, suite-level variables are written in `UPPERCASE`, while test-local variables (declared with `VAR`) are `lowercase`. This makes scope visible at a glance.

### ▸ Gotcha: variables are strings by default

> ⚠️ This is the single most common source of confusion when starting out with Robot Framework. Read this chapter carefully.

By default, Robot Framework treats every variable as a **string** — even if you wrote what looks like a number:

```robot
VAR    ${weight}    8200

# This passes — both are the STRING "8200"
Should Be Equal    ${weight}    8200

# This FAILS — you can't add a number to a string!
${total}    Evaluate    ${weight} + 1000
```

The fix is **typed variables**. Add a type annotation after the variable name:

```robot
VAR    ${weight: int}    8200

# Now ${weight} is a real integer
${total}    Evaluate    ${weight} + 1000
Should Be Equal As Integers    ${total}    9200
```

Common types you'll use:

| Type | Example |
|---|---|
| `int` | `VAR ${count: int} 42` |
| `float` | `VAR ${price: float} 19.99` |
| `bool` | `VAR ${active: bool} True` |
| `str` | `VAR ${name: str} Alice` |
| `dict` | `VAR ${data: dict} {"key": "value"}` |

You can also force a single value into a number inline by writing it as `${8200}` (with curly braces around the number). This is common in lists:

```robot
@{weights}    Create List    ${8200}    ${12400}    ${3000}
```

### ▸ Built-in variables worth knowing

Robot Framework provides a handful of useful built-in variables you don't need to declare:

| Variable | What it is |
|---|---|
| `${TRUE}` / `${FALSE}` | Boolean values |
| `${NONE}` | Python's `None` — useful for "not set yet" |
| `${EMPTY}` | An empty string (more readable than just nothing) |
| `${CURDIR}` | The folder the current `.robot` file lives in |
| `${OUTPUT_DIR}` | The folder where test artefacts are written (set via `-d`) |
| `${/}` | OS-appropriate path separator (`/` or `\`) |

Example — reading a test data file that lives next to your test:

```robot
${shipment}    Get File    ${CURDIR}/transport_event.json
```

### ▸ Lists and dictionaries in action

There are three ways to build lists and dictionaries. They produce the same result — pick the one that fits where you are in your test.

```robot
# (1) Inline literal — only works in the *** Variables *** section
@{containers}    MRKU1234567    TCLU7654321    MSKU9988776
&{shipment}      origin=Munich    destination=Amsterdam    weight=${8200}

# (2) VAR syntax — works anywhere (inside a test or a keyword)
VAR    @{containers}    MRKU1234567    TCLU7654321    MSKU9988776
VAR    &{shipment}      origin=Munich    destination=Amsterdam    weight=${8200}

# (3) Create List / Create Dictionary keywords (the traditional style)
@{containers}    Create List          MRKU1234567    TCLU7654321    MSKU9988776
&{shipment}      Create Dictionary    origin=Munich    destination=Amsterdam    weight=${8200}
```

💡 **Prefer `VAR`** for anything declared inside a test or keyword. It reads consistently with scalar declarations and — unlike inline literals or `Create List` — supports an optional `scope=` parameter:

```robot
VAR    ${local_var}    local value              scope=LOCAL
VAR    ${test_var}     shared within test       scope=TEST
VAR    ${suite_var}    shared across suite      scope=SUITE
```

Available scopes are `LOCAL` (default), `TEST`, `SUITE`, `SUITES`, and `GLOBAL`. This replaces the older family of `Set Variable`, `Set Test Variable`, `Set Suite Variable`, etc., with one consistent syntax. See the [VAR syntax section of the User Guide](https://robotframework.org/robotframework/latest/RobotFrameworkUserGuide.html#var-syntax) for full details.

Accessing values:

```robot
# List access by index (zero-based)
Log    ${containers}[0]      # MRKU1234567

# Dictionary access by key
Log    ${shipment}[origin]    # Munich
```

### Checklist

- ☐ You can declare scalar, list, and dictionary variables using `VAR`
- ☐ You know that variables are strings by default, and how typed variables fix that
- ☐ You can access list items by index and dict values by key
- ☐ You know what `${CURDIR}` and `${OUTPUT_DIR}` refer to

---

## Chapter 2.4 — Basic assertions

A test without assertions isn't really a test — it's just a script. Assertions are the keywords that **check your expectations** and cause the test to fail if those expectations aren't met.

Robot Framework's `BuiltIn` library (which is always imported automatically) provides dozens of assertion keywords. In practice, you'll use just a handful most of the time.

### The four you'll use 90% of the time

| Keyword | What it does |
|---|---|
| `Should Be Equal` | Assert two values are equal |
| `Should Be True` | Assert a condition (Python expression) is true |
| `Should Contain` | Assert a string/list/dict contains a value |
| `Length Should Be` | Assert a list or string has an expected length |

A full example using each:

```robot
*** Test Cases ***
Shipment Meets Requirements
    VAR    ${origin}        Munich
    VAR    ${weight: int}   8200
    @{containers}    Create List    MRKU1234567    TCLU7654321

    Should Be Equal      ${origin}         Munich
    Should Be True       ${weight} < 25000
    Should Contain       ${containers}     MRKU1234567
    Length Should Be     ${containers}     2
```

### ▸ When Should Be Equal lies to you

Remember the string-by-default gotcha from the previous chapter? It affects assertions too:

```robot
${answer}    Evaluate    100 + 23

# ${answer} is the integer 123
# "123" is the string "123"
# These are NOT equal!
Should Be Equal              ${answer}    123    # FAILS

# Use the type-aware variant instead:
Should Be Equal As Integers  ${answer}    123    # PASSES
```

Related variants you'll occasionally need:

- `Should Be Equal As Integers`
- `Should Be Equal As Numbers` (handles floats)
- `Should Be Equal As Strings`

### ▸ Negative assertions

Most assertion keywords have a `Should Not` counterpart:

```robot
Should Not Be Equal    ${status}       FAILED
Should Not Contain     ${shipment}     tracking_id
Should Not Be Empty    ${containers}
```

### Checklist

- ☐ You know the four most common assertion keywords
- ☐ You know when to use `Should Be Equal As Integers` instead of `Should Be Equal`
- ☐ You know that most assertions have a `Should Not` counterpart

---

## Chapter 2.5 — Control structures (a brief tour)

Robot Framework supports the control structures you'd expect from a modern programming language: conditionals, loops, and error handling. This chapter is a **brief tour** — just enough to recognise each one and write basic versions yourself. For the full range of options (WHILE loops, ELSE IF chains, BREAK/CONTINUE, pattern matching in EXCEPT, etc.), see the [Robot Framework User Guide](https://robotframework.org/robotframework/latest/RobotFrameworkUserGuide.html).

### ▸ IF / ELSE

Conditional logic uses `IF`, `ELSE`, and the mandatory `END`:

```robot
IF    ${weight} > 25000
    Log    Overweight — split the shipment
ELSE
    Log    OK to load
END
```

For a single short action, Robot Framework also supports an inline form:

```robot
IF    ${hazardous}    Log    ⚠ Hazardous cargo
```

### ▸ FOR loops

`FOR` iterates over a list of values. The syntax is `FOR ... IN ... END`:

```robot
FOR    ${container}    IN    @{containers}
    Log    Inspecting ${container}
END
```

For a fixed number of iterations, use `IN RANGE`:

```robot
FOR    ${dock}    IN RANGE    1    11
    Log    Dock ${dock} ready
END
```

### ▸ TRY / EXCEPT — error handling

When a keyword fails, Robot Framework normally stops the test. `TRY / EXCEPT` lets you catch the failure and continue:

```robot
TRY
    Parse Xml    broken.xml
EXCEPT
    Log    XML file was invalid — using defaults
END
```

You can also add a `FINALLY` block that always runs (useful for cleanup):

```robot
TRY
    Submit Customs Clearance
EXCEPT
    Log    Clearance failed — will retry later
FINALLY
    Log    Clearance attempt recorded in audit log
END
```

💡 Everything above can be combined — loops inside conditionals, TRY inside loops, and so on. Robot Framework also supports `WHILE`, `BREAK`, `CONTINUE`, and `ELSE IF` chains, which are covered in the User Guide. You'll rarely need them for simple tests.

### Checklist

- ☐ You can write an `IF / ELSE / END` block
- ☐ You can write a `FOR` loop over a list and over a range
- ☐ You know how to catch a failure with `TRY / EXCEPT`
- ☐ You know that all control structures require a closing `END`

---

## Hands-on exercises

These exercises give you a chance to practise what you've learnt on a realistic logistics scenario. Templates and solutions are available in the course repository.

### Exercise 2.1 — Warehouse Welcome  ★☆☆  (~5 min)

You've arrived for your first shift at the Munich Distribution Center. Log your arrival and assert the message is correct.

**Your task:**

1. Create a file `warehouse_welcome.robot`.
2. Write a test case called `Log Warehouse Arrival`.
3. Create a variable `${ARRIVAL_MSG}` with the text `"<your-name> reporting to Munich DC"`.
4. Log the message to both the Robot log and the console.
5. Assert that `${ARRIVAL_MSG}` is not empty.
6. Run the test: `robot -d logs warehouse_welcome.robot`
7. Open `logs/log.html` and verify your message appears.

**Keywords to use:** `Log`, `Log To Console`, `VAR`, `Should Not Be Empty`

### Exercise 2.2 — Shipment Inspector  ★★☆  (~10 min)

A new shipment has arrived. Build a dictionary with its details, flag it if it's hazardous, and iterate over all its fields.

**Your task:**

1. Create a file `shipment_inspector.robot`. Import the `Collections` library.
2. Write a test case called `Inspect Shipment`.
3. Build a dictionary `&{SHIPMENT}` with these keys:
   - `origin` = `Munich`
   - `destination` = `Amsterdam`
   - `weight_kg` = `${8200}`
   - `hazardous` = `${FALSE}`
4. Assert the dictionary **contains** `origin` but does **not contain** `tracking_id`.
5. Use an `IF` statement: if hazardous, log a warning; otherwise, log `"Standard cargo"`.
6. Add `tracking_id=SHP-2026-0042` to the dictionary using `Set To Dictionary`.
7. Loop over all key-value pairs with `FOR ${k} ${v} IN &{SHIPMENT}` and log each.

**Keywords to use:** `Create Dictionary`, `Should Contain`, `Should Not Contain`, `Set To Dictionary`, `IF / ELSE / END`, `FOR / IN / END`

---

## Section 2 — Flipcards

| Front | Back |
|---|---|
| `*** Settings ***` | Section for library imports, file-level documentation, and suite-level setup/teardown. |
| `*** Test Cases ***` | Section that contains one or more test cases. Each test is a name followed by indented steps. |
| Two-space separator | Keywords and their arguments (and arguments from each other) are separated by **at least two spaces**. One space is not enough. |
| `[Documentation]` | A test-level setting that adds a description, shown in the log and report. Can span multiple lines using `...`. |
| `[Tags]` | Labels attached to a test. Used with `--include` / `--exclude` to filter which tests to run. |
| `VAR` | The modern keyword for declaring variables inline inside a test or keyword. Works with scalars, lists, and dictionaries. |
| Scalar / List / Dict (`${x}` / `@{x}` / `&{x}`) | The three variable types, identified by prefix. `$` for a single value, `@` for a list, `&` for a dictionary. |
| Typed Variable (`${x: int}`) | A variable declared with a type annotation so it isn't treated as a string. Common types: `int`, `float`, `bool`, `str`, `dict`. |
| `${CURDIR}` | Built-in variable pointing to the folder the current `.robot` file lives in. Handy for loading test data files that sit next to your tests. |
| `${OUTPUT_DIR}` | Built-in variable pointing to the folder where test artefacts (log, report, files created during the run) are written. Controlled via the `-d` CLI flag. |
| Assertion | A keyword that checks an expectation and fails the test if the check doesn't hold. Most start with `Should...` — e.g. `Should Be Equal`, `Should Contain`. |
| `Should Be Equal As Integers` | Numeric comparison that converts both sides to integers before comparing. Needed because plain `Should Be Equal` treats values as strings. |
| `IF / ELSE / END` | Conditional block. The `END` is mandatory. An inline form exists for single-action conditions. |
| `FOR / IN / END` | Loop over a list of values. Variants: `IN` (explicit list), `IN RANGE` (fixed count), `IN ENUMERATE` (index + value). |
| `TRY / EXCEPT / END` | Error handling block. Catches keyword failures so the test can continue. Optional `FINALLY` runs in both success and failure cases. |

---

**End of Section 2**

> **What's next:** Section 3 — File Operations. You'll learn to read and write plain text, XML, and JSON files using built-in libraries — a practical skill you'll use in almost every real-world test project.
