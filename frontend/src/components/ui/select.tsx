import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const Select = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof SelectPrimitive.Root>>(
  (_props, _ref) => {
    return <SelectPrimitive.Root {..._props} />
  }
)
Select.displayName = SelectPrimitive.Root.displayName

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>[data-slot=trigger-value]]:flex [&>[data-slot=trigger-value]]:items-center [&>[data-slot=trigger-value]]:gap-2 [&>[data-slot=trigger-value]]:text-sm [&>[data-slot=trigger-value]]:font-medium [&>[data-slot=trigger-value]]:text-muted-foreground [&>[data-slot=trigger-value]]:line-clamp-1 [&>[data-slot=trigger-value]]:ml-auto [&>[data-slot=trigger-value]]:min-w-[15px] [&>select]:w-full [&>select]:cursor-pointer [&>select]:text-transparent [&>select]:w-auto',
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 fill-current opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn('flex cursor-default items-center justify-center py-1', className)}
    {...props}
  />
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn('flex cursor-default items-center justify-center py-1', className)}
    {...props}
  />
))
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      position={position}
      className={cn(
        'relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md state:data-[side=bottom]:slide-in-from-top-2 state:data-[side=left]:slide-in-from-right-2 state:data-[side=right]:slide-in-from-left-2 state:data-[side=top]:slide-in-from-bottom-2',
        className
      )}
      {...props}
    >
      <SelectPrimitive.ScrollUpButton />
      <SelectPrimitive.Viewport
        className={cn(
          'p-1',
          position === 'popper' && 'state:data-[side=bottom]:pb-1 state:data-[side=top]:pt-1'
        )}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectPrimitive.ScrollDownButton />
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 h-px bg-border', className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

// Type the Select component with static sub-components
interface SelectComponentType {
  Group: typeof SelectGroup
  Value: typeof SelectValue
  Trigger: typeof SelectTrigger
  Content: typeof SelectContent
  Item: typeof SelectItem
  Separator: typeof SelectSeparator
  ScrollUpButton: typeof SelectScrollUpButton
  ScrollDownButton: typeof SelectScrollDownButton
}

const SelectWithStatics = Select as unknown as SelectComponentType & React.ForwardRefExoticComponent<Omit<React.ComponentPropsWithoutRef<typeof SelectPrimitive.Root>, 'ref'> & { ref?: React.Ref<HTMLDivElement> }>

SelectWithStatics.Group = SelectGroup
SelectWithStatics.Value = SelectValue
SelectWithStatics.Trigger = SelectTrigger
SelectWithStatics.Content = SelectContent
SelectWithStatics.Item = SelectItem
SelectWithStatics.Separator = SelectSeparator
SelectWithStatics.ScrollUpButton = SelectScrollUpButton
SelectWithStatics.ScrollDownButton = SelectScrollDownButton

export {
  SelectWithStatics as Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
