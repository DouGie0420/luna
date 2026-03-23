"use client"

import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] flex max-h-screen w-full max-w-[420px] flex-col gap-3 p-0 items-center",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  [
    "group pointer-events-auto relative flex w-full items-start gap-4 overflow-hidden rounded-3xl border-2 p-5 pr-12",
    "backdrop-blur-2xl shadow-[0_30px_80px_rgba(0,0,0,0.8)]",
    "transition-all duration-500",
    "data-[swipe=cancel]:translate-x-0",
    "data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]",
    "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]",
    "data-[swipe=move]:transition-none",
    "data-[state=open]:animate-in data-[state=open]:zoom-in-90 data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-4",
    "data-[state=closed]:animate-out data-[state=closed]:zoom-out-90 data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-4",
    "data-[swipe=end]:animate-out",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-br from-[#1a0533]/95 via-[#0d1a3a]/95 to-[#0a1a2e]/95 border-purple-400/40 shadow-[0_30px_80px_rgba(0,0,0,0.8),0_0_40px_rgba(168,85,247,0.25),inset_0_1px_0_rgba(255,255,255,0.08)]",
        destructive:
          "destructive bg-gradient-to-br from-[#2d0a14]/95 via-[#1a0a2a]/95 to-[#0d0d2a]/95 border-red-400/40 shadow-[0_30px_80px_rgba(0,0,0,0.8),0_0_40px_rgba(239,68,68,0.25),inset_0_1px_0_rgba(255,255,255,0.08)]",
        success:
          "success bg-gradient-to-br from-[#0a2918]/95 via-[#0a1a2a]/95 to-[#0d0d2a]/95 border-emerald-400/40 shadow-[0_30px_80px_rgba(0,0,0,0.8),0_0_40px_rgba(16,185,129,0.25),inset_0_1px_0_rgba(255,255,255,0.08)]",
        warning:
          "warning bg-gradient-to-br from-[#2a1a00]/95 via-[#1a1000]/95 to-[#0d0d2a]/95 border-yellow-400/40 shadow-[0_30px_80px_rgba(0,0,0,0.8),0_0_40px_rgba(234,179,8,0.25),inset_0_1px_0_rgba(255,255,255,0.08)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-semibold text-white/70 ring-offset-background transition-all hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-3 top-3 rounded-lg p-1 text-white/25 opacity-0 transition-all hover:text-white/70 hover:bg-white/8 focus:opacity-100 group-hover:opacity-100",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-3.5 w-3.5" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-bold text-white leading-snug", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-xs text-white/50 leading-relaxed mt-0.5", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}
