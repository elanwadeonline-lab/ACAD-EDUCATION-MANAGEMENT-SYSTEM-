import * as React from "react";
import { cn } from "../../lib/utils";

const CardShadcn = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { variant?: "default" | "obsidian" | "goldOutline" | "glass" }
>(({ className, variant = "default", ...props }, ref) => {
  const variantStyles = {
    default: "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-950 dark:text-slate-50 shadow-sm",
    obsidian: "bg-obsidian-850 border-obsidian-700 text-slate-100 shadow-md",
    goldOutline: "bg-obsidian-850 border border-amber-500/40 text-slate-100 shadow-gold",
    glass: "backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-slate-200/60 dark:border-slate-800/60 shadow-lg",
  };

  return (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border transition-all duration-200",
        variantStyles[variant],
        className
      )}
      {...props}
    />
  );
});
CardShadcn.displayName = "CardShadcn";

const CardHeaderShadcn = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeaderShadcn.displayName = "CardHeaderShadcn";

const CardTitleShadcn = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight text-slate-900 dark:text-slate-50",
      className
    )}
    {...props}
  />
));
CardTitleShadcn.displayName = "CardTitleShadcn";

const CardDescriptionShadcn = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-slate-500 dark:text-slate-400 leading-relaxed", className)}
    {...props}
  />
));
CardDescriptionShadcn.displayName = "CardDescriptionShadcn";

const CardContentShadcn = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContentShadcn.displayName = "CardContentShadcn";

const CardFooterShadcn = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0 border-t border-slate-100 dark:border-slate-800/60 mt-4", className)}
    {...props}
  />
));
CardFooterShadcn.displayName = "CardFooterShadcn";

export {
  CardShadcn,
  CardHeaderShadcn,
  CardTitleShadcn,
  CardDescriptionShadcn,
  CardContentShadcn,
  CardFooterShadcn,
};
