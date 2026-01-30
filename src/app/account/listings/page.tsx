import { ProductCard } from "@/components/product-card";
import { getProducts } from "@/lib/data";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function MyListingsPage() {
    const allProducts = await getProducts();
    // In a real app, this would be filtered by the current user
    const userProducts = allProducts.slice(0, 4); 

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-headline">My Listings</h1>
                <Button asChild>
                    <Link href="/products/new">List a New Item</Link>
                </Button>
            </div>

            {userProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {userProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 border-2 border-dashed rounded-lg">
                    <h2 className="text-xl font-semibold">You have no active listings.</h2>
                    <p className="text-muted-foreground mt-2 mb-6">Start selling by listing your first item.</p>
                    <Button asChild>
                       <Link href="/products/new">List an Item</Link>
                    </Button>
                </div>
            )}
        </div>
    )
}
