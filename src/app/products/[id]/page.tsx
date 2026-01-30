import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getProductById } from '@/lib/data';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, MapPin, MessageCircle, CreditCard } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await getProductById(params.id);

  if (!product) {
    notFound();
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="grid md:grid-cols-2 gap-12">
        <div>
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
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
        <div className="flex flex-col gap-6">
          <div>
            <Badge variant="secondary" className="mb-2">{product.category}</Badge>
            <h1 className="font-headline text-4xl font-bold">{product.name}</h1>
            <div className="flex items-center gap-2 text-muted-foreground mt-2">
                <MapPin className="h-4 w-4" />
                <span>{product.location.city}, {product.location.country}</span>
            </div>
          </div>
          <p className="text-3xl font-semibold">
            {product.price.toLocaleString()}
            <span className="text-base text-muted-foreground ml-2">{product.currency}</span>
          </p>
          <div className="flex gap-4">
            <Button size="lg" className="flex-1">
                <CreditCard className="mr-2 h-5 w-5" /> Buy Now
            </Button>
            <Button size="lg" variant="outline" className="flex-1">
                <MessageCircle className="mr-2 h-5 w-5" /> Chat with Seller
            </Button>
          </div>
          <Separator />
          <Card>
            <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-16 w-16">
                    <AvatarImage src={product.seller.avatarUrl} alt={product.seller.name} />
                    <AvatarFallback>{product.seller.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                    <CardTitle className="text-lg">{product.seller.name}</CardTitle>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span>{product.seller.rating} ({product.seller.reviews} reviews)</span>
                    </div>
                </div>
            </CardHeader>
          </Card>
           <Separator />
          <div>
             <h2 className="font-headline text-2xl font-semibold mb-2">Description</h2>
             <p className="text-muted-foreground leading-relaxed">{product.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
