'use client';

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
import { useUser } from "@/firebase/auth/use-user";
// 导入Google、Facebook、Twitter三种OAuth提供者
import { GoogleAuthProvider, FacebookAuthProvider, TwitterAuthProvider, signInWithPopup, createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth"
import { useFirestore, useAuth } from "@/firebase";
import { useRouter } from "next/navigation"
import { upsertUserProfile } from "@/lib/user"
import { useToast } from "@/hooks/use-toast"
import { X, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";
import type { UserProfile } from "@/lib/types";
import { collection, getDocs, query, where, limit } from "firebase/firestore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"


// Google图标SVG组件
const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg role="img" viewBox="0 0 24 24" {...props} xmlns="http://www.w3.org/2000/svg"><title>Google</title><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.08-2.58 2.4-5.77 2.4-4.81 0-8.73-3.86-8.73-8.71s3.92-8.71 8.73-8.71c2.73 0 4.51 1.04 5.54 2.02l2.5-2.5C20.34 1.39 17.13 0 12.48 0 5.88 0 0 5.58 0 12.42s5.88 12.42 12.48 12.42c7.2 0 12.12-4.92 12.12-12.02 0-.8-.08-1.55-.2-2.32H12.48z"/></svg>
);

// Facebook图标SVG组件
const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg role="img" viewBox="0 0 24 24" {...props} xmlns="http://www.w3.org/2000/svg"><title>Facebook</title><path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 7.834 7.834 0 0 0-.567-.01c-.963 0-1.652.163-2.104.49-.451.327-.676.892-.676 1.695v1.796h4.168l-.591 3.667h-3.577v7.98C19.395 23.25 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z"/></svg>
);

// Twitter/X图标SVG组件
const TwitterIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg role="img" viewBox="0 0 24 24" {...props} xmlns="http://www.w3.org/2000/svg"><title>X</title><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>
);

export default function RegisterPage() {
  const { t } = useTranslation();
  const { user, loading: userLoading } = useUser();
  const auth = useAuth();
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
  
  const [isCheckingId, setIsCheckingId] = useState(false);
  const [idCheckResult, setIdCheckResult] = useState<'available' | 'taken' | 'invalid' | null>(null);

  useEffect(() => {
    if (!userLoading && user) {
      router.push('/');
    }
  }, [user, userLoading, router]);

  const handleLoginIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, ''); // Only allow numbers
    setLoginId(value);
    setIdCheckResult(null); // Reset check result on change
  }

  const handleCheckLoginId = async () => {
    if (!firestore) return;
    
    if (!loginId.match(/^[0-9]{3,}$/)) {
        setIdCheckResult('invalid');
        return;
    }
    
    const RESERVED_IDS = ['admin', 'staff', 'pay', 'root', 'luna'];
    if (RESERVED_IDS.includes(loginId.toLowerCase())) {
        setIdCheckResult('taken');
        return;
    }

    setIsCheckingId(true);
    setIdCheckResult(null);

    try {
        const usersRef = collection(firestore, 'users');
        const q = query(usersRef, where('loginId', '==', loginId), limit(1));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            setIdCheckResult('available');
        } else {
            setIdCheckResult('taken');
        }
    } catch (error) {
        console.error("Error checking login ID:", error);
        toast({ variant: 'destructive', title: '查询失败', description: '无法检查ID可用性，请稍后再试。' });
    } finally {
        setIsCheckingId(false);
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
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
    
    const RESERVED_IDS = ['admin', 'staff', 'pay', 'root', 'luna'];
    if (RESERVED_IDS.includes(loginId.toLowerCase())) {
        toast({ variant: 'destructive', title: 'Invalid Login ID', description: 'This ID is reserved for system use.' });
        return;
    }


    setIsLoading(true);
    try {
      // Check if loginId is unique
      const loginIdQuery = query(collection(firestore, 'users'), where('loginId', '==', loginId), limit(1));
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


  // 社交登录统一处理 - 支持Google、Facebook、Twitter
  const handleSocialLogin = async (providerName: 'google' | 'facebook' | 'twitter') => {
    if (!auth || !firestore) return;
    setIsLoading(true);

    // 根据类型创建对应的OAuth提供者
    let provider;
    switch (providerName) {
      case 'google':
        provider = new GoogleAuthProvider();
        break;
      case 'facebook':
        provider = new FacebookAuthProvider();
        provider.addScope('email'); // Facebook需要请求email权限
        break;
      case 'twitter':
        provider = new TwitterAuthProvider();
        break;
    }

    try {
      const result = await signInWithPopup(auth, provider);
      await upsertUserProfile(firestore, result.user);
      toast({ title: t('loginPage.loginSuccessTitle'), variant: 'warning' });
      router.push('/');
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
         toast({ variant: "destructive", title: t('registerPage.popupClosedTitle'), description: t('registerPage.popupClosed') });
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        toast({
          variant: "destructive",
          title: t('loginPage.accountExistsTitle') || "该邮箱已被使用",
          description: t('loginPage.accountExistsDescription') || "此邮箱已通过其他方式（如谷歌或密码）注册。请使用原始方式登录。",
          duration: 7000
        });
      }
      else {
        toast({ variant: "destructive", title: t('registerPage.registrationFailedTitle'), description: error.message });
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  if (userLoading || isLoading || user) {
    return (
      <div className="flex h-[calc(100vh-16rem)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }


  return (
    <Dialog>
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
            <form onSubmit={handleEmailRegister}>
            <CardContent className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div className="grid gap-2">
                  <Label htmlFor="loginId">自定义专属ID (纯数字)</Label>
                   <div className="flex items-center gap-2">
                    <Input id="loginId" placeholder="一个独特的数字ID" required value={loginId} onChange={handleLoginIdChange} />
                    <Button type="button" className="bg-yellow-400 text-black hover:bg-yellow-500" onClick={handleCheckLoginId} disabled={isCheckingId || !loginId.trim()}>
                        {isCheckingId ? <Loader2 className="h-4 w-4 animate-spin" /> : '查询'}
                    </Button>
                  </div>
                   <div className="h-5">
                     {idCheckResult === 'available' && <p className="text-xs text-green-500 flex items-center gap-1"><CheckCircle className="h-3 w-3"/>恭喜！此ID可用。</p>}
                     {idCheckResult === 'taken' && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3"/>此ID已被占用。</p>}
                     {idCheckResult === 'invalid' && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3"/>ID必须是3位或更长的纯数字。</p>}
                   </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="displayName">{t('registerPage.usernameLabel')}</Label>
                  <Input id="displayName" placeholder="人们将如何称呼您？" required value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                </div>
              </div>
               <div className="grid gap-2">
                  <Label htmlFor="email">{t('registerPage.emailLabel')}</Label>
                  <Input id="email" type="email" placeholder="luna@test.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              
              <div className="grid gap-2">
                  <Label htmlFor="phone">{t('registerPage.phoneLabel')}</Label>
                  <Input id="phone" type="tel" placeholder="+86 138 0013 8000" value={phone} onChange={(e) => setPhone(e.target.value)} />
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
                      <DialogTrigger asChild>
                        <span className="text-primary hover:underline cursor-pointer">
                          {t('registerPage.termsOfService')}
                        </span>
                      </DialogTrigger>
                    </label>
                    <p className="text-sm text-muted-foreground">
                      {t('registerPage.termsRequirement')}
                    </p>
                  </div>
                </div>

            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={isLoading || !termsAccepted}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <span>{t('registerPage.createAccount')}</span>
              </Button>
              
              <div className="relative w-full">
                <Separator className="absolute left-0 top-1/2 -translate-y-1/2 w-full" />
                <span className="bg-card px-2 relative text-xs text-muted-foreground z-10 flex items-center justify-center mx-auto w-fit">{t('registerPage.orRegisterWith')}</span>
              </div>

              {/* 三种社交登录按钮: Google、Facebook、Twitter */}
              <div className="w-full grid grid-cols-3 gap-2">
                  <Button variant="outline" onClick={() => handleSocialLogin('google')} disabled={isLoading}>
                    <GoogleIcon className="mr-2 h-4 w-4 fill-current"/>
                    <span>Google</span>
                  </Button>
                  <Button variant="outline" onClick={() => handleSocialLogin('facebook')} disabled={isLoading}>
                    <FacebookIcon className="mr-2 h-4 w-4 fill-current"/>
                    <span>Facebook</span>
                  </Button>
                  <Button variant="outline" onClick={() => handleSocialLogin('twitter')} disabled={isLoading}>
                    <TwitterIcon className="mr-2 h-4 w-4 fill-current"/>
                    <span>X</span>
                  </Button>
              </div>

              <div className="text-center text-sm">
                {t('registerPage.alreadyHaveAccount')}{" "}
                <Link href="/login" className="underline text-primary">
                  {t('common.login')}
                </Link>
              </div>
            </CardFooter>
            </form>
          </Card>
      </div>

      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>服务条款</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-96 pr-6">
          <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 whitespace-pre-wrap leading-relaxed space-y-4">
              <p>最后更新：{new Date().toLocaleDateString()}</p>
              <p>欢迎来到 LUNA！这些服务条款（“条款”）规定了您对我们网站、服务和应用程序（统称为“平台”）的访问和使用。请仔细阅读。</p>
              
              <h3 className="text-foreground font-semibold">1. 接受条款</h3>
              <p>通过访问或使用我们的平台，您同意受这些条款和我们的隐私政策的约束。如果您不同意这些条款，请不要访问或使用我们的平台。</p>

              <h3 className="text-foreground font-semibold">2. 账户</h3>
              <p>您需要创建一个帐户才能使用我们平台的某些功能。您有责任维护您的帐户和密码的机密性，并对在您的帐户下发生的所有活动负责。</p>

              <h3 className="text-foreground font-semibold">3. 用户行为</h3>
              <p>您同意不参与任何以下禁止活动：(a) 复制、分发或披露平台的任何部分；(b) 使用任何自动化系统访问平台；(c) 冒充他人或以其他方式歪曲您与某人或某实体的关系。</p>
              
              <h3 className="text-foreground font-semibold">4. 终止</h3>
              <p>我们可以随时以任何理由终止或暂停您访问我们平台的权限，而无需事先通知或承担责任，包括但不限于如果您违反了条款。</p>
              
              <h3 className="text-foreground font-semibold">5. 免责声明</h3>
              <p>本平台按“原样”和“现有”基础提供。对于平台的运营或平台上包含的信息、内容或材料，我们不作任何形式的明示或暗示的陈述或保证。</p>
          </div>
        </ScrollArea>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button">
              同意服务条款
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
