'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { LocateFixed, Search } from 'lucide-react';

interface LocationPickerProps {
  initialCenter: { lat: number; lng: number };
  onConfirm: (location: { lat: number; lng: number }) => void;
}

export function LocationPicker({ initialCenter, onConfirm }: LocationPickerProps) {
  const [markerPosition, setMarkerPosition] = useState(initialCenter);
  const map = useMap();
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!searchInputRef.current || !map) return;

    if (!autocompleteRef.current) {
      autocompleteRef.current = new google.maps.places.Autocomplete(searchInputRef.current, {
        fields: ["geometry.location", "name"],
      });
    }

    autocompleteRef.current.bindTo("bounds", map);

    const listener = autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace();
      if (place?.geometry?.location) {
        map.panTo(place.geometry.location);
        map.setZoom(17);
        setMarkerPosition({
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        });
      }
    });

    return () => google.maps.event.removeListener(listener);
  }, [map]);


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
      map.setZoom(15);
      setMarkerPosition(initialCenter);
    }
  }, [map, initialCenter]);

  return (
    <div className="flex flex-col gap-4 h-[60vh] md:h-[70vh]">
       <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
              ref={searchInputRef}
              placeholder="搜索地点，例如您的小区..."
              className="w-full pl-10"
          />
      </div>
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
