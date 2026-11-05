import type { HTMLAttributes } from "react";
import styles from "./Card.module.css";

type Props = HTMLAttributes<HTMLDivElement> & { className?: string };

export function Card({ className = "", ...props }: Props) {
  return <div data-slot="card" className={[styles.card, className].filter(Boolean).join(" ")} {...props} />;
}

export function CardHeader({ className = "", ...props }: Props) {
  return <div data-slot="card-header" className={[styles.header, className].filter(Boolean).join(" ")} {...props} />;
}

export function CardTitle({ className = "", ...props }: HTMLAttributes<HTMLHeadingElement> & { className?: string }) {
  return <h3 data-slot="card-title" className={[styles.title, className].filter(Boolean).join(" ")} {...props} />;
}

export function CardContent({ className = "", ...props }: Props) {
  return <div data-slot="card-content" className={[styles.content, className].filter(Boolean).join(" ")} {...props} />;
}

// Slot composition adapted from shadcn/ui Card (MIT); see THIRD_PARTY_UI.md.
export function CardDescription({ className = "", ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p data-slot="card-description" className={`${styles.description} ${className}`} {...props} />;
}

export function CardFooter({ className = "", ...props }: Props) {
  return <div data-slot="card-footer" className={`${styles.footer} ${className}`} {...props} />;
}

export function CardAction({ className = "", ...props }: Props) {
  return <div data-slot="card-action" className={`${styles.action} ${className}`} {...props} />;
}
