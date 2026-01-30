"use client";

import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import {
  FirestorePermissionError,
  isFirestorePermissionError,
} from "@/firebase/errors";

function getErrorMessage(error: FirestorePermissionError) {
  const { operation, path } = error.context;
  return `Operation "${operation}" on path "${path}" failed. Check your Firestore security rules.`;
}

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      toast({
        variant: "destructive",
        title: "Firestore Permission Error",
        description: getErrorMessage(error),
        duration: 10000,
      });

      // This throws the error to be caught by Next.js's development overlay
      // in development mode.
      if (process.env.NODE_ENV === "development") {
        throw error;
      }
    };

    errorEmitter.on("permission-error", handlePermissionError);

    // Add a global error handler for uncaught promise rejections
    const handleUncaughtErrors = (event: PromiseRejectionEvent) => {
      if (isFirestorePermissionError(event.reason)) {
        // Prevent the default console error for this specific error type,
        // as we are handling it via the toast and dev overlay.
        event.preventDefault();
      }
    };

    window.addEventListener("unhandledrejection", handleUncaughtErrors);

    return () => {
      errorEmitter.off("permission-error", handlePermissionError);
      window.removeEventListener("unhandledrejection", handleUncaughtErrors);
    };
  }, [toast]);

  return null;
}
