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
import { useFirebaseAuth } from "@/firebase/auth/use-user";
import { GoogleAuthProvider, FacebookAuthProvider, signInWithPopup } from "firebase/auth";
import { useFirestore } from "@/firebase";
import { useRouter } from "next/navigation";
import { upsertUserProfile } from "@/lib/user";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";
import React from "react";
import { useTranslation } from "@/hooks/use-translation";

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg role="img" viewBox="0 0 24 24" {...props} xmlns="http://www.w3.org/2000/svg"><title>Google</title><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.08-2.58 2.4-5.77 2.4-4.81 0-8.73-3.86-8.73-8.71s3.92-8.71 8.73-8.71c2.73 0 4.51 1.04 5.54 2.02l2.5-2.5C20.34 1.39 17.13 0 12.48 0 5.88 0 0 5.58 0 12.42s5.88 12.42 12.48 12.42c7.2 0 12.12-4.92 12.12-12.02 0-.8-.08-1.55-.2-2.32H12.48z"/></svg>
);

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg role="img" viewBox="0 0 24 24" {...props} xmlns="http://www.w3.org/2000/svg"><title>Facebook</title><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
);

export default function LoginPage() {
  const { t } = useTranslation();
  const auth = useFirebaseAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const handleTestLogin = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    localStorage.setItem('isTestUser', 'true');
    toast({
      title: t('loginPage.testLoginSuccessTitle'),
      description: t('loginPage.testLoginSuccessDescription'),
    });
    // Use a full page reload to ensure the user hook re-initializes
    window.location.href = '/account';
  };

  const handleSocialLogin = async (providerName: 'google' | 'facebook') => {
    if (!auth || !firestore) return;

    const provider = providerName === 'google' ? new GoogleAuthProvider() : new FacebookAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      await upsertUserProfile(firestore, result.user);
      toast({
        title: t('loginPage.loginSuccessTitle'),
        description: t('loginPage.loginSuccessDescription').replace('{displayName}', result.user.displayName || 'User'),
      });
      router.push('/account');
    } catch (error: any) {
      console.error("Social login error:", error);
      toast({
        variant: 'destructive',
        title: t('loginPage.loginFailedTitle'),
        description: error.message || t('loginPage.loginFailedDescription'),
      });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-10rem)] py-12">
      <Card className="w-full max-w-sm relative">
        <Button asChild variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-foreground">
          <Link href="/">
            <X className="h-4 w-4" />
            <span className="sr-only">{t('common.close')}</span>
          </Link>
        </Button>
        <CardHeader>
          <CardTitle className="text-2xl font-headline">{t('loginPage.title')}</CardTitle>
          <CardDescription>
            {t('loginPage.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">{t('loginPage.emailLabel')}</Label>
            <Input id="email" type="email" placeholder={t('loginPage.emailPlaceholder')} defaultValue="test@example.com" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">{t('loginPage.passwordLabel')}</Label>
            <Input id="password" type="password" defaultValue="password" required />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button className="w-full" onClick={handleTestLogin}>{t('common.login')}</Button>
          
          <div className="relative w-full">
            <Separator className="absolute left-0 top-1/2 -translate-y-1/2 w-full" />
            <span className="bg-card px-2 relative text-xs text-muted-foreground z-10 flex items-center justify-center mx-auto w-fit">{t('loginPage.orContinueWith')}</span>
          </div>

          <div className="w-full grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => handleSocialLogin('google')}>
                <GoogleIcon className="mr-2 h-4 w-4 fill-current"/>
                Google
              </Button>
              <Button variant="outline" onClick={() => handleSocialLogin('facebook')}>
                <FacebookIcon className="mr-2 h-4 w-4 fill-current"/>
                Facebook
              </Button>
          </div>

          <div className="text-center text-sm">
            {t('loginPage.noAccount')}{" "}
            <Link href="/register" className="underline">
              {t('common.register')}
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
