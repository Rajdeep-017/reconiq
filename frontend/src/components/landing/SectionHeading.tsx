import { cn } from '@/lib/utils'

interface SectionHeadingProps {
  eyebrow: string
  title: string
  description?: string
  align?: 'left' | 'center'
  className?: string
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        'max-w-3xl',
        align === 'center' ? 'mx-auto text-center' : 'text-left',
        className
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-electric-300/80">
        {eyebrow}
      </p>
      <h2 className="mt-3 font-display text-[clamp(1.85rem,4vw,3.2rem)] font-light leading-[1.08] tracking-[-0.035em] text-white">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-sm leading-relaxed text-white/50 sm:text-[15px]">{description}</p>
      )}
    </div>
  )
}
