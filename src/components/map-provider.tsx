'use client';

import { APIProvider } from '@vis.gl/react-google-maps';
import React from 'react';

export function MapProvider({ children }: { children: React.ReactNode }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    if (process.env.NODE_ENV === 'development') {
      console.error("Google Maps API key is missing. Please set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your .env file.");
    }
    return <div className='p-4 text-center text-destructive bg-destructive/10 border border-destructive rounded-md'>Google Maps cannot be loaded. API key is missing.</div>;
  }

  return <APIProvider apiKey={apiKey} libraries={['places']}>{children}</APIProvider>;
}
