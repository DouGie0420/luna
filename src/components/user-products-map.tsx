'use client';

import { Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import type { Product } from '@/lib/types';
import { useEffect, useRef } from 'react';

interface UserProductsMapProps {
  products: Product[];
  className?: string;
}

export function UserProductsMap({ products, className = 'h-96 w-full rounded-lg' }: UserProductsMapProps) {
  const mapRef = useRef(null);
  const productsWithLocation = products.filter(p => p.location && p.location.lat && p.location.lng);

  useEffect(() => {
    // This is a placeholder for potential map instance interactions
    // For now, we don't need to do anything here, but the ref is ready.
  }, [mapRef, productsWithLocation]);

  if (productsWithLocation.length === 0) {
    return <div className="text-center py-10 text-muted-foreground">User has no products with location data.</div>;
  }

  // Calculate bounds to fit all markers
  const bounds = new google.maps.LatLngBounds();
  productsWithLocation.forEach(product => {
    bounds.extend(new google.maps.LatLng(product.location.lat, product.location.lng));
  });

  return (
    <div className={className}>
      <Map
        ref={mapRef}
        defaultBounds={bounds}
        gestureHandling={'greedy'}
        disableDefaultUI={true}
        mapId="cyberpunk_map"
        className="h-full w-full"
      >
        {productsWithLocation.map(product => (
          <AdvancedMarker key={product.id} position={product.location}>
            <Pin background={'hsl(var(--primary))'} borderColor={'hsl(var(--primary-foreground))'} glyphColor={'hsl(var(--primary-foreground))'} />
          </AdvancedMarker>
        ))}
      </Map>
    </div>
  );
}
