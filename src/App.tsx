/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from 'react';
import { 
  User, Classroom, RoomParticipant, Quest, 
  QuestSubmission, AppNotification 
} from './types';
import { 
  db, initializeStorage, addSystemNotification, getLevelInfo, generateJointRooms, getGradeFromClass,
  subscribeToNotifications
} from './mockData';
import { 
  BookOpen, Shield, Flame, Terminal, LogOut, Users, Key, Lock, Eye, EyeOff, X,
  Activity, ArrowLeftRight, Clock, HelpCircle, GraduationCap, Settings, UserCheck, Smartphone,
  CheckCircle2, AlertTriangle, Info, Sparkles, Award
} from 'lucide-react';
import Leaderboard from './components/Leaderboard';
import TeacherView from './components/TeacherView';
import StudentView from './components/StudentView';
import AdminView from './components/AdminView';

export function getDeviceName(): string {
  if (typeof navigator === 'undefined') return 'Thiết bị không xác định';
  const ua = navigator.userAgent;
  let os = "Thiết bị không xác định";
  if (ua.includes("Windows NT")) os = "Windows PC";
  else if (ua.includes("Macintosh")) os = "macOS";
  else if (ua.includes("iPhone")) os = "iPhone";
  else if (ua.includes("iPad")) os = "iPad";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("Linux")) os = "Linux PC";

  let browser = "Trình duyệt";
  if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("Chrome") && !ua.includes("Chromium")) browser = "Chrome";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("OPR") || ua.includes("Opera")) browser = "Opera";
  
  return `${os} (${browser})`;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [activeRoomId, setActiveRoomId] = useState(() => db.getCurrentRoomId());
  
  // Controls swapping consoles: teacher vs student vs admin view
  const [currentConsole, setCurrentConsole] = useState<'teacher' | 'student' | 'admin'>('student');
  
  // Real-time notification log state
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [tickState, setTickState] = useState(0); // force redraws
  
  // Login fields
  const [loginType, setLoginType] = useState<'student' | 'teacher_admin'>('student');
  const [loginSelectedClass, setLoginSelectedClass] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Password alteration overlay modal triggers
  const [showChangePasswordForUser, setShowChangePasswordForUser] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');

  // Password forcing on first system log in
  const [pendingForceChangeUser, setPendingForceChangeUser] = useState<User | null>(null);
  const [forceNewPassword, setForceNewPassword] = useState('');
  const [forceConfirmPassword, setForceConfirmPassword] = useState('');

  // Automated Overdue sweep frequency configuration
  const [sweepFrequency, setSweepFrequency] = useState<'daily' | 'weekly'>(() => {
    return (localStorage.getItem('eduquest_sweep_frequency') as 'daily' | 'weekly') || 'daily';
  });
  const [sweepDay, setSweepDay] = useState<number>(() => {
    const saved = localStorage.getItem('eduquest_sweep_day');
    return saved !== null ? Number(saved) : 1; // Default to 1 (Thứ Hai / Monday)
  });

  // Real-time animated system toasts (Tailwind stylized)
  const [toasts, setToasts] = useState<Array<{
    id: string;
    title: string;
    message: string;
    type: 'success' | 'warning' | 'info' | 'level_up' | 'penalty';
  }>>([]);

  useEffect(() => {
    const unsubscribe = subscribeToNotifications((title, message, type) => {
      const id = 'toast-' + Math.random().toString(36).substr(2, 9);
      setToasts(prev => [...prev, { id, title, message, type }]);
      
      // Auto-dismiss after 6.5 seconds for readability
      const timer = setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 6500);

      return () => clearTimeout(timer);
    });
    return () => unsubscribe();
  }, []);

  // Low-level helper: check and populate active session
  const checkActiveSession = () => {
    // Check if secure login session token exists in localStorage or sessionStorage
    const savedUserId = localStorage.getItem('eduquest_session_user_id') || sessionStorage.getItem('eduquest_session_user_id');
    const savedExpire = localStorage.getItem('eduquest_session_expire') || sessionStorage.getItem('eduquest_session_expire');
    
    if (savedUserId && savedExpire) {
      const now = new Date().getTime();
      if (now < Number(savedExpire)) {
        // Token is valid! Auto login
        const users = db.getUsers();
        const user = users.find(u => u.id === savedUserId);
        if (user) {
          setActiveUser(user);
          setIsAuthenticated(true);
          
          if (user.role === 'admin') {
            setCurrentConsole('admin');
          } else if (user.role === 'teacher') {
            setCurrentConsole('teacher');
          } else {
            setCurrentConsole('student');
          }
          
          const savedRoomId = db.getCurrentRoomId();
          setActiveRoomId(savedRoomId);
        }
      } else {
        // Clears stale values
        localStorage.removeItem('eduquest_session_user_id');
        localStorage.removeItem('eduquest_session_expire');
        sessionStorage.removeItem('eduquest_session_user_id');
        sessionStorage.removeItem('eduquest_session_expire');
      }
    }
    refreshData();
  };

  // Initialize and check session (Remember Login)
  useEffect(() => {
    initializeStorage();
    checkActiveSession();
  }, []);

  // Sync Room Specific automated sweep settings whenever classroom code or activeRoom changes
  useEffect(() => {
    if (activeUser?.role === 'teacher' && activeRoomId) {
      const activeRoom = db.getRooms().find(r => r.id === activeRoomId);
      if (activeRoom) {
        setSweepFrequency(activeRoom.sweepFrequency || 'daily');
        setSweepDay(activeRoom.sweepDay !== undefined ? activeRoom.sweepDay : 1);
      }
    }
  }, [activeRoomId, activeUser]);

  const refreshData = () => {
    setNotifications(db.getNotifications());
    setTickState(prev => prev + 1);
  };

  // Google Sheets DB Sync Event Listener
  useEffect(() => {
    const handleSync = () => {
      // Re-run the active session with fresh datasets downloaded from Google Sheets
      checkActiveSession();
      
      // Refresh current active user reference to reflect any cloud edits
      const savedUserId = localStorage.getItem('eduquest_session_user_id') || sessionStorage.getItem('eduquest_session_user_id');
      if (savedUserId) {
        const freshUser = db.getUsers().find(u => u.id === savedUserId);
        if (freshUser) {
          setActiveUser(freshUser);
        }
      }
      
      // Force reload layouts
      refreshData();
      
      // Send beautiful sync success notification
      addSystemNotification(
        '☁️ ĐỒNG BỘ GOOGLE SHEET THÀNH CÔNG ☁️',
        'Toàn bộ tiến trình học tập và dữ liệu lớp học đã được đồng bộ hóa thành công với Google Sheets!',
        'success'
      );
    };

    window.addEventListener('eduquest_db_sync', handleSync);
    return () => window.removeEventListener('eduquest_db_sync', handleSync);
  }, []);

  // Synchronous constraint: Auto focus class-appropriate workspace room for student/teacher
  useEffect(() => {
    if (!activeUser) return;
    
    const allRooms = db.getRooms();
    const filtered = allRooms.filter(r => {
      if (activeUser.role === 'admin') return true;
      if (activeUser.role === 'teacher') return r.teacherId === activeUser.id;
      if (activeUser.role === 'student') return r.targetClass === activeUser.studentClass;
      return false;
    });

    if (filtered.length > 0) {
      const exists = filtered.some(r => r.id === activeRoomId);
      if (!exists) {
        setActiveRoomId(filtered[0].id);
        db.setCurrentRoomId(filtered[0].id);
      }
    } else {
      if (activeRoomId) {
        setActiveRoomId('');
        db.setCurrentRoomId('');
      }
    }
  }, [activeUser, activeRoomId]);

  // Check if active student's device has been reset/de-linked by Admin/Teacher
  useEffect(() => {
    if (!activeUser || activeUser.role !== 'student') return;

    const checkStudentDevice = () => {
      const users = db.getUsers();
      const dbUser = users.find(u => u.id === activeUser.id);
      
      if (dbUser) {
        const currentDevice = getDeviceName();
        // If device has been unlinked (is falsy or different), force logout
        if (!dbUser.studentDevice || dbUser.studentDevice !== currentDevice) {
          handleSignOut();
          alert(
            `⚠️ THIẾT BỊ ĐÃ BỊ CỐ GIẢI PHÓNG / GỠ LIÊN KẾT!\n\n` +
            `Tài khoản học sinh [${dbUser.fullName}] (Lớp ${dbUser.studentClass || 'Chưa xếp lớp'}, Mã HS: ${dbUser.email}) đã được Admin/Giáo viên gỡ liên kết thiết bị cũ.\n\n` +
            `Hệ thống tự động đăng xuất tài khoản này khỏi thiết bị cũ để cho phép đăng nhập trên thiết bị mới.`
          );
        }
      } else {
        // user no longer exists
        handleSignOut();
      }
    };

    // Run once on load/activeUser change
    checkStudentDevice();

    // Check periodically every 2 seconds
    const interval = setInterval(checkStudentDevice, 2000);
    return () => clearInterval(interval);
  }, [activeUser, tickState]);

  // Automated room enrollment for students based on their class assignment
  useEffect(() => {
    if (activeUser && activeUser.role === 'student' && activeRoomId) {
      const room = db.getRooms().find(r => r.id === activeRoomId);
      if (!room) return;

      const isMatch = room.targetClass === activeUser.studentClass || 
                      (room.isJoint && (room.classes?.includes(activeUser.studentClass) || 
                       getGradeFromClass(activeUser.studentClass) === (room.targetClass ? room.targetClass.replace(/\D/g, '') : '')));
      
      if (!isMatch) return;

      const allParts = db.getParticipants();
      const hasParticipation = allParts.some(p => p.studentId === activeUser.id && p.roomId === activeRoomId);
      
      if (!hasParticipation) {
        const newPart: RoomParticipant = {
          id: 'part-auto-' + Math.random().toString(36).substr(2, 9),
          roomId: activeRoomId,
          studentId: activeUser.id,
          currentXp: 151, // default starting XP
          currentLevel: 1,
          goldBalance: 50,
          luckySpins: 1,
          joinedAt: new Date().toISOString()
        };
        db.setParticipants([...allParts, newPart]);
        refreshData();
      }
    }
  }, [activeUser, activeRoomId]);

  const handleLogin = (e: FormEvent) => {
    e.preventDefault();
    const users = db.getUsers();

    if (loginType === 'student') {
      if (!loginSelectedClass) {
        alert("Vui lòng chọn Lớp học ở bước 1!");
        return;
      }
      if (!loginEmail) {
        alert("Vui lòng chọn Tên và Mã học sinh ở bước 2!");
        return;
      }
      const student = users.find(u => u.email.toLowerCase().trim() === loginEmail.toLowerCase().trim() && u.role === 'student');
      if (!student) {
        alert("Mã học sinh không tồn tại trên hệ thống! Vui lòng chọn tài khoản từ danh sách hoặc liên hệ giáo viên.");
        return;
      }

      const currentDevice = getDeviceName();
      if (student.studentDevice && student.studentDevice !== currentDevice) {
        alert(`Tài khoản của bạn đã được đăng ký đăng nhập trên thiết bị:\n👉 [${student.studentDevice}]\n\nBạn không thể đăng nhập từ thiết bị mới:\n❌ [${currentDevice}]\n\nVui lòng liên hệ Giáo viên hoặc Admin quản trị để gỡ bỏ liên kết thiết bị cũ trước khi đăng nhập thiết bị mới!`);
        return;
      }

      if (!student.studentDevice) {
        student.studentDevice = currentDevice;
        const updatedUsers = users.map(u => u.id === student.id ? { ...u, studentDevice: currentDevice } : u);
        db.setUsers(updatedUsers);
      }

      loginUserWithSuccess(student);
    } else {
      const user = users.find(u => u.email.toLowerCase().trim() === loginEmail.toLowerCase().trim());
      if (!user) {
        alert("Email tài khoản không tồn tại! Vui lòng kiểm tra lại thông tin đăng nhập.");
        return;
      }
      
      if (user.role === 'student') {
        alert("Tài khoản học sinh không được đăng nhập tại phân hệ Giáo viên / Admin! Vui lòng chọn mục Học sinh.");
        return;
      }

      // Verify Password (required for admin / teacher)
      if (!loginPassword) {
        alert("Vui lòng nhập mật khẩu đăng nhập!");
        return;
      }

      if (user.password && user.password !== loginPassword) {
        alert("Mật khẩu không chính xác! Vui lòng thử lại.");
        return;
      }

      // Check force change password request
      if (user.mustChangePassword) {
        setPendingForceChangeUser(user);
        setForceNewPassword('');
        setForceConfirmPassword('');
        return;
      }

      loginUserWithSuccess(user);
    }
  };

  const loginUserWithSuccess = (user: User) => {
    setActiveUser(user);
    setIsAuthenticated(true);
    
    if (user.role === 'admin') {
      setCurrentConsole('admin');
    } else if (user.role === 'teacher') {
      setCurrentConsole('teacher');
    } else {
      setCurrentConsole('student');
    }

    // Simulate 30 days remember login encrypted token
    if (rememberMe) {
      const expireTime = new Date();
      expireTime.setDate(expireTime.getDate() + 30); // 30-day window duration
      localStorage.setItem('eduquest_session_user_id', user.id);
      localStorage.setItem('eduquest_session_expire', expireTime.getTime().toString());
      sessionStorage.removeItem('eduquest_session_user_id');
      sessionStorage.removeItem('eduquest_session_expire');
    } else {
      // If remember status is unselected, save to sessionStorage for this tab only
      const expireTime = new Date();
      expireTime.setHours(expireTime.getHours() + 24); // 24 hours window
      sessionStorage.setItem('eduquest_session_user_id', user.id);
      sessionStorage.setItem('eduquest_session_expire', expireTime.getTime().toString());
      localStorage.removeItem('eduquest_session_user_id');
      localStorage.removeItem('eduquest_session_expire');
    }

    addSystemNotification(
      'Đăng nhập thành công',
      `Người dùng [${user.fullName}] đăng nhập thành công vai trò [${user.role}].`,
      'info'
    );
    
    // Clear login inputs
    setLoginPassword('');
    refreshData();
  };

  const handleSignOut = () => {
    localStorage.removeItem('eduquest_session_user_id');
    localStorage.removeItem('eduquest_session_expire');
    sessionStorage.removeItem('eduquest_session_user_id');
    sessionStorage.removeItem('eduquest_session_expire');
    setIsAuthenticated(false);
    setActiveUser(null);
  };

  // Password update action for any logged-in user
  const handleChangePassword = (e: FormEvent) => {
    e.preventDefault();
    if (!activeUser) return;

    if (!currentPasswordInput || !newPasswordInput || !confirmPasswordInput) {
      alert("Vui lòng nhập đầy đủ tất cả các trường mật khẩu!");
      return;
    }

    if (activeUser.password && activeUser.password !== currentPasswordInput) {
      alert("Mật khẩu hiện tại không chính xác!");
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      alert("Xác nhận mật khẩu mới không trùng khớp với mật khẩu mới!");
      return;
    }

    if (newPasswordInput.length < 4) {
      alert("Mật khẩu mới phải từ 4 ký tự trở lên để đảm bảo an toàn!");
      return;
    }

    // Save updated password in local storage
    const allUsers = db.getUsers();
    const updatedUsers = allUsers.map(u => {
      if (u.id === activeUser.id) {
        return {
          ...u,
          password: newPasswordInput,
          mustChangePassword: false
        };
      }
      return u;
    });

    db.setUsers(updatedUsers);
    
    // Update live state
    setActiveUser({
      ...activeUser,
      password: newPasswordInput,
      mustChangePassword: false
    });

    addSystemNotification(
      'Đổi mật khẩu thành công',
      `Người dùng [${activeUser.fullName}] đã cập nhật mật khẩu thành công.`,
      'success'
    );

    setCurrentPasswordInput('');
    setNewPasswordInput('');
    setConfirmPasswordInput('');
    setShowChangePasswordForUser(false);

    alert("Đã thay đổi mật khẩu của bạn thành công!");
  };

  // First sign-in force change password handler
  const handleForceChangePasswordSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!pendingForceChangeUser) return;

    if (!forceNewPassword || !forceConfirmPassword) {
      alert("Vui lòng điền đầy đủ tất cả các trường mật khẩu!");
      return;
    }

    if (forceNewPassword !== forceConfirmPassword) {
      alert("Mật khẩu mới và Nhập lại mật khẩu mới không trùng khớp!");
      return;
    }

    if (forceNewPassword.length < 4) {
      alert("Mật khẩu mới phải từ 4 ký tự trở lên để đảm bảo an toàn!");
      return;
    }

    // Update in database record
    const allUsers = db.getUsers();
    const updatedUsers = allUsers.map(u => {
      if (u.id === pendingForceChangeUser.id) {
        return {
          ...u,
          password: forceNewPassword,
          mustChangePassword: false
        };
      }
      return u;
    });

    db.setUsers(updatedUsers);

    const updatedUserObj = updatedUsers.find(u => u.id === pendingForceChangeUser.id)!;
    
    addSystemNotification(
      'Cập nhật mật khẩu cưỡng bức thành công',
      `Người dùng giáo viên [${updatedUserObj.fullName}] đã đổi mật khẩu mật an toàn lần đầu đăng nhập.`,
      'success'
    );

    setPendingForceChangeUser(null);
    setForceNewPassword('');
    setForceConfirmPassword('');

    // Access console
    loginUserWithSuccess(updatedUserObj);
    alert("Đã thiết lập mật khẩu mới thành công! Đang chuyển hướng bạn vào hệ thống.");
  };

  // Vòng lặp Quá hạn (Cron Job 00:00 - Midnight Overdue Solver)
  const triggerMidnightSweep = () => {
    if (!activeRoomId) {
      alert("Vui lòng khởi lập hoặc chọn một phòng học để rà soát phạt quá hạn!");
      return;
    }
    const allRooms = db.getRooms();
    const teacherRooms = allRooms.filter(r => r.teacherId === activeUser?.id);
    const adminClasses = db.getClasses();
    
    const localRooms = teacherRooms.map(r => {
      if (r.isJoint) {
        const grade = r.targetClass ? r.targetClass.replace(/\D/g, '') : '';
        const subrooms = allRooms.filter(other => 
          other.teacherId === r.teacherId && 
          other.subjectName === r.subjectName && 
          !other.isJoint && 
          other.targetClass &&
          getGradeFromClass(other.targetClass) === grade
        ).map(other => other.id);
        
        const gradeToClasses: string[] = [];
        adminClasses.forEach(c => {
          if (getGradeFromClass(c) === grade) {
            gradeToClasses.push(c);
          }
        });
        
        return {
          ...r,
          subrooms,
          classes: r.classes && r.classes.length > 0 ? r.classes : gradeToClasses
        };
      }
      return r;
    });
    const currentRoom = localRooms.find(r => r.id === activeRoomId);

    const allQuests = currentRoom?.isJoint
      ? db.getQuests().filter(q => currentRoom.subrooms?.includes(q.roomId))
      : db.getQuests().filter(q => q.roomId === activeRoomId);
    const allParts = db.getParticipants();
    const allSubs = db.getSubmissions();
    const allUsers = db.getUsers();
    
    const now = new Date();
    const currentDayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday, etc.
    const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    
    // If it's weekly and today is not the matching day, we explain this to the user but allow manual override sweep
    if (sweepFrequency === 'weekly' && currentDayOfWeek !== sweepDay) {
      const confirmRun = window.confirm(
        `[CÀI ĐẶT LỊCH QUÉT PHẠT]\n` +
        `• Tần suất đang cài đặt: Quét vào ${dayNames[sweepDay]} hằng tuần.\n` +
        `• Hôm nay là: ${dayNames[currentDayOfWeek]}.\n\n` +
        `Ở chế độ tự động thực tế, hệ thống sẽ KHÔNG quét phạt hôm nay.\n\n` +
        `Bạn có muốn tiếp tục chạy cưỡng bức (Manual Override) ngay bây giờ không?`
      );
      if (!confirmRun) return;
    }

    let penalizedCount = 0;
    let logs: string[] = [];

    const updatedSubs = [...allSubs];
    const updatedParticipants = [...allParts];

    allQuests.forEach(quest => {
      const questDeadline = new Date(quest.deadline);
      
      // Is quest expired?
      if (questDeadline.getTime() < now.getTime()) {
        // Scan each student enrolled in this quest's classroom
        const classParticipants = updatedParticipants.filter(p => p.roomId === quest.roomId);
        
        classParticipants.forEach(student => {
          // Did they submit this quest?
          const subIdx = updatedSubs.findIndex(s => s.questId === quest.id && s.studentId === student.studentId);
          const sub = subIdx !== -1 ? updatedSubs[subIdx] : null;

          const hasPassed = sub && sub.status === 'passed';
          const hasSubmittedReview = sub && sub.status === 'submitted';
          const alreadyFailed = sub && sub.status === 'failed';

          // If no submit / pending submit / failed
          if (!hasPassed && !hasSubmittedReview && !alreadyFailed) {
            penalizedCount++;

            // Deduct XP and Gold on room_participants
            const pIdx = updatedParticipants.findIndex(p => p.studentId === student.studentId && p.roomId === quest.roomId);
            const pGoldPenalty = quest.penaltyGold || 0;
            if (pIdx !== -1) {
              const oldXp = updatedParticipants[pIdx].currentXp;
              const newXp = Math.max(0, oldXp - quest.penaltyXp);
              updatedParticipants[pIdx].currentXp = newXp;

              const oldGold = updatedParticipants[pIdx].goldBalance || 0;
              updatedParticipants[pIdx].goldBalance = Math.max(0, oldGold - pGoldPenalty);

              // Check if level decreased
              const { level: computedLevel } = getLevelInfo(newXp);
              updatedParticipants[pIdx].currentLevel = computedLevel;
            }

            const penaltyDescStr = `-${quest.penaltyXp} XP` + (pGoldPenalty > 0 ? ` & -${pGoldPenalty} Vàng` : '');

            // Write Failure log to subs
            if (sub) {
              updatedSubs[subIdx].status = 'failed';
              updatedSubs[subIdx].statusLogs = `Thất bại quá hạn: Hệ thống quét phạt trễ hạn trừ ${penaltyDescStr} lúc nửa đêm.`;
            } else {
              updatedSubs.push({
                id: 'sub-penalty-' + Math.random().toString(36).substr(2, 9),
                questId: quest.id,
                studentId: student.studentId,
                status: 'failed',
                isVoucherUsed: false,
                submittedAt: new Date().toISOString(),
                gradedAt: new Date().toISOString(),
                statusLogs: `Thất bại quá hạn: Không thực hiện thử thách, bị quét phạt trễ hạn ${penaltyDescStr}.`
              });
            }

            const u = allUsers.find(user => user.id === student.studentId);
            logs.push(`- Học sinh [${u?.fullName || 'Ẩn danh'}] bị trừ [${penaltyDescStr}] ở bài [${quest.title}]`);
          }
        });
      }
    });

    if (penalizedCount > 0) {
      db.setParticipants(updatedParticipants);
      db.setSubmissions(updatedSubs);

      // Play buzzer sound
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } catch (e) {}

      addSystemNotification(
        'Đã chạy rà soát quá hạn 00:00! 🚨',
        `Phát hiện và tự động chuyển thất bại trễ hạn phạt ${penalizedCount} bài tập chưa nộp của học sinh.`,
        'penalty'
      );

      // Inform user detailing the transactions
      alert(`[Kích Hoạt Quét Trễ Hạn Thành Công]\n\nPhát hiện ${penalizedCount} bài tập nộp thiếu quá deadline.\n\nHệ thống tự động trừ điểm:\n${logs.join('\n')}`);
    } else {
      alert("Hệ thống đã dọn sạch! Không phát hiện thêm trường hợp trễ hạn chưa được phạt nào.");
    }

    refreshData();
  };

  const getNotificationIconColors = (type: string) => {
    switch (type) {
      case 'success': return 'bg-emerald-500/20 text-emerald-400';
      case 'warning': return 'bg-orange-500/20 text-orange-400';
      case 'level_up': return 'bg-yellow-500/20 text-yellow-500 font-bold border border-yellow-500/20';
      case 'penalty': return 'bg-rose-500/20 text-rose-400 border border-rose-500/25 animate-pulse';
      default: return 'bg-slate-800 text-slate-300';
    }
  };

  // First sign-in force change password wizard page
  if (pendingForceChangeUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans select-none">
        {/* Glow vector points */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-amber-500/5 blur-3xl rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-yellow-500/5 blur-3xl rounded-full" />

        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative space-y-6 text-center animate-fade-in z-10">
          <div className="space-y-2">
            <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-amber-500 to-yellow-400 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/10">
              <Lock className="w-8 h-8 text-slate-950" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-white font-display uppercase">ĐỔI MẬT KHẨU LẦN ĐẦU</h1>
            <p className="text-xs text-slate-400">
              Tài khoản giáo viên <span className="text-amber-400 font-bold">{pendingForceChangeUser.fullName}</span> do Quản trị thiết lập bắt buộc phải thay đổi mật khẩu trước khi tiếp tục.
            </p>
          </div>

          <form onSubmit={handleForceChangePasswordSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 font-mono">
                Mật khẩu mới an toàn:
              </label>
              <input 
                type="password" 
                value={forceNewPassword}
                onChange={e => setForceNewPassword(e.target.value)}
                required
                placeholder="Nhập tối thiểu 4 kí tự..."
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 focus:outline-none focus:border-amber-500 transition duration-150"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 font-mono">
                Xác nhận mật khẩu mới:
              </label>
              <input 
                type="password" 
                value={forceConfirmPassword}
                onChange={e => setForceConfirmPassword(e.target.value)}
                required
                placeholder="Xác thực trùng khớp mật khẩu mới..."
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 focus:outline-none focus:border-amber-500 transition duration-150"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-tr from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs rounded-xl tracking-wider uppercase transition shadow-md shadow-amber-950/20 cursor-pointer"
            >
              THIẾT LẬP VÀ ĐĂNG NHẬP
            </button>

            <button
              type="button"
              onClick={() => {
                setPendingForceChangeUser(null);
                setLoginPassword('');
              }}
              className="w-full py-2.5 bg-slate-950 hover:bg-slate-850 text-slate-400 font-semibold text-xs rounded-xl text-center cursor-pointer transition border border-transparent hover:border-slate-800"
            >
              Hủy bỏ / Quay về Trang Đăng Nhập
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !activeUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans select-none">
        {/* Glow vector points */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-emerald-500/5 blur-3xl rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-yellow-500/5 blur-3xl rounded-full" />

        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative space-y-6 text-center animate-fade-in z-10">
          
          <div className="space-y-2">
            <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-emerald-500 to-yellow-400 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <GraduationCap className="w-9 h-9 text-slate-950" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white font-display">EDUQUEST ENGINE</h1>
            <p className="text-[11px] text-slate-400 uppercase tracking-widest font-bold text-emerald-400">
              Hệ thống Giáo dục Lớp học Số học
            </p>
          </div>

          {/* Segment Selection for Login Type */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 border border-slate-850 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setLoginType('student');
                setLoginSelectedClass('');
                setLoginEmail('');
                setLoginPassword('');
              }}
              className={`py-2.5 px-3 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                loginType === 'student'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-350'
              }`}
            >
              🎓 Học Sinh
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginType('teacher_admin');
                setLoginSelectedClass('');
                setLoginEmail('');
                setLoginPassword('');
              }}
              className={`py-2.5 px-3 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                loginType === 'teacher_admin'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-350'
              }`}
            >
              🔑 Giáo viên / Admin
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-5 text-left">
            {loginType === 'student' ? (
              <div className="space-y-4">
                {(() => {
                  const studentUsers = db.getUsers().filter(u => u.role === 'student');
                  const classesList = Array.from(new Set(studentUsers.map(st => st.studentClass).filter(Boolean))).sort() as string[];

                  if (studentUsers.length === 0) {
                    return (
                      <div className="p-4 bg-emerald-950/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 font-mono leading-relaxed">
                        💡 Chưa có học sinh nào được thêm vào hệ thống. Giáo viên cần đăng nhập để tạo học sinh mới hoặc import danh sách lớp học.
                      </div>
                    );
                  }

                  return (
                    <>
                      {/* 1. Chọn Lớp */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                          Bước 1: Chọn Lớp Học của Bạn:
                        </label>
                        <select
                          value={loginSelectedClass}
                          required
                          onChange={e => {
                            setLoginSelectedClass(e.target.value);
                            setLoginEmail(''); // reset selected student when class changes
                          }}
                          className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-slate-200 focus:outline-none focus:border-emerald-500 transition duration-150 cursor-pointer"
                        >
                          <option value="">-- Bấm chọn lớp học của bạn --</option>
                          {classesList.map(clsName => (
                            <option key={clsName} value={clsName}>
                              🏫 Lớp {clsName}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* 2. Chọn Tên Học sinh + (Mã học sinh) */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                          Bước 2: Chọn Tên & Mã Học Sinh:
                        </label>
                        <select
                          value={loginEmail}
                          required
                          disabled={!loginSelectedClass}
                          onChange={e => setLoginEmail(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-semibold text-slate-200 focus:outline-none focus:border-emerald-500 transition duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {!loginSelectedClass ? (
                            <option value="">-- Hãy chọn lớp học ở bước 1 trước --</option>
                          ) : (
                            <>
                              <option value="">-- Chọn tên & mã học sinh của bạn --</option>
                              {studentUsers
                                .filter(st => st.studentClass === loginSelectedClass)
                                .map(st => (
                                  <option key={st.id} value={st.email}>
                                    👤 {st.fullName} ({st.email})
                                  </option>
                                ))}
                            </>
                          )}
                        </select>
                      </div>
                    </>
                  );
                })()}

                <div className="p-3 bg-yellow-500/5 border border-yellow-500/10 rounded-xl text-[10px] text-slate-300 leading-normal flex items-start gap-2">
                  <span className="text-yellow-400 shrink-0">✨</span>
                  <span>Phương thức đăng nhập nhanh cho Học sinh mà <strong>không cần mật khẩu</strong> giúp các em trải nghiệm học tập game hóa thuận lợi nhất. Do giáo viên quản lý lớp phân phối điểm số và phần thưởng.</span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                    Email Quản trị / Giáo viên:
                  </label>
                  <input 
                    type="email" 
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    required
                    placeholder="Nhập email giáo viên..."
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500 transition duration-150"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 font-mono">
                    Mật khẩu bảo mật:
                  </label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"}
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      required
                      placeholder="Nhập mật khẩu..."
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500 transition duration-150 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-500 hover:text-slate-300 cursor-pointer"
                      title="Hiển thị mật khẩu"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Remember Me Toggle */}
            <div className="flex items-center justify-between py-0.5 text-[11px]">
              <label className="flex items-center gap-2 text-slate-400 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="accent-emerald-500 w-4 h-4 rounded cursor-pointer"
                />
                <span>Duy trì đăng nhập trên trình duyệt này</span>
              </label>
            </div>

            <button
              type="submit"
              className={`w-full py-3 hover:scale-[1.01] active:scale-100 text-white font-bold text-xs rounded-xl tracking-wider uppercase transition shadow-md cursor-pointer ${
                loginType === 'student'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/20'
                  : 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-950/20'
              }`}
            >
              {loginType === 'student' ? '🚀 VÀO LỚP HỌC CHINH PHỤC' : '🔒 XÁC THỰC VÀO HỆ THỐNG'}
            </button>
          </form>


          
        </div>
      </div>
    );
  }

  // Filter rooms according to role privileges
  const allRooms = db.getRooms();
  const rawRooms = allRooms.filter(r => {
    if (!activeUser) return false;
    if (activeUser.role === 'admin') return true;
    if (activeUser.role === 'teacher') return r.teacherId === activeUser.id;
    if (activeUser.role === 'student') {
      if (r.targetClass === activeUser.studentClass) return true;
      if (r.isJoint) {
        if (r.classes?.includes(activeUser.studentClass)) return true;
        const studentGrade = getGradeFromClass(activeUser.studentClass);
        const roomGrade = r.targetClass ? r.targetClass.replace(/\D/g, '') : '';
        if (studentGrade && roomGrade && studentGrade === roomGrade) return true;
      }
      return false;
    }
    return false;
  });

  const adminClasses = db.getClasses();
  
  // Dynamically map subrooms and classes for joint rooms so they stay always updated
  const rooms = rawRooms.map(r => {
    if (r.isJoint) {
      const grade = r.targetClass ? r.targetClass.replace(/\D/g, '') : '';
      const subrooms = allRooms.filter(other => 
        other.teacherId === r.teacherId && 
        other.subjectName === r.subjectName && 
        !other.isJoint && 
        other.targetClass &&
        getGradeFromClass(other.targetClass) === grade
      ).map(other => other.id);
      
      const gradeToClasses: string[] = [];
      adminClasses.forEach(c => {
        if (getGradeFromClass(c) === grade) {
          gradeToClasses.push(c);
        }
      });
      
      return {
        ...r,
        subrooms,
        classes: r.classes && r.classes.length > 0 ? r.classes : gradeToClasses
      };
    }
    return r;
  });
  
  const activeRoom = rooms.find(r => r.id === activeRoomId) || rooms[0];

  const users = db.getUsers();

  // Active room data fetching
  const participants = activeRoom?.isJoint
    ? db.getParticipants().filter(p => {
        if (!activeRoom.subrooms?.includes(p.roomId)) return false;
        const studentUser = users.find(u => u.id === p.studentId);
        if (studentUser && studentUser.studentClass && activeRoom.classes) {
          return activeRoom.classes.includes(studentUser.studentClass);
        }
        return true;
      })
    : db.getParticipants().filter(p => {
        if (p.roomId !== activeRoomId) return false;
        const studentUser = users.find(u => u.id === p.studentId);
        if (studentUser && studentUser.studentClass && activeRoom?.targetClass) {
          return studentUser.studentClass === activeRoom.targetClass;
        }
        return true;
      });

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-slate-100 pb-12">
      
      {/* GLOBAL AUTOMATED CRON SWEEPING ALERTS RIBBON BAR */}
      {activeUser?.role === 'teacher' && activeRoom && (
        <div className="bg-slate-900 border-b border-rose-500/20 text-slate-300 px-4 py-2">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            
            <div className="flex flex-wrap items-center gap-2 text-rose-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              <span className="font-semibold text-[10px] tracking-wide uppercase font-display hidden md:inline">Bộ não tự động hóa lớp [{activeRoom.roomName}]</span>
              <span className="text-slate-500 hidden md:inline">|</span>
              <div className="flex flex-wrap items-center gap-1.5 text-slate-300">
                <span className="text-slate-400 text-[11px] font-sans flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-rose-400" /> Tự động phạt trễ hạn lớp:
                </span>
                
                <select
                  value={sweepFrequency}
                  onChange={e => {
                    const val = e.target.value as 'daily' | 'weekly';
                    setSweepFrequency(val);
                    
                    const allRooms = db.getRooms();
                    const updated = allRooms.map(r => r.id === activeRoom.id ? { ...r, sweepFrequency: val } : r);
                    db.setRooms(updated);
                    
                    addSystemNotification(
                      'Đặt tần suất phạt phòng',
                      `Phòng [${activeRoom.roomName}]: Thiết lập chu kỳ phạt trễ hạn tự động sang: ${val === 'daily' ? 'Hằng ngày' : 'Cố định một ngày trong tuần'}.`,
                      'info'
                    );
                    refreshData();
                  }}
                  className="bg-slate-950 border border-slate-800 text-[10px] text-rose-400 font-bold px-2 py-1 rounded-lg focus:outline-none focus:border-rose-500 cursor-pointer"
                >
                  <option value="daily">Hằng ngày lúc 00:00</option>
                  <option value="weekly">Một ngày trong tuần</option>
                </select>

                {sweepFrequency === 'weekly' && (
                  <select
                    value={sweepDay}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setSweepDay(val);
                      
                      const allRooms = db.getRooms();
                      const updated = allRooms.map(r => r.id === activeRoom.id ? { ...r, sweepDay: val } : r);
                      db.setRooms(updated);
                      
                      const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
                      addSystemNotification(
                        'Đặt ngày phạt phòng',
                        `Phòng [${activeRoom.roomName}]: Đã thiết lập tự động phạt trễ hạn cố định vào ngày: ${dayNames[val]}.`,
                        'info'
                      );
                      refreshData();
                    }}
                    className="bg-slate-950 border border-slate-800 text-[10px] text-rose-400 font-bold px-2 py-1 rounded-lg focus:outline-none focus:border-rose-500 cursor-pointer"
                  >
                    <option value={1}>Thứ Hai</option>
                    <option value={2}>Thứ Ba</option>
                    <option value={3}>Thứ Tư</option>
                    <option value={4}>Thứ Năm</option>
                    <option value={5}>Thứ Sáu</option>
                    <option value={6}>Thứ Bảy</option>
                    <option value={0}>Chủ Nhật</option>
                  </select>
                )}
              </div>
            </div>

            {/* SIMULATOR QUICK REACTION TRIGGER */}
            <button
              id="btn-trigger-cron"
              onClick={triggerMidnightSweep}
              className="px-4 py-1 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-400 hover:to-orange-400 text-white font-bold rounded-lg text-[10px] tracking-wider uppercase shadow hover:scale-[1.01] transition cursor-pointer"
              title="Nhấp chọn để rà soát tự trừ XP đối với các học sinh thiếu bài tập khi quá hạn chót của lớp hiện hành."
            >
              🚨 KIỂM TRA PHẠT QUÁ HẠN LỚP (Sweep)
            </button>
            
          </div>
        </div>
      )}

      {/* TOP DESKTOP NAVIGATION BAR */}
      <header className="bg-slate-900/60 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-wrap items-center justify-between gap-4">
          
          {/* Logo brand */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-yellow-400 flex items-center justify-center shadow-md">
              <GraduationCap className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <span className="font-black text-white tracking-widest text-sm font-display">EDUQUEST ENGINE</span>
              <span className="text-[10px] text-slate-400 ml-2 block sm:inline font-mono">v1.2.0</span>
            </div>
          </div>

          {/* Active user status and control elements */}
          <div className="flex items-center gap-2">
            {activeUser.role === 'admin' ? (
              <span className="text-xs bg-slate-800/80 text-amber-400 text-[11px] px-3 py-1.5 rounded-xl border border-amber-500/10 font-bold flex items-center gap-1">
                🛠️ {activeUser.fullName} (Admin)
              </span>
            ) : activeUser.role === 'teacher' ? (
              <span className="text-xs bg-slate-800/80 text-emerald-400 text-[11px] px-3 py-1.5 rounded-xl border border-slate-700/60 font-semibold">
                {activeUser.fullName} (Giáo viên)
              </span>
            ) : (
              <span className="text-xs bg-slate-800/80 text-cyan-400 text-[11px] px-3 py-1.5 rounded-xl border border-slate-700/60 font-semibold">
                🎓 {activeUser.fullName} (Học viên)
              </span>
            )}

            {/* Change Password Trigger Button */}
            <button
              onClick={() => {
                setCurrentPasswordInput('');
                setNewPasswordInput('');
                setConfirmPasswordInput('');
                setShowChangePasswordForUser(true);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-amber-400 text-[11px] font-bold rounded-xl border border-slate-700/55 transition cursor-pointer"
              title="Đổi mật khẩu tài khoản hiện tại"
            >
              <Key className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden md:inline">Đổi mật khẩu</span>
            </button>

            <button 
              onClick={handleSignOut} 
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded-lg transition"
              title="Đăng xuất khỏi hệ thống"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>

        </div>
      </header>

      {/* CORE FRAMEWORK GRID CONTENT */}
      <main className="max-w-7xl mx-auto px-4 py-8 w-full flex-1">
        
        {/* Active room indicator band */}
        {currentConsole !== 'admin' && (
          <div className="mb-6 p-4 bg-slate-900/40 border border-slate-800/85 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase font-mono tracking-wider">Phòng học hiện hành</span>
              <h1 className="text-lg font-bold text-slate-100 flex items-center gap-1.5">
                <span>{activeRoom?.roomName || 'Đang tải...'}</span>
                <span className="text-xs bg-slate-800 text-yellow-500 font-mono font-bold px-2 py-0.5 rounded-full border border-slate-700">
                  Mã vào lớp: {activeRoom?.inviteCode}
                </span>
              </h1>
            </div>
            
            {/* Room quick changer dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Chọn phòng:</span>
              <select
                value={activeRoomId}
                onChange={e => {
                  setActiveRoomId(e.target.value);
                  db.setCurrentRoomId(e.target.value);
                  refreshData();
                }}
                className="text-xs font-semibold bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>{r.roomName}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Master Double-Column structure on Desktop (Left controls / Right sidebar) */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 items-start">
          
          {/* LEFT 3 COLUMNS: MAIN WORKSPACE CHANGED BY ACTIVE VIEW STATE */}
          <div className={`${currentConsole === 'admin' ? 'xl:col-span-4' : 'xl:col-span-3'} space-y-6`}>
            {currentConsole === 'admin' ? (
              <AdminView onDataModified={refreshData} tick={tickState} />
            ) : currentConsole === 'teacher' ? (
              <TeacherView 
                teacherId={activeUser.id} 
                activeRoomId={activeRoomId} 
                onActiveRoomChanged={(id) => {
                  setActiveRoomId(id);
                  refreshData();
                }}
                onDataModified={refreshData}
              />
            ) : (
              <StudentView 
                studentId={activeUser.id}
                activeRoomId={activeRoomId}
                onDataModified={refreshData}
              />
            )}
          </div>

          {/* RIGHT COLUMNS: PERSISTENT HIGH-SCORES LEADERBOARD & EVENTS LOG */}
          {currentConsole !== 'admin' && (
            <div className="xl:col-span-1 space-y-6">
              
              {/* Leaderboard panel list */}
              <Leaderboard 
                participants={participants} 
                users={users} 
                currentUserId={activeUser.id}
              />

            </div>
          )}

        </div>

      </main>

      {/* FOOTER */}
      <footer className="text-center py-6 text-[10px] text-slate-500 mt-12 border-t border-slate-900">
        <p>© 2026 EduQuest Engine. Thiết lập quy chế tự động hóa học thuật tối tân.</p>
      </footer>

      {/* PASSWORD CHANGE DIALOG MODAL OVERLAY */}
      {showChangePasswordForUser && (
        <div id="change-password-modal" className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-fade-in text-left">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-805 text-amber-500">
              <Key className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-sm text-slate-100 flex-1">ĐỔI MẬT KHẨU TÀI KHOẢN</h3>
              <button 
                onClick={() => setShowChangePasswordForUser(false)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 font-mono">Mật khẩu hiện tại:</label>
                <input 
                  type="password"
                  required
                  value={currentPasswordInput}
                  onChange={e => setCurrentPasswordInput(e.target.value)}
                  placeholder="Nhập mật khẩu hiện thời..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-lg font-mono text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 font-mono">Mật khẩu mới:</label>
                <input 
                  type="password"
                  required
                  value={newPasswordInput}
                  onChange={e => setNewPasswordInput(e.target.value)}
                  placeholder="Nhập mật khẩu mới (tối thiểu 4 kí tự)..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-lg font-mono text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5 font-mono">Xác thực mật khẩu mới đầy đủ:</label>
                <input 
                  type="password"
                  required
                  value={confirmPasswordInput}
                  onChange={e => setConfirmPasswordInput(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới để trùng khớp..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-lg font-mono text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  XÁC NHẬN CẬP NHẬT
                </button>
                <button
                  type="button"
                  onClick={() => setShowChangePasswordForUser(false)}
                  className="flex-1 py-2.5 bg-slate-950 hover:bg-slate-850 text-slate-400 font-bold text-xs rounded-xl transition border border-slate-800 cursor-pointer"
                >
                  HỦY BỎ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dynamic Floating Toast Notifications Overlay */}
      <div id="toast-overlay" className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full select-none pointer-events-none">
        {toasts.map((toast) => {
          let borderClass = 'border-slate-800';
          let shadowClass = 'shadow-slate-950/50';
          let bgClass = 'bg-slate-900/95';
          let textClass = 'text-slate-300';
          let icon = <Info className="w-5 h-5 text-sky-400 shrink-0" />;
          let badgeText = '';
          let badgeClass = '';

          if (toast.type === 'success') {
            borderClass = 'border-emerald-500/30';
            shadowClass = 'shadow-emerald-950/30';
            bgClass = 'bg-slate-900/95';
            textClass = 'text-slate-200';
            icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />;
            badgeText = 'HOÀN THÀNH';
            badgeClass = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
          } else if (toast.type === 'level_up') {
            borderClass = 'border-amber-400/40';
            shadowClass = 'shadow-amber-950/40';
            bgClass = 'bg-gradient-to-r from-slate-900 via-amber-950/10 to-slate-900';
            textClass = 'text-amber-100';
            icon = <Sparkles className="w-5 h-5 text-amber-300 shrink-0 mt-0.5 animate-pulse" />;
            badgeText = 'THĂNG CẤP 🌟';
            badgeClass = 'bg-amber-400/15 text-amber-300 border border-amber-400/30';
          } else if (toast.type === 'penalty') {
            borderClass = 'border-rose-500/30';
            shadowClass = 'shadow-rose-950/30';
            bgClass = 'bg-slate-900/95';
            textClass = 'text-slate-200';
            icon = <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />;
            badgeText = 'HỆ THỐNG PHẠT';
            badgeClass = 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
          } else if (toast.type === 'warning') {
            borderClass = 'border-amber-500/30';
            shadowClass = 'shadow-amber-950/20';
            bgClass = 'bg-slate-900/95';
            textClass = 'text-slate-200';
            icon = <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />;
            badgeText = 'CẢNH BÁO';
            badgeClass = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
          } else {
            borderClass = 'border-sky-500/30';
            shadowClass = 'shadow-sky-950/20';
            bgClass = 'bg-slate-900/95';
            textClass = 'text-slate-200';
            icon = <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />;
            badgeText = 'THÔNG BÁO';
            badgeClass = 'bg-sky-500/10 text-sky-400 border border-sky-500/20';
          }

          return (
            <div 
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3.5 p-4 rounded-xl border ${borderClass} ${bgClass} shadow-xl ${shadowClass} animate-slide-in relative overflow-hidden group`}
            >
              {/* Highlight ribbon decor */}
              <div className={`absolute top-0 left-0 h-full w-1 ${
                toast.type === 'success' ? 'bg-emerald-500' :
                toast.type === 'level_up' ? 'bg-amber-400' :
                toast.type === 'penalty' ? 'bg-rose-500' :
                toast.type === 'warning' ? 'bg-amber-500' : 'bg-sky-500'
              }`} />

              <div className="shrink-0">
                {icon}
              </div>

              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded uppercase tracking-wider ${badgeClass}`}>
                    {badgeText}
                  </span>
                  <p className="text-xs font-bold text-slate-100 truncate">
                    {toast.title}
                  </p>
                </div>
                <p className={`text-[11px] leading-relaxed ${textClass} break-words`}>
                  {toast.message}
                </p>
              </div>

              {/* Dismiss button */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setToasts(prev => prev.filter(t => t.id !== toast.id));
                }}
                className="shrink-0 p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition cursor-pointer"
                title="Đóng thông báo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

    </div>
  );
}
