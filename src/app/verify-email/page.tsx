// @ts-nocheck
'use client'

import React, { Suspense, useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/firebase'
import { applyActionCode, sendEmailVerification, getAuth } from 'firebase/auth'
import { useTranslation } from '@/hooks/use-translation'
import { MailCheck, Loader2, CheckCircle2, XCircle } from 'lucide-react'

function VerifyEmailContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email')
  
  // 🚀 获取邮件链接中的 Firebase 验证参数
  const mode = searchParams.get('mode')
  const oobCode = searchParams.get('oobCode')

  const { user, loading } = useUser()
  const { toast } = useToast()

  const [cooldown, setCooldown] = useState(60)
  const [isSending, setIsSending] = useState(false)
  
  // 🚀 验证状态管理
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [verifyMessage, setVerifyMessage] = useState('')

  // 🚀 防抖锁：防止 React 18 的 StrictMode 导致 useEffect 执行两次，从而废掉验证码
  const hasAttempted = useRef(false)

  // 🚀 核心逻辑 1：如果检测到是验证链接，自动执行验证
  useEffect(() => {
    // 加上 hasAttempted.current 锁，确保只向 Firebase 发送一次请求
    if (mode === 'verifyEmail' && oobCode && !hasAttempted.current) {
      hasAttempted.current = true // 立即上锁
      setVerifyStatus('loading')
      
      applyActionCode(getAuth(), oobCode)
        .then(() => {
          setVerifyStatus('success')
          setVerifyMessage('Your email has been successfully verified!')
          // 验证成功，3秒后跳回首页
          setTimeout(() => router.push('/'), 3000)
        })
        .catch((error) => {
          console.error("Verification Error:", error)
          setVerifyStatus('error')
          setVerifyMessage('Verification link is invalid, expired, or has already been used.')
        })
    }
  }, [mode, oobCode, router])

  // 核心逻辑 2：倒计时功能（只在普通提醒模式下运行）
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (cooldown > 0 && !oobCode) {
      timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [cooldown, oobCode])

  const handleResend = async () => {
    if (!user || cooldown > 0 || isSending) return

    setIsSending(true)
    try {
      await sendEmailVerification(user)
      toast({ title: t('registerPage.emailVerificationResent') || 'Verification email resent.' })
      setCooldown(60)
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      })
    } finally {
      setIsSending(false)
    }
  }

  // 正在加载用户状态
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
      </div>
    )
  }

  // 🚀 渲染界面 A：用户点击邮件链接进来的处理界面
  if (mode === 'verifyEmail' && oobCode) {
    return (
      <div className="container mx-auto flex min-h-[calc(100vh-16rem)] items-center justify-center px-4 py-12 relative overflow-hidden">
        {/* 赛博风背景点缀 */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

        <Card className="mx-auto w-full max-w-md text-center py-10 bg-[#0A0A0C]/90 backdrop-blur-3xl border-white/10 shadow-[0_30px_60px_rgba(0,0,0,0.8)] relative z-10">
          <CardHeader>
            {verifyStatus === 'loading' && <Loader2 className="mx-auto h-20 w-20 text-purple-500 animate-spin drop-shadow-[0_0_20px_rgba(168,85,247,0.6)]" />}
            {verifyStatus === 'success' && <CheckCircle2 className="mx-auto h-20 w-20 text-green-400 drop-shadow-[0_0_20px_rgba(74,222,128,0.6)]" />}
            {verifyStatus === 'error' && <XCircle className="mx-auto h-20 w-20 text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.6)]" />}
            
            <CardTitle className="mt-6 text-2xl font-black font-sans uppercase tracking-[0.15em] text-white">
              {verifyStatus === 'loading' && 'Verifying Protocol...'}
              {verifyStatus === 'success' && 'Access Granted'}
              {verifyStatus === 'error' && 'Access Denied'}
            </CardTitle>
            <CardDescription className="mt-4 text-xs tracking-widest uppercase text-white/50 leading-relaxed px-4">
              {verifyMessage}
            </CardDescription>
          </CardHeader>
          
          {verifyStatus === 'success' && (
            <CardFooter className="flex justify-center text-[10px] text-purple-400 mt-2 animate-pulse uppercase tracking-[0.2em]">
              Redirecting automatically...
            </CardFooter>
          )}
          
          {verifyStatus === 'error' && (
            <CardFooter className="flex justify-center mt-4">
              <Button asChild className="px-8 py-6 rounded-2xl border border-white/10 bg-white/5 text-xs font-black uppercase tracking-widest hover:bg-white/10 hover:border-purple-500/50 transition-all shadow-xl">
                <Link href="/">Return to Home</Link>
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    )
  }

  // 🚀 渲染界面 B：用户刚注册完，提示去查收邮件的界面
  return (
    <div className="container mx-auto flex min-h-[calc(100vh-16rem)] items-center justify-center px-4 py-12">
      <Card className="mx-auto w-full max-w-md text-center">
        <CardHeader>
          <MailCheck className="mx-auto h-16 w-16 text-green-400" />
          <CardTitle className="mt-4 text-2xl font-headline">
            {t('verify-email.title') || 'Check Your Email'}
          </CardTitle>
          <CardDescription>
            {t('verify-email.description')?.replace('{email}', email || 'your email') || `We sent a verification link to ${email || 'your email'}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button asChild size="lg">
            <Link href="/login">{t('verify-email.verifiedLogin') || 'I have verified my email'}</Link>
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            {t('verify-email.didNotReceive') || 'Did not receive the email?'}
          </p>
          <Button
            variant="secondary"
            className="w-full"
            onClick={handleResend}
            disabled={!user || cooldown > 0 || isSending}
          >
            {isSending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : cooldown > 0 ? (
              `${t('verify-email.resendIn') || 'Resend in'} ${cooldown}s`
            ) : (
              t('verify-email.resend') || 'Resend Email'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-purple-500"/></div>}>
      <VerifyEmailContent />
    </Suspense>
  )
}