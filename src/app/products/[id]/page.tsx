import Image from 'next/image';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getProductById, getProducts } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, MapPin, ShieldCheck } from 'lucide-react';
import { BuyNowButton } from '@/components/buy-now-button';
import { PageHeaderWithBackAndClose } from '@/components/page-header-with-back-and-close';
import { ProductImageGallery } from '@/components/product-image-gallery';
import { ProductPriceAndPayment } from '@/components/product-price-and-payment';

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
              <h1 className="font-headline text-3xl font-bold">{product.name}</h1>
              
              <ProductPriceAndPayment product={product} />

              <div className="flex gap-2">
                  <Button size="lg" variant="secondary" className="flex-1 h-14 text-lg">
                      联系卖家
                  </Button>
                  <BuyNowButton product={product} />
              </div>

              <Card>
                  <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                          <Avatar className="h-16 w-16">
                              <AvatarImage src={product.seller.avatarUrl} alt={product.seller.name} />
                              <AvatarFallback>{product.seller.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                              <p className="font-bold text-lg">{product.seller.name}</p>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Star className="h-4 w-4 fill-primary text-primary" />
                                  <span>{product.seller.rating} ({product.seller.reviews} reviews)</span>
                              </div>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                  <MapPin className="h-4 w-4" />
                                  <span>{product.location.city}, {product.location.country}</span>
                              </div>
                          </div>
                          <div className="flex flex-col items-start gap-1 text-sm font-medium">
                              {product.seller.isPro && (
                                  <div className="flex items-center gap-1.5 text-green-400">
                                      <ShieldCheck className="h-4 w-4" />
                                      <span>PRO</span>
                                  </div>
                              )}
                              {product.seller.isWeb3Verified && (
                                  <div className="flex items-center gap-1.5 text-blue-400">
                                      <ShieldCheck className="h-4 w-4" />
                                      <span>WEB3</span>
                                  </div>
                              )}
                              {product.seller.kycStatus === 'Verified' && (
                                  <div className="flex items-center gap-1.5 text-cyan-400">
                                      <ShieldCheck className="h-4 w-4" />
                                      <span>KYC</span>
                                  </div>
                              )}
                          </div>
                      </div>
                  </CardContent>
              </Card>
          </div>
        </div>
        
        {/* Description and other sections below */}
        <div className="mt-12 flex flex-col gap-8">
              <Card>
                  <CardHeader>
                      <CardTitle>留言板</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <p className="text-muted-foreground leading-relaxed">这里按留言发布的时间顺序显示用户对该商品的留言</p>
                  </CardContent>
              </Card>
            
              <Card>
                  <CardHeader>
                      <CardTitle>商品描述</CardTitle>
                  </CardHeader>
                  <CardContent>
                      <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{product.description}</p>
                  </CardContent>
              </Card>
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
