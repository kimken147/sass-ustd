import { type NotificationProvider } from "@refinedev/core";
import { toast } from "sonner";

export const useNotificationProvider = (): NotificationProvider => {
  return {
    open: ({ key, message, description, type, undoableTimeout, cancelMutation }) => {
      if (type === "progress") {
        toast.loading(message, {
          id: key,
          description,
          duration: undoableTimeout ? undoableTimeout * 1000 : undefined,
          action: cancelMutation
            ? {
                label: "復原",
                onClick: () => {
                  cancelMutation();
                  toast.dismiss(key);
                },
              }
            : undefined,
        });
      } else if (type === "success") {
        toast.success(message, {
          id: key,
          description,
        });
      } else if (type === "error") {
        toast.error(message, {
          id: key,
          description,
        });
      } else {
        toast(message, {
          id: key,
          description,
        });
      }
    },
    close: (key) => {
      toast.dismiss(key);
    },
  };
};
