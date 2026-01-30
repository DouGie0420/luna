import { getUsers } from "@/lib/data";
import { MerchantCard } from "./merchant-card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export async function VerifiedMerchants() {
    const users = await getUsers();
    const proUsers = users.slice(0, 5); // For now, just take the first 5 as "pro"

    return (
        <section className="container mx-auto px-4 py-12 md:py-16">
            <h2 className="font-headline text-3xl font-semibold mb-6">认证商户</h2>
            <div className="relative">
                <ScrollArea className="w-full whitespace-nowrap">
                    <div className="flex w-max space-x-6 pb-4">
                        {proUsers.map(user => (
                            <div key={user.id} className="w-64">
                                <MerchantCard user={user} />
                            </div>
                        ))}
                    </div>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </div>
        </section>
    );
}
