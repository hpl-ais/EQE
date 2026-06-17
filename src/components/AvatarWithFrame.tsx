import React from 'react';
import { getLevelInfo } from '../mockData';

interface AvatarWithFrameProps {
  avatarUrl: string;
  xp: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullName?: string;
}

export default function AvatarWithFrame({ avatarUrl, xp, size = 'md', fullName }: AvatarWithFrameProps) {
  const { level, title, frameType, frameLabel } = getLevelInfo(xp);

  // Define scale sizing classes
  let avatarSizeClass = 'w-12 h-12';
  let frameSizePadding = 'p-0.5';
  let badgeSizeClass = 'text-[10px] -bottom-1 px-1.5 py-0.5';

  if (size === 'sm') {
    avatarSizeClass = 'w-8 h-8';
    frameSizePadding = 'p-0.5';
    badgeSizeClass = 'text-[8px] -bottom-1.5 px-1 py-0';
  } else if (size === 'lg') {
    avatarSizeClass = 'w-18 h-18';
    frameSizePadding = 'p-1';
    badgeSizeClass = 'text-xs -bottom-1 px-2 py-0.5';
  } else if (size === 'xl') {
    avatarSizeClass = 'w-28 h-28';
    frameSizePadding = 'p-1.5';
    badgeSizeClass = 'text-sm -bottom-1.5 px-3 py-1';
  }

  // Frame custom color and border structures inside nested elements
  const renderFrameContainer = (children: React.ReactNode) => {
    switch (frameType) {
      case 'wood':
        return (
          <div 
            className={`relative rounded-xl border-4 border-amber-800 ${frameSizePadding} bg-amber-100 shadow-[2px_2px_4px_rgba(120,53,4,0.5),-1px_-1px_1px_rgba(251,191,36,0.3)] transition-all`}
            title={`${frameLabel} - Lvl ${level}`}
          >
            {children}
            {/* Wooden corner detail accents */}
            <div className="absolute top-0 left-0 w-2 h-2 bg-amber-950 rounded-br-sm" />
            <div className="absolute top-0 right-0 w-2 h-2 bg-amber-950 rounded-bl-sm" />
            <div className="absolute bottom-0 left-0 w-2 h-2 bg-amber-950 rounded-tr-sm" />
            <div className="absolute bottom-0 right-0 w-2 h-2 bg-amber-950 rounded-tl-sm" />
          </div>
        );

      case 'bronze':
        return (
          <div 
            className={`relative rounded-2xl border-4 border-orange-700 ${frameSizePadding} bg-orange-50 shadow-[0_4px_6px_-1px_rgba(194,65,12,0.3)]`}
            title={`${frameLabel} - Lvl ${level}`}
          >
            {children}
            <div className="absolute inset-0 border border-orange-400/30 rounded-xl pointer-events-none" />
          </div>
        );

      case 'silver':
        return (
          <div 
            className={`relative rounded-full border-4 border-slate-300 ${frameSizePadding} bg-white shadow-[0_0_12px_rgba(148,163,184,0.5)] group hover:scale-105 hover:border-sky-300 transition-all duration-300 overflow-hidden`}
            title={`${frameLabel} - Lvl ${level}`}
          >
            {children}
            {/* Shimmer element */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/45 to-transparent -rotate-45 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none rounded-full" />
          </div>
        );

      case 'gold':
        return (
          <div 
            className={`relative rounded-full border-4 border-yellow-400 ${frameSizePadding} bg-yellow-50 shadow-[0_0_18px_rgba(234,179,8,0.8)] animate-pulse ring-2 ring-yellow-300 group hover:scale-105 transition-all duration-300`}
            title={`${frameLabel} - Lvl ${level}`}
          >
            {children}
            {/* Sparkly particles running around */}
            <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
            </span>
            <span className="absolute -bottom-1.5 -left-1.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-300 opacity-60"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-500"></span>
            </span>
          </div>
        );
    }
  };

  // Specific color matching for badges
  const getBadgeColor = () => {
    switch (frameType) {
      case 'wood': return 'bg-amber-800 text-amber-50';
      case 'bronze': return 'bg-orange-700 text-orange-50';
      case 'silver': return 'bg-slate-500 text-white';
      case 'gold': return 'bg-yellow-500 text-yellow-950 font-bold border border-yellow-300 animate-bounce';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative avatar-frame-container">
        {renderFrameContainer(
          <div className={`${avatarSizeClass} rounded-full overflow-hidden bg-slate-100 border border-slate-200/50`}>
            <img 
              src={avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${fullName || 'eduquest'}`} 
              alt={fullName || 'User Avatar'} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        )}
        <span className={`absolute left-1/2 -translate-x-1/2 shadow-md rounded-full font-semibold uppercase ${badgeSizeClass} ${getBadgeColor()}`}>
          Lvl {level}
        </span>
      </div>
      {size === 'xl' && (
        <div className="mt-4 text-center">
          <p className="text-xs font-mono tracking-wider font-semibold uppercase text-slate-500">{title}</p>
          <p className="text-[11px] text-slate-400 mt-1">{frameLabel}</p>
        </div>
      )}
    </div>
  );
}
