"use client";

import React, { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CloseIcon } from "../icons/Icons";
import { X, useStudentIconScope } from "../icons/StudentIcons";
import styles from "./Modal.module.css";

export type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

export type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  size?: ModalSize;
  hideCloseButton?: boolean;
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className = "",
  size = "md",
  hideCloseButton = false,
}: ModalProps) {
  const descriptionId = React.useId();
  const studentIcons = useStudentIconScope();
  const returnFocusRef = React.useRef<HTMLElement | null>(null);
  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay}>
          <Dialog.Content
            className={`${styles.modal} ${styles[`size-${size}`]} ${className}`.trim()}
            aria-describedby={description ? descriptionId : undefined}
            onOpenAutoFocus={() => {
              returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
            }}
            onCloseAutoFocus={(event) => {
              if (returnFocusRef.current?.isConnected) {
                event.preventDefault();
                returnFocusRef.current.focus();
              }
            }}
          >
            <div className={title ? styles.header : styles.visuallyHidden}>
              <Dialog.Title className={styles.title}>{title || "Dialog"}</Dialog.Title>
              {title && !hideCloseButton && (
                <Dialog.Close className={styles.close} aria-label="Close dialog">
                  {studentIcons ? <X size={18} /> : <CloseIcon width="18" height="18" />}
                </Dialog.Close>
              )}
            </div>
            {description && <Dialog.Description id={descriptionId} className={styles.description}>{description}</Dialog.Description>}
            <div className={styles.content}>{children}</div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
