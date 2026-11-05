"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "../../lib/utils";

const TabsShadcn = TabsPrimitive.Root;

const TabsListShadcn = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-obsidian-850 p-1 text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-obsidian-700",
      className
    )}
    {...props}
  />
));
TabsListShadcn.displayName = TabsPrimitive.List.displayName;

const TabsTriggerShadcn = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3.5 py-1.5 text-xs font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white dark:data-[state=active]:bg-obsidian-750 data-[state=active]:text-amber-500 dark:data-[state=active]:text-amber-400 data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-amber-500/30",
      className
    )}
    {...props}
  />
));
TabsTriggerShadcn.displayName = TabsPrimitive.Trigger.displayName;

const TabsContentShadcn = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
));
TabsContentShadcn.displayName = TabsPrimitive.Content.displayName;

export { TabsShadcn, TabsListShadcn, TabsTriggerShadcn, TabsContentShadcn };
