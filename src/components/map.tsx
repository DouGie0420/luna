'use client';

import { Map, AdvancedMarker } from '@vis.gl/react-google-maps';

interface MapComponentProps {
  center: {
    lat: number;
    lng: number;
  };
  marker?: {
    lat: number;
    lng: number;
  };
  zoom?: number;
  className?: string;
}

export function MapComponent({ center, marker, zoom = 12, className = 'h-64 w-full rounded-lg' }: MapComponentProps) {
  return (
    <div className={className}>
      <Map
        defaultCenter={center}
        defaultZoom={zoom}
        gestureHandling={'greedy'}
        disableDefaultUI={true}
        mapId="cyberpunk_map"
      >
        {marker && <AdvancedMarker position={marker} />}
      </Map>
    </div>
  );
}
