/**
 * Shared types for the quiz widget family.
 *
 * These mirror the `Interaction` / `Score` contracts in `@lernkit/tracker` so
 * widgets can feed the Tracker without ceremony. The widgets themselves don't
 * import Tracker at the type level from this file — see `context.ts` for the
 * runtime bridge.
 */

export interface QuestionResult {
  readonly id: string;
  readonly correct: boolean;
  readonly response: string;
  readonly correctResponse?: string;
}

export interface QuestionRegistration {
  readonly id: string;
  getResult(): QuestionResult | null;
}

export type QuizStatus = 'idle' | 'answering' | 'graded';

export interface QuizGradeReport {
  readonly totalQuestions: number;
  readonly correctCount: number;
  readonly scaledScore: number;
  readonly passed: boolean;
  readonly perQuestion: readonly QuestionResult[];
}
