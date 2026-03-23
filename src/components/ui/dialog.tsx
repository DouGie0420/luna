"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-[200] bg-black/60 backdrop-blur-md",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const memphisStyles = `
  @keyframes dlg-blob1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(30px,-20px) scale(1.1)} 66%{transform:translate(-20px,15px) scale(0.95)} }
  @keyframes dlg-blob2 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-25px,18px) scale(1.05)} 66%{transform:translate(20px,-15px) scale(1.1)} }
  @keyframes dlg-blob3 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(15px,22px) scale(0.9)} }
  .dlg-blob1 { animation: dlg-blob1 8s ease-in-out infinite; }
  .dlg-blob2 { animation: dlg-blob2 10s ease-in-out infinite; }
  .dlg-blob3 { animation: dlg-blob3 12s ease-in-out infinite; }
  .dlg-zigzag {
    background-image:
      repeating-linear-gradient(45deg, rgba(168,85,247,0.05) 0px, rgba(168,85,247,0.05) 1.5px, transparent 1.5px, transparent 12px),
      repeating-linear-gradient(-45deg, rgba(236,72,153,0.05) 0px, rgba(236,72,153,0.05) 1.5px, transparent 1.5px, transparent 12px);
  }
`

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { hideCloseButton?: boolean }
>(({ className, children, hideCloseButton = false, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <style dangerouslySetInnerHTML={{ __html: memphisStyles }} />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-[201] w-full max-w-lg translate-x-[-50%] translate-y-[-50%]",
        "relative overflow-hidden rounded-[28px] border border-white/10",
        "bg-[#07020f]/90 backdrop-blur-3xl",
        "shadow-[0_40px_120px_rgba(0,0,0,0.9),0_0_0_1px_rgba(168,85,247,0.15),inset_0_1px_0_rgba(255,255,255,0.06)]",
        "p-7",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "duration-200",
        className
      )}
      {...props}
    >
      {/* Memphis animated blobs */}
      <div className="dlg-blob1 absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.25) 0%, rgba(79,70,229,0.15) 50%, transparent 70%)', filter: 'blur(40px)' }} />
      <div className="dlg-blob2 absolute -bottom-12 -left-12 w-40 h-40 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.2) 0%, rgba(139,92,246,0.12) 50%, transparent 70%)', filter: 'blur(40px)' }} />
      <div className="dlg-blob3 absolute top-1/2 -right-8 w-32 h-32 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, transparent 70%)', filter: 'blur(30px)' }} />
      {/* Zigzag pattern */}
      <div className="dlg-zigzag absolute inset-0 pointer-events-none rounded-[28px]" />
      {/* Top shimmer line */}
      <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-purple-400/40 to-transparent pointer-events-none" />

      <div className="relative z-10">
        {children}
      </div>

      {!hideCloseButton && (
        <DialogPrimitive.Close className="absolute right-4 top-4 z-20 rounded-full p-1.5 text-white/30 hover:text-white hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-2 mb-5", className)} {...props} />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end mt-6", className)} {...props} />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-black text-white tracking-tight", className)}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-white/50 leading-relaxed", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
