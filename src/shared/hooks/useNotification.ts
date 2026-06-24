import { useState } from "react";
import { Notificacion } from "../lib/types";

export function useNotification() {
  const [notification, setNotification] = useState<Notificacion | null>(null);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });

    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const clearNotification = () => {
    setNotification(null);
  };

  return {
    notification,
    showNotification,
    clearNotification,
  };
}
