import { PageHeaderWithBackAndClose } from '@/components/page-header-with-back-and-close';
import { SnakeBorder } from '@/components/snake-border';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/product-card';
import { getProducts } from '@/lib/data';
import Image from 'next/image';

export default async function CyberMondayPromoPage() {
    const allProducts = await getProducts();
    const promoProducts = allProducts.slice(0, 8); // Showcase 8 products

    return (
        <>
            <PageHeaderWithBackAndClose />
            <div className="relative overflow-hidden">
                <div className="container mx-auto px-4 py-12 md:py-20">

                    {/* Hero Section */}
                    <div className="relative mb-20 p-8 text-center border-2 border-primary/50 overflow-hidden">
                        <SnakeBorder />
                        <div 
                            className="absolute inset-0 -z-10 opacity-20"
                            style={{ backgroundImage: 'url(https://media.giphy.com/media/mlvseq9yvZhba/giphy.gif)', backgroundSize: 'cover', backgroundPosition: 'center' }}
                        />
                        <div className="absolute inset-0 -z-20 bg-background/90" />

                        <h1 className="font-headline text-5xl md:text-7xl font-bold text-primary animate-glow [text-shadow:0_0_15px_hsl(var(--primary))]">
                            CYBER MONDAY
                        </h1>
                        <p className="mt-4 text-xl text-foreground/80 max-w-2xl mx-auto">
                            全场商品限时折扣！即日起至下周一，全场电子产品、赛博配件享受高达30%的折扣，快来选购你的下一件装备吧！
                        </p>
                        <div className="mt-8 flex justify-center gap-4">
                            <Button size="lg" className="h-14 text-lg">立即抢购</Button>
                            <Button size="lg" variant="outline" className="h-14 text-lg">查看规则</Button>
                        </div>
                    </div>

                    {/* Featured Products */}
                    <div>
                        <h2 className="font-headline text-3xl font-semibold mb-8 text-center">折扣商品</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                            {promoProducts.map((product) => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
