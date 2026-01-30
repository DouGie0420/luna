
'use client'

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
import { useFirebaseAuth } from "@/firebase/auth/use-user"
import { GoogleAuthProvider, FacebookAuthProvider, signInWithPopup } from "firebase/auth"
import { useFirestore } from "@/firebase"
import { useRouter } from "next/navigation"
import { upsertUserProfile } from "@/lib/user"
import { useToast } from "@/hooks/use-toast"
import { X } from "lucide-react"

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg role="img" viewBox="0 0 24 24" {...props} xmlns="http://www.w3.org/2000/svg"><title>Google</title><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.08-2.58 2.4-5.77 2.4-4.81 0-8.73-3.86-8.73-8.71s3.92-8.71 8.73-8.71c2.73 0 4.51 1.04 5.54 2.02l2.5-2.5C20.34 1.39 17.13 0 12.48 0 5.88 0 0 5.58 0 12.42s5.88 12.42 12.48 12.42c7.2 0 12.12-4.92 12.12-12.02 0-.8-.08-1.55-.2-2.32H12.48z"/></svg>
);

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg role="img" viewBox="0 0 24 24" {...props} xmlns="http://www.w3.org/2000/svg"><title>Facebook</title><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
);


export default function RegisterPage() {
  const auth = useFirebaseAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const handleSocialLogin = async (providerName: 'google' | 'facebook') => {
    if (!auth || !firestore) return;

    const provider = providerName === 'google' ? new GoogleAuthProvider() : new FacebookAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      await upsertUserProfile(firestore, result.user);
      toast({
        title: "注册成功",
        description: `欢迎，${result.user.displayName}！您的账户已创建。`,
      });
      router.push('/account');
    } catch (error: any) {
      console.error("Social login error:", error);
      toast({
        variant: 'destructive',
        title: "注册失败",
        description: error.message || "无法通过社交账号注册，请稍后再试。",
      });
    }
  };

  return (
    <div className="py-12">
      <Card className="w-full max-w-2xl mx-auto relative">
        <Button asChild variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-foreground">
          <Link href="/">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Link>
        </Button>
        <CardHeader>
          <CardTitle className="text-2xl font-headline">创建您的 LUNA 账户</CardTitle>
          <CardDescription>
            加入我们，开始您的赛博朋克交易之旅。
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="login-id">登录ID</Label>
              <Input id="login-id" placeholder="唯一的登录ID" required />
              <p className="text-xs text-muted-foreground">这将是您唯一的、不可更改的登录名。</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="username">用户名</Label>
              <Input id="username" placeholder="人们将如何称呼您？" required />
              <p className="text-xs text-muted-foreground">这是您在平台内显示的昵称，可以修改。</p>
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="email">电子邮箱</Label>
            <div className="flex gap-2">
              <Input id="email" type="email" placeholder="m@example.com" required className="flex-1" />
              <Button variant="secondary">发送验证码</Button>
            </div>
          </div>
           <div className="grid gap-2">
              <Label htmlFor="phone">手机号码 (可选)</Label>
              <Input id="phone" type="tel" placeholder="+86 138 0013 8000" />
            </div>

          <Separator />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="password">密码</Label>
              <Input id="password" type="password" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password-confirm">确认密码</Label>
              <Input id="password-confirm" type="password" required />
            </div>
          </div>

           <div className="items-top flex space-x-2">
              <Checkbox id="terms1" />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="terms1"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  我已阅读并同意 <Link href="/terms" className="text-primary hover:underline">服务条款</Link>
                </label>
                <p className="text-sm text-muted-foreground">
                  您必须同意我们的服务条款才能继续。
                </p>
              </div>
            </div>

        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button className="w-full">创建账户</Button>
          
          <div className="relative w-full">
            <Separator className="absolute left-0 top-1/2 -translate-y-1/2 w-full" />
            <span className="bg-card px-2 relative text-xs text-muted-foreground z-10 flex items-center justify-center mx-auto w-fit">或通过以下方式注册</span>
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
            已经有账户了？{" "}
            <Link href="/login" className="underline text-primary">
              登录
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
