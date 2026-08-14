import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  className?: string;
  wrapperClassName?: string;
  icon?: React.ReactNode;
  error?: boolean;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, wrapperClassName, icon, error = false, ...props }, ref) => (
    <span className={cn('relative block', wrapperClassName)}>
      <select
        ref={ref}
        className={cn(
          'h-10 w-full min-w-0 cursor-pointer appearance-none rounded-xl border bg-background px-3 pr-9 text-sm text-foreground outline-none transition-colors focus:ring-3 focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-60 [&::-ms-expand]:hidden',
          error
            ? 'border-accent/70 hover:border-accent focus:border-accent focus:ring-accent/20'
            : 'border-border hover:border-foreground/25 focus:border-primary focus:ring-primary/20',
          className,
        )}
        {...props}
      />
      {icon ?? <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />}
    </span>
  ),
);
Select.displayName = 'Select';

export { Select };
