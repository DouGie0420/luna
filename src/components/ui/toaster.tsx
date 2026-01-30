"use client"

import {
  Toast,
  ToastDescription,
  ToastProvider,
  ToastTitle,
} from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider swipeThreshold={9999}>
      {toasts.map(function ({ id, title, description, action, x, y, ...props }) {
        const hasCoords = x !== undefined && y !== undefined
        return (
          <div
            key={id}
            style={{
              position: 'fixed',
              left: hasCoords ? `${x}px` : '50%',
              top: hasCoords ? `${y}px` : '5%',
              transform: hasCoords ? 'translate(-50%, -150%)' : 'translateX(-50%)',
              zIndex: 100,
            }}
          >
            <Toast {...props}>
              <div className="grid gap-1 text-center">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
              {action}
            </Toast>
          </div>
        )
      })}
    </ToastProvider>
  )
}
