'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Map, Marker, useMap } from '@vis.gl/react-google-maps';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { LocateFixed, Search, Loader2, MapPin, Target } from 'lucide-react';

// 定义赛博朋克暗色地图样式
const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#212121" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#2c2c2c" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] }
];

export function LocationPicker({ initialCenter, onConfirm }: any) {
  const [markerPosition, setMarkerPosition] = useState(initialCenter);
  const [addressInfo, setAddressInfo] = useState({ city: '', country: '', fullAddress: '' });
  const [isResolving, setIsResolving] = useState(false);
  const map = useMap();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);

  useEffect(() => {
    if (!searchInputRef.current || !map) return;
    if (!geocoderRef.current) geocoderRef.current = new google.maps.Geocoder();
    if (!autocompleteRef.current) {
      autocompleteRef.current = new google.maps.places.Autocomplete(searchInputRef.current, {
        fields: ["geometry.location", "address_components", "formatted_address"],
      });
    }
    autocompleteRef.current.bindTo("bounds", map);
    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace();
      if (place?.geometry?.location) {
        const newPos = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
        map.panTo(newPos);
        setMarkerPosition(newPos);
        parseAddressComponents(place.address_components || [], place.formatted_address || '');
      }
    });
  }, [map]);

  const reverseGeocode = useCallback((latLng: any) => {
    if (!geocoderRef.current) return;
    setIsResolving(true);
    geocoderRef.current.geocode({ location: latLng }, (results: any, status: any) => {
      if (status === "OK" && results?.[0]) {
        parseAddressComponents(results[0].address_components, results[0].formatted_address);
      }
      setIsResolving(false);
    });
  }, []);

  const parseAddressComponents = (components: any[], fullAddress: string) => {
    let city = ''; let country = '';
    components.forEach(c => {
      if (c.types.includes('locality') || c.types.includes('administrative_area_level_1')) city = c.long_name;
      if (c.types.includes('country')) country = c.short_name;
    });
    setAddressInfo({ city, country, fullAddress });
  };

  const handleRecenter = () => {
    if (map) {
      map.panTo(initialCenter);
      setMarkerPosition(initialCenter);
      reverseGeocode(initialCenter);
    }
  };

  return (
    <div className="flex flex-col gap-3 h-full w-full relative">
      <style dangerouslySetInnerHTML={{__html: `.pac-container { z-index: 9999 !important; background-color: #0C0C0E !important; border: 1px solid rgba(255,255,255,0.1); } .pac-item { color: white !important; }`}} />
      <div className="relative shrink-0">
        <Target className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#D33A89] animate-pulse" />
        <Input ref={searchInputRef} placeholder="ENTER PROTOCOL COORDINATES..." className="w-full pl-10 bg-black/50 border-[#D33A89]/30 text-white h-11 uppercase font-mono text-xs tracking-tighter" />
      </div>
      <div className="relative flex-grow rounded-xl overflow-hidden border border-white/5">
        <Map defaultCenter={initialCenter} defaultZoom={15} mapId="location_map" styles={darkMapStyle} disableDefaultUI={true}>
          <Marker position={markerPosition} draggable={true} onDragEnd={(e:any) => {
            const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
            setMarkerPosition(newPos); reverseGeocode(newPos);
          }} />
        </Map>
        <div className="absolute bottom-3 left-3 right-3 bg-black/90 border border-[#D33A89]/20 p-3 rounded-xl flex items-center gap-3 backdrop-blur-md">
          <MapPin className="text-[#D33A89] w-4 h-4" />
          <div className="flex-1 truncate">
            <p className="text-white font-bold text-xs truncate">{addressInfo.city || 'Locating...'}</p>
            <p className="text-[10px] text-white/40 truncate font-mono uppercase">{addressInfo.fullAddress}</p>
          </div>
        </div>
      </div>
      <Button onClick={() => onConfirm({ ...markerPosition, ...addressInfo, address: addressInfo.fullAddress })} className="h-12 w-full bg-[#D33A89] hover:bg-[#ff4ab0] text-black font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-[0_0_20px_rgba(211,58,137,0.4)]">
        Sync Coordinates
      </Button>
    </div>
  );
}