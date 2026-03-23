import Link from 'next/link';

interface LogoProps {
  className?: string;
}

export function Logo({ className }: LogoProps) {
  return (
    <Link
      href="/"
      aria-label="LUNA Home"
      className={`group relative inline-flex items-center${className ? ` ${className}` : ''}`}
    >
      {/* Default: white glow. Hover: pink-purple gradient */}
      <span
        className="font-headline text-3xl md:text-4xl tracking-widest select-none transition-all duration-300 text-white group-hover:text-transparent"
        style={{
          textShadow: '0 0 18px rgba(255,255,255,0.5), 0 0 40px rgba(255,255,255,0.2)',
        }}
      >
        LUNA
      </span>
      {/* Gradient overlay visible only on hover */}
      <span
        className="font-headline text-3xl md:text-4xl tracking-widest select-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: 'linear-gradient(90deg, #f472b6, #c084fc, #f472b6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          filter: 'drop-shadow(0 0 16px rgba(236,72,153,0.8))',
        }}
        aria-hidden="true"
      >
        LUNA
      </span>
    </Link>
  );
}
