import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  User, RoomParticipant, Quest, 
  QuestSubmission, InventoryItem, LuckyWheelItemConfig 
} from '../types';
import { db, addSystemNotification, getLevelInfo } from '../mockData';
import { 
  Award, Shield, BookOpen, Clock, AlertCircle, FileText, CheckCircle2, 
  Gamepad2, Coins, ArrowRight, BookMarked, Sparkles, UploadCloud, Play, Gift, Trophy, X
} from 'lucide-react';
import AvatarWithFrame from './AvatarWithFrame';
import LuckyWheel from './LuckyWheel';

interface StudentViewProps {
  studentId: string;
  activeRoomId: string;
  onDataModified: () => void;
}

export default function StudentView({ studentId, activeRoomId, onDataModified }: StudentViewProps) {
  const [participant, setParticipant] = useState<RoomParticipant | null>(null);
  const [studentUser, setStudentUser] = useState<User | null>(null);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [submissions, setSubmissions] = useState<QuestSubmission[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  
  // Display Quest Completion Results Modal
  const [questResult, setQuestResult] = useState<{
    title: string;
    success: boolean;
    questType: 'quiz' | 'file' | 'voucher';
    score?: number;
    correctCount?: number;
    totalCount?: number;
    rewardXp: number;
    rewardGold: number;
    statusLogs: string;
  } | null>(null);

  // Celebrate level up with amazing canvas-confetti and fireworks
  const triggerLevelUpConfetti = () => {
    // 1. Immediate major celebratory burst
    confetti({
      particleCount: 140,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6']
    });

    // 2. Continuous fireworks and shooters from sides to make the screen feel alive
    const duration = 4.5 * 1000;
    const end = Date.now() + duration;

    const interval = setInterval(() => {
      if (Date.now() > end) {
        return clearInterval(interval);
      }

      // Left-shoot
      confetti({
        particleCount: 8,
        angle: 60,
        spread: 60,
        origin: { x: 0, y: 0.8 },
        colors: ['#3b82f6', '#8b5cf6', '#ec4899']
      });

      // Right-shoot
      confetti({
        particleCount: 8,
        angle: 120,
        spread: 60,
        origin: { x: 1, y: 0.8 },
        colors: ['#10b981', '#f59e0b', '#14b8a6']
      });
    }, 150);
  };

  // Stats changes feedback track
  const lastXpRef = useRef<number | null>(null);
  const lastGoldRef = useRef<number | null>(null);
  const [xpChanges, setXpChanges] = useState<{ id: string; amount: number }[]>([]);
  const [goldChanges, setGoldChanges] = useState<{ id: string; amount: number }[]>([]);

  useEffect(() => {
    if (participant) {
      if (lastXpRef.current !== null && lastXpRef.current !== participant.currentXp) {
        const diff = participant.currentXp - lastXpRef.current;
        const changeId = 'xp-' + Math.random().toString(36).substr(2, 9);
        setXpChanges(prev => [...prev, { id: changeId, amount: diff }]);
        setTimeout(() => {
          setXpChanges(prev => prev.filter(c => c.id !== changeId));
        }, 2100);

        // Check if level increased to trigger celebratory confetti
        const oldLvl = getLevelInfo(lastXpRef.current).level;
        const { level: newLvl } = getLevelInfo(participant.currentXp);
        if (newLvl > oldLvl) {
          triggerLevelUpConfetti();
        }
      }
      lastXpRef.current = participant.currentXp;

      if (lastGoldRef.current !== null && lastGoldRef.current !== participant.goldBalance) {
        const diff = participant.goldBalance - lastGoldRef.current;
        const changeId = 'gold-' + Math.random().toString(36).substr(2, 9);
        setGoldChanges(prev => [...prev, { id: changeId, amount: diff }]);
        setTimeout(() => {
          setGoldChanges(prev => prev.filter(c => c.id !== changeId));
        }, 2100);
      }
      lastGoldRef.current = participant.goldBalance;
    }
  }, [participant]);

  // Tab control
  const [activeTab, setActiveTab] = useState<'available' | 'completed' | 'wheel'>('available');

  // Interactive Quiz Taking Modal
  const [activeQuizQuest, setActiveQuizQuest] = useState<Quest | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [currentQuizStep, setCurrentQuizStep] = useState(0);
  const [shuffledQuizQuestions, setShuffledQuizQuestions] = useState<Array<{
    id: string;
    questionText: string;
    questionImage?: string;
    options: Array<{
      text: string;
      originalIndex: number;
      optionImage?: string;
    }>;
    originalCorrectIndex: number;
  }>>([]);

  // File Upload modal/states
  const [activeFileQuest, setActiveFileQuest] = useState<Quest | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refresh DB lists
  const syncState = () => {
    const parts = db.getParticipants();
    const activePart = parts.find(p => p.studentId === studentId && p.roomId === activeRoomId);
    setParticipant(activePart || null);

    const users = db.getUsers();
    setStudentUser(users.find(u => u.id === studentId) || null);

    // Active room quests
    const qList = db.getQuests().filter(q => q.roomId === activeRoomId);
    setQuests(qList);

    // Active student submissions
    const sList = db.getSubmissions().filter(s => s.studentId === studentId);
    setSubmissions(sList);

    // Active student inventory
    const iList = db.getInventory().filter(i => i.studentId === studentId && i.roomId === activeRoomId);
    setInventory(iList);
  };

  useEffect(() => {
    syncState();
  }, [studentId, activeRoomId]);

  // Audio help feedback
  const playSfx = (freq: number, type: 'sine' | 'triangle' | 'square' | 'sawtooth' = 'triangle', duration = 0.1) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  };

  // Automated Quiz solver & Scoring (Vòng lặp Hoàn thành)
  const handleAnswerSelect = (qid: string, optIdx: number) => {
    setQuizAnswers({
      ...quizAnswers,
      [qid]: optIdx
    });
  };

  const submitQuizAnswers = () => {
    if (!activeQuizQuest || shuffledQuizQuestions.length === 0) return;

    // Count attempts
    const questSubs = submissions.filter(s => s.questId === activeQuizQuest.id && s.studentId === studentId);
    const attemptCount = questSubs.length;

    if (activeQuizQuest.maxAttempts && attemptCount >= activeQuizQuest.maxAttempts) {
      alert(`Bạn đã đạt tới giới hạn tối đa ${activeQuizQuest.maxAttempts} lần làm bài cho nhiệm vụ này!`);
      setActiveQuizQuest(null);
      setShuffledQuizQuestions([]);
      return;
    }

    let correctCount = 0;
    
    shuffledQuizQuestions.forEach(q => {
      if (quizAnswers[q.id] === q.originalCorrectIndex) {
        correctCount++;
      }
    });

    const score100Percent = correctCount === shuffledQuizQuestions.length;
    const calculatedScore = Math.floor((correctCount / shuffledQuizQuestions.length) * 100);

    // Calculate reward multipliers for retries
    let penaltyFactor = 1;
    if (activeQuizQuest.reduceRewardOnRetry && attemptCount > 0) {
      penaltyFactor = Math.max(0.1, 1 - 0.2 * attemptCount); // -20% reward per retry, minimum 10%
    }

    const baseRewardXp = activeQuizQuest.rewardXp;
    const baseRewardGold = activeQuizQuest.rewardGold;

    let rewardXpApplied = 0;
    let rewardGoldApplied = 0;
    let isPassedOverall = false;
    let resolvedStatus: 'passed' | 'failed' = 'failed';
    let logsMsg = '';

    if (score100Percent) {
      rewardXpApplied = Math.floor(baseRewardXp * penaltyFactor);
      rewardGoldApplied = Math.floor(baseRewardGold * penaltyFactor);
      isPassedOverall = true;
      resolvedStatus = 'passed';
      logsMsg = `Chấm điểm tự động: Đúng 100% (${correctCount}/${shuffledQuizQuestions.length} câu). Nhận phần thưởng: ${rewardXpApplied} XP & ${rewardGoldApplied} Vàng (Lần làm bài thứ ${attemptCount + 1}${penaltyFactor < 1 ? `, giảm ${Math.round((1 - penaltyFactor) * 100)}% do nộp lại` : ''}).`;
    } else {
      if (activeQuizQuest.threeLevelGrading) {
        // Three level grading: correct < 100% -> PASSED but NO reward/penalty
        rewardXpApplied = 0;
        rewardGoldApplied = 0;
        isPassedOverall = true;
        resolvedStatus = 'passed';
        logsMsg = `Thang điểm 3 mức: Đúng ${correctCount}/${shuffledQuizQuestions.length} câu (${calculatedScore}/100đ). Bài làm Đạt (Passed) để tránh phạt quá hạn, không nhận thưởng và không bị phạt.`;
      } else {
        // Regular quest: fail
        rewardXpApplied = 0;
        rewardGoldApplied = 0;
        isPassedOverall = false;
        resolvedStatus = 'failed';
        logsMsg = `Chấm điểm tự động: Đúng ${correctCount}/${shuffledQuizQuestions.length} câu (${calculatedScore}/100đ). Thử thách yêu cầu đạt 100/100đ để hoàn thành. Trạng thái Thất Bại!`;
      }
    }

    // Save submission status
    const allSubs = db.getSubmissions();
    const newSub: QuestSubmission = {
      id: 'sub-' + Math.random().toString(36).substr(2, 9),
      questId: activeQuizQuest.id,
      studentId: studentId,
      submissionValue: JSON.stringify(quizAnswers),
      status: resolvedStatus,
      isVoucherUsed: false,
      submittedAt: new Date().toISOString(),
      gradedAt: new Date().toISOString(),
      statusLogs: logsMsg
    };

    db.setSubmissions([...allSubs, newSub]);

    // Apply auto rewards immediately if passed!
    if (isPassedOverall && participant) {
      const allParts = db.getParticipants();
      const pIdx = allParts.findIndex(p => p.studentId === studentId && p.roomId === activeRoomId);
      
      if (pIdx !== -1) {
        const oldXp = allParts[pIdx].currentXp;
        const newXp = oldXp + rewardXpApplied;
        
        allParts[pIdx].currentXp = newXp;
        allParts[pIdx].goldBalance += rewardGoldApplied;

        // Auto Level up check!
        const oldLvl = allParts[pIdx].currentLevel;
        const { level: computedLevel } = getLevelInfo(newXp);

        if (computedLevel > oldLvl) {
          let awardedSpins = 1;
          if (computedLevel >= 16) awardedSpins = 3;
          else if (computedLevel >= 6) awardedSpins = 2;

          allParts[pIdx].currentLevel = computedLevel;
          allParts[pIdx].luckySpins += awardedSpins;

          addSystemNotification(
            '🌟 THĂNG CẤP ĐỘT PHÁ! 🌟',
            `Bạn vừa thăng lên Cấp ${computedLevel}! Nhận thêm +${awardedSpins} Lượt quay và đặc quyền danh hiệu mới.`,
            'level_up'
          );
          playSfx(880, 'sine', 0.4);
        } else {
          playSfx(rewardXpApplied > 0 ? 523 : 392, 'sine', 0.2);
        }

        db.setParticipants(allParts);
      }

      if (rewardXpApplied > 0) {
        addSystemNotification(
          'Hoàn thành bài tập',
          `Học sinh [${studentUser?.fullName}] đã hoàn tất trắc nghiệm "${activeQuizQuest.title}" đạt 100%. Nhận thưởng +${rewardXpApplied} XP!`,
          'success'
        );
      } else {
        addSystemNotification(
          'Đạt nhiệm vụ trắc nghiệm',
          `Học sinh [${studentUser?.fullName}] đã hoàn thành "${activeQuizQuest.title}" với thang điểm 3 mức. Trạng thái: Đạt (Không thưởng, Không phạt).`,
          'info'
        );
      }
    } else {
      // Quiz Failed
      playSfx(220, 'square', 0.25);
      addSystemNotification(
        'Thử thách thất bại',
        `Bạn nộp trắc nghiệm nhiệm vụ "${activeQuizQuest.title}" chưa đạt điểm tối đa. Trạng thái Thất Bại!`,
        'warning'
      );
    }

    setQuestResult({
      title: activeQuizQuest.title,
      success: isPassedOverall,
      questType: 'quiz',
      score: calculatedScore,
      correctCount: correctCount,
      totalCount: shuffledQuizQuestions.length,
      rewardXp: rewardXpApplied,
      rewardGold: rewardGoldApplied,
      statusLogs: logsMsg
    });

    // cleanup
    setActiveQuizQuest(null);
    setShuffledQuizQuestions([]);
    setQuizAnswers({});
    setCurrentQuizStep(0);
    onDataModified();
    syncState();
  };

  // Drag Drop Handlers for manual file upload simulation
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setDroppedFile(e.dataTransfer.files[0]);
      playSfx(440, 'triangle', 0.1);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setDroppedFile(e.target.files[0]);
      playSfx(440, 'triangle', 0.1);
    }
  };

  // Submit manual file upload
  const submitFileChallenge = () => {
    if (!activeFileQuest || !droppedFile) return;

    // Count attempts
    const questSubs = submissions.filter(s => s.questId === activeFileQuest.id && s.studentId === studentId);
    const attemptCount = questSubs.length;

    if (activeFileQuest.maxAttempts && attemptCount >= activeFileQuest.maxAttempts) {
      alert(`Bạn đã đạt tới giới hạn tối đa ${activeFileQuest.maxAttempts} lần nộp bài cho nhiệm vụ này!`);
      setActiveFileQuest(null);
      setDroppedFile(null);
      return;
    }

    const allSubs = db.getSubmissions();
    const newSub: QuestSubmission = {
      id: 'sub-' + Math.random().toString(36).substr(2, 9),
      questId: activeFileQuest.id,
      studentId: studentId,
      submissionValue: droppedFile.name,
      status: 'submitted', // needs teachers manual review but awards standard pending
      isVoucherUsed: false,
      submittedAt: new Date().toISOString(),
      statusLogs: `Đã nộp tệp vẽ/ảnh (Lượt ${attemptCount + 1}): "${droppedFile.name}" thành công lúc ${new Date().toLocaleTimeString()}. Đang chờ giáo viên rà soát duyệt duyệt.`
    };

    db.setSubmissions([...allSubs, newSub]);
    
    // Play sound
    playSfx(600, 'sine', 0.15);

    addSystemNotification(
      'Nộp bài thành công',
      `Bạn đã nộp tệp "${droppedFile.name}" thành công cho bài "${activeFileQuest.title}".`,
      'info'
    );

    setQuestResult({
      title: activeFileQuest.title,
      success: true,
      questType: 'file',
      rewardXp: 0,
      rewardGold: 0,
      statusLogs: `Đã nộp tệp "${droppedFile.name}" thành công! Thử thách đã được chuyển sang trạng thái chờ Giáo viên kiểm duyệt. Khi được duyệt đạt, tài nguyên XP (+${activeFileQuest.rewardXp} XP) và Vàng (+${activeFileQuest.rewardGold} vàng) sẽ được tự động cộng vào nhân vật của bạn.`
    });

    setActiveFileQuest(null);
    setDroppedFile(null);
    onDataModified();
    syncState();
  };

  // Vòng lặp Đặc quyền (Auto-Voucher via Free homework pass card)
  const useFreePassVoucherOnQuest = (quest: Quest) => {
    // 1. Locate available voucher in inventory
    const items = db.getInventory();
    const vIndex = items.findIndex(i => i.studentId === studentId && i.roomId === activeRoomId && i.itemType === 'free_pass_voucher' && i.status === 'unused');
    
    if (vIndex === -1) {
      alert("Bạn không sở hữu Thẻ Miễn Bài Tập nào trong Kho Đồ!");
      return;
    }

    if (!confirm(`Bạn có chắc muốn dùng [Thẻ Miễn Bài Tập] để được phê duyệt ngay bài "${quest.title}" mà không cần làm bài?`)) {
      return;
    }

    // 2. Consume voucher
    items[vIndex].status = 'used';
    db.setInventory(items);

    // 3. Automated submissions bypass to Passed!
    const allSubs = db.getSubmissions();
    
    const newSub: QuestSubmission = {
      id: 'sub-voucher-' + Math.random().toString(36).substr(2, 9),
      questId: quest.id,
      studentId: studentId,
      submissionValue: 'Kích hoạt Thẻ Đặc Quyền Miễn Bài Tập Về Nhà',
      status: 'passed',
      isVoucherUsed: true,
      submittedAt: new Date().toISOString(),
      gradedAt: new Date().toISOString(),
      statusLogs: 'Trạng thái: Hoàn thành Tự động nhờ kích hoạt đặc quyền Thẻ Miễn Bài Tập Về Nhà (Bản thân vượt qua an toàn).'
    };

    db.setSubmissions([...allSubs, newSub]);

    // 4. Grant rewards (standard XP and Gold balances)
    if (participant) {
      const allParts = db.getParticipants();
      const pIdx = allParts.findIndex(p => p.studentId === studentId && p.roomId === activeRoomId);
      
      if (pIdx !== -1) {
        const oldXp = allParts[pIdx].currentXp;
        const newXp = oldXp + quest.rewardXp;
        
        allParts[pIdx].currentXp = newXp;
        allParts[pIdx].goldBalance += quest.rewardGold;

        // Auto Level up check!
        const oldLvl = allParts[pIdx].currentLevel;
        const { level: computedLevel } = getLevelInfo(newXp);

        if (computedLevel > oldLvl) {
          let awardedSpins = 1;
          if (computedLevel >= 16) awardedSpins = 3;
          else if (computedLevel >= 6) awardedSpins = 2;

          allParts[pIdx].currentLevel = computedLevel;
          allParts[pIdx].luckySpins += awardedSpins;

          addSystemNotification(
            '🌟 KÍCH HOẠT VOUCHER THĂNG CẤP! 🌟',
            `Thăng lên Cấp ${computedLevel} một cách nhàn hạ! +${awardedSpins} Lượt quay mới.`,
            'level_up'
          );
        }

        db.setParticipants(allParts);
      }
    }

    addSystemNotification(
      'Kích hoạt Voucher',
      `Học sinh [${studentUser?.fullName}] kích hoạt "Thẻ miễn bài tập" cho thử thách "${quest.title}". Trạng thái Passed tự động!`,
      'success'
    );

    // Sound effect chimes
    playSfx(523.25, 'sine', 0.2);
    setTimeout(() => playSfx(659.25, 'sine', 0.2), 100);
    setTimeout(() => playSfx(783.99, 'sine', 0.3), 200);

    setQuestResult({
      title: quest.title,
      success: true,
      questType: 'voucher',
      rewardXp: quest.rewardXp,
      rewardGold: quest.rewardGold,
      statusLogs: `Đã dùng thành công [Thẻ Miễn Bài Tập] cho thử thách "${quest.title}". Hệ thống đặc cách duyệt đạt tự động thành công (Passed)! Bạn đã được nhận ngay phần thưởng tài nguyên trọn vẹn.`
    });

    // cleanup
    setActiveFileQuest(null);
    onDataModified();
    syncState();
  };

  // Helper lists filtering
  if (!participant) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400">
        Bạn chưa tham gia vào lớp học này. Vui lòng liên hệ Thầy/Cô để lấy mã mời tuyển thêm!
      </div>
    );
  }

  const { level, title, frameType, frameLabel, prevLevelXp, nextLevelXp } = getLevelInfo(participant.currentXp);
  const xpNeeded = nextLevelXp - prevLevelXp;
  const currentXPProgressInLevel = participant.currentXp - prevLevelXp;
  const progressPercentage = Math.min(100, Math.max(0, (currentXPProgressInLevel / xpNeeded) * 100));

  // Sort quests by submission status
  const pendingQuests = quests.filter(q => {
    const sub = submissions.find(s => s.questId === q.id);
    const isDeadlinePassed = new Date(q.deadline).getTime() < new Date().getTime();
    
    // Pending means either: no submission at all, or submission with status == 'pending' (excluding passed/failed/submitted)
    if (!sub) return !isDeadlinePassed;
    return sub.status === 'pending' && !isDeadlinePassed;
  });

  const completedQuestsList = quests.map(q => {
    const sub = submissions.find(s => s.questId === q.id);
    const isDeadlinePassed = new Date(q.deadline).getTime() < new Date().getTime();
    
    let resolvedStatus: 'passed' | 'failed' | 'submitted' | 'expired' | 'unsubmitted' = 'unsubmitted';
    if (sub) {
      if (sub.status === 'passed') resolvedStatus = 'passed';
      else if (sub.status === 'failed') resolvedStatus = 'failed';
      else if (sub.status === 'submitted') resolvedStatus = 'submitted';
    } else if (isDeadlinePassed) {
      resolvedStatus = 'expired'; // scan penalty trễ hạn simulator will mark failed but visually shown here as expired
    }

    return {
      ...q,
      resolvedStatus,
      submission: sub
    };
  }).filter(q => q.resolvedStatus !== 'unsubmitted' && q.resolvedStatus !== 'expired');

  // Let's also look at actual unsubmitted expired quests
  const overdueQuestsList = quests.map(q => {
    const sub = submissions.find(s => s.questId === q.id);
    const isDeadlinePassed = new Date(q.deadline).getTime() < new Date().getTime();
    
    if (!sub && isDeadlinePassed) return { ...q, resolvedStatus: 'overdue' };
    if (sub && sub.status === 'failed') return { ...q, resolvedStatus: 'failed', submission: sub };
    return null;
  }).filter(q => q !== null) as Array<Quest & { resolvedStatus: string; submission?: QuestSubmission }>;

  const hasVoucher = inventory.some(i => i.itemType === 'free_pass_voucher' && i.status === 'unused');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* LEFT TWO COLUMNS: character details, main quest logger, popups */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* CHARACTER CARD PROFILE DISPLAY */}
        <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center gap-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 blur-3xl rounded-full" />
          
          <div className="flex-shrink-0">
            <AvatarWithFrame 
              avatarUrl={studentUser?.avatarUrl || ''} 
              xp={participant.currentXp} 
              size="xl" 
              fullName={studentUser?.fullName}
            />
          </div>

          <div className="flex-1 text-center md:text-left space-y-3 w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-1.5">
              <div>
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-cyan-400">HỒ SƠ KHÁNH GIẢ</span>
                <h2 className="text-xl font-black text-white">{studentUser?.fullName}</h2>
              </div>
              <div className="flex items-center justify-center md:justify-end gap-3 mt-1 md:mt-0 bg-slate-950/70 border border-slate-800/80 px-4 py-1.5 rounded-2xl relative">
                {/* Floating Gold Changes */}
                {goldChanges.map(change => (
                  <span 
                    key={change.id} 
                    className={`absolute -top-7 left-3 font-mono font-black text-[10px] px-2 py-0.5 rounded-md border shadow-lg flex items-center gap-0.5 pointer-events-none z-30 animate-float-up ${
                      change.amount > 0 
                        ? 'bg-emerald-950/90 text-emerald-400 border-emerald-500/30' 
                        : 'bg-rose-950/90 text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {change.amount > 0 ? `+${change.amount}` : change.amount} 🪙
                  </span>
                ))}
                
                <div className="flex items-center gap-1 font-mono text-xs text-yellow-400 font-bold" title="Tiền vàng mua sắm đổi thẻ">
                  <Coins className="w-4 h-4 text-yellow-500" />
                  <span>{participant.goldBalance} vàng</span>
                </div>
                <div className="w-px h-3.5 bg-slate-800" />
                <div className="flex items-center gap-1 font-mono text-xs text-cyan-400 font-bold" title="Lượt xoay vòng quay trúng thưởng">
                  <Gift className="w-4 h-4 text-cyan-500" />
                  <span>{participant.luckySpins} lượt quay</span>
                </div>
              </div>
            </div>

            {/* Academic title label */}
            <div className="flex items-center justify-center md:justify-start gap-1 text-xs text-slate-300">
              <Shield className="w-4 h-4 text-yellow-500" />
              <span>Chức vụ học thuật: </span>
              <strong className="text-yellow-400 font-semibold">{title}</strong>
              <span className="text-slate-500 text-[10px] font-mono">({frameLabel})</span>
            </div>

            {/* Level progress bar */}
            <div className="space-y-1 relative">
              {/* Floating XP Changes */}
              {xpChanges.map(change => (
                <span 
                  key={change.id} 
                  className={`absolute -top-5 right-6 font-mono font-black text-[10px] px-2 py-0.5 rounded-md border shadow-lg flex items-center gap-0.5 pointer-events-none z-30 animate-float-up ${
                    change.amount > 0 
                      ? 'bg-blue-950/90 text-blue-450 border-blue-500/30' 
                      : 'bg-rose-950/90 text-rose-400 border-rose-500/30'
                  }`}
                >
                  {change.amount > 0 ? `+${change.amount}` : change.amount} XP ✨
                </span>
              ))}

              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>Cấp {level}</span>
                <span>{participant.currentXp} / {nextLevelXp} XP</span>
              </div>
              <div className="h-2.5 w-full bg-slate-950 rounded-full border border-slate-800 overflow-hidden relative">
                <div 
                  className={`h-full rounded-full transition-all duration-700 ${
                    frameType === 'gold' 
                      ? 'bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 animate-pulse' 
                      : frameType === 'silver'
                        ? 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]'
                        : frameType === 'bronze'
                          ? 'bg-orange-600'
                          : 'bg-amber-700'
                  }`}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 text-right">
                Kiếm thêm <strong className="text-slate-300">{nextLevelXp - participant.currentXp} XP</strong> để đột phá lên Cấp {level+1}!
              </p>
            </div>
          </div>
        </div>

        {/* QUEST TABS BAR CONTAINER */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-2 flex gap-1">
          <button
            onClick={() => setActiveTab('available')}
            className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === 'available' 
                ? 'bg-slate-800 text-emerald-400' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Thử Thách Mới ({pendingQuests.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === 'completed' 
                ? 'bg-slate-800 text-emerald-400' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Đã làm & Trễ hạn ({completedQuestsList.length + overdueQuestsList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('wheel')}
            className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === 'wheel' 
                ? 'bg-slate-800 text-yellow-400' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            <span>Vòng Quay May Mắn</span>
            {participant.luckySpins > 0 && (
              <span className="w-2.5 h-2.5 bg-rose-500 animate-ping rounded-full" />
            )}
          </button>
        </div>

        {/* TAB 1: AVAILABLE QUESTS */}
        {activeTab === 'available' && (
          <div className="space-y-4">
            {pendingQuests.length === 0 ? (
              <div className="p-12 text-center bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                <BookMarked className="w-12 h-12 text-slate-500 mx-auto" />
                <p className="text-sm text-slate-400 font-bold">Lớp sạch tinh bóng thử thách!</p>
                <p className="text-xs text-slate-500">Chúc mừng em đã hoàn thành toàn bộ bài tập giáo viên giao.</p>
              </div>
            ) : (
              pendingQuests.map(quest => {
                const sub = submissions.find(s => s.questId === quest.id);
                const hasPendingReview = sub && sub.status === 'submitted';
                
                const now = new Date();
                const deadlineDateObj = new Date(quest.deadline);
                const diffMs = deadlineDateObj.getTime() - now.getTime();
                const diffHours = diffMs / (1000 * 60 * 60);

                let cardBorderClass = 'border-slate-800 hover:border-slate-700 bg-slate-900';
                let deadlineColorClass = 'text-slate-300';
                let warningText = '';
                let warningBadge = null;

                if (diffHours > 0 && diffHours <= 24) {
                  if (diffHours <= 12) {
                    cardBorderClass = 'border-rose-500/40 bg-rose-950/20 shadow-lg shadow-rose-950/10 hover:border-rose-500/55';
                    deadlineColorClass = 'text-rose-400 font-bold';
                    warningText = `Còn ${Math.ceil(diffHours)} giờ`;
                    warningBadge = (
                      <span className="px-2 py-0.5 text-[9px] font-bold rounded-full border bg-rose-500/15 text-rose-400 border-rose-500/30 flex items-center gap-1 animate-pulse uppercase">
                        <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" /> Dưới 12g
                      </span>
                    );
                  } else {
                    cardBorderClass = 'border-amber-500/40 bg-amber-950/10 shadow-lg shadow-amber-950/10 hover:border-amber-500/50';
                    deadlineColorClass = 'text-amber-400 font-bold';
                    warningText = `Còn ${Math.ceil(diffHours)} giờ`;
                    warningBadge = (
                      <span className="px-2 py-0.5 text-[9px] font-bold rounded-full border bg-amber-500/15 text-amber-400 border-amber-500/30 flex items-center gap-1 uppercase">
                        <Clock className="w-3 h-3 text-amber-500 shrink-0" /> Dưới 24g
                      </span>
                    );
                  }
                }

                return (
                  <div 
                    key={quest.id}
                    className={`p-5 rounded-2xl transition duration-300 space-y-4 relative border ${cardBorderClass}`}
                  >
                    {/* Badge rewards top */}
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <div className="flex flex-wrap gap-1.5 items-center">
                          <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full border uppercase ${
                            quest.questType === 'quiz' 
                              ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' 
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}>
                            {quest.questType === 'quiz' ? 'Trắc nghiệm tự chấm' : 'Nộp ảnh bài tập'}
                          </span>
                          {warningBadge}
                        </div>
                        <h3 className="font-bold text-slate-100 text-sm mt-1.5">{quest.title}</h3>
                      </div>

                      <div className="text-right flex-shrink-0 flex items-center gap-1 bg-slate-950/70 py-1 px-2.5 rounded-lg border border-slate-800">
                        <span className="text-[11px] font-mono text-emerald-400 font-bold">+{quest.rewardXp} XP</span>
                        <span className="text-slate-600 text-xs">|</span>
                        <span className="text-[11px] font-mono text-yellow-400 font-bold flex items-center gap-0.5">
                          +{quest.rewardGold} <Coins className="w-3 h-3 text-yellow-500 inline" />
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed font-sans">{quest.description}</p>

                    {/* Advanced Configuration Badges */}
                    {(() => {
                      const localAttempts = submissions.filter(s => s.questId === quest.id && s.studentId === studentId).length;
                      const hasBadges = quest.maxAttempts || quest.reduceRewardOnRetry || quest.threeLevelGrading;
                      if (!hasBadges) return null;
                      return (
                        <div className="flex flex-wrap gap-2 p-2.5 bg-slate-950/50 rounded-xl border border-slate-850/80 text-[10px] items-center">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Quy tắc:</span>
                          
                          {quest.maxAttempts !== undefined && (
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[9px] border ${localAttempts >= quest.maxAttempts ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-slate-900 border-slate-800 text-slate-300'}`}>
                              Lượt đã làm: {localAttempts}/{quest.maxAttempts}
                            </span>
                          )}

                          {quest.reduceRewardOnRetry && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium text-[9px]">
                              {localAttempts > 0 
                                ? `Hệ số thưởng: -${Math.round((1 - Math.max(0.1, 1 - 0.2 * localAttempts)) * 100)}% điểm nộp lại`
                                : 'Làm lại: -20% điểm/lần'
                              }
                            </span>
                          )}

                          {quest.threeLevelGrading && (
                            <span className="px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-400 border border-teal-500/20 font-medium text-[9px] font-mono" title="Đúng 100% -> Thưởng | Đúng < 100% -> Passed không thưởng phạt | Quá hạn -> Phạt">
                              🛡️ Thang điểm 3 mức
                            </span>
                          )}
                        </div>
                      );
                    })()}

                    {/* Deadline block with automated warning details */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-3 border-t border-slate-800 text-[11px] text-slate-400 gap-2">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        Hạn nộp: <strong className={deadlineColorClass}>{new Date(quest.deadline).toLocaleDateString()} lúc 23:59</strong>
                        {warningText && (
                          <span className={`ml-1 font-bold ${diffHours <= 12 ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`}>
                            ({warningText})
                          </span>
                        )}
                      </span>
                      {quest.penaltyXp > 0 && (
                        <span className="text-rose-400 flex items-center gap-0.5" title="Hệ thống tự trừ XP lúc nửa đêm nếu chưa làm khi quá hạn font-sans">
                          <AlertCircle className="w-3.5 h-3.5" /> Phạt quá hạn: -{quest.penaltyXp} XP (Tự quét 00:00)
                        </span>
                      )}
                    </div>

                    {/* Submit choices or voucher trigger */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      {hasVoucher && quest.questType === 'file' && (
                        <button
                          onClick={() => useFreePassVoucherOnQuest(quest)}
                          className="px-3.5 py-2 bg-gradient-to-r from-yellow-500/15 via-amber-500/20 to-yellow-500/15 text-yellow-300 border border-yellow-500/30 hover:border-yellow-400 text-[10px] font-bold rounded-xl flex items-center gap-1 cursor-pointer transition shadow hover:shadow-yellow-500/5 uppercase"
                          title="Kích hoạt Kho Đồ Voucher nộp bài ngay tức khắc!"
                        >
                          <Sparkles className="w-3.5 h-3.5 animate-bounce" />
                          Dùng Thẻ Miễn Bài Tập
                        </button>
                      )}
                      
                      <div className="flex-1" />

                      {quest.questType === 'quiz' ? (
                        <button
                          onClick={() => {
                            const shuffleArray = <T,>(arr: T[]): T[] => {
                              const copy = [...arr];
                              for (let i = copy.length - 1; i > 0; i--) {
                                const j = Math.floor(Math.random() * (i + 1));
                                [copy[i], copy[j]] = [copy[j], copy[i]];
                              }
                              return copy;
                            };

                            let questionsToUse = quest.quizData ? [...quest.quizData] : [];
                            if (quest.shuffleQuestions) {
                              questionsToUse = shuffleArray(questionsToUse);
                            }

                            const prepared = questionsToUse.map(q => {
                              let mappedOpts = q.options.map((text, idx) => ({
                                text,
                                originalIndex: idx,
                                optionImage: q.optionImages?.[idx]
                              }));
                              if (quest.shuffleOptions) {
                                mappedOpts = shuffleArray(mappedOpts);
                              }
                              return {
                                id: q.id,
                                questionText: q.questionText,
                                questionImage: q.questionImage,
                                options: mappedOpts,
                                originalCorrectIndex: q.correctOptionIndex
                              };
                            });

                            setShuffledQuizQuestions(prepared);
                            setActiveQuizQuest(quest);
                            setQuizAnswers({});
                            setCurrentQuizStep(0);
                          }}
                          className="px-4.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl select-none flex items-center gap-1 transition shadow hover:shadow-cyan-500/10"
                        >
                          Làm Bài Trắc Nghiệm <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : hasPendingReview ? (
                        <span className="text-[11px] text-slate-400 px-3 py-1.5 bg-slate-950 rounded-lg italic">
                          🔄 Đã nộp file. Đang chờ chấm duyệt...
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setActiveFileQuest(quest);
                            setDroppedFile(null);
                          }}
                          className="px-4.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl select-none flex items-center gap-1 transition shadow"
                        >
                          Nộp Ảnh Bài Làm <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: COMPLETED & EXPIRED HISTORY QUESTS */}
        {activeTab === 'completed' && (
          <div className="space-y-4 font-sans">
            <h4 className="text-xs font-bold tracking-wider text-slate-400 uppercase">Thành tích vượt qua thách thức ({completedQuestsList.length})</h4>
            {completedQuestsList.length === 0 ? (
              <div className="p-6 text-center text-slate-500 italic text-xs bg-slate-950 rounded-xl border border-slate-800">
                Chưa có nhiệm vụ nào hoàn tất thành công trong lớp này. Hãy nộp một bài trắc nghiệm nhé!
              </div>
            ) : (
              completedQuestsList.map(quest => {
                const isPassed = quest.resolvedStatus === 'passed';
                const isVoucher = quest.submission?.isVoucherUsed;

                return (
                  <div key={quest.id} className="p-4 bg-slate-950 border border-slate-900 rounded-xl flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${isPassed ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <h5 className="font-bold text-xs text-slate-100 truncate">{quest.title}</h5>
                      </div>
                      
                      <p className="text-[10px] text-slate-400 truncate mt-1">{quest.submission?.statusLogs}</p>
                      {isVoucher && (
                        <span className="mt-1.5 inline-block text-[9px] font-bold bg-yellow-500/10 text-yellow-400 py-0.5 px-2 rounded-full border border-yellow-500/20">
                          ⚡ Miễn nộp bài (Voucher)
                        </span>
                      )}
                    </div>

                    <div className="flex-shrink-0 text-right space-y-1">
                      <span className={`text-[10px] uppercase font-bold py-1 px-2.5 rounded-full ${
                        isPassed 
                          ? 'bg-emerald-500/15 text-emerald-400' 
                          : 'bg-rose-500/15 text-rose-400'
                      }`}>
                        {quest.resolvedStatus === 'passed' ? 'Đã duyệt đạt' : quest.resolvedStatus === 'submitted' ? 'Đang duyệt' : 'Chưa qua'}
                      </span>
                      <p className="text-[9px] text-slate-500 font-mono mt-1">
                        {quest.submission?.submittedAt ? new Date(quest.submission.submittedAt).toLocaleDateString() : ''}
                      </p>
                    </div>
                  </div>
                );
              })
            )}

            {/* Overdue Failure List */}
            {overdueQuestsList.length > 0 && (
              <div className="space-y-4 mt-6">
                <h4 className="text-xs font-bold tracking-wider text-rose-400 uppercase flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> Danh sách Thất bại / Quá hạn phạt dọn ({overdueQuestsList.length})
                </h4>
                {overdueQuestsList.map(quest => (
                  <div key={quest.id} className="p-4 bg-rose-950/10 border border-rose-950/30 rounded-xl flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h5 className="font-bold text-xs text-slate-200 truncate">{quest.title}</h5>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Thiếu nộp bài trước hạn chót {new Date(quest.deadline).toLocaleDateString()}. Hệ thống quét chuyển trạng thái Thất bại.
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <span className="text-[10px] font-bold py-1 px-2.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full font-mono">
                        Quá hạn (-{quest.penaltyXp} XP)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: LUCKY WHEEL SPINNING ENGINE */}
        {activeTab === 'wheel' && (
          <div className="flex flex-col items-center">
            <LuckyWheel 
              studentId={studentId} 
              roomId={activeRoomId} 
              luckySpins={participant.luckySpins} 
              onSpinCompleted={() => {
                syncState();
                onDataModified();
              }}
            />
          </div>
        )}

      </div>

      {/* RIGHT SIDEBAR COLUMN: INVENTORY DRAWER */}
      <div className="space-y-6">
        
        {/* KHO ĐỒ CÁ C NHÂN (Inventory Container) */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-1.5 text-yellow-400">
              <Shield className="w-4 h-4" />
              <h3 className="font-bold tracking-tight text-sm text-slate-100">Kho Đồ Cá Nhân (Inventory)</h3>
            </div>
            <span className="text-[10px] text-slate-400 font-mono bg-slate-800 px-2 py-0.5 rounded-full">
              {inventory.length} Đồ vật
            </span>
          </div>

          <p className="text-[11px] text-slate-400 mb-4 Leading-relaxed">
            Nơi lưu trữ các thẻ bài ma thuật trúng từ vòng quay. Học sinh chủ động kích hoạt nút sử dụng nhanh!
          </p>

          <div className="space-y-3 max-h-[440px] overflow-y-auto pr-1">
            {inventory.length === 0 ? (
              <div className="text-center py-8 text-slate-600 text-xs italic">
                Rương đồ trống rỗng! Hãy tham gia làm nhiệm vụ kiếm XP thăng cấp nhận Lượt quay may mắn.
              </div>
            ) : (
              inventory.map(item => {
                const isUsed = item.status === 'used';
                return (
                  <div 
                    key={item.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isUsed 
                        ? 'bg-slate-950/40 border-slate-900 text-slate-500 opacity-60' 
                        : item.itemType === 'free_pass_voucher'
                          ? 'bg-amber-500/5 border-amber-500/20'
                          : item.itemType === 'double_xp_card'
                            ? 'bg-emerald-500/5 border-emerald-500/20'
                            : 'bg-indigo-500/5 border-indigo-500/20'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className={`text-xs font-bold leading-snug ${isUsed ? 'line-through text-slate-500' : 'text-slate-100'}`}>
                          {item.itemName}
                        </h4>
                        <span className="text-[8px] uppercase tracking-wider font-mono px-1.5 py-0.2 bg-slate-800 rounded font-bold text-slate-400">
                          {item.itemType === 'free_pass_voucher' ? 'Thẻ đặc quyền' : 'Thẻ chúc phúc'}
                        </span>
                      </div>
                      
                      {!isUsed ? (
                        item.itemType === 'free_pass_voucher' ? (
                          <span className="text-[10px] text-yellow-400 font-bold bg-yellow-400/15 py-0.5 px-2 rounded-lg">
                            Dùng ở bài nộp file
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              // Consume double XP or card mockup
                              const list = db.getInventory();
                              const idx = list.findIndex(i => i.id === item.id);
                              if (idx !== -1) {
                                list[idx].status = 'used';
                                db.setInventory(list);
                                syncState();
                                addSystemNotification(
                                  'Kích hoạt chúc phúc',
                                  `Học sinh [${studentUser?.fullName}] đã dùng thành công [${item.itemName}] nhân đôi XP.`,
                                  'success'
                                );
                                playSfx(659, 'triangle', 0.2);
                                onDataModified();
                              }
                            }}
                            className="px-2 py-1 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-[9px] rounded-lg tracking-wider uppercase transition shadow cursor-pointer select-none"
                          >
                            Dùng Thẻ
                          </button>
                        )
                      ) : (
                        <span className="text-[9px] text-slate-500 italic block font-mono">Đã sử dụng</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 leading-relaxed">{item.description}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* ACTIVE QUIZ MODAL TAKING CHALLENGE */}
      {activeQuizQuest && shuffledQuizQuestions.length > 0 && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in select-none">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full relative space-y-6">
            
            <div className="pb-3 border-b border-slate-800">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest font-mono">LÀM BÀI KHÁCH QUAN TỰ ĐỘNG CHẤM</span>
              <h3 className="font-bold text-slate-100 text-md truncate mt-1">{activeQuizQuest.title}</h3>
            </div>

            {/* Quiz Step tracker bar */}
            <div className="flex gap-1 h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
              {shuffledQuizQuestions.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-full flex-1 transition ${
                    i <= currentQuizStep ? 'bg-cyan-400' : 'bg-slate-800'
                  }`} 
                />
              ))}
            </div>

            {/* Question Text */}
            <div className="space-y-4">
              <p className="text-xs font-bold text-slate-400 font-mono">
                CÂU HỎI {currentQuizStep + 1} / {shuffledQuizQuestions.length}
              </p>
              <p className="text-sm font-semibold text-slate-100 italic">
                " {shuffledQuizQuestions[currentQuizStep].questionText} "
              </p>
              {shuffledQuizQuestions[currentQuizStep].questionImage && (
                <div className="mt-2 flex justify-center bg-slate-950/40 p-2.5 rounded-xl border border-slate-850">
                  <img 
                    src={shuffledQuizQuestions[currentQuizStep].questionImage} 
                    className="max-h-48 rounded-lg object-contain" 
                    referrerPolicy="no-referrer" 
                    alt="Question visual"
                  />
                </div>
              )}
            </div>

            {/* Radio Options Grid */}
            <div className="grid grid-cols-1 gap-2.5">
              {shuffledQuizQuestions[currentQuizStep].options.map((optObj, optIdx) => {
                const qId = shuffledQuizQuestions[currentQuizStep].id;
                const isSelected = quizAnswers[qId] === optObj.originalIndex;
                const optImage = optObj.optionImage;

                return (
                  <button
                    key={optIdx}
                    onClick={() => handleAnswerSelect(qId, optObj.originalIndex)}
                    className={`text-left p-3.5 rounded-xl text-xs font-medium transition flex items-center gap-3 border ${
                      isSelected 
                        ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/50 shadow-sm shadow-cyan-400/5' 
                        : 'bg-slate-950 border-slate-850 hover:border-slate-800 text-slate-300'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] border shrink-0 ${
                      isSelected 
                        ? 'bg-cyan-500 text-slate-900 border-cyan-400' 
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}>
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    <div className="flex-1 flex items-center justify-between gap-3">
                      <span>{optObj.text}</span>
                      {optImage && (
                        <img 
                          src={optImage} 
                          className="w-12 h-12 object-cover rounded border border-slate-800 shrink-0" 
                          referrerPolicy="no-referrer" 
                          alt="Option visual"
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer switcher steps */}
            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <button
                onClick={() => {
                  setActiveQuizQuest(null);
                  setShuffledQuizQuestions([]);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Thoát bài nộp
              </button>

              <div className="flex gap-2">
                {currentQuizStep > 0 && (
                  <button
                    onClick={() => setCurrentQuizStep(currentQuizStep - 1)}
                    className="px-4 py-2 bg-slate-855 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold transition"
                  >
                    Quay lại
                  </button>
                )}

                {currentQuizStep < shuffledQuizQuestions.length - 1 ? (
                  <button
                    onClick={() => setCurrentQuizStep(currentQuizStep + 1)}
                    disabled={quizAnswers[shuffledQuizQuestions[currentQuizStep].id] === undefined}
                    className="px-5.5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1"
                  >
                    Trang tiếp
                  </button>
                ) : (
                  <button
                    onClick={submitQuizAnswers}
                    disabled={quizAnswers[shuffledQuizQuestions[currentQuizStep].id] === undefined}
                    className="px-5.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl text-xs font-bold transition inline-flex items-center gap-1.5 uppercase tracking-wide"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Nộp Bài Châm Điểm
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ACTIVE MANUAL FILE UPLOAD CHALLENGE MODAL */}
      {activeFileQuest && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full relative space-y-5">
            
            <div className="pb-2 border-b border-slate-800">
              <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-emerald-400">NỘP FILE HOÀN THIỆN NHIỆM VỤ</span>
              <h3 className="font-bold text-slate-100 text-md truncate mt-0.5">{activeFileQuest.title}</h3>
            </div>

            <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
              Vui lòng tải lên ảnh chụp bản vẽ thiết kế robot, bài thực hành PowerPoint hoặc kết quả mã Scratch để báo cáo Thầy Cô duyệt:
            </p>

            {/* Custom Drag Drop Zone boxes */}
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 border-2 border-dashed rounded-2xl text-center cursor-pointer transition duration-200 select-none ${
                dragActive 
                  ? 'border-emerald-400 bg-emerald-500/5' 
                  : droppedFile 
                    ? 'border-emerald-500/60 bg-slate-950/40' 
                    : 'border-slate-800 hover:border-slate-700 bg-slate-950/10'
              }`}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileSelect} 
                className="hidden" 
                accept="image/*,.pdf,.zip" 
              />
              
              <UploadCloud className={`w-10 h-10 mx-auto mb-2.5 ${droppedFile ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
              
              {droppedFile ? (
                <div>
                  <p className="text-xs font-bold text-slate-200 truncate">{droppedFile.name}</p>
                  <p className="text-[10px] text-slate-500 mt-1">Kích cỡ: {Math.round(droppedFile.size / 1024)} KB • Click lại để đổi</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-300">Kéo thả tệp hoặc click chọn từ thiết bị</p>
                  <p className="text-[10px] text-slate-500">Hỗ trợ Ảnh chụp, PDF hoặc tài liệu Zip</p>
                </div>
              )}
            </div>

            {/* Actions button */}
            <div className="flex justify-between items-center gap-2 pt-2">
              <button
                onClick={() => {
                  setActiveFileQuest(null);
                  setDroppedFile(null);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Hủy nập
              </button>

              <button
                onClick={submitFileChallenge}
                disabled={!droppedFile}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1 uppercase tracking-wide"
              >
                <CheckCircle2 className="w-4 h-4" /> Nộp bài tập
              </button>
            </div>

          </div>
        </div>
      )}

      {/* QUEST RESULT DETAILED OVERLAY DISPLAY MODAL */}
      {questResult && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full relative space-y-5 text-center shadow-2xl">
            
            {/* Close small cross top-right */}
            <button 
              onClick={() => setQuestResult(null)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Glowing Icon Banner */}
            <div className="flex justify-center pt-2">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center border ${
                questResult.success 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}>
                {questResult.success ? (
                  questResult.questType === 'voucher' ? (
                    <Sparkles className="w-7 h-7 text-yellow-400 animate-pulse" />
                  ) : (
                    <Trophy className="w-7 h-7 text-emerald-400" />
                  )
                ) : (
                  <AlertCircle className="w-7 h-7 text-rose-500" />
                )}
              </div>
            </div>

            {/* Quest Header */}
            <div>
              <span className={`text-[9px] uppercase font-mono font-bold tracking-widest ${
                questResult.success ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {questResult.success 
                  ? (questResult.questType === 'voucher' ? 'MIỄN BÀI TẬP THÀNH CÔNG' : 'HOÀN THÀNH NHIỆM VỤ') 
                  : 'CHƯA ĐẠT ĐIỂM TỐI ĐA'}
              </span>
              <h3 className="font-bold text-slate-100 text-md mt-1 leading-snug">
                {questResult.title}
              </h3>
            </div>

            {/* Score Display if Quiz */}
            {questResult.questType === 'quiz' && (
              <div className="space-y-2 bg-slate-950/60 p-3.5 rounded-2xl border border-slate-850 text-left">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-slate-400 font-sans">Điểm trắc nghiệm:</span>
                  <span className={questResult.success ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {questResult.score} / 100đ
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                  <span>Số câu chính xác:</span>
                  <span>{questResult.correctCount} / {questResult.totalCount} câu</span>
                </div>
                {/* Visual mini progress bar for quiz correctness */}
                <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${questResult.success ? 'bg-emerald-500' : 'bg-rose-500'}`}
                    style={{ width: `${questResult.score}%` }}
                  />
                </div>
              </div>
            )}

            {/* Explanation Logs */}
            <p className="text-xs text-slate-300 font-sans leading-relaxed px-1">
              {questResult.statusLogs}
            </p>

            {/* Gained Rewards cards */}
            {questResult.success && (questResult.rewardXp > 0 || questResult.rewardGold > 0) && (
              <div className="grid grid-cols-2 gap-3" id="quest-result-rewards">
                {questResult.rewardXp > 0 && (
                  <div className="p-2.5 bg-blue-950/20 border border-blue-500/20 rounded-xl flex flex-col items-center justify-center gap-0.5">
                    <span className="text-[9px] text-blue-450 uppercase tracking-wider font-mono">Kinh nghiệm</span>
                    <span className="font-bold text-blue-400 text-sm">+{questResult.rewardXp} XP</span>
                  </div>
                )}
                {questResult.rewardGold > 0 && (
                  <div className="p-2.5 bg-yellow-950/20 border border-yellow-500/20 rounded-xl flex flex-col items-center justify-center gap-0.5">
                    <span className="text-[9px] text-yellow-500 uppercase tracking-wider font-mono">Phần thưởng</span>
                    <span className="font-bold text-yellow-400 text-sm flex items-center gap-1">
                      +{questResult.rewardGold} <Coins className="w-3.5 h-3.5 text-yellow-500 inline" />
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Action button */}
            <div className="pt-1.5">
              <button
                onClick={() => setQuestResult(null)}
                className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer select-none ${
                  questResult.success 
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                {questResult.success ? 'Xác nhận & Tiếp tục' : 'Đóng & Thử lại sau'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
