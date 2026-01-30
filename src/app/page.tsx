import { ProductCard } from '@/components/product-card';
import { getProducts } from '@/lib/data';
import {
  Smartphone,
  Watch,
  Shirt,
  Baby,
  Home,
  Book,
  Car,
  HardHat,
  Apple,
  Gem,
  MoreHorizontal,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default async function HomePage() {
  const products = await getProducts();
  const categories = [
    { name: '手机 / 数码 / 电脑', icon: Smartphone },
    { name: '服饰 / 箱包 / 运动', icon: Shirt },
    { name: '技能 / 卡券 / 潮玩', icon: Watch },
    { name: '母婴 / 美妆 / 个护', icon: Baby },
    { name: '家具 / 家电 / 家装', icon: Home },
    { name: '文玩 / 珠宝 / 礼品', icon: Gem },
    { name: '食品 / 宠物 / 花卉', icon: Apple },
    { name: '图书 / 游戏 / 音像', icon: Book },
    { name: '汽车 / 电动车 / 租房', icon: Car },
    { name: '五金 / 设备 / 农牧', icon: HardHat },
    { name: '更多', icon: MoreHorizontal },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-12 gap-8">
        <aside className="col-span-2 hidden md:block">
          <div className="p-4 rounded-lg bg-card border h-full">
            <ul className="space-y-4">
              {categories.map((cat) => (
                <li key={cat.name}>
                  <Link
                    href="#"
                    className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                  >
                    <cat.icon className="h-5 w-5 text-muted-foreground" />
                    <span>{cat.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
        <main className="col-span-12 md:col-span-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-primary/10 p-4 rounded-lg border border-primary/30 flex items-center">
                <div>
                    <h3 className="font-bold text-primary-foreground">闲鱼抄底好物</h3>
                    <p className="text-sm text-primary-foreground/80">超绝性价比</p>
                </div>
                <Image src="https://images.unsplash.com/photo-1603356033288-23b25e4d35fc?w=80&h=80&fit=crop" alt="promo1" width={50} height={50} className="rounded-full ml-auto" data-ai-hint="neon city" />
            </div>
             <div className="bg-secondary/10 p-4 rounded-lg border border-secondary/30 flex items-center">
                 <div>
                    <h3 className="font-bold text-foreground">衣橱捡漏</h3>
                    <p className="text-sm text-muted-foreground">时尚美衣低价淘</p>
                 </div>
                 <Image src="https://images.unsplash.com/photo-1635338101435-87175a59a4c5?w=80&h=80&fit=crop" alt="promo2" width={50} height={50} className="rounded-full ml-auto" data-ai-hint="cyberpunk glasses" />
            </div>
             <div className="bg-accent/10 p-4 rounded-lg border border-accent/30 flex items-center">
                 <div>
                    <h3 className="font-bold text-accent-foreground">手机数码</h3>
                    <p className="text-sm text-accent-foreground/80">热门装备</p>
                 </div>
                 <Image src="https://images.unsplash.com/photo-1618366712122-5134d115814e?w=80&h=80&fit=crop" alt="promo3" width={50} height={50} className="rounded-full ml-auto" data-ai-hint="cyberpunk headphones" />
            </div>
             <div className="bg-primary/10 p-4 rounded-lg border border-primary/30 flex items-center">
                 <div>
                    <h3 className="font-bold text-primary-foreground">省钱卡券</h3>
                    <p className="text-sm text-primary-foreground/80">超值优惠</p>
                 </div>
                 <Image src="https://images.unsplash.com/photo-1589879728410-b98a49c4dd74?w=80&h=80&fit=crop" alt="promo4" width={50} height={50} className="rounded-full ml-auto" data-ai-hint="neon sign" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
