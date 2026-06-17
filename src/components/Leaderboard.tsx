import { User, RoomParticipant } from '../types';
import { getLevelInfo } from '../mockData';
import { Trophy, Medal, Flame, Award, Coins } from 'lucide-react';
import AvatarWithFrame from './AvatarWithFrame';

interface LeaderboardProps {
  participants: RoomParticipant[];
  users: User[];
  currentUserId: string;
}

export default function Leaderboard({ participants, users, currentUserId }: LeaderboardProps) {
  // Map participant with details
  const leaderboardData = participants
    .map(p => {
      const u = users.find(user => user.id === p.studentId);
      const lvlInfo = getLevelInfo(p.currentXp);
      return {
        ...p,
        fullName: u?.fullName || 'Học sinh ẩn danh',
        avatarUrl: u?.avatarUrl || '',
        title: lvlInfo.title,
        level: lvlInfo.level,
        frameType: lvlInfo.frameType,
        frameLabel: lvlInfo.frameLabel,
        prevLevelXp: lvlInfo.prevLevelXp,
        nextLevelXp: lvlInfo.nextLevelXp,
      };
    })
    .sort((a, b) => {
      // Sort descending by currentXp
      return b.currentXp - a.currentXp;
    });

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return (
          <div className="flex items-center justify-center w-7 h-7 bg-yellow-400 rounded-full text-slate-900 border-2 border-yellow-300 shadow shadow-yellow-500/50">
            <Trophy className="w-4 h-4 fill-amber-700 stroke-amber-700" />
          </div>
        );
      case 1:
        return (
          <div className="flex items-center justify-center w-7 h-7 bg-slate-300 rounded-full text-slate-900 border-2 border-slate-200 shadow">
            <Medal className="w-4 h-4 fill-slate-700 stroke-slate-500" />
          </div>
        );
      case 2:
        return (
          <div className="flex items-center justify-center w-7 h-7 bg-amber-600 rounded-full text-white border-2 border-amber-500 shadow">
            <Medal className="w-4 h-4 fill-amber-300 stroke-amber-200" />
          </div>
        );
      default:
        return (
          <span className="text-slate-400 font-mono font-bold text-sm w-7 text-center">
            #{index + 1}
          </span>
        );
    }
  };

  return (
    <div id="leaderboard-panel" className="bg-slate-900/45 border border-slate-800/80 rounded-2xl p-5 shadow-sm text-slate-100 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-1.5">
          <Flame className="w-5 h-5 text-orange-500 animate-pulse" />
          <h3 className="font-bold tracking-tight text-md">Bảng Vinh Danh Học Thuật</h3>
        </div>
        <span className="text-[11px] text-slate-400 font-mono px-2 py-0.5 bg-slate-800 rounded-full">
          {leaderboardData.length} chiến binh
        </span>
      </div>

      <div className="space-y-2.5 overflow-y-auto max-h-[480px] pr-1.5 flex-1">
        {leaderboardData.map((student, idx) => {
          const isCurrentUser = student.studentId === currentUserId;
          const range = student.nextLevelXp - student.prevLevelXp;
          const relativeXp = student.currentXp - student.prevLevelXp;
          const progressPercent = Math.min(100, Math.max(0, (relativeXp / range) * 100));

          return (
            <div 
              key={student.id}
              className={`flex items-center gap-4 p-3 rounded-xl transition duration-200 ${
                isCurrentUser 
                  ? 'bg-amber-500/10 border border-amber-500/30 shadow-[inset_0_0_12px_rgba(245,158,11,0.06)]' 
                  : 'bg-slate-900/70 border border-slate-800/45 hover:border-slate-700/60'
              }`}
            >
              {/* Rank column */}
              <div className="flex-shrink-0">
                {getRankBadge(idx)}
              </div>

              {/* Avatar column */}
              <div className="flex-shrink-0">
                <AvatarWithFrame 
                  avatarUrl={student.avatarUrl} 
                  xp={student.currentXp} 
                  size="sm" 
                  fullName={student.fullName}
                />
              </div>

              {/* Identity & Progress details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className={`text-sm font-semibold truncate ${isCurrentUser ? 'text-amber-300' : 'text-slate-100'}`}>
                      {student.fullName}
                    </p>
                    {isCurrentUser && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono font-medium px-1.5 py-0.2 rounded-full border border-amber-500/40">
                        BẠN
                      </span>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-xs font-mono font-bold text-yellow-400 flex items-center justify-end gap-0.5">
                      {student.currentXp} <span className="text-[10px] text-slate-400 font-normal">XP</span>
                    </span>
                  </div>
                </div>

                {/* Progress bar container */}
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        student.frameType === 'gold' 
                          ? 'bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 animate-pulse' 
                          : student.frameType === 'silver'
                            ? 'bg-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.5)]'
                            : student.frameType === 'bronze'
                              ? 'bg-orange-600'
                              : 'bg-amber-700'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono font-medium w-8 text-right flex-shrink-0">
                    {Math.round(progressPercent)}%
                  </span>
                </div>

                {/* Badges/Rank texts */}
                <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400 font-sans">
                  <span className="truncate">{student.title}</span>
                  <span className="text-slate-500 text-[9px] flex items-center gap-0.5 font-mono">
                    <Coins className="w-3 h-3 text-yellow-500/80" /> {student.goldBalance} vàng
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 p-3 bg-slate-900/30 border border-slate-800 rounded-xl text-center flex items-center justify-center gap-1.5 text-xs text-slate-300 font-mono">
        <Award className="w-4 h-4 text-emerald-400 animate-pulse" />
        Thi đua sôi nổi - Thăng cấp bùng nổ!
      </div>
    </div>
  );
}
