'use client';

import { useState, useCallback } from 'react';
import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { Button } from './ui/button';
import { LocateFixed } from 'lucide-react';

interface LocationPickerProps {
  initialCenter: { lat: number; lng: number };
  onConfirm: (location: { lat: number; lng: number }) => void;
}

export function LocationPicker({ initialCenter, onConfirm }: LocationPickerProps) {
  const [markerPosition, setMarkerPosition] = useState(initialCenter);
  const map = useMap();

  const handleMapClick = useCallback((event: google.maps.MapMouseEvent) => {
    if (event.detail.latLng) {
      setMarkerPosition({
        lat: event.detail.latLng.lat,
        lng: event.detail.latLng.lng,
      });
    }
  }, []);

  const handleMarkerDragEnd = useCallback((event: google.maps.MapMouseEvent) => {
     if (event.detail.latLng) {
      setMarkerPosition({
        lat: event.detail.latLng.lat,
        lng: event.detail.latLng.lng,
      });
    }
  }, []);

  const handleRecenter = useCallback(() => {
    if (map) {
      map.panTo(initialCenter);
      setMarkerPosition(initialCenter);
    }
  }, [map, initialCenter]);

  return (
    <div className="flex flex-col gap-4 h-[60vh] md:h-[70vh]">
      <div className="relative flex-grow rounded-md overflow-hidden">
        <Map
          defaultCenter={initialCenter}
          defaultZoom={15}
          gestureHandling={'greedy'}
          disableDefaultUI={true}
          mapId="location_picker_map"
          onClick={handleMapClick}
        >
          <AdvancedMarker
            position={markerPosition}
            draggable={true}
            onDragEnd={handleMarkerDragEnd}
          />
        </Map>
        <Button 
          type="button" 
          size="icon" 
          className="absolute top-3 right-3" 
          onClick={handleRecenter}
          title="Recenter to your location"
        >
          <LocateFixed className="h-4 w-4" />
        </Button>
      </div>
      <Button onClick={() => onConfirm(markerPosition)}>Confirm Location</Button>
    </div>
  );
}
