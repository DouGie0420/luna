import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import Image from "next/image";

const balances = [
    { currency: "THB", name: "Thai Baht", amount: "15,250.75", icon: "/flags/th.svg" },
    { currency: "USDT", name: "Tether", amount: "550.20", icon: "/crypto/usdt.svg" },
    { currency: "RMB", name: "Chinese Yuan (Alipay)", amount: "3,120.50", icon: "/payments/alipay.svg" },
    { currency: "RMB", name: "Chinese Yuan (WeChat)", amount: "1,800.00", icon: "/payments/wechat.svg" },
];

export default function WalletPage() {
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-headline">My Wallet</h1>
                <div className="flex gap-2">
                    <Button variant="outline"><ArrowDownLeft className="mr-2 h-4 w-4" /> Deposit</Button>
                    <Button><ArrowUpRight className="mr-2 h-4 w-4" /> Withdraw</Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {balances.map(balance => (
                    <Card key={balance.name}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-base font-medium">{balance.name}</CardTitle>
                            {/* In a real app, these icons would exist. For now, it will show a broken image. */}
                            <div className="w-6 h-6 relative">
                               <div className="w-6 h-6 rounded-full bg-muted-foreground"></div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{balance.amount}</div>
                            <p className="text-xs text-muted-foreground">{balance.currency}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="mt-8">
                <CardHeader>
                    <CardTitle>Transaction History</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Recent transactions will be displayed here.</p>
                </CardContent>
            </Card>
        </div>
    )
}
