import { useCallback, useState } from "react";
import { Notificacion } from "../lib/types";

export function useNotification() {
  const [notification, setNotification] = useState<Notificacion | null>(null);

  const showNotification = useCallback((type: "success" | "error", message: string) => {
    setNotification({ type, message });

    setTimeout(() => {
      setNotification(null);
    }, 4000);
  }, []);

  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  return {
    notification,
    showNotification,
    clearNotification,
  };
}
