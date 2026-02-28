'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Map, Marker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MapPin, CheckCircle2 } from 'lucide-react';

interface LocationData {
  lat: number;
  lng: number;
  address: string;
  city: string;
  country: string;
}

interface LocationPickerProps {
  initialCenter: { lat: number; lng: number };
  onConfirm: (location: LocationData) => void;
}

export function LocationPicker({ initialCenter, onConfirm }: LocationPickerProps) {
  const map = useMap();
  const placesLib = useMapsLibrary('places');
  const geocodingLib = useMapsLibrary('geocoding'); // 引入逆地址解析
  
  const [markerPos, setMarkerPos] = useState(initialCenter);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  
  const inputRef = useRef<HTMLInputElement>(null);
  const [placeAutocomplete, setPlaceAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [geocoder, setGeocoder] = useState<google.maps.Geocoder | null>(null);

  // 初始化搜索补全
  useEffect(() => {
    if (!placesLib || !inputRef.current) return;
    const options = { fields: ['geometry', 'name', 'formatted_address', 'address_components'] };
    const autocomplete = new placesLib.Autocomplete(inputRef.current, options);
    setPlaceAutocomplete(autocomplete);
  }, [placesLib]);

  // 初始化地理编码器 (用于点击地图时解析地址)
  useEffect(() => {
    if (!geocodingLib) return;
    setGeocoder(new geocodingLib.Geocoder());
  }, [geocodingLib]);

  const extractCityCountry = (components?: google.maps.GeocoderAddressComponent[]) => {
    let extractedCity = '';
    let extractedCountry = '';
    components?.forEach(comp => {
      if (comp.types.includes('locality') || comp.types.includes('administrative_area_level_1')) {
        extractedCity = extractedCity || comp.long_name;
      }
      if (comp.types.includes('country')) {
        extractedCountry = comp.long_name;
      }
    });
    setCity(extractedCity);
    setCountry(extractedCountry);
  };

  // 监听搜索选择
  useEffect(() => {
    if (!placeAutocomplete) return;
    placeAutocomplete.addListener('place_changed', () => {
      const place = placeAutocomplete.getPlace();
      if (place.geometry?.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        setMarkerPos({ lat, lng });
        map?.panTo({ lat, lng });
        map?.setZoom(16);
        setAddress(place.formatted_address || place.name || '');
        extractCityCountry(place.address_components);
      }
    });
  }, [placeAutocomplete, map]);

  // 监听地图任意点击
  const handleMapClick = (e: any) => {
    if(e.detail.latLng) {
       const lat = e.detail.latLng.lat;
       const lng = e.detail.latLng.lng;
       setMarkerPos({ lat, lng });
       map?.panTo({ lat, lng });
       
       if(geocoder) {
          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
             if (status === 'OK' && results && results[0]) {
                setAddress(results[0].formatted_address);
                extractCityCountry(results[0].address_components);
             } else {
                setAddress('Custom Map Location');
             }
          });
       }
    }
  };

  const handleConfirm = () => {
    onConfirm({
      lat: markerPos.lat,
      lng: markerPos.lng,
      address: address || 'Selected Location',
      city: city || 'Unknown City',
      country: country || 'Unknown Country'
    });
  };

  // 赛博朋克暗黑地图皮肤
  const darkMapStyle = [
    { elementType: "geometry", stylers: [{ color: "#212121" }] },
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
    { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#2c2c2c" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] }
  ];

  return (
    <div className="relative w-full h-full flex flex-col bg-[#0A0A0C]">
      
      {/* 🚀 核心修复区：强制赋予下拉菜单点击权限，并注入高级赛博UI样式 */}
      <style dangerouslySetInnerHTML={{__html: `
        .pac-container {
            /* 致命 Bug 修复：打破 Dialog 的事件拦截，允许鼠标点击！ */
            pointer-events: auto !important; 
            z-index: 999999 !important; 
            background-color: #0A0A0C !important;
            border: 1px solid rgba(0, 255, 255, 0.3) !important;
            border-radius: 12px !important;
            box-shadow: 0 20px 50px rgba(0,0,0,0.9), 0 0 20px rgba(0, 255, 255, 0.1) !important;
            margin-top: 8px !important;
            padding: 8px !important;
            font-family: inherit !important;
        }
        .pac-item {
            border-top: none !important;
            border-bottom: 1px solid rgba(255,255,255,0.05) !important;
            padding: 14px 16px !important;
            color: rgba(255,255,255,0.5) !important;
            cursor: pointer !important;
            border-radius: 8px !important;
            transition: all 0.2s ease !important;
        }
        .pac-item:hover, .pac-item.pac-item-selected { 
            background-color: rgba(0, 255, 255, 0.1) !important; 
        }
        .pac-item-query { 
            color: #ffffff !important; 
            font-size: 15px !important; 
            font-weight: 800 !important; 
            margin-right: 6px !important; 
        }
        .pac-matched { color: #00ffff !important; }
        .pac-icon { display: none !important; }
        .pac-item:last-child { border-bottom: none !important; }
      `}} />

      {/* 核心地图层 */}
      <Map 
        defaultZoom={13} 
        defaultCenter={initialCenter} 
        styles={darkMapStyle}
        disableDefaultUI={true} 
        onClick={handleMapClick}
        className="w-full h-full"
      >
        <Marker position={markerPos} />
      </Map>
      
      {/* 顶层悬浮搜索框 */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[90%] max-w-lg z-10">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400" size={20} />
          <Input 
            ref={inputRef}
            type="text" 
            placeholder="搜索街道、建筑或地标..." 
            className="w-full h-14 pl-12 pr-4 rounded-[1.2rem] bg-[#0A0A0C]/90 backdrop-blur-xl border border-cyan-400/30 text-white font-bold placeholder:text-white/40 shadow-[0_10px_40px_rgba(0,0,0,0.8)] focus:border-cyan-400 transition-all"
          />
        </div>
      </div>

      {/* 底层悬浮操作确认面板 */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-lg z-10">
         <div className="bg-[#0A0A0C]/95 backdrop-blur-xl border border-white/10 p-5 rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.9)] flex flex-col gap-5">
            <div className="flex items-center gap-4">
               <div className="h-12 w-12 shrink-0 rounded-full bg-cyan-400/10 flex items-center justify-center border border-cyan-400/30">
                  <MapPin size={24} className="text-cyan-400" />
               </div>
               <div className="flex-1 overflow-hidden">
                  <p className="text-sm font-bold text-white truncate">{address || '请在上方搜索或在地图上点击取点'}</p>
                  <p className="text-xs text-white/40 font-mono mt-1">
                     {markerPos.lat.toFixed(6)}, {markerPos.lng.toFixed(6)}
                  </p>
               </div>
            </div>
            <Button 
              onClick={handleConfirm}
              className="w-full h-14 bg-cyan-400 hover:bg-cyan-300 text-black font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(0,255,255,0.2)] hover:shadow-[0_0_30px_rgba(0,255,255,0.4)]"
            >
              <CheckCircle2 size={20} className="mr-2" /> 确认发货定位
            </Button>
         </div>
      </div>
    </div>
  );
}