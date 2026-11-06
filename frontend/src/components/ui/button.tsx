import { Slot } from '@radix-ui/react-slot'
import { buttonVariants } from '@/components/ui/button-variants'
import type { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  asChild?: boolean
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp className={buttonVariants({ variant, size, className })} {...props} />
  )
}

Button.displayName = 'Button'

export { Button }
export type { ButtonProps }
