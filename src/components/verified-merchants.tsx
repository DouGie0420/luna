import { getUsers } from "@/lib/data";
import { MerchantCard } from "./merchant-card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import Autoplay from "embla-carousel-autoplay";

export async function VerifiedMerchants() {
    const users = await getUsers();
    const proUsers = users.slice(0, 10); // Get 10 users

    return (
        <section className="container mx-auto px-4 py-12 md:py-16">
            <h2 className="font-headline text-3xl font-semibold mb-6">认证商户</h2>
            <div className="relative">
                <Carousel
                  opts={{
                    align: "start",
                    loop: true,
                  }}
                  plugins={[
                    Autoplay({
                      delay: 3000,
                      stopOnInteraction: true,
                    }),
                  ]}
                  className="w-full"
                >
                  <CarouselContent>
                    {proUsers.map((user) => (
                      <CarouselItem key={user.id} className="sm:basis-1/2 md:basis-1/3 lg:basis-1/5">
                        <div className="p-1 h-full">
                          <MerchantCard user={user} />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="hidden lg:flex" />
                  <CarouselNext className="hidden lg:flex" />
                </Carousel>
            </div>
        </section>
    );
}
