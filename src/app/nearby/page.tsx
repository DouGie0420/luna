'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Product } from '@/lib/types';
import { Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { PageHeaderWithBackAndClose } from '@/components/page-header-with-back-and-close';
import { Loader2, LocateFixed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { haversineDistance } from '@/lib/utils';
import { ProductCard } from '@/components/product-card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

export default function NearbyPage() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [radius, setRadius] = useState(50); // default 50km
  const [loadingLocation, setLoadingLocation] = useState(true);

  const firestore = useFirestore();
  const productsQuery = useMemo(() => firestore ? query(collection(firestore, 'products'), where('status', '==', 'active')) : null, [firestore]);
  const { data: allProducts, loading: loadingProducts } = useCollection<Product>(productsQuery);

  const getLocation = () => {
    setLoadingLocation(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      position => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLoadingLocation(false);
      },
      error => {
        setLocationError("Unable to retrieve your location. Please enable location services in your browser.");
        setLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    getLocation();
  }, []);

  const nearbyProducts = useMemo(() => {
    if (!location || !allProducts) return [];
    return allProducts
      .map(product => ({
        ...product,
        distance: haversineDistance(location.lat, location.lng, product.location.lat, product.location.lng),
      }))
      .filter(product => product.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
  }, [location, allProducts, radius]);

  const mapCenter = location || { lat: 13.7563, lng: 100.5018 }; // Default to Bangkok

  return (
    <>
      <PageHeaderWithBackAndClose />
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-headline mb-4">Nearby Treasures</h1>
        <p className="text-muted-foreground mb-8">Discover items for sale around you.</p>

        <div className="mb-8 p-4 border rounded-lg bg-card/50 flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1">
                <Label htmlFor="radius-slider" className="mb-2 block">Search Radius: {radius} km</Label>
                <Slider
                    id="radius-slider"
                    defaultValue={[50]}
                    max={500}
                    step={10}
                    onValueChange={(value) => setRadius(value[0])}
                />
            </div>
            <Button onClick={getLocation} disabled={loadingLocation} variant="outline">
                {loadingLocation ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : <LocateFixed className="h-4 w-4 mr-2" />}
                Refresh My Location
            </Button>
        </div>

        {locationError && <p className="text-destructive mb-4">{locationError}</p>}
        
        <div className="h-[500px] w-full rounded-lg overflow-hidden mb-12 border">
          <Map
            center={mapCenter}
            zoom={10}
            gestureHandling={'greedy'}
            disableDefaultUI={true}
            mapId="cyberpunk_map_nearby"
          >
            {location && (
              <AdvancedMarker position={location}>
                <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white animate-pulse" />
              </AdvancedMarker>
            )}
            {nearbyProducts.map(product => (
              <AdvancedMarker key={product.id} position={product.location}>
                <Pin background={'hsl(var(--primary))'} borderColor={'hsl(var(--primary-foreground))'} glyphColor={'hsl(var(--primary-foreground))'} />
              </AdvancedMarker>
            ))}
          </Map>
        </div>

        {loadingProducts ? (
            <div className="text-center py-10">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                <p className="mt-4 text-muted-foreground">Loading products...</p>
            </div>
        ) : nearbyProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                {nearbyProducts.map(product => <ProductCard key={product.id} product={product} />)}
            </div>
        ) : (
             <p className="text-center py-10 text-muted-foreground">No items found within the selected radius. Try expanding your search area.</p>
        )}
      </div>
    </>
  );
}
