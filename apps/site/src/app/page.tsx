import { CodeTabs } from '@/components/CodeTabs';
import { CopyAgentPrompt } from '@/components/CopyAgentPrompt';
import { QuietLine } from '@/components/Emphasis';
import { Faq } from '@/components/Faq';
import { HeroHeadline } from '@/components/HeroHeadline';
import { HeroStage } from '@/components/HeroStage';
import { HowItWorks } from '@/components/HowItWorks';
import { InstallCommand } from '@/components/InstallCommand';
import { LeakScenes } from '@/components/LeakScenes';
import { PlanCard } from '@/components/PlanCard';
import { ProviderStrip } from '@/components/ProviderStrip';
import { Showcase } from '@/components/Showcase';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteNav } from '@/components/SiteNav';
import { WaitlistForm } from '@/components/WaitlistForm';
import { buttonVariants } from '@/components/ui/button';
import { FAQ } from '@/lib/faq';
import { NEW_TAB } from '@/lib/site';
import { DESCRIPTION_CLASS, LABEL_CLASS, SECTION_CLASS, SECTION_HEAD_CLASS } from '@/lib/styles';
import { TITLE_CLASS } from '@/lib/styles';
import { faqPage } from '@farm.js/core/json-ld';

import type { Metadata } from '@farm.js/core';

export const metadata: Metadata = {
  jsonLd: faqPage(FAQ.map((item) => ({ question: item.question, answer: item.answer })))
};

export default function HomePage() {
  return (
    <div className="square-corners min-h-screen bg-white px-4 font-sans text-ink antialiased selection:bg-ink selection:text-white">
      <div className="mx-auto max-w-[1200px] divide-y divide-dashed divide-frame border-x border-frame">
        <SiteNav />

        <main className="divide-y divide-dashed divide-frame">
          <section className="grid grid-cols-[minmax(0,1fr)] items-center gap-8 px-gutter py-16 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:py-20">
            <div className="@container grid min-w-0 grid-cols-[minmax(0,1fr)] gap-7">
              <HeroHeadline />
              <div className="grid grid-cols-[minmax(0,1fr)] gap-6 animate-rise-in [animation-delay:240ms]">
                <p className={`${DESCRIPTION_CLASS} max-w-[46ch] text-[0.9375rem]`}>
                  With Fiducy, your app uses your users' AI keys without ever storing or seeing
                  them. Their keys, none of the risk.
                </p>
                <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
                  <div className="flex flex-wrap items-center gap-2.5 max-sm:[&>a]:w-full sm:flex-nowrap">
                    <a
                      className={buttonVariants({ size: 'lg' })}
                      href="/docs/quickstart"
                      {...NEW_TAB}
                    >
                      Read the docs
                    </a>
                    <InstallCommand />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 max-sm:[&>button]:w-full">
                    <CopyAgentPrompt />
                    <span className="text-xs text-ink-muted">
                      Your coding agent sets it up.{' '}
                      <a className="text-ink underline underline-offset-4" href="/setup">
                        Tailor it to your stack
                      </a>
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <HeroStage />
          </section>

          <Showcase />
          <ProviderStrip />

          <section id="how-it-works" className={SECTION_CLASS}>
            <div className={SECTION_HEAD_CLASS}>
              <p className={LABEL_CLASS}>How it works</p>
              <h2 className={TITLE_CLASS}>
                <QuietLine text="A breach can't leak" word="leak" />
                <QuietLine text="what you never stored" word="never" />
              </h2>
              <p className={DESCRIPTION_CLASS}>
                Your app keeps a handle, not a key. The real key exists for one request inside a
                sealed enclave, then it is gone.
              </p>
            </div>
            <HowItWorks />
          </section>

          <section
            className={`${SECTION_CLASS} lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:items-start`}
          >
            <div className={SECTION_HEAD_CLASS}>
              <h2 className={TITLE_CLASS}>
                <QuietLine text="Ship bring-your-own-key" />
                <QuietLine text="this week" word="this week" />
              </h2>
              <p className={DESCRIPTION_CLASS}>
                No crypto to write and no key vault to run. Four small pieces drop into the app you
                already have, and your model calls look the same as before.
              </p>
              <div className="pt-1 max-sm:[&>button]:w-full">
                <CopyAgentPrompt />
              </div>
            </div>
            <CodeTabs />
          </section>

          <section className={`${SECTION_CLASS} pb-0 max-md:pb-0`}>
            <div className={SECTION_HEAD_CLASS}>
              <h2 className={TITLE_CLASS}>
                <QuietLine text="When something leaks," word="leaks" />
                <QuietLine text="your users' keys don't" word="don't" />
              </h2>
              <p className={DESCRIPTION_CLASS}>
                Users don't have to take your word for it.{' '}
                <code className="font-mono text-[0.95em] text-ink">GET /attestation</code> proves
                which code holds their key, signed by AWS.{' '}
                <a className="underline underline-offset-4" href="/docs/security" {...NEW_TAB}>
                  How to check it
                </a>
              </p>
            </div>
            <LeakScenes />
          </section>

          <Faq />

          <section className="grid divide-dashed divide-frame max-md:divide-y md:grid-cols-2 md:divide-x">
            <PlanCard
              title="Self-host"
              price="Free and open source"
              description="Keep every key in your own AWS account. One CloudFormation stack, and nothing leaves your infrastructure."
              linkLabel="Self-hosting guide"
              linkURL="/docs/self-hosting"
            />
            <PlanCard
              id="managed"
              title="Managed"
              price="Coming soon"
              description="Skip the infrastructure. We run the enclave and the dashboard, you add the SDK. Leave your email and you hear first."
              action={<WaitlistForm source="plan-managed" />}
            />
          </section>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
}
