"use client";

import * as Avatar from "@radix-ui/react-avatar";
import styles from "./StudentAvatar.module.css";

type Props = {
  name?: string;
  gender?: "boy" | "girl" | "auto";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  imageUrl?: string | null;
  className?: string;
  showBadge?: boolean;
};

/** Real profile image with an accessible, neutral initials fallback. */
export function StudentAvatar({ name = "", size = "md", imageUrl, className = "", showBadge = false }: Props) {
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(part => part.charAt(0)).join("").toUpperCase() || "?";
  return <span className={`${styles.wrapper} ${className}`} data-size={size}>
    <Avatar.Root className={styles.avatar} role="img" aria-label={name || "Student"}>
      {imageUrl && <Avatar.Image src={imageUrl} alt="" className={styles.image} />}
      <Avatar.Fallback className={styles.fallback} aria-hidden="true">{initials}</Avatar.Fallback>
    </Avatar.Root>
    {showBadge && <span className={styles.badge} aria-hidden="true" />}
  </span>;
}
