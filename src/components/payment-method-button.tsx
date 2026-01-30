'use client';

import React from 'react';
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const AlipayLogo = () => (
    <div className="w-6 h-6 rounded-full bg-[#00A1E9] flex items-center justify-center p-0.5">
        <svg viewBox="0 0 1024 1024" fill="white">
            <path d="M817.3 400.9h-165.7l-59 200.9 136 230c4.5 7.6 1.8 17.7-5.8 22.2-7.6 4.5-17.7 1.8-22.2-5.8l-140-235.5-140 235.5c-4.5 7.6-14.5 10.3-22.2 5.8-7.6-4.5-10.3-14.5-5.8-22.2l136-230-59-200.9H205.8c-9.2 0-16.7-7.5-16.7-16.7s7.5-16.7 16.7-16.7h165.7c6.2 0 11.7 3.4 14.6 8.9L445 514.8l58.9-138.4c2.8-5.5 8.4-8.9 14.6-8.9h165.7c9.2 0 16.7 7.5 16.7 16.7s-7.5 16.7-16.7 16.7z"></path>
        </svg>
    </div>
);

const WeChatLogo = () => (
    <div className="w-6 h-6 rounded-full bg-[#07C160] flex items-center justify-center">
        <svg viewBox="0 0 1024 1024" fill="white" xmlns="http://www.w3.org/2000/svg">
            <path d="M512 64C264.58 64 64 254.34 64 502c0 137.02 64.12 260.66 166.62 344.22-14.26 38.9-39.98 72.82-74.08 99.3-4.52 3.52-6.2 9.56-4.22 14.98 1.98 5.4 7.28 8.8 12.98 8.44 32.96-2.08 65.34-11.42 94.6-27.18 24.96-13.44 47.56-31.14 67.28-52.42C425.86 896.7 468.18 902 512 902c247.42 0 448-189.92 448-438S759.42 64 512 64z m-144.38 522.68c-40.42 0-73.2-30.82-73.2-68.86s32.78-68.86 73.2-68.86c40.42 0 73.2 30.82 73.2 68.86s-32.78 68.86-73.2 68.86z m288.76 0c-40.42 0-73.2-30.82-73.2-68.86s32.78-68.86 73.2-68.86c40.42 0 73.2 30.82 73.2 68.86s-32.78 68.86-73.2 68.86z"/>
        </svg>
    </div>
);

const USDTLogo = () => (
    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm">
        T
    </div>
);

const PromptPayLogo = () => (
     <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
        P
    </div>
);


const logos = {
    USDT: <USDTLogo />,
    Alipay: <AlipayLogo />,
    WeChat: <WeChatLogo />,
    PromptPay: <PromptPayLogo />
};

type PaymentMethod = 'USDT' | 'Alipay' | 'WeChat' | 'PromptPay';

interface PaymentMethodButtonProps extends ButtonProps {
    method: PaymentMethod;
    label: string;
}

export const PaymentMethodButton = React.forwardRef<HTMLButtonElement, PaymentMethodButtonProps>(
    ({ method, label, className, ...props }, ref) => {
        return (
            <Button ref={ref} className={cn("h-12 text-sm justify-start", className)} {...props}>
                <div className="mr-2 flex-shrink-0 flex items-center justify-center">{logos[method]}</div>
                <span>{label}</span>
            </Button>
        );
    }
);
PaymentMethodButton.displayName = "PaymentMethodButton";
