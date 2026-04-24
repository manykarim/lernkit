*** Settings ***
Documentation    Validation suite - runs every Robot Framework snippet from the
...              generated training chapters (Sections 1 and 2) to verify they
...              execute without syntax or runtime errors.
Library          Collections
Library          OperatingSystem


*** Variables ***
${WAREHOUSE}      Munich Distribution Center
@{CONTAINERS}     MRKU1234567    TCLU7654321    MSKU9988776
&{SHIPMENT}       origin=Munich    destination=Amsterdam    weight=${8200}


*** Test Cases ***
# ============================================================
# Section 1 - First test snippet
# ============================================================

Say Hello
    [Documentation]    My very first Robot Framework test (from Section 1).
    [Tags]             section1    first-test
    Log To Console     Hello, Robot Framework!
    Should Be Equal    ${1 + 1}    ${2}

# ============================================================
# Section 2.1 - Anatomy of a .robot file
# ============================================================

Log Warehouse Name
    [Documentation]    Minimal example from Chapter 2.1.
    [Tags]             section2.1
    Log                Welcome to ${WAREHOUSE}

Two Space Separator Correct Form
    [Documentation]    Correct form of the two-space rule.
    [Tags]             section2.1
    Log    Hello, world!

Comments
    [Documentation]    Comments are ignored by Robot Framework.
    [Tags]             section2.1
    # This whole line is a comment
    Log    Hello    # You can also comment at the end of a line

# ============================================================
# Section 2.2 - Writing test cases
# ============================================================

Warehouse Arrival Is Logged
    [Documentation]    Shift start is logged.
    [Tags]             section2.2
    Log                Shift started at Munich DC
    Log To Console     Ready for dock assignments

Container Weight Is Within Limit
    [Documentation]    Verifies that two containers do not exceed the vessel limit.
    [Tags]             section2.2    warehouse    smoke
    Log    Checking container weights...

Multi Line Documentation
    [Documentation]    This test verifies that two containers
    ...                do not exceed the vessel weight limit
    ...                of 25,000 kg.
    [Tags]             section2.2
    Log    Docs span multiple lines

# ============================================================
# Section 2.3 - Variables
# ============================================================

VAR Scalar List Dict
    [Documentation]    Declaring all three variable types with VAR.
    [Tags]             section2.3
    VAR    ${warehouse}     Munich DC
    VAR    @{containers}    MRKU1234567    TCLU7654321
    VAR    &{shipment}      origin=Munich    destination=Amsterdam
    Log    Shipping from ${shipment}[origin]

Suite Level Variables Are Accessible
    [Documentation]    The *** Variables *** section values are usable here.
    [Tags]             section2.3
    Log    ${WAREHOUSE}
    Log    ${CONTAINERS}[0]
    Log    ${SHIPMENT}[origin]

Strings By Default Gotcha
    [Documentation]    Untyped variable behaves as a string.
    [Tags]             section2.3
    VAR    ${weight}    8200
    # Both sides are strings - this passes
    Should Be Equal    ${weight}    8200

Typed Variable Fix
    [Documentation]    Adding a type annotation turns the value into an int.
    [Tags]             section2.3
    VAR    ${weight: int}    8200
    ${total}    Evaluate    ${weight} + 1000
    Should Be Equal As Integers    ${total}    9200

Typed Variable Types Tour
    [Documentation]    Examples of each common typed variable.
    [Tags]             section2.3
    VAR    ${count: int}      42
    VAR    ${price: float}    19.99
    VAR    ${active: bool}    True
    VAR    ${name: str}       Alice
    VAR    ${data: dict}      {"key": "value"}
    Should Be Equal As Integers    ${count}    42
    Should Be Equal As Numbers     ${price}    19.99
    Should Be True                 ${active}
    Should Be Equal                ${name}     Alice
    Should Be Equal                ${data}[key]    value

Inline Numeric Literals
    [Documentation]    Curly-brace numeric literals force integer type inline.
    [Tags]             section2.3
    @{weights}    Create List    ${8200}    ${12400}    ${3000}
    Length Should Be    ${weights}    3
    Should Be Equal As Integers    ${weights}[0]    8200

Built-in Variables
    [Documentation]    Sanity-check of the common built-in variables.
    [Tags]             section2.3
    Should Be True     ${TRUE}
    Should Not Be True    ${FALSE}
    Should Be Equal    ${EMPTY}    ${EMPTY}
    Should Not Be Empty    ${CURDIR}
    Should Not Be Empty    ${OUTPUT_DIR}
    Should Not Be Empty    ${/}

Lists And Dictionaries In Action
    [Documentation]    Build and access lists and dicts using both approaches.
    [Tags]             section2.3
    # Inline literal style
    VAR    @{containers_inline}    MRKU1234567    TCLU7654321    MSKU9988776
    VAR    &{shipment_inline}      origin=Munich    destination=Amsterdam    weight=${8200}

    # Create keywords style
    @{containers_created}    Create List    MRKU1234567    TCLU7654321
    &{shipment_created}      Create Dictionary    origin=Munich    destination=Amsterdam

    Log    ${containers_inline}[0]
    Log    ${shipment_inline}[origin]
    Log    ${containers_created}[0]
    Log    ${shipment_created}[origin]

# ============================================================
# Section 2.4 - Basic assertions
# ============================================================

Shipment Meets Requirements
    [Documentation]    The "four you'll use 90% of the time" example.
    [Tags]             section2.4
    VAR    ${origin}        Munich
    VAR    ${weight: int}   8200
    @{containers}    Create List    MRKU1234567    TCLU7654321
    Should Be Equal      ${origin}         Munich
    Should Be True       ${weight} < 25000
    Should Contain       ${containers}     MRKU1234567
    Length Should Be     ${containers}     2

Should Be Equal As Integers Variant
    [Documentation]    Numeric comparison fix.
    [Tags]             section2.4
    ${answer}    Evaluate    100 + 23
    Should Be Equal As Integers    ${answer}    123

Should Be Equal As Numbers Variant
    [Documentation]    Float comparison.
    [Tags]             section2.4
    VAR    ${price: float}    19.99
    Should Be Equal As Numbers    ${price}    19.99

Should Be Equal As Strings Variant
    [Documentation]    String comparison.
    [Tags]             section2.4
    VAR    ${code}    SHP-2026-0042
    Should Be Equal As Strings    ${code}    SHP-2026-0042

Negative Assertions
    [Documentation]    The Should Not counterparts.
    [Tags]             section2.4
    VAR    ${status}    IN_TRANSIT
    &{shipment}    Create Dictionary    origin=Munich    destination=Amsterdam
    @{containers}  Create List    MRKU1234567    TCLU7654321
    Should Not Be Equal    ${status}      FAILED
    Should Not Contain     ${shipment}    tracking_id
    Should Not Be Empty    ${containers}

# ============================================================
# Section 2.5 - Control structures
# ============================================================

IF ELSE Block
    [Documentation]    Basic IF / ELSE / END.
    [Tags]             section2.5
    VAR    ${weight: int}    8200
    IF    ${weight} > 25000
        Log    Overweight - split the shipment
    ELSE
        Log    OK to load
    END

Inline IF
    [Documentation]    Single-action IF.
    [Tags]             section2.5
    VAR    ${hazardous}    ${TRUE}
    IF    ${hazardous}    Log    Hazardous cargo

FOR Loop Over List
    [Documentation]    FOR ... IN @{list} ... END.
    [Tags]             section2.5
    @{containers}    Create List    MRKU1234567    TCLU7654321    MSKU9988776
    FOR    ${container}    IN    @{containers}
        Log    Inspecting ${container}
    END

FOR Loop In Range
    [Documentation]    FOR ... IN RANGE ... END.
    [Tags]             section2.5
    FOR    ${dock}    IN RANGE    1    11
        Log    Dock ${dock} ready
    END

TRY EXCEPT Basic
    [Documentation]    Catch a failure and continue.
    [Tags]             section2.5
    TRY
        Fail    Simulated failure inside TRY
    EXCEPT
        Log    Caught the failure - continuing
    END

TRY EXCEPT FINALLY
    [Documentation]    FINALLY block always runs.
    [Tags]             section2.5
    VAR    ${audit}    ${EMPTY}
    TRY
        Fail    Clearance failed
    EXCEPT
        Log    Clearance failed - will retry later
    FINALLY
        VAR    ${audit}    recorded
        Log    Clearance attempt recorded in audit log
    END
    Should Be Equal    ${audit}    recorded

# ============================================================
# Hands-on Exercise 2.1 - Warehouse Welcome
# ============================================================

Exercise 2.1 - Warehouse Welcome
    [Documentation]    Log arrival and assert the message is not empty.
    [Tags]             exercise    section2
    VAR    ${ARRIVAL_MSG}    Alex reporting to Munich DC
    Log                 ${ARRIVAL_MSG}
    Log To Console      ${ARRIVAL_MSG}
    Should Not Be Empty    ${ARRIVAL_MSG}

# ============================================================
# Hands-on Exercise 2.2 - Shipment Inspector
# ============================================================

Exercise 2.2 - Shipment Inspector
    [Documentation]    Inspect a shipment dict, flag hazardous cargo, iterate entries.
    [Tags]             exercise    section2
    &{SHIPMENT}    Create Dictionary
    ...    origin=Munich
    ...    destination=Amsterdam
    ...    weight_kg=${8200}
    ...    hazardous=${FALSE}

    Should Contain        ${SHIPMENT}    origin
    Should Not Contain    ${SHIPMENT}    tracking_id

    IF    ${SHIPMENT}[hazardous]
        Log    Hazardous cargo - special handling required
    ELSE
        Log    Standard cargo
    END

    Set To Dictionary    ${SHIPMENT}    tracking_id=SHP-2026-0042

    FOR    ${key}    ${value}    IN    &{SHIPMENT}
        Log    ${key} = ${value}
    END

    Should Contain    ${SHIPMENT}    tracking_id
