'use client';

import { PlusIcon } from 'lucide-react';

import { QuietLine } from '@/components/Emphasis';
import { Accordion, AccordionItem, AccordionPanel } from '@/components/ui/accordion';
import { AccordionPrimitive } from '@/components/ui/accordion';
import { FAQ } from '@/lib/faq';
import { DESCRIPTION_CLASS, LABEL_CLASS, SECTION_CLASS, TITLE_CLASS } from '@/lib/styles';

const TRIGGER_CLASS =
  'group flex w-full cursor-pointer items-center justify-between gap-6 py-5 text-left text-[0.9375rem] font-medium tracking-[-0.01em] text-ink outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2';
const ICON_CLASS =
  'grid size-7 shrink-0 place-items-center rounded-full border border-frame transition-transform duration-200 group-data-[panel-open]:rotate-45';

export function Faq() {
  return (
    <section
      className={`${SECTION_CLASS} lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16`}
      aria-labelledby="faq-title"
    >
      <div className="grid content-start gap-3.5">
        <p className={`${LABEL_CLASS} flex items-center gap-2`}>
          <span aria-hidden="true" className="size-1.5 bg-ink" />
          Questions
        </p>
        <h2 id="faq-title" className={TITLE_CLASS}>
          <QuietLine text="Before you hand over" word="hand over" />
          <QuietLine text="your users' keys." word="keys" />
        </h2>
        <p className={DESCRIPTION_CLASS}>
          Something else on your mind? The{' '}
          <a className="text-ink underline underline-offset-4" href="/docs">
            docs
          </a>{' '}
          are searchable, and so is{' '}
          <a className="text-ink underline underline-offset-4" href="/llms.txt">
            llms.txt
          </a>
          .
        </p>
      </div>
      <Accordion className="border-frame border-t">
        {FAQ.map((item) => (
          <AccordionItem key={item.question} className="border-frame border-b last:border-b">
            <AccordionPrimitive.Header>
              <AccordionPrimitive.Trigger className={TRIGGER_CLASS}>
                {item.question}
                <span aria-hidden="true" className={ICON_CLASS}>
                  <PlusIcon className="size-3.5" />
                </span>
              </AccordionPrimitive.Trigger>
            </AccordionPrimitive.Header>
            <AccordionPanel hiddenUntilFound className={`${DESCRIPTION_CLASS} max-w-[60ch] pb-5`}>
              {item.answer}
            </AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
