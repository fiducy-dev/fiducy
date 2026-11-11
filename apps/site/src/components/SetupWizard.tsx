'use client';

import { useState } from 'react';

import { SetupQuestionView } from '@/components/SetupQuestionView';
import { SetupRail } from '@/components/SetupRail';
import { SetupReview } from '@/components/SetupReview';
import { Button } from '@/components/ui/button';
import { trackEvent } from '@/lib/analytics';
import { SETUP_QUESTIONS, SETUP_STEPS } from '@/lib/setupOptions';

import type { SetupAnswers, SetupQuestion } from '@/types';

const ADVANCE_DELAY_MILLISECONDS = 220;
const INITIAL_ANSWERS: SetupAnswers = {
  framework: [],
  auth: [],
  storage: [],
  chat: [],
  widget: [],
  providers: ['openai']
};

function toggle(chosen: string[], optionID: string, isMultiple?: boolean): string[] {
  if (!isMultiple) return [optionID];
  return chosen.includes(optionID)
    ? chosen.filter((item) => item !== optionID)
    : [...chosen, optionID];
}

export function SetupWizard() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(INITIAL_ANSWERS);
  const question: SetupQuestion | undefined = SETUP_QUESTIONS[step];
  const isLast = step === SETUP_STEPS.length - 1;
  const canContinue = !question || answers[question.id].length > 0;

  const goTo = (next: number) => {
    setStep(next);
    if (next === SETUP_STEPS.length - 1) trackEvent('setup_review');
  };

  const choose = (current: SetupQuestion, optionID: string) => {
    setAnswers((previous) => ({
      ...previous,
      [current.id]: toggle(previous[current.id], optionID, current.isMultiple)
    }));
    if (!current.isMultiple) setTimeout(() => goTo(step + 1), ADVANCE_DELAY_MILLISECONDS);
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] overflow-hidden rounded-xl border border-frame bg-white lg:grid-cols-[220px_minmax(0,1fr)]">
      <SetupRail current={step} answers={answers} onJump={goTo} />
      <div className="grid min-h-[34rem] min-w-0 grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)_auto]">
        <div key={step} className="animate-rise-in p-5 motion-reduce:animate-none sm:p-8">
          {question ? (
            <SetupQuestionView
              question={question}
              chosen={answers[question.id]}
              onChoose={(optionID) => choose(question, optionID)}
            />
          ) : (
            <SetupReview answers={answers} onJump={goTo} />
          )}
        </div>
        <footer className="flex items-center justify-between gap-3 border-t border-frame px-5 py-4 sm:px-8">
          <Button variant="ghost" disabled={step === 0} onClick={() => goTo(step - 1)}>
            Back
          </Button>
          {isLast ? null : (
            <Button disabled={!canContinue} onClick={() => goTo(step + 1)}>
              Next
            </Button>
          )}
        </footer>
      </div>
    </div>
  );
}
