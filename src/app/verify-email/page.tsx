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
import { sendEmailVerification } from 'firebase/auth'
import { useTranslation } from '@/hooks/use-translation'
import { MailCheck, Loader2 } from 'lucide-react'

function VerifyEmailContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email')
  const { user, loading } = useUser()
  const { toast } = useToast()

  const [cooldown, setCooldown] = useState(60)
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [cooldown])

  const handleResend = async () => {
    if (!user || cooldown > 0 || isSending) return

    setIsSending(true)
    try {
      await sendEmailVerification(user)
      toast({ title: t('registerPage.emailVerificationResent') })
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-16rem)] items-center justify-center px-4 py-12">
      <Card className="mx-auto w-full max-w-md text-center">
        <CardHeader>
          <MailCheck className="mx-auto h-16 w-16 text-green-400" />
          <CardTitle className="mt-4 text-2xl font-headline">
            {t('verify-email.title')}
          </CardTitle>
          <CardDescription>
            {t('verify-email.description').replace('{email}', email || 'your email')}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button asChild size="lg">
            <Link href="/login">{t('verify-email.verifiedLogin')}</Link>
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            {t('verify-email.didNotReceive')}
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
              `${t('verify-email.resendIn')} ${cooldown}s`
            ) : (
              t('verify-email.resend')
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}


export default function VerifyEmailPage() {
    return (
        <Suspense>
            <VerifyEmailContent />
        </Suspense>
    )
}
