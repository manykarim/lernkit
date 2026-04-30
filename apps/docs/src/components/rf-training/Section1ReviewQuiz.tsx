import { MCQ, Quiz, TrueFalse } from '@lernkit/components';
import { useMemo, useRef, useState, type ReactElement } from 'react';
import { pickTracker } from '../../lib/pick-tracker';

/**
 * Section 1 review quiz. Six questions drawn from the Section 1 flipcard concepts.
 * Tracker is selected by `pickTracker`: SCORM 1.2 LMS-bridge inside a packaged
 * SCO, in-memory xAPI stub everywhere else.
 */
export default function Section1ReviewQuiz(): ReactElement {
  const picked = useMemo(() => pickTracker('rf-training/section-1/review'), []);
  const tracker = picked.tracker;
  const initOnce = useRef(false);
  const [statements, setStatements] = useState(() =>
    picked.kind === 'xapi-stub' ? picked.tracker.statements : [],
  );

  if (!initOnce.current) {
    initOnce.current = true;
    void tracker.init().then(() => {
      if (picked.kind === 'xapi-stub') setStatements(picked.tracker.statements);
    });
  }

  return (
    <div className="lernkit-demo">
      <Quiz
        id="rf-section-1-review"
        title="Section 1 review"
        passingScore={0.7}
        tracker={tracker}
        onGraded={() => {
          if (picked.kind === 'xapi-stub') setStatements(picked.tracker.statements);
        }}
      >
        <MCQ
          id="venv-purpose"
          prompt="What is the main purpose of a Python virtual environment?"
          options={[
            { id: 'a', label: 'Speed up package installation.' },
            { id: 'b', label: 'Isolate a project\u2019s packages from other projects and the system Python.' },
            { id: 'c', label: 'Compile Python source to machine code.' },
            { id: 'd', label: 'Encrypt installed dependencies.' },
          ]}
          correctOptionId="b"
          explanation="Virtual environments keep one project\u2019s pip-installed packages separate from every other project, so version conflicts don\u2019t bleed across projects."
        />

        <MCQ
          id="activate-venv"
          prompt="Which command activates a venv on Windows PowerShell?"
          options={[
            { id: 'a', label: 'source .venv/bin/activate' },
            { id: 'b', label: '.venv\\Scripts\\activate.bat' },
            { id: 'c', label: '.venv\\Scripts\\Activate.ps1' },
            { id: 'd', label: 'venv activate' },
          ]}
          correctOptionId="c"
          explanation="PowerShell uses the .ps1 script. cmd.exe uses activate.bat. macOS / Linux use `source .venv/bin/activate`."
        />

        <MCQ
          id="uv-run"
          prompt="Why does `uv run robot --version` not need a `source activate` step first?"
          options={[
            { id: 'a', label: 'uv installs Robot Framework globally, bypassing venvs.' },
            { id: 'b', label: 'uv manages the venv automatically and runs commands inside it for you.' },
            { id: 'c', label: 'uv disables venvs entirely.' },
            { id: 'd', label: 'uv requires the venv to already be active before running.' },
          ]}
          correctOptionId="b"
          explanation="uv\u2019s model is to manage the project\u2019s venv for you. `uv run <command>` executes <command> inside the project\u2019s isolated environment without manual activation."
        />

        <TrueFalse
          id="pip-freeze"
          prompt="`pip freeze > requirements.txt` is needed when you\u2019re using uv."
          correctAnswer={false}
          explanation="uv records dependencies automatically in `uv.lock`. A separate requirements.txt is only needed when you\u2019re on pip + venv."
        />

        <MCQ
          id="first-test-file"
          prompt="Which file extension does a Robot Framework test file use by convention?"
          options={[
            { id: 'a', label: '.rf' },
            { id: 'b', label: '.py' },
            { id: 'c', label: '.robot' },
            { id: 'd', label: '.test' },
          ]}
          correctOptionId="c"
          explanation=".robot is the standard extension. Robot Framework will also read .resource and .yaml files, but .robot is the default for test suites."
        />

        <TrueFalse
          id="robotcode-ext"
          prompt="The RobotCode VS Code extension bundles the Python extension automatically."
          correctAnswer={true}
          explanation="RobotCode declares the Python extension as a dependency, so installing RobotCode installs Python support along with it."
        />
      </Quiz>

      {picked.kind === 'xapi-stub' ? (
        <details className="lernkit-demo__xapi">
          <summary>xAPI statements emitted ({statements.length})</summary>
          <pre aria-label="xAPI statement queue">
            <code>{JSON.stringify(statements, null, 2)}</code>
          </pre>
        </details>
      ) : null}
    </div>
  );
}
