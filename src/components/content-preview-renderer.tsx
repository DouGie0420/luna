'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { X, Youtube, Film } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

export const ContentPreviewRenderer = ({ content, onRemove }: { content: string; onRemove: (line: string) => void }) => {
    
    const renderableContent = useMemo(() => {
        if (!content) return [];
        return content.split('\n').map((line, index) => {
            const trimmedLine = line.trim();

            if (trimmedLine === '') {
                return <div key={index} className="h-4" />;
            }

            const imageMatch = trimmedLine.match(/^!\[(.*?)\]\((.+?)\)$/);
            if (imageMatch) {
                const [, alt, src] = imageMatch;
                return (
                    <div key={index} className="relative group my-2 max-w-[400px] mx-auto">
                        <Dialog>
                            <DialogTrigger asChild>
                                <div className="relative aspect-video w-full cursor-pointer overflow-hidden rounded-lg border hover:border-primary transition-all">
                                    <Image src={src} alt={alt || 'Embedded Image'} layout="fill" className="object-contain" />
                                </div>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl h-[80vh] p-0 bg-transparent border-0">
                               <Image src={src} alt={alt || 'Embedded Image'} layout="fill" className="object-contain" />
                            </DialogContent>
                        </Dialog>
                        <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={() => onRemove(line)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                );
            }

            const youtubeMatch = trimmedLine.match(/^\[youtube\]\((.+?)\)$/);
            if (youtubeMatch) {
                const [, src] = youtubeMatch;
                return (
                    <div key={index} className="relative group my-2 max-w-lg mx-auto">
                        <div className="aspect-video w-full overflow-hidden rounded-lg border">
                            <iframe width="100%" height="100%" src={src} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen></iframe>
                        </div>
                        <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={() => onRemove(line)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                );
            }
            
            const tiktokMatch = trimmedLine.match(/^\[tiktok\]\((.+?)\)$/);
            if (tiktokMatch) {
                return (
                    <div key={index} className="relative group my-2 mx-auto max-w-[325px]">
                        <div className="aspect-[9/16] flex flex-col items-center justify-center bg-secondary rounded-md p-2">
                            <Film className="h-8 w-8" />
                            <p className="mt-2 text-xs text-muted-foreground text-center">TikTok Video Preview</p>
                        </div>
                        <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={() => onRemove(line)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                );
            }
            
            return <p key={index} className="min-h-[1em]">{line}</p>;
        });
    }, [content, onRemove]);

    if (!content.trim()) {
        return null;
    }

    return (
        <div className="p-4 border-t border-input bg-background/50">
            <h3 className="mb-3 text-xs font-semibold uppercase text-muted-foreground tracking-wider">Live Preview</h3>
            <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 whitespace-pre-wrap leading-relaxed space-y-2">
                {renderableContent}
            </div>
        </div>
    );
};
