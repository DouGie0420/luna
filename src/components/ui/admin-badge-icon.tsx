import React from 'react';

export const AdminBadgeIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <defs>
            <filter id="admin-badge-glow" x="-0.5" y="-0.5" width="2" height="2">
                <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
        </defs>
        <g filter="url(#admin-badge-glow)">
            <rect x="4" y="4" width="16" height="16" rx="2" fill="#EC4899"/>
            <path d="M16.5 8.5L10.5 14.5L7.5 11.5L8.5 10.5L10.5 12.5L15.5 7.5L16.5 8.5Z" fill="white"/>
        </g>
    </svg>
);
