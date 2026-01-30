export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: 'THB' | 'USDT' | 'RMB';
  images: string[];
  imageHints: string[];
  seller: User;
  location: {
    city: string;
    country: string;
    lat: number;
    lng: number;
  };
  category: string;
};

export type User = {
  id: string;
  name: string;
  avatarUrl: string;
  rating: number;
  reviews: number;
};
