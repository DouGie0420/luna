'use client';

import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { useEffect } from 'react';

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
  const map = useMap();

  // 🚀 额外逻辑：当房源切换，坐标中心点改变时，强制地图平移过去
  useEffect(() => {
    if (map && center) {
      map.panTo(center);
    }
  }, [map, center]);

  return (
    <div className={className}>
      <Map
        defaultCenter={center}
        defaultZoom={zoom}
        gestureHandling={'greedy'}
        disableDefaultUI={true}
        // ⚠️ 请确保在 Google Cloud Console 已经创建并关联了此 ID，
        // 且类型选为 "Vector"，否则 AdvancedMarker 不会显示。
        mapId="cyberpunk_map" 
      >
        {marker && (
          <AdvancedMarker position={marker}>
            {/* 你甚至可以在这里自定义标记的样式，比如一个紫色的光点 */}
            <div className="w-4 h-4 bg-primary rounded-full shadow-[0_0_15px_#ec4899] border-2 border-white" />
          </AdvancedMarker>
        )}
      </Map>
    </div>
  );
}