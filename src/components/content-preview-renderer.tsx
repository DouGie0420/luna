
'use client';

import React, { useMemo } from 'react';

export const ContentPreviewRenderer = ({ content, onRemove }: { content: string; onRemove: (line: string) => void }) => {
    
    const renderableContent = useMemo(() => {
        if (!content) return [];
        return content.split('\n').map((line, index) => {
            const trimmedLine = line.trim();

            if (trimmedLine === '') {
                return <p key={index} className="h-4" />;
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
