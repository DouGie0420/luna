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
            <div className="bg-orange-100 p-4 rounded-lg border border-orange-200 flex items-center">
                <div>
                    <h3 className="font-bold text-orange-900">闲鱼抄底好物</h3>
                    <p className="text-sm text-orange-800">超绝性价比</p>
                </div>
                <Image src="https://picsum.photos/seed/promo1/80/80" alt="promo1" width={50} height={50} className="rounded-full ml-auto" data-ai-hint="abstract illustration" />
            </div>
             <div className="bg-blue-100 p-4 rounded-lg border border-blue-200 flex items-center">
                 <div>
                    <h3 className="font-bold text-blue-900">衣橱捡漏</h3>
                    <p className="text-sm text-blue-800">时尚美衣低价淘</p>
                 </div>
                 <Image src="https://picsum.photos/seed/promo2/80/80" alt="promo2" width={50} height={50} className="rounded-full ml-auto" data-ai-hint="fashion clothes" />
            </div>
             <div className="bg-green-100 p-4 rounded-lg border border-green-200 flex items-center">
                 <div>
                    <h3 className="font-bold text-green-900">手机数码</h3>
                    <p className="text-sm text-green-800">热门装备</p>
                 </div>
                 <Image src="https://picsum.photos/seed/promo3/80/80" alt="promo3" width={50} height={50} className="rounded-full ml-auto" data-ai-hint="gadgets" />
            </div>
             <div className="bg-purple-100 p-4 rounded-lg border border-purple-200 flex items-center">
                 <div>
                    <h3 className="font-bold text-purple-900">省钱卡券</h3>
                    <p className="text-sm text-purple-800">超值优惠</p>
                 </div>
                 <Image src="https://picsum.photos/seed/promo4/80/80" alt="promo4" width={50} height={50} className="rounded-full ml-auto" data-ai-hint="coupon ticket" />
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
