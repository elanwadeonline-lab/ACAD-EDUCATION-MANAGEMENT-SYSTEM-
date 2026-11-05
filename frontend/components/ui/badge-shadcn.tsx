import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/40 select-none",
  {
    variants: {
      variant: {
        // Luxury Imperial Gold Badge
        gold: "border-amber-500/40 bg-amber-500/10 text-amber-500 dark:text-amber-400 shadow-gold",
        goldSolid: "border-transparent bg-amber-500 text-slate-950 font-bold",
        // Deep Obsidian Carbon Badge
        obsidian: "border-slate-700 bg-slate-900 text-slate-200",
        // Default / Neutral
        default: "border-transparent bg-slate-900 text-slate-50 dark:bg-slate-50 dark:text-slate-900",
        secondary: "border-transparent bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100",
        destructive: "border-transparent bg-rose-500 text-white shadow hover:bg-rose-600",
        outline: "text-slate-950 dark:text-slate-50 border-slate-300 dark:border-slate-700",
        success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      },
    },
    defaultVariants: {
      variant: "gold",
    },
  }
);

export interface BadgeShadcnProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function BadgeShadcn({ className, variant, ...props }: BadgeShadcnProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { BadgeShadcn, badgeVariants };
