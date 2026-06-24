import { useState } from "react";

export interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void | Promise<void>;
}

export function useConfirmDialog() {
  const [confirmDialog, setConfirmDialog] =
    useState<ConfirmDialogOptions | null>(null);

  const requestConfirmation = (options: ConfirmDialogOptions) => {
    setConfirmDialog(options);
  };

  const closeConfirmation = () => {
    setConfirmDialog(null);
  };

  return {
    confirmDialog,
    requestConfirmation,
    closeConfirmation,
  };
}
