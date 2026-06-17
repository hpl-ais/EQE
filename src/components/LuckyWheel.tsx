import { useState, useRef, useEffect } from 'react';
import { LuckyWheelItemConfig } from '../types';
import { db, addSystemNotification } from '../mockData';
import { Gift, Sparkles, RefreshCw, Volume2, Coins } from 'lucide-react';

interface LuckyWheelProps {
  studentId: string;
  roomId: string;
  luckySpins: number;
  onSpinCompleted: () => void;
}

export default function LuckyWheel({ studentId, roomId, luckySpins, onSpinCompleted }: LuckyWheelProps) {
  const [wheelItems, setWheelItems] = useState<LuckyWheelItemConfig[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [wonItem, setWonItem] = useState<{ name: string; text: string; color: string } | null>(null);
  
  // Real audio synthesis context to play chime clicks
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    setWheelItems(db.getWheelConfig());
  }, []);

  const playChime = (freq: number, type: 'sine' | 'triangle' = 'triangle', duration = 0.08) => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Audio context failure safeguard
    }
  };

  const handleSpin = () => {
    if (isSpinning || luckySpins <= 0 || wheelItems.length === 0) return;

    setIsSpinning(true);
    setWonItem(null);

    // Cumulative probability check
    const rand = Math.random() * 100;
    let cumulative = 0;
    let selectedIndex = 0;

    for (let i = 0; i < wheelItems.length; i++) {
      cumulative += wheelItems[i].probability;
      if (rand <= cumulative) {
        selectedIndex = i;
        break;
      }
    }

    const item = wheelItems[selectedIndex];
    const n = wheelItems.length;
    const sliceAngle = 360 / n;
    
    // Calculate targeted angle to stop at index
    // The top pointer is physically at 12 o'clock / 270 degrees (pointing downwards)
    // Angle of segment i: [i * sliceAngle, (i+1) * sliceAngle]
    // Middle of segment i: (i * sliceAngle) + (sliceAngle / 2)
    // To align this center with the physical top (270 degrees in trigonometric coordinates)
    const centerOfSegment = (selectedIndex * sliceAngle) + (sliceAngle / 2);
    let targetAngle = (270 - centerOfSegment) % 360;
    if (targetAngle < 0) {
      targetAngle += 360;
    }
    
    // Turn 6 complete circles (2160 degrees) for dramatic effect
    const finalRotation = rotation - (rotation % 360) + 2160 + targetAngle;
    setRotation(finalRotation);

    // Audio click ticks simulator while accelerating and decelerating
    let ticksPlayed = 0;
    const totalDuration = 4000; // ms
    const tickInterval = 120; // play chimes periodically

    const intervalId = setInterval(() => {
      ticksPlayed++;
      // pitch goes higher as wheel spins and decelerates as it settles
      const pitch = 250 + (ticksPlayed % n) * 45;
      playChime(pitch, 'triangle', 0.05);
    }, tickInterval);

    setTimeout(() => {
      clearInterval(intervalId);
      setIsSpinning(false);
      
      // Play heavy celebration sound
      playChime(523.25, 'sine', 0.2); // C5
      setTimeout(() => playChime(659.25, 'sine', 0.2), 120); // E5
      setTimeout(() => playChime(783.99, 'sine', 0.3), 240); // G5
      setTimeout(() => playChime(1046.50, 'sine', 0.4), 360); // C6

      setWonItem({
        name: item.itemName,
        text: item.rewardText,
        color: item.color
      });

      // DB transactional effect:
      // 1. Deduct 1 spin from room_participants table
      const participants = db.getParticipants();
      const pIndex = participants.findIndex(p => p.studentId === studentId && p.roomId === roomId);
      if (pIndex !== -1) {
        participants[pIndex].luckySpins = Math.max(0, participants[pIndex].luckySpins - 1);
        
        // 2. Grant rewards
        if (item.rewardSpinsEffect) {
          // Extra Gold or Spins
          if (item.itemName.includes('Vàng') || item.rewardText.includes('vàng')) {
            participants[pIndex].goldBalance += item.rewardSpinsEffect;
          } else {
            participants[pIndex].luckySpins += item.rewardSpinsEffect;
          }
        } else {
          // Item or Voucher! Put in inventory
          const inventory = db.getInventory();
          inventory.push({
            id: 'inv-' + Math.random().toString(36).substr(2, 9),
            roomId,
            studentId,
            itemType: item.itemType,
            itemName: item.itemName.replace(/[📝✨🎰🪙]/g, '').trim(),
            description: item.itemName.includes('Miễn') 
              ? 'Kích hoạt thẻ này để tự động đổi trạng thái 1 nhiệm vụ bài tập nộp tải lên hình ảnh tiếp theo thành Đạt (Passed).' 
              : 'Thẻ tăng hiệu suất trong các tác vụ kiểm tra tích lũy.',
            status: 'unused',
            acquiredAt: new Date().toISOString()
          });
          db.setInventory(inventory);
        }
        
        db.setParticipants(participants);
      }

      // Add notification log
      addSystemNotification(
        'Vòng quay may mắn',
        `Học sinh quay trúng và nhận vật phẩm: [${item.itemName}]`,
        'success'
      );

      // Reload
      onSpinCompleted();
    }, totalDuration);
  };

  const getCoordinatesForPercent = (percent: number) => {
    const x = Math.cos(2 * Math.PI * percent);
    const y = Math.sin(2 * Math.PI * percent);
    return [x, y];
  };

  return (
    <div id="quest-lucky-wheel" className="flex flex-col items-center bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 shadow-2xl relative overflow-hidden max-w-md w-full mx-auto">
      {/* Background starlight aura */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-yellow-500/10 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-36 h-36 bg-blue-500/10 blur-3xl rounded-full pointer-events-none" />

      <div className="flex justify-between items-center w-full mb-4 z-10">
        <div className="flex items-center gap-1.5 text-yellow-400">
          <Gift className="w-5 h-5 animate-bounce" />
          <h3 className="font-bold tracking-tight text-md">Vòng Quay Học Thuật</h3>
        </div>
        <button 
          onClick={() => setSoundEnabled(!soundEnabled)} 
          className="text-slate-400 hover:text-white p-1.5 hover:bg-slate-800 rounded-lg transition"
          title={soundEnabled ? "Tắt âm thanh" : "Bật âm thanh"}
        >
          <Volume2 className={`w-4 h-4 ${soundEnabled ? 'text-emerald-400' : 'text-slate-500 line-through'}`} />
        </button>
      </div>

      <div className="text-center mb-6 z-10">
        <p className="text-sm text-slate-300">
          Bấm <strong className="text-yellow-400">QUAY</strong> để thử vận may trúng Thẻ Miễn Bài Tập, Thẻ nhân đôi XP hoặc Vàng.
        </p>
        <div className="mt-3 flex gap-2 justify-center items-center">
          <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 text-xs font-mono font-bold rounded-full border border-yellow-500/30">
            {luckySpins} lượt quay
          </span>
          <span className="text-slate-400 text-xs">|</span>
          <span className="text-xs text-slate-300">Tự cộng khi thăng cấp!</span>
        </div>
      </div>

      {/* Main Wheel Container */}
      <div className="relative w-72 h-72 flex items-center justify-center mb-4 select-none">
        {/* Red Arrow Pointer */}
        <div className="absolute top-[-8px] left-1/2 -translate-x-1/2 z-30 drop-shadow-lg">
          <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[24px] border-t-rose-500" />
          <div className="w-2 h-2 rounded-full bg-white absolute top-[-4px] left-[10px] shadow" />
        </div>

        {/* Glow rim ring */}
        <div className="absolute inset-0 border-8 border-slate-800 rounded-full shadow-[0_0_25px_rgba(250,204,21,0.25)] pointer-events-none z-20" />

        {/* Outer Wheel rotating group */}
        <div 
          className="w-full h-full rounded-full overflow-hidden transition-transform duration-[4000ms] ease-out shadow-inner relative"
          style={{ 
            transform: `rotate(${rotation}deg)`,
            transitionTimingFunction: 'cubic-bezier(0.1, 0.8, 0.1, 1)'
          }}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {wheelItems.map((item, idx) => {
              const n = wheelItems.length;
              const angle = 2 * Math.PI / n;
              const startAngle = idx * angle;
              const endAngle = (idx + 1) * angle;

              // coordinates
              const x1 = 50 + 50 * Math.cos(startAngle);
              const y1 = 50 + 50 * Math.sin(startAngle);
              const x2 = 50 + 50 * Math.cos(endAngle);
              const y2 = 50 + 50 * Math.sin(endAngle);

              // SVG Path for slice
              const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`;

              // Angle for text
              const midAngle = startAngle + (angle / 2);
              const textX = 50 + 30 * Math.cos(midAngle);
              const textY = 50 + 30 * Math.sin(midAngle);
              const rotateDeg = (midAngle * 180 / Math.PI) + 90;

              return (
                <g key={item.id}>
                  {/* Colorful slice */}
                  <path 
                    d={pathData} 
                    fill={item.color} 
                    className="stroke-slate-950/20 stroke-1"
                  />
                  {/* Text labels */}
                  <g transform={`translate(${textX}, ${textY}) rotate(${rotateDeg})`}>
                    <text 
                      x="0" 
                      y="0" 
                      fill="#FFFFFF" 
                      textAnchor="middle" 
                      className="text-[4px] font-bold select-none drop-shadow-md text-white font-sans"
                    >
                      {item.itemName.split(' ')[0]}
                    </text>
                    <text 
                      x="0" 
                      y="4" 
                      fill="#FFFFFF" 
                      textAnchor="middle" 
                      className="text-[3px] font-semibold select-none drop-shadow-md text-yellow-100 font-sans opacity-85"
                    >
                      {item.itemName.split(' ').slice(1).join(' ')}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* Inner rim dots decoration */}
            <circle cx="50" cy="50" r="47" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" fill="none" strokeDasharray="3,3" />
          </svg>

          {/* Golden Center Hub */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-gradient-to-tr from-slate-950 via-slate-800 to-slate-900 border-4 border-yellow-400 flex items-center justify-center shadow-lg z-20">
            <Gift className="w-5 h-5 text-yellow-400" />
          </div>
        </div>
      </div>

      {/* Spin Button */}
      <button
        id="btn-spin-wheel"
        onClick={handleSpin}
        disabled={isSpinning || luckySpins <= 0}
        className={`w-full py-3.5 px-6 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer transition shadow-lg ${
          isSpinning 
            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' 
            : luckySpins <= 0 
              ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
              : 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-slate-950 hover:scale-[1.02] active:scale-100 hover:shadow-yellow-500/20'
        }`}
      >
        {isSpinning ? (
          <>
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Đang quay may mắn...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span className="uppercase text-[13px] tracking-wider">Quay Ngay</span>
          </>
        )}
      </button>

      {/* Congratulations Modal Layer */}
      {wonItem && (
        <div className="mt-4 p-4 rounded-xl bg-slate-800/80 border border-yellow-500/40 text-center animate-fade-in w-full">
          <p className="text-xs font-semibold tracking-wide text-yellow-400 uppercase">Chúc Mừng Bạn Trúng Thưởng!</p>
          <p className="text-md font-bold mt-1 text-white flex items-center justify-center gap-1">
            <span style={{ color: wonItem.color }}>★</span> {wonItem.name} <span style={{ color: wonItem.color }}>★</span>
          </p>
          <p className="text-xs text-slate-300 mt-1">{wonItem.text}</p>
        </div>
      )}
    </div>
  );
}
