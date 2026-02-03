'use client'

import React, { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import { Separator } from "@/components/ui/separator"
import { useFirebaseAuth, useUser } from "@/firebase/auth/use-user"
import { GoogleAuthProvider, FacebookAuthProvider, signInWithRedirect, createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth"
import { useFirestore } from "@/firebase"
import { useRouter } from "next/navigation"
import { upsertUserProfile } from "@/lib/user"
import { useToast } from "@/hooks/use-toast"
import { X, Loader2 } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation";
import type { UserProfile } from "@/lib/types";
import { collection, getDocs, query, where } from "firebase/firestore";

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg role="img" viewBox="0 0 24 24" {...props} xmlns="http://www.w3.org/2000/svg"><title>Google</title><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.08-2.58 2.4-5.77 2.4-4.81 0-8.73-3.86-8.73-8.71s3.92-8.71 8.73-8.71c2.73 0 4.51 1.04 5.54 2.02l2.5-2.5C20.34 1.39 17.13 0 12.48 0 5.88 0 0 5.58 0 12.42s5.88 12.42 12.48 12.42c7.2 0 12.12-4.92 12.12-12.02 0-.8-.08-1.55-.2-2.32H12.48z"/></svg>
);

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg role="img" viewBox="0 0 24 24" {...props} xmlns="http://www.w3.org/2000/svg"><title>Facebook</title><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
);


export default function RegisterPage() {
  const { t } = useTranslation();
  const { user, loading: userLoading } = useUser();
  const auth = useFirebaseAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [loginId, setLoginId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    if (!userLoading && user) {
      router.push('/');
    }
  }, [user, userLoading, router]);

  const handleLoginIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, ''); // Only allow numbers
    setLoginId(value);
  }

  const handleEmailRegister = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!auth || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Firebase not ready. Please try again.' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Error', description: 'Passwords do not match.' });
      return;
    }
    if (!termsAccepted) {
      toast({ variant: 'destructive', title: 'Agreement Required', description: t('registerPage.termsRequirement') });
      return;
    }
    if (!loginId.match(/^[0-9]{3,}$/)) {
      toast({ variant: 'destructive', title: 'Invalid Login ID', description: '专属ID必须是3位或更长的纯数字。' });
      return;
    }


    setIsLoading(true);
    try {
      // Check if loginId is unique
      const loginIdQuery = query(collection(firestore, 'users'), where('loginId', '==', loginId));
      const querySnapshot = await getDocs(loginIdQuery);
      if (!querySnapshot.empty) {
        toast({ variant: 'destructive', title: 'Login ID Taken', description: '此专属ID已被使用，请选择其他ID。' });
        setIsLoading(false);
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const additionalData: Partial<UserProfile> = {
        loginId,
        displayName,
        phone,
        email,
      };
      
      await upsertUserProfile(firestore, user, additionalData);
      
      await sendEmailVerification(user);

      router.push(`/verify-email?email=${email}`);

    } catch (error: any) {
      let description = "An unknown error occurred.";
      switch (error.code) {
        case 'auth/email-already-in-use':
          description = 'This email address is already in use by another account.';
          break;
        case 'auth/weak-password':
          description = 'The password is too weak. Please use at least 6 characters.';
          break;
        case 'auth/invalid-email':
          description = 'The email address is not valid.';
          break;
        default:
          description = error.message;
      }
      toast({
        variant: 'destructive',
        title: t('registerPage.registrationFailedTitle'),
        description,
      });
    } finally {
      setIsLoading(false);
    }
  };


  const handleSocialLogin = async (providerName: 'google' | 'facebook', e: React.MouseEvent) => {
    if (!auth || !firestore) return;

    setIsLoading(true);
    const provider = providerName === 'google' ? new GoogleAuthProvider() : new FacebookAuthProvider();
    await signInWithRedirect(auth, provider);
  };
  
  if (userLoading || user) {
    return (
      <div className="flex h-[calc(100vh-16rem)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }


  return (
    <div className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[calc(100vh-16rem)]">
        <Card className="w-full max-w-2xl mx-auto relative">
          <Button asChild variant="ghost" size="icon" className="absolute right-2 top-2 z-10 h-9 w-9 rounded-full p-1 text-primary ring-offset-background transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none animate-glow">
              <Link href="/">
                <X className="h-5 w-5" />
                <span className="sr-only">{t('common.close')}</span>
              </Link>
          </Button>
          <CardHeader>
            <CardTitle className="text-2xl font-headline">{t('registerPage.title')}</CardTitle>
            <CardDescription>
              {t('registerPage.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="loginId">自定义专属ID (纯数字)</Label>
                <Input id="loginId" placeholder="一个独特的数字ID" required value={loginId} onChange={handleLoginIdChange} />
                 <p className="text-xs text-muted-foreground">这将是您的专属网址: /u/{loginId || '420'}</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="displayName">{t('registerPage.usernameLabel')}</Label>
                <Input id="displayName" placeholder={t('registerPage.usernamePlaceholder')} required value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </div>
            </div>
             <div className="grid gap-2">
                <Label htmlFor="email">{t('registerPage.emailLabel')}</Label>
                <Input id="email" type="email" placeholder={t('registerPage.emailPlaceholder')} required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            
            <div className="grid gap-2">
                <Label htmlFor="phone">{t('registerPage.phoneLabel')}</Label>
                <Input id="phone" type="tel" placeholder={t('registerPage.phonePlaceholder')} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>

            <Separator />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="password">{t('registerPage.passwordLabel')}</Label>
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password-confirm">{t('registerPage.confirmPasswordLabel')}</Label>
                <Input id="password-confirm" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
            </div>

            <div className="items-top flex space-x-2">
                <Checkbox id="terms1" checked={termsAccepted} onCheckedChange={(checked) => setTermsAccepted(!!checked)} />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="terms1"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {t('registerPage.termsAgreement')}{" "}
                    <Link href="/terms" className="text-primary hover:underline">
                      {t('registerPage.termsOfService')}
                    </Link>
                  </label>
                  <p className="text-sm text-muted-foreground">
                    {t('registerPage.termsRequirement')}
                  </p>
                </div>
              </div>

          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button className="w-full" onClick={handleEmailRegister} disabled={isLoading || !termsAccepted}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <span>{t('registerPage.createAccount')}</span>
            </Button>
            
            <div className="relative w-full">
              <Separator className="absolute left-0 top-1/2 -translate-y-1/2 w-full" />
              <span className="bg-card px-2 relative text-xs text-muted-foreground z-10 flex items-center justify-center mx-auto w-fit">{t('registerPage.orRegisterWith')}</span>
            </div>

            <div className="w-full grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={(e) => handleSocialLogin('google', e)} disabled={isLoading}>
                  <GoogleIcon className="mr-2 h-4 w-4 fill-current"/>
                  <span>Google</span>
                </Button>
                <Button variant="outline" onClick={(e) => handleSocialLogin('facebook', e)} disabled={isLoading}>
                  <FacebookIcon className="mr-2 h-4 w-4 fill-current"/>
                  <span>Facebook</span>
                </Button>
            </div>

            <div className="text-center text-sm">
              {t('registerPage.alreadyHaveAccount')}{" "}
              <Link href="/login" className="underline text-primary">
                {t('common.login')}
              </Link>
            </div>
          </CardFooter>
        </Card>
    </div>
  )
}
