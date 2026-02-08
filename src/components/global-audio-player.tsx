'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import YouTube from 'react-youtube';
import type { YouTubePlayer } from 'react-youtube';
import { useFirestore, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { GlobalAudioPlayerConfig } from '@/lib/types';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Music, Play, Pause, X, Volume2, VolumeX, Radio } from 'lucide-react';
import { Slider } from './ui/slider';

export function GlobalAudioPlayer() {
    const firestore = useFirestore();
    const configRef = useMemo(() => firestore ? doc(firestore, 'configs', 'global_audio_player') : null, [firestore]);
    const { data: config, loading } = useDoc<GlobalAudioPlayerConfig>(configRef);

    const playerRef = useRef<YouTubePlayer | null>(null);
    const isMobile = useIsMobile();

    const [isMinimized, setIsMinimized] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(50);
    const [isMuted, setIsMuted] = useState(true); // Start muted for autoplay

    useEffect(() => {
        if (config?.display_logic) {
            setIsMinimized(config.display_logic.isMinimized);
            if (config.content_source?.autoPlay) {
                setIsMuted(true);
            }
        }
    }, [config?.display_logic?.isMinimized, config?.content_source?.autoPlay]);
    
    useEffect(() => {
        if (playerRef.current) {
            if (isMuted) {
                playerRef.current.mute();
            } else {
                playerRef.current.unMute();
                playerRef.current.setVolume(volume);
            }
        }
    }, [isMuted, volume]);

    const onPlayerReady = (event: { target: YouTubePlayer }) => {
        playerRef.current = event.target;
        if (config?.content_source?.autoPlay) {
            event.target.mute();
            event.target.playVideo();
        }
    };

    const onPlayerStateChange = (event: { data: number }) => {
        if (event.data === 1) setIsPlaying(true);
        else setIsPlaying(false);
    };

    const togglePlay = () => {
        if (!playerRef.current) return;
        if (isPlaying) {
            playerRef.current.pauseVideo();
        } else {
            if (isMuted) setIsMuted(false); // Unmute on first manual play
            playerRef.current.playVideo();
        }
        setIsPlaying(!isPlaying);
    };

    const handleVolumeChange = (value: number[]) => {
        const newVolume = value[0];
        setVolume(newVolume);
        if (playerRef.current) {
            playerRef.current.setVolume(newVolume);
            if (newVolume > 0 && isMuted) {
                setIsMuted(false);
            }
        }
    };

    const toggleMute = () => {
        setIsMuted(!isMuted);
    };

    if (loading || !config?.display_logic?.isVisible || (isMobile && !config?.display_logic?.enableOnMobile)) {
        return null;
    }

    const { position, primaryColor, secondaryColor, opacity, blur, showLiveBadge } = config.ui_customization;
    const { stationName, channelIcon } = config.metadata;
    const { videoId, autoPlay } = config.content_source;

    const youtubeOpts = {
      height: '0', width: '0',
      playerVars: { 
        autoplay: autoPlay ? 1 : 0, 
        controls: 0,
        mute: 1, // Always start muted to comply with browser policies
      },
    };

    return (
      <div 
        className={cn(
          'fixed z-[9999] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] shadow-2xl',
          'bottom-6 left-6', // Hardcoded to bottom-left to fix overlap issue
          isMinimized ? 'w-12 h-12 rounded-full' : 'w-72 h-auto rounded-2xl'
        )}
        style={{
          backgroundColor: `${primaryColor}1a`,
          borderColor: primaryColor,
          borderWidth: '1px',
          backdropFilter: `blur(${blur})`,
          opacity: opacity,
          borderStyle: 'solid',
        }}
      >
        <div className="hidden">
          <YouTube 
            videoId={videoId} 
            opts={youtubeOpts} 
            onReady={onPlayerReady}
            onStateChange={onPlayerStateChange}
          />
        </div>

        {isMinimized ? (
          <button 
            onClick={() => setIsMinimized(false)}
            className="w-full h-full flex items-center justify-center text-xl animate-spin-slow"
          >
            💿
          </button>
        ) : (
          <div className="flex flex-col h-full relative group p-3">
            <div className="flex h-full items-center">
              <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/10 shrink-0">
                <img 
                  src={channelIcon || '/default-icon.png'} 
                  className="object-cover w-full h-full" 
                  alt="Station" 
                />
                {showLiveBadge && (
                  <div className="absolute top-1 left-1 px-1 bg-red-600 text-[8px] text-white font-bold rounded animate-pulse">LIVE</div>
                )}
              </div>

              <div className="ml-4 flex-1 overflow-hidden">
                <h4 className="text-white text-xs font-bold truncate tracking-widest uppercase" style={{ color: secondaryColor }}>
                  {stationName || 'Zaliens Radio'}
                </h4>
                <div className="flex items-end space-x-0.5 h-4 mt-2">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="w-1 bg-current animate-wave" style={{ color: primaryColor, animationDelay: `${i * 0.15}s`, height: isPlaying ? '100%' : '20%' }} />
                  ))}
                </div>
              </div>

              <button 
                onClick={() => setIsMinimized(true)} 
                className="absolute -top-1 -right-1 text-white/40 hover:text-white text-lg px-1"
              >
                <X className="h-4 w-4"/>
              </button>
            </div>
            
            <div className="mt-4 flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-white" onClick={togglePlay}>
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>
                <div className="flex-1 flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-white" onClick={toggleMute}>
                        {isMuted || volume === 0 ? <VolumeX className="h-4 w-4"/> : <Volume2 className="h-4 w-4"/>}
                    </Button>
                    <Slider 
                        defaultValue={[volume]} 
                        max={100} 
                        step={1} 
                        onValueChange={handleVolumeChange}
                    />
                </div>
            </div>
          </div>
        )}

        <style jsx>{`
          @keyframes wave {
            0%, 100% { transform: scaleY(0.3); }
            50% { transform: scaleY(1); }
          }
          .animate-wave { animation: wave 1.2s infinite ease-in-out; transform-origin: bottom; }
          .animate-spin-slow { animation: spin 6s linear infinite; }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
}
