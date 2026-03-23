"use client"

import { CheckCircle2, AlertTriangle, Info, XCircle, Sparkles } from "lucide-react"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useToast } from "@/hooks/use-toast"

type ToastVariant = "default" | "destructive" | "success" | "warning"

const variantConfig: Record<ToastVariant, {
  icon: React.ElementType;
  iconGradient: string;
  iconColor: string;
  accentFrom: string;
  accentTo: string;
  blob1: string;
  blob2: string;
}> = {
  default: {
    icon: Sparkles,
    iconGradient: "from-purple-500 to-fuchsia-500",
    iconColor: "text-white",
    accentFrom: "from-purple-500",
    accentTo: "to-cyan-400",
    blob1: "bg-purple-500/20",
    blob2: "bg-fuchsia-500/15",
  },
  destructive: {
    icon: XCircle,
    iconGradient: "from-red-500 to-orange-500",
    iconColor: "text-white",
    accentFrom: "from-red-500",
    accentTo: "to-orange-400",
    blob1: "bg-red-500/20",
    blob2: "bg-orange-500/15",
  },
  success: {
    icon: CheckCircle2,
    iconGradient: "from-emerald-400 to-cyan-400",
    iconColor: "text-white",
    accentFrom: "from-emerald-400",
    accentTo: "to-cyan-400",
    blob1: "bg-emerald-500/20",
    blob2: "bg-cyan-500/15",
  },
  warning: {
    icon: AlertTriangle,
    iconGradient: "from-yellow-400 to-orange-400",
    iconColor: "text-white",
    accentFrom: "from-yellow-400",
    accentTo: "to-orange-400",
    blob1: "bg-yellow-500/20",
    blob2: "bg-orange-400/15",
  },
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const v = (variant as ToastVariant) || "default"
        const cfg = variantConfig[v] || variantConfig.default
        const Icon = cfg.icon

        return (
          <Toast key={id} variant={variant} {...props}>
            {/* Memphis液态背景blob */}
            <div className={`absolute -top-8 -left-8 w-32 h-32 rounded-full ${cfg.blob1} blur-2xl pointer-events-none animate-pulse`} />
            <div className={`absolute -bottom-6 -right-6 w-24 h-24 rounded-full ${cfg.blob2} blur-xl pointer-events-none`} style={{ animation: 'pulse 3s ease-in-out infinite 1s' }} />

            {/* 顶部彩色渐变线 */}
            <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${cfg.accentFrom} ${cfg.accentTo} opacity-80`} />

            {/* 底部彩色渐变线 */}
            <div className={`absolute bottom-0 left-8 right-8 h-px bg-gradient-to-r ${cfg.accentFrom} ${cfg.accentTo} opacity-30`} />

            {/* 图标 — 渐变圆形 */}
            <div className={`relative shrink-0 flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br ${cfg.iconGradient} shadow-lg`}>
              <Icon className={`h-5 w-5 ${cfg.iconColor}`} />
            </div>

            {/* 内容 */}
            <div className="relative flex-1 min-w-0 grid gap-0.5 py-0.5">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>

            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
