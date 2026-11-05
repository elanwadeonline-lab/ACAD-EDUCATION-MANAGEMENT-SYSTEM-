import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:pointer-events-none disabled:opacity-50 select-none active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100",
  {
    variants: {
      variant: {
        // Luxury Imperial Gold (Primary Acqad CTA)
        gold: "bg-[var(--color-primary)] text-white font-semibold hover:bg-[var(--color-primary-hover)] border border-transparent shadow-sm",
        // Deep Obsidian / Carbon Black Surface
        obsidian: "bg-slate-900 text-slate-100 hover:bg-slate-800 border border-slate-700/80 shadow-sm hover:border-amber-500/40 hover:text-amber-400",
        // Default Primary (Theme mapped)
        default: "bg-[var(--color-primary)] text-white font-semibold hover:bg-[var(--color-primary-hover)] shadow-sm",
        // Destructive / Danger
        destructive: "bg-rose-600 text-white hover:bg-rose-700 shadow-sm focus-visible:ring-rose-500",
        // Outline Gold
        outlineGold: "border border-[var(--color-primary)] bg-transparent text-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)]",
        // Outline Chrome / Silver
        outline: "border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80",
        // Secondary / Slate
        secondary: "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700/60",
        // Ghost / Minimalist
        ghost: "hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100",
        // Link
        link: "text-[var(--color-primary)] underline-offset-4 hover:underline",
      },
      size: {
        xs: "h-7 px-2.5 text-xs rounded-md",
        sm: "h-8 px-3 text-xs rounded-md",
        default: "h-9 px-4 py-2",
        md: "h-10 px-4 py-2",
        lg: "h-11 px-6 text-base rounded-xl",
        icon: "h-9 w-9 p-0",
        iconSm: "h-8 w-8 p-0 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonShadcnProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const ButtonShadcn = React.forwardRef<HTMLButtonElement, ButtonShadcnProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <span>Loading…</span>
          </span>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
ButtonShadcn.displayName = "ButtonShadcn";

export { ButtonShadcn, buttonVariants };
