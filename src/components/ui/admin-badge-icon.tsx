import React from 'react';

export const AdminBadgeIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <defs>
            <filter id="admin-badge-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
                <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                </feMerge>
            </filter>
        </defs>
        <g filter="url(#admin-badge-glow)">
            <path fillRule="evenodd" clipRule="evenodd" d="M13 2.05V5.05C15.13 5.58 16.94 6.88 18 8.65L20.59 7.25L22 9.98L19.41 11.38C19.89 12.44 19.89 13.66 19.41 14.72L22 16.12L20.59 18.85L18 17.45C16.94 19.22 15.13 20.52 13 21.05V24.05H11V21.05C8.87 20.52 7.06 19.22 6 17.45L3.41 18.85L2 16.12L4.59 14.72C4.11 13.66 4.11 12.44 4.59 11.38L2 9.98L3.41 7.25L6 8.65C7.06 6.88 8.87 5.58 11 5.05V2.05H13ZM12 14.05C13.1 14.05 14 13.15 14 12.05C14 10.95 13.1 10.05 12 10.05C10.9 10.05 10 10.95 10 12.05C10 13.15 10.9 14.05 12 14.05Z" fill="#EC4899"/>
            <path d="M15.5 9.5L11 14L8.5 11.5L9.5 10.5L11 12L14.5 8.5L15.5 9.5Z" fill="white"/>
        </g>
    </svg>
);
