import { SetupWizard } from '@/components/SetupWizard';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteNav } from '@/components/SiteNav';
import { DESCRIPTION_CLASS, SECTION_CLASS, SECTION_HEAD_CLASS, TITLE_CLASS } from '@/lib/styles';

import type { Metadata } from '@farm.js/core';

export const metadata: Metadata = {
  title: 'Set up Fiducy',
  description:
    'Answer five questions about your stack and get a setup prompt for your coding agent plus the exact fiducy init command.',
  alternates: { canonical: '/setup' }
};

export default function SetupPage() {
  return (
    <div className="square-corners min-h-screen bg-white px-4 font-sans text-ink antialiased selection:bg-ink selection:text-white">
      <div className="mx-auto max-w-[1200px] divide-y divide-dashed divide-frame border-x border-frame">
        <SiteNav />
        <main className={SECTION_CLASS}>
          <div className={SECTION_HEAD_CLASS}>
            <h1 className={TITLE_CLASS}>Set up Fiducy with your agent</h1>
            <p className={`${DESCRIPTION_CLASS} text-[0.9375rem]`}>
              Five quick questions about your app. You get a prompt tailored to your stack and the
              exact command to run. Nothing you pick leaves this page.
            </p>
          </div>
          <SetupWizard />
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
