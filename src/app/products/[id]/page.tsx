import Image from 'next/image';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getProductById, getProducts } from '@/lib/data';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, MapPin, ShieldCheck } from 'lucide-react';
import { BuyNowButton } from '@/components/buy-now-button';
import { PageHeaderWithBackAndClose } from '@/components/page-header-with-back-and-close';

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
            <Carousel className="w-full">
              <CarouselContent>
                {product.images.map((img, index) => (
                  <CarouselItem key={index}>
                    <Card className="overflow-hidden">
                      <div className="aspect-video relative">
                        <Image
                          src={img}
                          alt={`${product.name} image ${index + 1}`}
                          fill
                          className="object-cover"
                          data-ai-hint={product.imageHints[index]}
                        />
                      </div>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-4" />
              <CarouselNext className="right-4" />
            </Carousel>
            <div className="flex items-center justify-end gap-6 mt-4">
                <Button variant="ghost" className="text-muted-foreground">
                    <Star className="mr-2 h-4 w-4" /> 点赞
                </Button>
                <Button variant="ghost" className="text-muted-foreground">
                    <Star className="mr-2 h-4 w-4" /> 收藏
                </Button>
            </div>
          </div>

          {/* Right Column: Product Details & Actions */}
          <div className="lg:col-span-2 flex flex-col gap-6">
              <h1 className="font-headline text-3xl font-bold">{product.name}</h1>
              
              <div className="bg-card p-4 border border-border">
                  <p className="text-4xl font-bold text-primary">
                      ¥{product.price.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                      <ShieldCheck className="h-4 w-4 text-primary"/>
                      <span>描述不符包邮退</span>
                  </div>
              </div>

              <div>
                  <h3 className="text-lg font-semibold mb-3">支付方式</h3>
                  <div className="grid grid-cols-2 gap-3">
                      <Button variant="outline" className="h-12 text-base">USDT</Button>
                      <Button variant="outline" className="h-12 text-base">支付宝</Button>
                      <Button variant="outline" className="h-12 text-base">微信支付</Button>
                      <Button variant="outline" className="h-12 text-base">PromptPay</Button>
                  </div>
              </div>

              <div className="flex gap-2">
                  <Button size="lg" variant="secondary" className="flex-1 h-14 text-lg">
                      Chat with Seller
                  </Button>
                  <BuyNowButton product={product} />
              </div>

              <Card>
                  <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                          <Avatar className="h-16 w-16">
                              <AvatarImage src={product.seller.avatarUrl} alt={product.seller.name} />
                              <AvatarFallback>{product.seller.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
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
