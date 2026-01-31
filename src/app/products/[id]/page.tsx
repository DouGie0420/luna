import Image from 'next/image';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getProductById, getProducts } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeaderWithBackAndClose } from '@/components/page-header-with-back-and-close';
import { ProductImageGallery } from '@/components/product-image-gallery';
import { ProductTitleWithBadge } from '@/components/product-title-with-badge';
import { SellerProfileCard } from '@/components/seller-profile-card';
import { ProductPurchaseActions } from '@/components/product-purchase-actions';
import { ProductCommentSection } from '@/components/product-comment-section';

export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await getProductById(params.id);
  const allProducts = await getProducts(); 

  if (!product) {
    notFound();
  }
  
  const recommendedProducts = allProducts.filter(p => p.id !== product.id).slice(0, 5);

  return (
    <>
      <PageHeaderWithBackAndClose />
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-x-12 gap-y-8">
          {/* Left Column: Image Carousel & Actions */}
          <div className="lg:col-span-3">
            <ProductImageGallery product={product} />
          </div>

          {/* Right Column: Product Details & Actions */}
          <div className="lg:col-span-2 flex flex-col gap-6">
              <ProductTitleWithBadge product={product} />
              
              <ProductPurchaseActions product={product} />

              <SellerProfileCard product={product} />
          </div>
        </div>
        
        {/* Description and other sections below */}
        <div className="mt-12 flex flex-col gap-8">
            <Card>
                <CardHeader>
                    <CardTitle>商品描述</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{product.description}</p>
                </CardContent>
            </Card>
            
            <ProductCommentSection productId={product.id} />
        </div>


        <div className="mt-20">
          <h2 className="font-headline text-3xl font-semibold mb-6">为你推荐</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {recommendedProducts.map((p) => (
                  <Link href={`/products/${p.id}`} key={p.id} className="group aspect-video relative overflow-hidden border border-border">
                    <Image
                      src={p.images[0]}
                      alt={p.name}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      data-ai-hint={p.imageHints[0]}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <h3 className="absolute bottom-0 left-0 p-4 font-headline text-lg text-foreground">
                      {p.name}
                    </h3>
                  </Link>
              ))}
          </div>
        </div>
      </div>
    </>
  );
}
