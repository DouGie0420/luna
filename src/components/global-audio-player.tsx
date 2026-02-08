
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
import { Music, Play, Pause, Minimize2, Maximize2, Volume2, VolumeX, Radio } from 'lucide-react';
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
    const [isMuted, setIsMuted] = useState(false);

    useEffect(() => {
        if (config?.display_logic) {
            setIsMinimized(config.display_logic.isMinimized);
            if(config.content_source?.autoPlay) {
                setIsMuted(true);
            }
        }
    }, [config]);
    
    useEffect(() => {
        if (playerRef.current) {
            if (isMuted) {
                playerRef.current.mute();
            } else {
                playerRef.current.unMute();
                playerRef.current.setVolume(volume);
            }
        }
    }, [isMuted, volume, playerRef.current]);

    const onPlayerReady = (event: { target: YouTubePlayer }) => {
        playerRef.current = event.target;
        if (config?.content_source?.autoPlay) {
            event.target.mute();
            event.target.playVideo();
        }
    };

    const onPlayerStateChange = (event: { data: number }) => {
        // -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
        if (event.data === 1) { // Playing
            setIsPlaying(true);
        } else {
            setIsPlaying(false);
        }
    };

    const togglePlay = () => {
        if (!playerRef.current) return;
        if (isPlaying) {
            playerRef.current.pauseVideo();
        } else {
            // Unmute on first manual play
            if(isMuted) setIsMuted(false);
            playerRef.current.playVideo();
        }
        setIsPlaying(!isPlaying);
    };

    const handleVolumeChange = (value: number[]) => {
        const newVolume = value[0];
        setVolume(newVolume);
        if (playerRef.current) {
            playerRef.current.setVolume(newVolume);
            if(newVolume > 0 && isMuted) {
                setIsMuted(false);
            }
        }
    };

    const toggleMute = () => {
        setIsMuted(!isMuted);
    }
    

    if (loading || !config?.display_logic?.isVisible || (isMobile && !config?.display_logic?.enableOnMobile)) {
        return null;
    }

    const { position, theme, primaryColor, secondaryColor, opacity, blur, showLiveBadge } = config.ui_customization;
    const { stationName, channelIcon } = config.metadata;
    
    const containerStyle: React.CSSProperties = {
        '--player-primary': primaryColor || 'hsl(var(--primary))',
        '--player-secondary': secondaryColor || 'hsl(var(--secondary))',
        position: 'fixed',
        zIndex: 100,
        ...position === 'bottom-left' ? { bottom: '2rem', left: '2rem' } : {},
    };

    return (
        <div style={containerStyle}>
            {isMinimized ? (
                <Button 
                    size="icon" 
                    className="h-16 w-16 rounded-full border-2 animate-pulse"
                    style={{ borderColor: 'var(--player-primary)', backgroundColor: `hsla(var(--background), ${opacity})`, backdropFilter: `blur(${blur})` }}
                    onClick={() => setIsMinimized(false)}
                >
                    <Music className="h-8 w-8" style={{ color: 'var(--player-primary)' }} />
                </Button>
            ) : (
                <Card className="w-80 rounded-lg border-2" style={{ borderColor: 'var(--player-primary)', backgroundColor: `hsla(var(--background), ${opacity})`, backdropFilter: `blur(${blur})` }}>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {channelIcon ? <img src={channelIcon} alt={stationName} className="h-10 w-10 rounded-md object-cover" /> : <Radio className="h-8 w-8 text-muted-foreground" />}
                                <div>
                                    <p className="font-semibold">{stationName}</p>
                                    {showLiveBadge && <div className="flex items-center gap-1.5 text-xs text-red-500 font-bold"><div className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></div>LIVE</div>}
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsMinimized(true)}>
                                <Minimize2 className="h-4 w-4"/>
                            </Button>
                        </div>

                        <div className="mt-4 flex items-center gap-4">
                             <Button variant="ghost" size="icon" onClick={togglePlay}>
                                {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                            </Button>
                            <div className="flex-1 flex items-center gap-2">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={toggleMute}>
                                    {isMuted || volume === 0 ? <VolumeX className="h-4 w-4"/> : <Volume2 className="h-4 w-4"/>}
                                </Button>
                                <Slider 
                                    defaultValue={[volume]} 
                                    max={100} 
                                    step={1} 
                                    onValueChange={handleVolumeChange}
                                    className="[&>span]:h-1 [&>span>span]:h-1 [&>span>span]:bg-[var(--player-secondary)] [&>div]:h-3 [&>div]:w-3 [&>div]:border-[var(--player-primary)]"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="absolute -z-10">
                <YouTube
                    videoId={config.content_source.videoId}
                    opts={{ height: '0', width: '0', playerVars: { autoplay: config.content_source.autoPlay ? 1 : 0, controls: 0 } }}
                    onReady={onPlayerReady}
                    onStateChange={onPlayerStateChange}
                />
            </div>
        </div>
    );
}
