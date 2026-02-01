'use client';

import React from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { X, Youtube, Camera, Film } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

export const ContentPreviewRenderer = ({ content, onRemove }: { content: string; onRemove: (line: string) => void }) => {
    const lines = content ? content.split('\n') : [];

    const mediaLines = lines.filter(line => 
        line.match(/^!\[.*?\]\(.+?\)$/) || 
        line.match(/^\[youtube\]\(.+?\)$/) ||
        line.match(/^\[tiktok\]\(.+?\)$/)
    );

    if (mediaLines.length === 0) {
        return null;
    }

    return (
        <div className="p-3 border-t border-input bg-background">
            <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Media Previews</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {mediaLines.map((line, index) => {
                const imageMatch = line.match(/^!\[(.*?)\]\((.+?)\)$/);
                if (imageMatch) {
                    const [, alt, src] = imageMatch;
                    return (
                        <div key={index} className="relative group aspect-square">
                            <Dialog>
                                <DialogTrigger asChild>
                                    <div className="w-full h-full rounded-md overflow-hidden cursor-pointer bg-secondary">
                                        <Image src={src} alt={alt || 'Embedded Image'} layout="fill" className="object-cover" />
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

                const youtubeMatch = line.match(/^\[youtube\]\(.+?\)$/);
                if (youtubeMatch) {
                    return (
                        <div key={index} className="relative group aspect-square flex flex-col items-center justify-center bg-secondary rounded-md p-2">
                             <Youtube className="h-8 w-8 text-red-500" />
                             <p className="mt-2 text-xs text-muted-foreground text-center">YouTube Video</p>
                            <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={() => onRemove(line)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    );
                }

                 const tiktokMatch = line.match(/^\[tiktok\]\(.+?\)$/);
                 if (tiktokMatch) {
                     return (
                         <div key={index} className="relative group aspect-square flex flex-col items-center justify-center bg-secondary rounded-md p-2">
                             <Film className="h-8 w-8" />
                             <p className="mt-2 text-xs text-muted-foreground text-center">TikTok Video</p>
                            <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={() => onRemove(line)}>
                                <X className="h-4 w-4" />
                            </Button>
                         </div>
                     );
                 }
                
                return null;
            })}
            </div>
        </div>
    );
}
