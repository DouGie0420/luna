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
import { GoogleAuthProvider, FacebookAuthProvider, signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { useFirestore, useAuth } from "@/firebase";
import { useRouter } from "next/navigation";
import { upsertUserProfile } from "@/lib/user";
import { useToast } from "@/hooks/use-toast";
import { X, Loader2 } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useTranslation } from "@/hooks/use-translation";

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg role="img" viewBox="0 0 24 24" {...props} xmlns="http://www.w3.org/2000/svg"><title>Google</title><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.08-2.58 2.4-5.77 2.4-4.81 0-8.73-3.86-8.73-8.71s3.92-8.71 8.73-8.71c2.73 0 4.51 1.04 5.54 2.02l2.5-2.5C20.34 1.39 17.13 0 12.48 0 5.88 0 0 5.58 0 12.42s5.88 12.42 12.48 12.42c7.2 0 12.12-4.92 12.12-12.02 0-.8-.08-1.55-.2-2.32H12.48z"/></svg>
);

export default function LoginPage() {
  const { t } = useTranslation();
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const auth = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    if (!userLoading && user) {
      router.push('/');
    }
  }, [user, userLoading, router]);
  
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
    if (!auth || !firestore) return;
    setIsLoading(true);
    const provider = providerName === 'google' ? new GoogleAuthProvider() : new FacebookAuthProvider();
    if (providerName === 'facebook') {
      provider.addScope('email');
    }

    try {
      const result = await signInWithPopup(auth, provider);
      await upsertUserProfile(firestore, result.user);
      toast({ title: t('loginPage.loginSuccessTitle'), variant: 'success' });
      router.push('/');
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
         toast({ variant: "destructive", title: t('loginPage.popupClosedTitle'), description: t('loginPage.popupClosed') });
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        toast({
          variant: "destructive",
          title: "该邮箱已被使用",
          description: "此邮箱已通过其他方式（如谷歌或密码）注册。请使用原始方式登录。",
          duration: 7000
        });
      } else {
        toast({ variant: "destructive", title: t('loginPage.loginFailedTitle'), description: error.message });
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (userLoading || isLoading || user) {
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
            <div className="grid grid-cols-1 gap-2 w-full">
              <Button type="button" variant="outline" className="border-zinc-800 hover:bg-zinc-900" onClick={() => handleSocialLogin('google')}><GoogleIcon className="mr-2 h-4 w-4" /> Google</Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
