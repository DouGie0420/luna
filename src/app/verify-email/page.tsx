// @ts-nocheck
'use client'

import React, { Suspense, useState, useEffect } from 'react'
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
// 🚀 确保这里引入的是 auth，而不是 app
import { applyActionCode, sendEmailVerification } from 'firebase/auth'
import { auth } from '@/firebase' 
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

  // 🚀 核心逻辑 1：如果检测到是验证链接，自动执行验证
  useEffect(() => {
    if (mode === 'verifyEmail' && oobCode) {
      setVerifyStatus('loading')
      
      // 直接使用项目里的 auth 实例
      applyActionCode(auth, oobCode)
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
      <div className="container mx-auto flex min-h-[calc(100vh-16rem)] items-center justify-center px-4 py-12">
        <Card className="mx-auto w-full max-w-md text-center py-8">
          <CardHeader>
            {verifyStatus === 'loading' && <Loader2 className="mx-auto h-16 w-16 text-purple-500 animate-spin" />}
            {verifyStatus === 'success' && <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />}
            {verifyStatus === 'error' && <XCircle className="mx-auto h-16 w-16 text-red-500" />}
            
            <CardTitle className="mt-4 text-2xl font-headline uppercase tracking-widest">
              {verifyStatus === 'loading' && 'Verifying Protocol...'}
              {verifyStatus === 'success' && 'Access Granted'}
              {verifyStatus === 'error' && 'Access Denied'}
            </CardTitle>
            <CardDescription className="mt-4 text-sm">
              {verifyMessage}
            </CardDescription>
          </CardHeader>
          
          {verifyStatus === 'success' && (
            <CardFooter className="flex justify-center text-xs text-purple-400 animate-pulse uppercase tracking-widest">
              Redirecting automatically...
            </CardFooter>
          )}
          
          {verifyStatus === 'error' && (
            <CardFooter className="flex justify-center">
              <Button asChild variant="secondary"><Link href="/">Return to Home</Link></Button>
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