import type { Tracker } from '@lernkit/tracker';
import { createContext, useContext } from 'react';
import type { QuestionRegistration, QuizStatus } from './types.js';

/**
 * React context shared between a `<Quiz>` container and the question widgets
 * nested inside it. Each question registers itself on mount; the container
 * gathers results at submit time.
 */
export interface QuizContextValue {
  readonly register: (question: QuestionRegistration) => () => void;
  readonly status: QuizStatus;
  readonly tracker: Tracker | null;
}

export const QuizContext = createContext<QuizContextValue | null>(null);

export function useQuizContext(): QuizContextValue | null {
  return useContext(QuizContext);
}
