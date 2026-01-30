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
    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48">
            <path fill="none" stroke="#FFF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M17 33.91s-11-6-11-15c0-8 7-14 16-14s17 6 17 14c0 9.4-10 15.4-10 15.4M17 34s-2 4-2 7s4 4 7 4s6-2 6-4s-1-5-1-5m-11.83-14a.5.5 0 1 0 0-1a.5.5 0 0 0 0 1m14.5 0a.5.5 0 1 0 0-1a.5.5 0 0 0 0 1"/>
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
                <span className="truncate">{label}</span>
            </Button>
        );
    }
);
PaymentMethodButton.displayName = "PaymentMethodButton";
