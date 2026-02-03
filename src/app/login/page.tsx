'use client';

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { Separator } from "@/components/ui/separator";
import { useUser } from "@/firebase/auth/use-user";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider, signInWithRedirect, signInWithEmailAndPassword, fetchSignInMethodsForEmail, getRedirectResult } from "firebase/auth";
import { useFirestore } from "@/firebase";
import { useRouter } from "next/navigation";
import { upsertUserProfile } from "@/lib/user";
import { useToast } from "@/hooks/use-toast";
import { X, Loader2 } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useTranslation } from "@/hooks/use-translation";

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg role="img" viewBox="0 0 24 24" {...props} xmlns="http://www.w3.org/2000/svg"><title>Google</title><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.08-2.58 2.4-5.77 2.4-4.81 0-8.73-3.86-8.73-8.71s3.92-8.71 8.73-8.71c2.73 0 4.51 1.04 5.54 2.02l2.5-2.5C20.34 1.39 17.13 0 12.48 0 5.88 0 0 5.58 0 12.42s5.88 12.42 12.48 12.42c7.2 0 12.12-4.92 12.12-12.02 0-.8-.08-1.55-.2-2.32H12.48z"/></svg>
);

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg role="img" viewBox="0 0 24 24" {...props} xmlns="http://www.w3.org/2000/svg"><title>Facebook</title><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
);

export default function LoginPage() {
  const { t } = useTranslation();
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  // 直接通过 getAuth 获取实例，避免导入错误
  const auth = getAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingRedirect, setIsProcessingRedirect] = useState(true);

  useEffect(() => {
    if (!auth || !firestore) {
      setIsProcessingRedirect(false);
      return;
    }
    getRedirectResult(auth)
      .then(async (result) => {
        if (result) {
          toast({ title: t('loginPage.loginSuccessTitle'), variant: 'success' });
          await upsertUserProfile(firestore, result.user);
          router.push('/');
        } else {
          setIsProcessingRedirect(false);
        }
      })
      .catch((error) => {
        toast({ variant: "destructive", title: t('loginPage.loginFailedTitle'), description: error.message });
        setIsProcessingRedirect(false);
      });
  }, [auth, firestore, router, t, toast]);

  useEffect(() => {
    if (!isProcessingRedirect && !userLoading && user) {
      router.push('/');
    }
  }, [user, userLoading, router, isProcessingRedirect]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !firestore) return;
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await upsertUserProfile(firestore, userCredential.user);
      toast({ title: t('loginPage.loginSuccessTitle'), variant: 'success' });
      router.push('/');
    } catch (error: any) {
      toast({ variant: 'destructive', title: t('loginPage.loginFailedTitle'), description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (providerName: 'google' | 'facebook') => {
    if (!auth) return;
    const provider = providerName === 'google' ? new GoogleAuthProvider() : new FacebookAuthProvider();
    await signInWithRedirect(auth, provider);
  };

  if (userLoading || isProcessingRedirect || user) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-sm relative bg-zinc-950 border-zinc-800 text-white">
        <Button asChild variant="ghost" className="absolute right-2 top-2 rounded-full h-8 w-8 p-0 text-zinc-500">
          <Link href="/"><X className="h-4 w-4" /></Link>
        </Button>
        <CardHeader>
          <CardTitle className="text-2xl">{t('loginPage.title')}</CardTitle>
          <CardDescription className="text-zinc-500">{t('loginPage.description')}</CardDescription>
        </CardHeader>
        <form onSubmit={handleEmailLogin}>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">{t('loginPage.emailLabel')}</Label>
              <Input id="email" type="email" className="bg-zinc-900 border-zinc-800" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">{t('loginPage.passwordLabel')}</Label>
              <Input id="password" type="password" className="bg-zinc-900 border-zinc-800" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.login')}
            </Button>
            <div className="relative w-full text-center">
              <Separator className="bg-zinc-800" />
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-950 px-2 text-[10px] text-zinc-500 uppercase">{t('loginPage.orContinueWith')}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full">
              <Button type="button" variant="outline" className="border-zinc-800 hover:bg-zinc-900" onClick={() => handleSocialLogin('google')}><GoogleIcon className="mr-2 h-4 w-4" /> Google</Button>
              <Button type="button" variant="outline" className="border-zinc-800 hover:bg-zinc-900" onClick={() => handleSocialLogin('facebook')}><FacebookIcon className="mr-2 h-4 w-4" /> Facebook</Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}