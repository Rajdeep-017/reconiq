import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Reveal } from '@/components/landing/Reveal'
import { SectionHeading } from '@/components/landing/SectionHeading'

const FAQ_ITEMS = [
  {
    id: 'what',
    question: 'What does ReconIQ do?',
    answer:
      'ReconIQ brings financial reports into one reconciliation workspace. It ingests reports, helps map and normalize columns, matches transactions across supported streams, surfaces discrepancies and lets finance teams track claims through an explicit review lifecycle.',
  },
  {
    id: 'formats',
    question: 'Which report formats and report types are supported?',
    answer:
      'ReconIQ accepts CSV and XLSX files. The supported report types are orders, settlements, COD remittances, freight invoices, returns and warehouse scans. Column mapping is reviewed before a file is processed.',
  },
  {
    id: 'reconciliation',
    question: 'How does financial reconciliation work?',
    answer:
      'After a report is uploaded, its columns are mapped to canonical fields and the data is normalized. A reconciliation run then matches records for the selected stream using deterministic rules, producing expected, actual and difference values with an explanation for each outcome.',
  },
  {
    id: 'discrepancies',
    question: 'How are discrepancies detected?',
    answer:
      'Discrepancies come from persisted reconciliation outcomes — for example short payments, missing settlements, COD remittance gaps, freight overcharges and return mismatches. Calculations are deterministic, and each discrepancy keeps the context needed for review.',
  },
  {
    id: 'ai',
    question: 'Does AI approve matches or claims?',
    answer:
      'No. Assistance can help suggest column mappings or candidate matches, but financial calculations are deterministic. Matches, discrepancies and claims remain subject to human review, and approval or closure is never automatic.',
  },
  {
    id: 'security',
    question: 'Is my financial data secure?',
    answer:
      'Authenticated API access uses JWT tokens, and financial endpoints are scoped to the signed-in user’s organization. The public landing page does not expose tenant records; its dashboard preview is an explicitly labelled demonstration dataset controlled by the backend.',
  },
  {
    id: 'start',
    question: 'How do I get started?',
    answer:
      'Create an account, upload your first CSV or XLSX report, review the suggested column mapping and run a reconciliation. From there you can inspect discrepancies, verify outcomes and create claims for confirmed recoveries.',
  },
]

export function FaqSection() {
  const [openId, setOpenId] = useState<string | null>('what')

  return (
    <section id="faq" className="landing-section">
      <div className="landing-container">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <Reveal>
            <SectionHeading
              align="left"
              eyebrow="FAQ"
              title="Questions finance teams ask before they start."
              description="Clear answers about the product, the data it handles and the controls that stay in human hands."
            />
          </Reveal>

          <Reveal delay={100}>
            <div className="space-y-2.5">
              {FAQ_ITEMS.map((item) => {
                const isOpen = openId === item.id
                return (
                  <div
                    key={item.id}
                    className={cn(
                      'overflow-hidden rounded-2xl border transition-colors',
                      isOpen
                        ? 'border-electric-300/25 bg-electric-500/[0.07]'
                        : 'border-white/[0.08] bg-white/[0.025]'
                    )}
                  >
                    <h3>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left sm:px-5"
                        aria-expanded={isOpen}
                        aria-controls={`faq-panel-${item.id}`}
                        id={`faq-button-${item.id}`}
                        onClick={() => setOpenId(isOpen ? null : item.id)}
                      >
                        <span className="text-[13px] font-medium text-white/85 sm:text-sm">
                          {item.question}
                        </span>
                        <ChevronDown
                          className={cn(
                            'h-4 w-4 shrink-0 text-white/35 transition-transform duration-300',
                            isOpen && 'rotate-180 text-electric-300'
                          )}
                          aria-hidden="true"
                        />
                      </button>
                    </h3>
                    <div
                      id={`faq-panel-${item.id}`}
                      role="region"
                      aria-labelledby={`faq-button-${item.id}`}
                      aria-hidden={!isOpen}
                      className={cn('landing-accordion-panel', isOpen && 'is-open')}
                    >
                      <div>
                        <p className="px-4 pb-4 text-xs leading-relaxed text-white/55 sm:px-5 sm:pb-5">
                          {item.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
