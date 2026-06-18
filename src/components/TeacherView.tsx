import React, { useState, useEffect } from 'react';
import { 
  Classroom, User, RoomParticipant, Quest, 
  QuestSubmission, LuckyWheelItemConfig 
} from '../types';
import { db, addSystemNotification, getLevelInfo, generateJointRooms, getGradeFromClass } from '../mockData';
import { 
  Users, Plus, Trash2, Copy, FileSpreadsheet, PlusCircle, MinusCircle, 
  BookOpen, HelpCircle, Save, Settings, Sliders, Play, AlertTriangle, Calendar,
  ClipboardList, Layers, GraduationCap, Edit3, Clock, CheckCircle, XCircle,
  Smartphone, RefreshCw
} from 'lucide-react';

interface TeacherViewProps {
  teacherId: string;
  activeRoomId: string;
  onActiveRoomChanged: (id: string) => void;
  onDataModified: () => void;
}

export default function TeacherView({ teacherId, activeRoomId, onActiveRoomChanged, onDataModified }: TeacherViewProps) {
  // State variables synchronized with mock local databases
  const [rooms, setRooms] = useState<Classroom[]>([]);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [submissions, setSubmissions] = useState<QuestSubmission[]>([]);
  const [wheelConfig, setWheelConfig] = useState<LuckyWheelItemConfig[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Quest and Submission management active tab and room filter
  const [subTab, setSubTab] = useState<'quests' | 'reviews'>('quests');
  const [filterRoomId, setFilterRoomId] = useState<string>('all');

  // Room forms states
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  
  // Custom dynamic subjects states
  const [subjects, setSubjectsList] = useState<string[]>(() => db.getSubjects());
  const [isAddingNewSubject, setIsAddingNewSubject] = useState(() => db.getSubjects().length === 0);
  const [subjectName, setSubjectName] = useState(() => {
    const list = db.getSubjects();
    return list.length > 0 ? list[0] : '';
  });
  const [customSubjectText, setCustomSubjectText] = useState('');

  const [targetClass, setTargetClass] = useState(() => db.getClasses()[0] || '10A1');
  const adminClasses = db.getClasses();
  const uniqueGrades = Array.from(
    new Set(adminClasses.map(cls => {
      const match = cls.trim().match(/^(\d+)/);
      return match ? match[1] : '';
    }).filter(Boolean))
  ).sort();
  const [showEditRoom, setShowEditRoom] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editRoomName, setEditRoomName] = useState('');
  const [editRoomDesc, setEditRoomDesc] = useState('');
  
  // Custom student Excel/CSV text enrollment state
  const [bulkStudents, setBulkStudents] = useState(
    "Đào Quốc Anh, anh.dao@test.com\nNguyễn Minh Khang, khang.nguyen@test.com\n"
  );
  const [showBulkEnroll, setShowBulkEnroll] = useState(false);

  // Manual individual student enrollment states
  const [manualStudentName, setManualStudentName] = useState('');
  const [manualStudentEmail, setManualStudentEmail] = useState('');
  const [manualStudentPassword, setManualStudentPassword] = useState('password123');
  const [showManualEnroll, setShowManualEnroll] = useState(false);

  // Classroom quick-XP tweaks
  const [xpTweakAmount, setXpTweakAmount] = useState(10);
  const [goldTweakAmount, setGoldTweakAmount] = useState(10);

  // Quest Creating matrix state
  const [questTitle, setQuestTitle] = useState('');
  const [questDesc, setQuestDesc] = useState('');
  const [questType, setQuestType] = useState<'quiz' | 'file'>('quiz');
  const [rewardXp, setRewardXp] = useState(100);
  const [rewardGold, setRewardGold] = useState(50);
  const [penaltyXp, setPenaltyXp] = useState(30);
  const [penaltyGold, setPenaltyGold] = useState(15);
  const [deadlineDate, setDeadlineDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  // Quest Editing states
  const [editingQuestId, setEditingQuestId] = useState<string | null>(null);
  const [editQuestTitle, setEditQuestTitle] = useState('');
  const [editQuestDesc, setEditQuestDesc] = useState('');
  const [editQuestType, setEditQuestType] = useState<'quiz' | 'file'>('quiz');
  const [editRewardXp, setEditRewardXp] = useState(100);
  const [editRewardGold, setEditRewardGold] = useState(50);
  const [editPenaltyXp, setEditPenaltyXp] = useState(30);
  const [editPenaltyGold, setEditPenaltyGold] = useState(15);
  const [editDeadlineDate, setEditDeadlineDate] = useState('');

  // Matrix parameters for custom configuration (deploying)
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [maxAttempts, setMaxAttempts] = useState<number>(0);
  const [reduceRewardOnRetry, setReduceRewardOnRetry] = useState(false);
  const [threeLevelGrading, setThreeLevelGrading] = useState(false);

  // Matrix parameters for custom configuration (editing)
  const [editShuffleQuestions, setEditShuffleQuestions] = useState(false);
  const [editShuffleOptions, setEditShuffleOptions] = useState(false);
  const [editMaxAttempts, setEditMaxAttempts] = useState<number>(0);
  const [editReduceRewardOnRetry, setEditReduceRewardOnRetry] = useState(false);
  const [editThreeLevelGrading, setEditThreeLevelGrading] = useState(false);

  const getTomorrowDateString = (): string => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Sub-Quiz state builder
  const [quizQuestions, setQuizQuestions] = useState<Array<{
    questionText: string;
    options: string[];
    correctOptionIndex: number;
  }>>([
    {
      questionText: 'Thẻ <p> trong lập trình HTML dùng để hiển thị nội dung nào?',
      options: ['Hình ảnh', 'Đoạn văn bản', 'Đường siêu liên kết', 'Bảng biểu dữ liệu'],
      correctOptionIndex: 1
    }
  ]);

  // Force local DB refresh from storage cache
  const loadDbState = () => {
    const allRooms = db.getRooms();
    const rawRooms = allRooms.filter(r => r.teacherId === teacherId);
    const adminClasses = db.getClasses();
    
    const combinedRooms = rawRooms.map(r => {
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

    setRooms(combinedRooms);

    const currentRoom = combinedRooms.find(r => r.id === activeRoomId) || combinedRooms[0];
    
    if (currentRoom?.isJoint) {
      const subrooms = currentRoom.subrooms || [];
      const allowedClasses = currentRoom.classes || [];
      const studentsList = db.getUsers();
      setParticipants(db.getParticipants().filter(p => {
        if (!subrooms.includes(p.roomId)) return false;
        const studentUser = studentsList.find(u => u.id === p.studentId);
        if (studentUser && studentUser.studentClass) {
          return allowedClasses.includes(studentUser.studentClass);
        }
        return true;
      }));
      setQuests(db.getQuests().filter(q => subrooms.includes(q.roomId)));
    } else {
      const studentsList = db.getUsers();
      setParticipants(db.getParticipants().filter(p => {
        if (p.roomId !== activeRoomId) return false;
        const studentUser = studentsList.find(u => u.id === p.studentId);
        if (studentUser && studentUser.studentClass && currentRoom?.targetClass) {
          return studentUser.studentClass === currentRoom.targetClass;
        }
        return true;
      }));
      setQuests(db.getQuests().filter(q => q.roomId === activeRoomId));
    }

    setUsers(db.getUsers());
    setSubmissions(db.getSubmissions());
    setWheelConfig(db.getWheelConfig());
    setSubjectsList(db.getSubjects());
  };

  useEffect(() => {
    loadDbState();
    setSelectedStudentIds([]);
  }, [activeRoomId]);

  // Synchronized Audio Synthesis feedback for actions
  const playBeep = (freq: number, type: 'sine' | 'square' = 'sine', duration = 0.1) => {
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

  const formatSubjectName = (name: string): string => {
    if (!name) return '';
    return name
      .trim()
      .split(/\s+/)
      .map(word => {
        if (!word) return '';
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  };

  // Create customized class room
  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    
    let activeSubject = subjectName;
    if (isAddingNewSubject) {
      const formatted = formatSubjectName(customSubjectText);
      if (!formatted) {
        alert('Vui lòng nhập tên môn học hợp lệ!');
        return;
      }
      activeSubject = formatted;

      // Update dynamic subjects list in localStorage database
      const currentSubjects = db.getSubjects();
      if (!currentSubjects.includes(formatted)) {
        const updatedSubjects = [...currentSubjects, formatted].sort();
        db.setSubjects(updatedSubjects);
        setSubjectsList(updatedSubjects);
      }
      setSubjectName(formatted);
      setCustomSubjectText('');
      setIsAddingNewSubject(false);
    } else {
      if (!activeSubject) {
        alert('Vui lòng chọn hoặc thêm một môn học!');
        return;
      }
    }

    const isJointSelected = targetClass.startsWith('Khối');
    const numericGrade = isJointSelected ? targetClass.replace(/\D/g, '') : '';
    const adminClasses = db.getClasses();
    const relatedClasses = isJointSelected
      ? adminClasses.filter(cls => {
          const match = cls.trim().match(/^(\d+)/);
          return match ? match[1] === numericGrade : false;
        })
      : [targetClass];

    const computedRoomName = isJointSelected
      ? `${activeSubject} - Phòng chung ${targetClass}`
      : `${activeSubject} - Lớp ${targetClass}`;

    const allRooms = db.getRooms();
    const generatedId = 'room-' + Math.random().toString(36).substr(2, 9);
    const inviteCode = Math.random().toString(36).substr(2, 6).toUpperCase();

    // Dynamically link existing subrooms if any
    const matchedSubrooms = isJointSelected
      ? allRooms.filter(r => 
          r.teacherId === teacherId && 
          r.subjectName === activeSubject && 
          !r.isJoint && 
          r.targetClass &&
          r.targetClass.trim().match(/^(\d+)/)?.[1] === numericGrade
        ).map(r => r.id)
      : undefined;

    const newRoom: Classroom = {
      id: generatedId,
      roomName: computedRoomName,
      description: newRoomDesc.trim() || (isJointSelected
        ? `Phòng học chung môn ${activeSubject} dành cho toàn bộ học sinh Khối ${numericGrade} (Liên gộp các lớp: ${relatedClasses.join(', ')})`
        : `Phòng học trực tuyến môn ${activeSubject} dành cho các học sinh thuộc Lớp ${targetClass}`),
      teacherId,
      inviteCode,
      createdAt: new Date().toISOString(),
      targetClass,
      subjectName: activeSubject,
      isJoint: isJointSelected ? true : undefined,
      classes: isJointSelected ? relatedClasses : undefined,
      subrooms: isJointSelected ? matchedSubrooms : undefined
    };

    const updated = [...allRooms, newRoom];
    db.setRooms(updated);
    setNewRoomName('');
    setNewRoomDesc('');
    
    addSystemNotification(
      'Tạo phòng học mới',
      `Phòng học "${computedRoomName}" được thành lập thành công. Mã vào lớp: ${inviteCode}`,
      'success'
    );

    playBeep(440, 'sine', 0.15);
    onActiveRoomChanged(generatedId);
    onDataModified();
    loadDbState();
  };

  // Delete Room
  const handleDeleteRoom = (roomId: string) => {
    const allRooms = db.getRooms().filter(r => r.id !== roomId);
    db.setRooms(allRooms);

    // Delete participants, quests
    const remainingParticipants = db.getParticipants().filter(p => p.roomId !== roomId);
    db.setParticipants(remainingParticipants);

    const remainingQuests = db.getQuests().filter(q => q.roomId !== roomId);
    db.setQuests(remainingQuests);

    addSystemNotification(
      'Xóa phòng học',
      `Giáo viên chủ quản đã xóa vĩnh viễn phòng học ID: ${roomId}`,
      'warning'
    );

    // switch room to the next available room for this teacher
    const teacherRooms = allRooms.filter(r => r.teacherId === teacherId);
    const nextRoom = teacherRooms.length > 0 ? teacherRooms[0].id : '';

    db.setCurrentRoomId(nextRoom);
    onActiveRoomChanged(nextRoom);
    onDataModified();
    setShowDeleteConfirm(false);
    loadDbState();
    playBeep(300, 'square', 0.2);
  };

  // Start Edit Room
  const handleStartEditRoom = () => {
    const currentRoom = rooms.find(r => r.id === activeRoomId);
    if (currentRoom) {
      setEditRoomName(currentRoom.roomName);
      setEditRoomDesc(currentRoom.description || '');
      setShowEditRoom(prev => !prev);
    }
  };

  // Save Room Edit
  const handleSaveRoomEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRoomName.trim()) {
      alert("Tên phòng học không được để trống!");
      return;
    }

    const allRooms = db.getRooms();
    const updated = allRooms.map(r => {
      if (r.id === activeRoomId) {
        return {
          ...r,
          roomName: editRoomName.trim(),
          description: editRoomDesc.trim()
        };
      }
      return r;
    });

    db.setRooms(updated);
    setShowEditRoom(false);

    addSystemNotification(
      'Cập nhật phòng học',
      `Thông tin phòng học được cập nhật thành công thành: "${editRoomName}"`,
      'success'
    );

    playBeep(440, 'sine', 0.1);
    onDataModified();
    loadDbState();
  };

  // Clone Classroom (Copies all quests and lucky wheel configs from active room to a brand new one)
  const handleCloneRoom = () => {
    const currentRoom = rooms.find(r => r.id === activeRoomId);
    if (!currentRoom) return;

    const allRooms = db.getRooms();
    const clonedId = 'room-clone-' + Math.random().toString(36).substr(2, 9);
    const inviteCode = 'CL' + Math.random().toString(36).substr(2, 4).toUpperCase();

    const clonedRoom: Classroom = {
      id: clonedId,
      roomName: `${currentRoom.roomName} (Bản sao)`,
      description: `Bản sao nhân bản từ ${currentRoom.roomName}. Kho nhiệm vụ được sao chép nguyên vẹn.`,
      teacherId,
      inviteCode,
      createdAt: new Date().toISOString()
    };

    db.setRooms([...allRooms, clonedRoom]);

    // Copy Quests
    const activeQuests = db.getQuests().filter(q => q.roomId === activeRoomId);
    const clonedQuests: Quest[] = activeQuests.map(q => ({
      ...q,
      id: 'quest-clon-' + Math.random().toString(36).substr(2, 9),
      roomId: clonedId,
      createdAt: new Date().toISOString()
    }));
    db.setQuests([...db.getQuests(), ...clonedQuests]);

    // Copy participants for convenience
    const currentParts = db.getParticipants().filter(p => p.roomId === activeRoomId);
    const clonedParts: RoomParticipant[] = currentParts.map(p => ({
      ...p,
      id: 'part-clon-' + Math.random().toString(36).substr(2, 9),
      roomId: clonedId,
      joinedAt: new Date().toISOString()
    }));
    db.setParticipants([...db.getParticipants(), ...clonedParts]);

    addSystemNotification(
      'Nhân bản thành công',
      `Đã nhân bản phòng học "${currentRoom.roomName}" sang "${clonedRoom.roomName}" với ${clonedQuests.length} nhiệm vụ liên kết.`,
      'success'
    );

    playBeep(587.33, 'sine', 0.2); // D5
    onActiveRoomChanged(clonedId);
    onDataModified();
    loadDbState();
  };

  // Helper: Download a real robust format-compliant CSV template for teacher to fill easily
  const downloadCsvTemplate = () => {
    const headers = "Họ và tên,Email,Mật khẩu\n";
    const rows = [
      "Nguyễn Minh Hằng,hang.nguyen@eduquest.vn,password123",
      "Văn Quốc Dũng,dung.van@eduquest.vn,password123",
      "Phạm Thị Lan,lan.pham@eduquest.vn,password123"
    ].join("\n");
    const csvContent = "\uFEFF" + headers + rows; // Add UTF-8 BOM so Vietnamese displays correctly in Excel
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "eduquest_phieu_nhap_hoc_sinh_mau.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addSystemNotification(
      'Tải file mẫu',
      `Tải xuống thành công biểu mẫu "eduquest_phieu_nhap_hoc_sinh_mau.csv" để điền dữ liệu.`,
      'success'
    );
    playBeep(440, 'sine', 0.1);
  };

  // Helper: Process reader of selected CSV file
  const handleCsvFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv') && !file.name.toLowerCase().endsWith('.txt')) {
      alert("Hệ thống chỉ hỗ trợ xử lý file biểu mẫu .csv hoặc .txt!");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/);
      const allUsers = db.getUsers();
      const allParticipants = db.getParticipants();
      let enrollCount = 0;

      const updatedUsers = [...allUsers];
      const updatedParticipants = [...allParticipants];

      lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        // Skip headers
        if (index === 0 && (trimmed.toLowerCase().includes('họ') || trimmed.toLowerCase().includes('name') || trimmed.toLowerCase().includes('email'))) {
          return;
        }

        const parts = trimmed.split(',');
        if (parts[0] && parts[0].trim()) {
          const name = parts[0].trim();
          const email = parts[1] ? parts[1].trim() : `student.${Math.random().toString(36).substr(2, 4)}@eduquest.vn`;
          const rawPassword = parts[2] ? parts[2].trim() : 'password123';
          const studentId = 'student-bulk-' + Math.random().toString(36).substr(2, 9);

          // Check exists user
          const existsUser = allUsers.find(u => u.email.toLowerCase().trim() === email.toLowerCase().trim());
          let activeId = studentId;

          if (!existsUser) {
            const newUser: User = {
              id: studentId,
              email,
              fullName: name,
              avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name)}`,
              role: 'student',
              password: rawPassword,
              createdAt: new Date().toISOString()
            };
            updatedUsers.push(newUser);
          } else {
            activeId = existsUser.id;
          }

          // Add participant to the current active classroom
          const alreadyPart = allParticipants.find(p => p.studentId === activeId && p.roomId === activeRoomId);
          if (!alreadyPart) {
            const newPart: RoomParticipant = {
              id: 'part-bulk-' + Math.random().toString(36).substr(2, 9),
              roomId: activeRoomId,
              studentId: activeId,
              currentXp: 150, // default starting XP for newly added students
              currentLevel: 1,
              goldBalance: 50,
              luckySpins: 1,
              joinedAt: new Date().toISOString()
            };
            updatedParticipants.push(newPart);
            enrollCount++;
          }
        }
      });

      db.setUsers(updatedUsers);
      db.setParticipants(updatedParticipants);

      addSystemNotification(
        'Nhập file CSV',
        `Tải tệp thành công! Đã đăng ký thành viên và nhập ${enrollCount} học sinh vào lớp học qua file CSV.`,
        'success'
      );

      playBeep(480, 'sine', 0.22);
      onDataModified();
      loadDbState();
    };
    reader.readAsText(file, "UTF-8");
  };

  // Helper: Manually individual student registration inside active class
  const handleManualStudentEnrollSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualStudentName.trim() || !manualStudentEmail.trim()) {
      alert("Vui lòng điền đầy đủ thông tin Tên và Email của học sinh!");
      return;
    }

    const email = manualStudentEmail.trim();
    const name = manualStudentName.trim();
    const password = manualStudentPassword.trim() || 'password123';

    const allUsers = db.getUsers();
    const allParticipants = db.getParticipants();

    const existsUser = allUsers.find(u => u.email.toLowerCase().trim() === email.toLowerCase().trim());
    let studentId = '';
    const updatedUsers = [...allUsers];

    const currentRoom = rooms.find(r => r.id === activeRoomId);
    const studentClassToSet = currentRoom?.isJoint 
      ? (currentRoom.classes?.[0] || '10A1') 
      : (currentRoom?.targetClass || '10A1');

    if (existsUser && !currentRoom?.isJoint && existsUser.studentClass && existsUser.studentClass !== currentRoom?.targetClass) {
      alert(`Học sinh [${existsUser.fullName}] hiện đang thuộc Lớp [${existsUser.studentClass}]. Không thể ghi danh vào phòng học thuộc Lớp [${currentRoom?.targetClass}]!`);
      return;
    }

    if (!existsUser) {
      studentId = 'student-man-' + Math.random().toString(36).substr(2, 9);
      const newUser: User = {
        id: studentId,
        email,
        fullName: name,
        avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name)}`,
        role: 'student',
        studentClass: studentClassToSet,
        password,
        createdAt: new Date().toISOString()
      };
      updatedUsers.push(newUser);
      db.setUsers(updatedUsers);
    } else {
      studentId = existsUser.id;
    }

    const alreadyPart = allParticipants.find(p => p.studentId === studentId && p.roomId === activeRoomId);
    if (alreadyPart) {
      alert("Học sinh này hiện đã hoạt động trong phòng học này rồi!");
      return;
    }

    const newPart: RoomParticipant = {
      id: 'part-man-' + Math.random().toString(36).substr(2, 9),
      roomId: activeRoomId,
      studentId,
      currentXp: 150,
      currentLevel: 1,
      goldBalance: 50,
      luckySpins: 1,
      joinedAt: new Date().toISOString()
    };

    db.setParticipants([...allParticipants, newPart]);
    
    setManualStudentName('');
    setManualStudentEmail('');
    setManualStudentPassword('password123');
    setShowManualEnroll(false);

    addSystemNotification(
      'Thêm học sinh thủ công',
      `Đã khởi tạo tài khoản và ghi danh học sinh [${name}] vào phòng học thành công.`,
      'success'
    );

    playBeep(480, 'sine', 0.15);
    onDataModified();
    loadDbState();
  };

  // Excel / CSV lines importer simulation that expands student users and classroom participants
  const handleBulkEnroll = () => {
    if (!bulkStudents.trim()) return;

    const lines = bulkStudents.split('\n');
    const allUsers = db.getUsers();
    const allParticipants = db.getParticipants();
    let enrollCount = 0;
    let skipCount = 0;
    let mismatchClassNames: string[] = [];

    const updatedUsers = [...allUsers];
    const updatedParticipants = [...allParticipants];

    const currentRoom = rooms.find(r => r.id === activeRoomId);
    const studentClassToSet = currentRoom?.isJoint 
      ? (currentRoom.classes?.[0] || '10A1') 
      : (currentRoom?.targetClass || '10A1');

    lines.forEach(line => {
      const parts = line.split(',');
      if (parts[0] && parts[0].trim()) {
        const name = parts[0].trim();
        const email = parts[1] ? parts[1].trim() : `student.${Math.random().toString(36).substr(2, 4)}@eduquest.vn`;
        const studentId = 'student-bulk-' + Math.random().toString(36).substr(2, 9);

        // 1. Double check exists
        const existsUser = allUsers.find(u => u.email === email);
        let activeId = studentId;
        
        if (!existsUser) {
          const newUser: User = {
            id: studentId,
            email,
            fullName: name,
            avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${name}`,
            role: 'student',
            studentClass: studentClassToSet,
            createdAt: new Date().toISOString()
          };
          updatedUsers.push(newUser);
        } else {
          activeId = existsUser.id;
          // Check class mismatch
          if (!currentRoom?.isJoint && existsUser.studentClass && existsUser.studentClass !== currentRoom.targetClass) {
            skipCount++;
            if (!mismatchClassNames.includes(existsUser.fullName)) {
              mismatchClassNames.push(existsUser.fullName);
            }
            return; // Skip this student
          }
        }

        // 2. Add to class room participants
        const alreadyPart = allParticipants.find(p => p.studentId === activeId && p.roomId === activeRoomId);
        if (!alreadyPart) {
          const newPart: RoomParticipant = {
            id: 'part-bulk-' + Math.random().toString(36).substr(2, 9),
            roomId: activeRoomId,
            studentId: activeId,
            currentXp: 150, // default onboarding XP
            currentLevel: 1,
            goldBalance: 50,
            luckySpins: 1,
            joinedAt: new Date().toISOString()
          };
          updatedParticipants.push(newPart);
          enrollCount++;
        }
      }
    });

    db.setUsers(updatedUsers);
    db.setParticipants(updatedParticipants);
    setBulkStudents('');
    setShowBulkEnroll(false);

    let message = `Đã ghi nhận và nhập thành công thêm ${enrollCount} học sinh mới vào lớp thông qua Excel dán văn bản.`;
    if (skipCount > 0) {
      message += ` Bỏ qua ${skipCount} học sinh do không trùng lớp học mục tiêu: ${mismatchClassNames.join(', ')}.`;
      alert(`Đã bỏ qua ${skipCount} học sinh khác lớp: ${mismatchClassNames.join(', ')}.`);
    }

    addSystemNotification(
      'Import danh sách',
      message,
      'success'
    );

    playBeep(480, 'sine', 0.2);
    onDataModified();
    loadDbState();
  };

  // Bulk Points Adjustments for selected students
  const adjustMultipleStudentsScores = (studentIds: string[], type: 'add' | 'subtract') => {
    if (studentIds.length === 0) return;
    const list = db.getParticipants();
    const usersList = db.getUsers();
    let inventory = db.getInventory();
    let inventoryModified = false;
    let leveledUpCount = 0;

    studentIds.forEach(studentId => {
      const targetIdx = list.findIndex(p => p.studentId === studentId && p.roomId === activeRoomId);
      if (targetIdx === -1) return;

      const studentUser = usersList.find(u => u.id === studentId);
      let xpChange = type === 'add' ? xpTweakAmount : -xpTweakAmount;
      let goldChange = type === 'add' ? goldTweakAmount : -goldTweakAmount;

      const oldXp = list[targetIdx].currentXp;
      const newXp = Math.max(0, oldXp + xpChange);
      list[targetIdx].currentXp = newXp;
      list[targetIdx].goldBalance = Math.max(0, list[targetIdx].goldBalance + goldChange);

      const oldLevel = list[targetIdx].currentLevel;
      const { level: computedLevel } = getLevelInfo(newXp);

      if (computedLevel > oldLevel) {
        let awardedSpins = 1;
        if (computedLevel >= 16) awardedSpins = 3;
        else if (computedLevel >= 6) awardedSpins = 2;

        list[targetIdx].currentLevel = computedLevel;
        list[targetIdx].luckySpins += awardedSpins;

        if (computedLevel >= 16) {
          inventory.push({
            id: 'inv-grade-' + Math.random().toString(36).substr(2, 9),
            roomId: activeRoomId,
            studentId,
            itemType: 'free_pass_voucher',
            itemName: 'Thẻ Miễn Bài Tập Cao Cấp (Bậc Thầy)',
            description: 'Hàng quà tặng đặc quyền tối cao tự thăng cấp 16+ ban tặng.',
            status: 'unused',
            acquiredAt: new Date().toISOString()
          });
          inventoryModified = true;
        }

        leveledUpCount++;

        addSystemNotification(
          'Thăng cấp tự động! 🌟',
          `Học sinh [${studentUser?.fullName || 'Học sinh'}] đột phá lên Cấp ${computedLevel}! Thưởng thêm +${awardedSpins} lượt quay may mắn.`,
          'level_up'
        );
      } else if (computedLevel < oldLevel) {
        list[targetIdx].currentLevel = computedLevel;
      }
    });

    db.setParticipants(list);
    if (inventoryModified) {
      db.setInventory(inventory);
    }

    if (leveledUpCount > 0) {
      playBeep(880, 'sine', 0.3);
    }
    playChimeTweak(type);
    onDataModified();
    loadDbState();
  };

  // Quick tweak Points trigger [+ Điểm] or [- Điểm]
  const adjustStudentScore = (studentId: string, type: 'add' | 'subtract') => {
    const list = db.getParticipants();
    const targetIdx = list.findIndex(p => p.studentId === studentId && p.roomId === activeRoomId);
    if (targetIdx === -1) return;

    const studentUser = db.getUsers().find(u => u.id === studentId);
    let xpChange = type === 'add' ? xpTweakAmount : -xpTweakAmount;
    let goldChange = type === 'add' ? goldTweakAmount : -goldTweakAmount;

    // Apply adjustments
    const oldXp = list[targetIdx].currentXp;
    const newXp = Math.max(0, oldXp + xpChange);
    list[targetIdx].currentXp = newXp;
    list[targetIdx].goldBalance = Math.max(0, list[targetIdx].goldBalance + goldChange);

    // Monitor for automated level up thresholds!
    const oldLevel = list[targetIdx].currentLevel;
    const { level: computedLevel } = getLevelInfo(newXp);

    if (computedLevel > oldLevel) {
      // Level Up! Calculate rewards bonus spins
      let awardedSpins = 1;
      if (computedLevel >= 16) awardedSpins = 3;
      else if (computedLevel >= 6) awardedSpins = 2;

      list[targetIdx].currentLevel = computedLevel;
      list[targetIdx].luckySpins += awardedSpins;

      // Drop auto award higher level pass cards if gold level
      if (computedLevel >= 16) {
        const inventory = db.getInventory();
        inventory.push({
          id: 'inv-grade-' + Math.random().toString(36).substr(2, 9),
          roomId: activeRoomId,
          studentId,
          itemType: 'free_pass_voucher',
          itemName: 'Thẻ Miễn Bài Tập Cao Cấp (Bậc Thầy)',
          description: 'Hàng quà tặng đặc quyền tối cao tự thăng cấp 16+ ban tặng.',
          status: 'unused',
          acquiredAt: new Date().toISOString()
        });
        db.setInventory(inventory);
      }

      // alert audio
      playBeep(880, 'sine', 0.3);
      addSystemNotification(
        'Thăng cấp tự động! 🌟',
        `Học sinh [${studentUser?.fullName}] đột phá lên Cấp ${computedLevel}! Thưởng thêm +${awardedSpins} lượt quay may mắn.`,
        'level_up'
      );
    } else if (computedLevel < oldLevel) {
      list[targetIdx].currentLevel = computedLevel;
    }

    db.setParticipants(list);
    playChimeTweak(type);
    onDataModified();
    loadDbState();
  };

  // 1. Quản lý nhiệm vụ đã phát hành
  // Hủy/Xóa nhiệm vụ
  const handleCancelQuest = (questId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn HỦY VÀ XÓA VĨNH VIỄN nhiệm vụ này? Toàn bộ bài làm liên quan của học sinh cũng sẽ biến mất.")) {
      return;
    }
    const allQuests = db.getQuests();
    const targetedQuest = allQuests.find(q => q.id === questId);
    let idsToRemove = [questId];
    if (targetedQuest?.jointGroupId) {
      idsToRemove = allQuests.filter(q => q.jointGroupId === targetedQuest.jointGroupId).map(q => q.id);
    }

    const remainingQuests = allQuests.filter(q => !idsToRemove.includes(q.id));
    db.setQuests(remainingQuests);

    const remainingSubs = db.getSubmissions().filter(s => !idsToRemove.includes(s.questId));
    db.setSubmissions(remainingSubs);

    playBeep(330, 'square', 0.15);
    alert("Đã hủy nhiệm vụ thành công!");
    onDataModified();
    loadDbState();
  };

  // Kết thúc sớm nhiệm vụ
  const handleEndQuestEarly = (questId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn KẾT THÚC SỚM nhiệm vụ này? Hạn chót sẽ được chuyển thành thời điểm hiện tại và học sinh sẽ không thể nộp bài thêm.")) {
      return;
    }
    const allQuests = db.getQuests();
    const targetedQuest = allQuests.find(q => q.id === questId);
    const pastDate = new Date();
    pastDate.setSeconds(pastDate.getSeconds() - 5);

    if (targetedQuest?.jointGroupId) {
      allQuests.forEach(q => {
        if (q.jointGroupId === targetedQuest.jointGroupId) {
          q.deadline = pastDate.toISOString();
        }
      });
    } else {
      const qIdx = allQuests.findIndex(q => q.id === questId);
      if (qIdx !== -1) {
        allQuests[qIdx].deadline = pastDate.toISOString();
      }
    }
    db.setQuests(allQuests);

    playBeep(493.88, 'sine', 0.25);
    alert("Nhiệm vụ đã được kết thúc sớm thành công!");
    onDataModified();
    loadDbState();
  };

  // Đưua dữ liệu lên form chỉnh sửa
  const handleStartEditQuest = (quest: Quest) => {
    setEditingQuestId(quest.id);
    setEditQuestTitle(quest.title);
    setEditQuestDesc(quest.description);
    setEditQuestType(quest.questType);
    setEditRewardXp(quest.rewardXp);
    setEditRewardGold(quest.rewardGold);
    setEditPenaltyXp(quest.penaltyXp);
    setEditPenaltyGold(quest.penaltyGold || 0);
    setEditShuffleQuestions(quest.shuffleQuestions || false);
    setEditShuffleOptions(quest.shuffleOptions || false);
    setEditMaxAttempts(quest.maxAttempts || 0);
    setEditReduceRewardOnRetry(quest.reduceRewardOnRetry || false);
    setEditThreeLevelGrading(quest.threeLevelGrading || false);

    const d = new Date(quest.deadline);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const dy = String(d.getDate()).padStart(2, '0');
    setEditDeadlineDate(`${yr}-${mo}-${dy}`);
  };

  // Lưu nhiệm vụ đã chỉnh sửa
  const handleSaveEditedQuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editQuestTitle.trim() || !editQuestDesc.trim()) {
      alert("Vui lòng nhập đầy đủ tiêu đề và mô tả nhiệm vụ!");
      return;
    }
    const allQuests = db.getQuests();
    const targetedQuest = allQuests.find(q => q.id === editingQuestId);
    if (!targetedQuest) return;

    const calculatedDeadline = new Date(editDeadlineDate + 'T23:59:59');

    if (targetedQuest.jointGroupId) {
      allQuests.forEach(q => {
        if (q.jointGroupId === targetedQuest.jointGroupId) {
          q.title = editQuestTitle.trim();
          q.description = editQuestDesc.trim();
          q.questType = editQuestType;
          q.rewardXp = editRewardXp;
          q.rewardGold = editRewardGold;
          q.penaltyXp = editPenaltyXp;
          q.penaltyGold = editPenaltyGold;
          q.deadline = calculatedDeadline.toISOString();
          q.shuffleQuestions = editShuffleQuestions;
          q.shuffleOptions = editShuffleOptions;
          q.maxAttempts = editMaxAttempts > 0 ? editMaxAttempts : undefined;
          q.reduceRewardOnRetry = editReduceRewardOnRetry;
          q.threeLevelGrading = editThreeLevelGrading;
        }
      });
    } else {
      const qIdx = allQuests.findIndex(q => q.id === editingQuestId);
      if (qIdx !== -1) {
        allQuests[qIdx] = {
          ...allQuests[qIdx],
          title: editQuestTitle.trim(),
          description: editQuestDesc.trim(),
          questType: editQuestType,
          rewardXp: editRewardXp,
          rewardGold: editRewardGold,
          penaltyXp: editPenaltyXp,
          penaltyGold: editPenaltyGold,
          deadline: calculatedDeadline.toISOString(),
          shuffleQuestions: editShuffleQuestions,
          shuffleOptions: editShuffleOptions,
          maxAttempts: editMaxAttempts > 0 ? editMaxAttempts : undefined,
          reduceRewardOnRetry: editReduceRewardOnRetry,
          threeLevelGrading: editThreeLevelGrading
        };
      }
    }

    db.setQuests(allQuests);
    setEditingQuestId(null);
    playBeep(523.25, 'sine', 0.2); // C5
    alert("Đã cập nhật nhiệm vụ thành công!");
    onDataModified();
    loadDbState();
  };

  // 2. Phê duyệt/Đánh giá bài nộp của học sinh
  const handleGradeSubmission = (submissionId: string, gradeStatus: 'passed' | 'failed') => {
    const allSubs = db.getSubmissions();
    const sIdx = allSubs.findIndex(s => s.id === submissionId);
    if (sIdx === -1) return;

    const sub = allSubs[sIdx];
    const quest = db.getQuests().find(q => q.id === sub.questId);
    if (!quest) {
      alert("Nhiệm vụ liên kết không tồn tại!");
      return;
    }

    const studentUser = db.getUsers().find(u => u.id === sub.studentId);

    // Update submission status
    allSubs[sIdx].status = gradeStatus;
    allSubs[sIdx].gradedAt = new Date().toISOString();
    
    // Calculate retry reward reduction
    const studentSubs = allSubs.filter(s => s.questId === quest.id && s.studentId === sub.studentId)
                               .sort((a,b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
    const subIndex = studentSubs.findIndex(s => s.id === sub.id);
    const attemptIndex = subIndex !== -1 ? subIndex : Math.max(0, studentSubs.length - 1);

    let penaltyFactor = 1;
    if (quest.reduceRewardOnRetry && attemptIndex > 0) {
      penaltyFactor = Math.max(0.1, 1 - 0.2 * attemptIndex); // -20% for each retry, min 10%
    }

    const rewardXpApplied = Math.floor(quest.rewardXp * penaltyFactor);
    const rewardGoldApplied = Math.floor(quest.rewardGold * penaltyFactor);

    if (gradeStatus === 'passed') {
      allSubs[sIdx].statusLogs = `Phê duyệt ĐẠT thủ công bởi Giáo viên lúc ${new Date().toLocaleTimeString()}. Thưởng +${rewardXpApplied} XP và +${rewardGoldApplied} Vàng (Lượt làm bài thứ ${attemptIndex + 1}${penaltyFactor < 1 ? `, giảm ${Math.round((1 - penaltyFactor) * 100)}% do nộp lại` : ''}).`;
      
      // Award student rewards
      const participantsList = db.getParticipants();
      const pIdx = participantsList.findIndex(p => p.studentId === sub.studentId && p.roomId === quest.roomId);
      if (pIdx !== -1) {
        let inventory = db.getInventory();
        let inventoryModified = false;

        const oldXp = participantsList[pIdx].currentXp;
        const newXp = oldXp + rewardXpApplied;
        participantsList[pIdx].currentXp = newXp;
        participantsList[pIdx].goldBalance = (participantsList[pIdx].goldBalance || 0) + rewardGoldApplied;

        const oldLevel = participantsList[pIdx].currentLevel;
        const { level: computedLevel } = getLevelInfo(newXp);

        if (computedLevel > oldLevel) {
          let awardedSpins = 1;
          if (computedLevel >= 16) awardedSpins = 3;
          else if (computedLevel >= 6) awardedSpins = 2;

          participantsList[pIdx].currentLevel = computedLevel;
          participantsList[pIdx].luckySpins += awardedSpins;

          if (computedLevel >= 16) {
            inventory.push({
              id: 'inv-grade-' + Math.random().toString(36).substr(2, 9),
              roomId: quest.roomId,
              studentId: sub.studentId,
              itemType: 'free_pass_voucher',
              itemName: 'Thẻ Miễn Bài Tập Cao Cấp (Bậc Thầy)',
              description: 'Hàng quà tặng đặc quyền tối cao tự thăng cấp 16+ ban tặng.',
              status: 'unused',
              acquiredAt: new Date().toISOString()
            });
            inventoryModified = true;
          }

          addSystemNotification(
            'Thăng cấp tự động! 🌟',
            `Học sinh [${studentUser?.fullName || 'Học sinh'}] thăng cấp lên Cấp ${computedLevel} sau khi đạt thử thách "${quest.title}"! Thưởng +${awardedSpins} lượt quay.`,
            'level_up'
          );
        }

        db.setParticipants(participantsList);
        if (inventoryModified) {
          db.setInventory(inventory);
        }

        playBeep(659.25, 'sine', 0.2); // Mi
      }
    } else {
      allSubs[sIdx].statusLogs = `Giáo viên phê duyệt KHÔNG ĐẠT lúc ${new Date().toLocaleTimeString()}. Không phạt trừ điểm (được miễn phạt).`;
      playBeep(220, 'square', 0.25);
    }

    db.setSubmissions(allSubs);
    alert(`Đã duyệt đánh giá [${gradeStatus === 'passed' ? 'ĐẠT' : 'KHÔNG ĐẠT'}] cho bài nộp của ${studentUser?.fullName || 'Học sinh'}.`);
    onDataModified();
    loadDbState();
  };

  const playChimeTweak = (type: 'add' | 'subtract') => {
    if (type === 'add') {
      playBeep(659.25, 'sine', 0.1); // E5
      setTimeout(() => playBeep(783.99, 'sine', 0.15), 80); // G5
    } else {
      playBeep(329.63, 'square', 0.15); // E4
    }
  };

  // Add question to builder bank
  const addQuizQuestionToForm = () => {
    setQuizQuestions([
      ...quizQuestions,
      {
        questionText: '',
        options: ['', '', '', ''],
        correctOptionIndex: 0,
        questionImage: '',
        optionImages: ['', '', '', '']
      }
    ]);
  };

  // Remove builder question
  const removeQuizQuestionFromForm = (idx: number) => {
    if (quizQuestions.length <= 1) return;
    setQuizQuestions(quizQuestions.filter((_, i) => i !== idx));
  };

  // Handle Quiz question option changes
  const updateQuizFormQuestion = (qIdx: number, text: string) => {
    const updated = [...quizQuestions];
    updated[qIdx].questionText = text;
    setQuizQuestions(updated);
  };

  const updateQuizFormOption = (qIdx: number, optIdx: number, text: string) => {
    const updated = [...quizQuestions];
    updated[qIdx].options[optIdx] = text;
    setQuizQuestions(updated);
  };

  const updateQuizFormCorrect = (qIdx: number, correctIdx: number) => {
    const updated = [...quizQuestions];
    updated[qIdx].correctOptionIndex = correctIdx;
    setQuizQuestions(updated);
  };

  const updateQuizFormImage = (qIdx: number, text: string) => {
    const updated = [...quizQuestions];
    updated[qIdx].questionImage = text;
    setQuizQuestions(updated);
  };

  const updateQuizFormOptionImage = (qIdx: number, optIdx: number, text: string) => {
    const updated = [...quizQuestions];
    if (!updated[qIdx].optionImages) {
      updated[qIdx].optionImages = ['', '', '', ''];
    }
    updated[qIdx].optionImages![optIdx] = text;
    setQuizQuestions(updated);
  };

  const handleImageUploadForQuestion = (qIdx: number, file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      updateQuizFormImage(qIdx, result);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUploadForOption = (qIdx: number, optIdx: number, file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      updateQuizFormOptionImage(qIdx, optIdx, result);
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadQuizTemplate = () => {
    const template = [
      {
        questionText: "Nút bấm nào trong Scratch dùng để bắt đầu chạy chương trình?",
        questionImage: "https://images.unsplash.com/photo-1618005198143-e528346d9a59?w=500",
        options: [
          "Lá cờ màu xanh",
          "Nút tròn màu đỏ",
          "Nút Space (Khoảng trắng)",
          "Nút Enter"
        ],
        correctOptionIndex: 0,
        optionImages: [
          "https://images.unsplash.com/photo-1618005198143-e528346d9a59?w=100&q=50",
          "",
          "",
          ""
        ]
      },
      {
        questionText: "Lệnh lặp 'repeat 10' nằm trong danh mục nào dưới đây?",
        questionImage: "",
        options: [
          "Motion (Di chuyển)",
          "Looks (Hiển thị)",
          "Control (Điều khiển)",
          "Sensing (Cảm biến)"
        ],
        correctOptionIndex: 2,
        optionImages: [
          "",
          "",
          "",
          ""
        ]
      }
    ];

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(template, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "bieu_mau_cau_hoi_trac_nghiem.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    playBeep(523.25, 'sine', 0.1);
  };

  const handleImportQuizTemplate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!Array.isArray(parsed)) {
          alert("Lỗi: Định dạng file biểu mẫu phải là một mảng các câu hỏi!");
          return;
        }

        const validated = parsed.map((item, index) => {
          if (typeof item.questionText !== 'string') {
            throw new Error(`Câu hỏi thứ ${index + 1} thiếu nội dung "questionText" hợp lệ.`);
          }
          if (!Array.isArray(item.options) || item.options.length < 2) {
            throw new Error(`Câu hỏi thứ ${index + 1} cần có mảng "options" ít nhất 2 đáp án.`);
          }
          const correctIdx = typeof item.correctOptionIndex === 'number' ? item.correctOptionIndex : 0;
          
          return {
            questionText: item.questionText,
            options: item.options.map((o: any) => String(o)),
            correctOptionIndex: correctIdx >= 0 && correctIdx < item.options.length ? correctIdx : 0,
            questionImage: typeof item.questionImage === 'string' ? item.questionImage : '',
            optionImages: Array.isArray(item.optionImages) 
              ? item.optionImages.map((img: any) => typeof img === 'string' ? img : '') 
              : ['', '', '', '']
          };
        });

        if (validated.length === 0) {
          alert("Không tìm thấy câu hỏi nào trong file!");
          return;
        }

        setQuizQuestions(validated);
        
        addSystemNotification(
          'Nhập câu hỏi thành công',
          `Đã tải ${validated.length} câu hỏi mới từ file biểu mẫu thành công!`,
          'success'
        );

        playBeep(659.25, 'sine', 0.15);
      } catch (err: any) {
        alert("Lỗi khi đọc file câu hỏi: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Deploy Quest / Assignment Form Submission
  const handleDeployQuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questTitle.trim() || !questDesc.trim()) {
      alert('Vui lòng điền tiêu đề và mô tả!');
      return;
    }

    // Check if the selected date is valid (greater than current date)
    const chosen = new Date(deadlineDate);
    const chosenDateOnly = new Date(chosen.getFullYear(), chosen.getMonth(), chosen.getDate());
    
    const today = new Date();
    const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (chosenDateOnly.getTime() <= todayDateOnly.getTime()) {
      alert("Hạn chót phải lớn hơn ngày hiện tại!");
      return;
    }

    const calculatedDeadline = new Date(deadlineDate + 'T23:59:59');

    const activeGlobalQuests = db.getQuests();
    const currentRoom = rooms.find(r => r.id === activeRoomId);

    if (currentRoom?.isJoint && currentRoom.subrooms && currentRoom.subrooms.length > 0) {
      const jointGroupId = 'joint-group-' + Math.random().toString(36).substr(2, 9);
      const newQuests: Quest[] = currentRoom.subrooms.map(subroomId => {
        const newQuestId = 'quest-' + Math.random().toString(36).substr(2, 9);
        return {
          id: newQuestId,
          roomId: subroomId,
          title: questTitle.trim(),
          description: questDesc.trim(),
          questType: questType,
          rewardXp: rewardXp,
          rewardGold: rewardGold,
          penaltyXp: penaltyXp,
          penaltyGold: penaltyGold,
          deadline: calculatedDeadline.toISOString(),
          createdAt: new Date().toISOString(),
          jointGroupId,
          shuffleQuestions,
          shuffleOptions,
          maxAttempts: maxAttempts > 0 ? maxAttempts : undefined,
          reduceRewardOnRetry,
          threeLevelGrading,
          ...(questType === 'quiz' ? { quizData: quizQuestions } : {})
        };
      });

      db.setQuests([...activeGlobalQuests, ...newQuests]);

      addSystemNotification(
        'Nhiệm vụ mới cho Khối!',
        `Đã phát hành nhiệm vụ "${questTitle.trim()}" hình thức [${questType === 'quiz' ? 'Trắc nghiệm' : 'Nộp ảnh/tài liệu'}] tới toàn bộ lớp học trong ${currentRoom.roomName}. Thưởng: ${rewardXp} XP.`,
        'info'
      );

      alert(`Phát hành thành công nhiệm vụ "${questTitle.trim()}" tới toàn bộ các lớp con thuộc ${currentRoom.roomName}!`);
    } else {
      const newQuestId = 'quest-' + Math.random().toString(36).substr(2, 9);
      const newQuest: Quest = {
        id: newQuestId,
        roomId: activeRoomId,
        title: questTitle.trim(),
        description: questDesc.trim(),
        questType: questType,
        rewardXp: rewardXp,
        rewardGold: rewardGold,
        penaltyXp: penaltyXp,
        penaltyGold: penaltyGold,
        deadline: calculatedDeadline.toISOString(),
        createdAt: new Date().toISOString(),
        shuffleQuestions,
        shuffleOptions,
        maxAttempts: maxAttempts > 0 ? maxAttempts : undefined,
        reduceRewardOnRetry,
        threeLevelGrading,
        ...(questType === 'quiz' ? { quizData: quizQuestions } : {})
      };

      db.setQuests([...activeGlobalQuests, newQuest]);

      addSystemNotification(
        'Nhiệm vụ mới!',
        `Đã phát hành nhiệm vụ "${questTitle.trim()}" hình thức [${questType === 'quiz' ? 'Trắc nghiệm' : 'Nộp ảnh/tài liệu'}]. Thưởng: ${rewardXp} XP.`,
        'info'
      );

      alert(`Phát hành thành công nhiệm vụ "${newQuest.title}"! Các cấu hình phát hành khác đã được tự động đưa về mặc định.`);
    }
    
    // reset form fields to defaults
    setQuestTitle('');
    setQuestDesc('');
    setDeadlineDate(getTomorrowDateString());
    setRewardXp(100);
    setRewardGold(50);
    setPenaltyXp(30);
    setPenaltyGold(15);
    setShuffleQuestions(false);
    setShuffleOptions(false);
    setMaxAttempts(0);
    setReduceRewardOnRetry(false);
    setThreeLevelGrading(false);
    setQuizQuestions([
      {
        questionText: 'Thẻ <p> trong lập trình HTML dùng để hiển thị nội dung nào?',
        options: ['Hình ảnh', 'Đoạn văn bản', 'Đường siêu liên kết', 'Bảng biểu dữ liệu'],
        correctOptionIndex: 1
      }
    ]);

    playBeep(523.25, 'sine', 0.2); // C5
    onDataModified();
    loadDbState();
  };

  // Sliders handler to modify wheel item configurations
  const handleSliderChange = (id: string, newVal: number) => {
    const backup = [...wheelConfig];
    const index = backup.findIndex(w => w.id === id);
    if (index === -1) return;

    backup[index].probability = newVal;
    setWheelConfig(backup);
  };

  const saveWheelProbabilities = () => {
    // Check if absolute sum exceeds 100%
    const total = wheelConfig.reduce((acc, c) => acc + c.probability, 0);
    if (total !== 100) {
      if (confirm(`Tổng xác suất hiện tại là ${total}%, không khớp 100% chuẩn. Bạn có muốn tự động chuẩn hóa tỷ lệ chia đều không?`)) {
        const normalized = wheelConfig.map(w => ({
          ...w,
          probability: Math.round((w.probability / total) * 100)
        }));
        
        // ensure exactly 100 on rounded errors
        const currentSum = normalized.reduce((acc, c) => acc + c.probability, 0);
        if (currentSum !== 100) {
          normalized[0].probability += (100 - currentSum);
        }

        db.setWheelConfig(normalized);
        setWheelConfig(normalized);
        alert("Đã chuẩn hóa thành công về chuẩn 100%!");
      } else {
        return;
      }
    } else {
      db.setWheelConfig(wheelConfig);
      alert("Đã lưu thiết lập vòng quay may mắn thành công!");
    }

    addSystemNotification(
      'Cấu hình tỷ lệ',
      'Giáo viên đã cập nhật lại bảng xác suất quay trúng của Vòng quay may mắn.',
      'info'
    );
    
    playBeep(440, 'sine', 0.1);
    onDataModified();
    loadDbState();
  };

  // Quick student lookups
  const enrolledStudents = participants.map(p => {
    const user = users.find(u => u.id === p.studentId);
    return {
      ...p,
      fullName: user?.fullName || 'Học sinh mới',
      email: user?.email || '',
      avatarUrl: user?.avatarUrl || '',
      studentDevice: user?.studentDevice
    };
  });

  if (rooms.length === 0) {
    return (
      <div className="space-y-8 select-none max-w-xl mx-auto py-12 text-center">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 space-y-6 shadow-xl">
          <BookOpen className="w-16 h-16 mx-auto text-emerald-500 animate-pulse" />
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-slate-100">Chào Mừng Giáo Viên Mới!</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              Bạn chưa thành lập phòng học nào. Vui lòng sử dụng biểu mẫu bên dưới để tạo phòng tin học/học tập của riêng bạn, sau đó thêm học sinh thủ công hoặc qua file Excel/CSV!
            </p>
          </div>
          
          <div className="border-t border-slate-800/80 pt-6 max-w-md mx-auto">
            <h4 className="text-xs font-bold text-emerald-400 mb-4 tracking-wider uppercase">THÀNH LẬP PHÒNG HỌC MỚI CHI TIẾT</h4>
            <form onSubmit={handleCreateRoom} className="space-y-4 text-left font-sans">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">
                  Môn học giảng dạy *
                </label>
                <div className="space-y-3">
                  {!isAddingNewSubject ? (
                    <div className="flex gap-2">
                      <select 
                        value={subjectName} 
                        onChange={e => {
                          if (e.target.value === '__NEW_SUBJECT_TRIGGER__') {
                            setIsAddingNewSubject(true);
                            setSubjectName('');
                          } else {
                            setSubjectName(e.target.value);
                          }
                        }}
                        className="flex-1 text-xs px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer font-medium" 
                        required={!isAddingNewSubject}
                      >
                        <option value="" disabled hidden>-- Chọn môn học --</option>
                        {subjects.map(sub => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                        <option value="__NEW_SUBJECT_TRIGGER__" className="text-emerald-400 font-bold">+ Thêm môn học mới...</option>
                      </select>
                      {subjects.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingNewSubject(true);
                            setSubjectName('');
                          }}
                          className="px-3 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg text-[10px] text-emerald-400 font-bold transition-all"
                        >
                          THÊM MỚI
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Nhập tên môn học mới..."
                          value={customSubjectText}
                          onChange={e => setCustomSubjectText(e.target.value)}
                          className="flex-1 text-xs px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500 font-medium placeholder-slate-600"
                          required={isAddingNewSubject}
                        />
                        {subjects.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingNewSubject(false);
                              if (subjects.length > 0) {
                                setSubjectName(subjects[0]);
                              }
                            }}
                            className="px-3 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg text-[10px] text-slate-400 font-bold transition-all"
                          >
                            HỦY
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 italic">Môn học sẽ được tự động chuẩn hóa chữ cái viêt hoa mỗi từ (Ví dụ: Tin Học).</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">
                  Lớp học tham gia *
                </label>
                <select 
                  value={targetClass} 
                  onChange={e => setTargetClass(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-emerald-400 font-bold focus:outline-none focus:border-emerald-500 cursor-pointer" 
                  required
                >
                  <optgroup label="Danh sách Lớp học cá nhân" className="text-slate-400 font-medium bg-slate-950">
                    {db.getClasses().map(cls => (
                      <option key={cls} value={cls} className="text-slate-100 font-medium">Lớp {cls}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Tạo phòng học chung (Theo Khối)" className="text-emerald-400 font-bold bg-slate-950">
                    {uniqueGrades.map(grade => (
                      <option key={`Khối ${grade}`} value={`Khối ${grade}`} className="text-emerald-300 font-bold">👥 Phòng chung Khối {grade}</option>
                    ))}
                  </optgroup>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">Chỉ những học sinh được Admin xếp vào Lớp này mới được quyền tham gia phòng tự động.</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">
                  Mô tả chi tiết phòng học (Tùy chọn)
                </label>
                <textarea 
                  value={newRoomDesc} 
                  onChange={e => setNewRoomDesc(e.target.value)}
                  placeholder="Mô tả các chủ đề, phần thưởng thi đua học tập hoặc cấp bậc của phòng này..." 
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-950 border border-slate-800/80 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500 resize-none h-20" 
                />
              </div>

              <button 
                type="submit" 
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs tracking-wider transition uppercase"
              >
                Thành Lập Lớp
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 select-none">
      
      {/* 1. ROOM MANAGER GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left selector card */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-400" />
                Tổng Quan Phòng Học Chủ Quản
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Giáo viên quản trị nội dung phòng học, phân phối điểm số và cấu hình gamification
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleStartEditRoom}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition cursor-pointer"
                title="Đổi tên và mô tả phòng học"
              >
                ✏️ Đổi Tên Lớp
              </button>
              <button 
                onClick={() => {
                  setShowDeleteConfirm(prev => !prev);
                  setShowEditRoom(false);
                }}
                className={`p-1.5 rounded-lg border transition cursor-pointer ${
                  showDeleteConfirm
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border-rose-500/20'
                }`}
                title="Xóa vĩnh viễn phòng học"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Edit Room Form if active */}
          {showEditRoom && (
            <form onSubmit={handleSaveRoomEdit} className="mb-6 p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-4 animate-fade-in text-left">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                <span>✏️ CHI TIẾT ĐỔI TÊN & MÔ TẢ PHÒNG HỌC</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Tên Phòng Học *</label>
                  <input
                    type="text"
                    value={editRoomName}
                    onChange={e => setEditRoomName(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">Mô tả Phòng học</label>
                  <input
                    type="text"
                    value={editRoomDesc}
                    onChange={e => setEditRoomDesc(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditRoom(false)}
                  className="px-3 py-1 bg-slate-850 hover:bg-slate-800 text-xs text-slate-300 rounded-lg transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-1 bg-emerald-600 hover:bg-emerald-500 text-xs text-white font-bold rounded-lg shadow transition cursor-pointer"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          )}

          {/* Delete Room Confirmation Modal-alike Panel */}
          {showDeleteConfirm && (
            <div className="mb-6 p-5 bg-rose-950/20 border border-rose-500/30 rounded-xl space-y-4 animate-fade-in text-left">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-10 h-10 text-rose-500 shrink-0" />
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-rose-400 tracking-wider uppercase font-mono flex items-center gap-1.5">
                    <span>⚠️ CẢNH BÁO XÓA PHÒNG HỌC</span>
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Bạn có chắc chắn muốn xóa vĩnh viễn phòng học <strong className="text-rose-300 font-bold">"{rooms.find(r => r.id === activeRoomId)?.roomName}"</strong> chứ?
                  </p>
                  <p className="text-[11px] text-rose-400/90 leading-relaxed">
                    ⚠️ Hành động này sẽ xóa toàn bộ danh sách học sinh, các nhiệm vụ đã giao, lịch sử quay số và bảng điểm của phòng này. Hành động này KHÔNG THỂ hoàn tác!
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2.5 pt-2 border-t border-rose-500/10">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 rounded-lg transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteRoom(activeRoomId)}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-xs text-white font-bold rounded-lg shadow transition cursor-pointer"
                >
                  Xác Nhận Xóa Vĩnh Viễn
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {rooms.map(r => {
              const countParts = db.getParticipants().filter(p => p.roomId === r.id).length;
              const countQuests = db.getQuests().filter(q => q.roomId === r.id).length;
              const isActive = r.id === activeRoomId;

              return (
                <div 
                  key={r.id}
                  onClick={() => onActiveRoomChanged(r.id)}
                  className={`p-4 rounded-xl cursor-pointer transition flex flex-col justify-between border ${
                    isActive 
                      ? 'bg-emerald-500/10 border-emerald-500/50 shadow-md shadow-emerald-500/5' 
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-slate-100 truncate">{r.roomName}</h4>
                      <span className="text-[10px] bg-slate-800 text-emerald-400 font-mono font-bold px-1.5 py-0.5 rounded-full">
                        Code: {r.inviteCode}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 line-clamp-2 h-8">{r.description || 'Không có mô tả'}</p>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800/55 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {countParts} Học sinh
                    </span>
                    <span className="font-mono">
                      {countQuests} Nhiệm vụ
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right classroom creator card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-sm text-slate-100 flex items-center gap-1.5 mb-4">
            <Plus className="w-4 h-4 text-emerald-400" />
            Tạo Phòng Học Mới
          </h3>

          <form onSubmit={handleCreateRoom} className="space-y-4 font-sans text-left">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Môn học giảng dạy *</label>
              <div className="space-y-3">
                {!isAddingNewSubject ? (
                  <div className="flex gap-2">
                    <select 
                      value={subjectName} 
                      onChange={e => {
                        if (e.target.value === '__NEW_SUBJECT_TRIGGER__') {
                          setIsAddingNewSubject(true);
                          setSubjectName('');
                        } else {
                          setSubjectName(e.target.value);
                        }
                      }}
                      className="flex-1 text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer font-medium" 
                      required={!isAddingNewSubject}
                    >
                      <option value="" disabled hidden>-- Chọn môn học --</option>
                      {subjects.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                      <option value="__NEW_SUBJECT_TRIGGER__" className="text-emerald-400 font-bold">+ Thêm môn học mới...</option>
                    </select>
                    {subjects.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingNewSubject(true);
                          setSubjectName('');
                        }}
                        className="px-2 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg text-[10px] text-emerald-400 font-bold transition-all"
                      >
                        THÊM MỚI
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nhập tên môn học mới..."
                        value={customSubjectText}
                        onChange={e => setCustomSubjectText(e.target.value)}
                        className="flex-1 text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500 font-medium placeholder-slate-600"
                        required={isAddingNewSubject}
                      />
                      {subjects.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingNewSubject(false);
                            if (subjects.length > 0) {
                              setSubjectName(subjects[0]);
                            }
                          }}
                          className="px-2 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-lg text-[10px] text-slate-400 font-bold transition-all"
                        >
                          HỦY
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 italic">Viết hoa tự động chữ cái đầu mỗi từ (Ví dụ: Tin Học).</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Lớp học tham gia *</label>
              <select 
                value={targetClass} 
                onChange={e => setTargetClass(e.target.value)}
                required
                className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-emerald-400 font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <optgroup label="Danh sách Lớp học cá nhân" className="text-slate-400 font-medium bg-slate-950">
                  {db.getClasses().map(cls => (
                    <option key={cls} value={cls} className="text-slate-100 font-medium">Lớp {cls}</option>
                  ))}
                </optgroup>
                <optgroup label="Tạo phòng học chung (Theo Khối)" className="text-emerald-400 font-bold bg-slate-950">
                  {uniqueGrades.map(grade => (
                    <option key={`Khối ${grade}`} value={`Khối ${grade}`} className="text-emerald-300 font-bold">👥 Phòng chung Khối {grade}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">Mô tả chi tiết (Tùy chọn)</label>
              <textarea 
                placeholder="Mô tả tóm lược môn và mục tiêu lớp học..."
                value={newRoomDesc}
                onChange={e => setNewRoomDesc(e.target.value)}
                rows={3}
                className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs tracking-wider transition uppercase cursor-pointer"
            >
              Thành Lập Lớp
            </button>
          </form>
        </div>
      </div>

      {/* 2. ENROLLED STUDENTS & EXCEL IMPORT */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              Bảng Học Viên Lớp Học ({enrolledStudents.length} học sinh)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Danh sách học viên thuộc lớp này được tự động lấy từ dữ liệu hệ thống (do Admin quản lý) và tự động đồng bộ.
            </p>
          </div>
        </div>

        {/* Dynamic score tweaking configures values */}
        <div className="bg-slate-950 border border-slate-800/70 rounded-xl p-4 mb-6 flex flex-wrap justify-between items-center gap-4">
          <div className="flex flex-wrap gap-6 items-center">
            <div>
              <span className="text-xs font-bold text-slate-300 block mb-1">Cấu hình điều chỉnh điểm:</span>
              <p className="text-[10px] text-slate-500 italic">
                Bù/trừ lượng điểm này khi thực hiện thưởng/phạt.
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-mono font-bold">XP:</span>
              <input 
                type="number" 
                value={xpTweakAmount} 
                onChange={e => setXpTweakAmount(Number(e.target.value))}
                className="w-16 text-center text-xs bg-slate-900 border border-slate-800 rounded py-1 px-1.5 text-amber-400 font-bold"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-mono font-bold">Vàng:</span>
              <input 
                type="number" 
                value={goldTweakAmount} 
                onChange={e => setGoldTweakAmount(Number(e.target.value))}
                className="w-16 text-center text-xs bg-slate-900 border border-slate-800 rounded py-1 px-1.5 text-yellow-400 font-bold"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-900/60 p-2 px-3 border border-slate-800/80 rounded-lg">
            <div className="text-left">
              <span className="text-[10px] font-bold text-slate-400 block font-mono">ĐÃ CHỌN:</span>
              <span className="text-xs font-mono font-extrabold text-emerald-400">{selectedStudentIds.length} học sinh</span>
            </div>
            
            <div className="flex gap-1.5 ml-2">
              <button
                type="button"
                onClick={() => {
                  if (selectedStudentIds.length === 0) {
                    alert('Vui lòng chọn ít nhất 1 học sinh ở danh sách bên dưới!');
                    return;
                  }
                  adjustMultipleStudentsScores(selectedStudentIds, 'add');
                }}
                className={`px-3 py-1.5 rounded text-xs font-extrabold transition-all duration-150 flex items-center gap-1 cursor-pointer ${
                  selectedStudentIds.length > 0
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg'
                    : 'bg-slate-850 text-slate-500 border border-slate-800/50 cursor-not-allowed'
                }`}
                disabled={selectedStudentIds.length === 0}
              >
                <PlusCircle className="w-3.5 h-3.5" /> Thưởng Điểm
              </button>

              <button
                type="button"
                onClick={() => {
                  if (selectedStudentIds.length === 0) {
                    alert('Vui lòng chọn ít nhất 1 học sinh ở danh sách bên dưới!');
                    return;
                  }
                  adjustMultipleStudentsScores(selectedStudentIds, 'subtract');
                }}
                className={`px-3 py-1.5 rounded text-xs font-extrabold transition-all duration-150 flex items-center gap-1 cursor-pointer ${
                  selectedStudentIds.length > 0
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg'
                    : 'bg-slate-850 text-slate-500 border border-slate-800/50 cursor-not-allowed'
                }`}
                disabled={selectedStudentIds.length === 0}
              >
                <MinusCircle className="w-3.5 h-3.5" /> Phạt Điểm
              </button>
            </div>
          </div>
        </div>

        {/* Students scoreboard list */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase font-mono tracking-wider">
                <th className="py-3 px-4 w-10 text-center">
                  <input 
                    type="checkbox"
                    checked={enrolledStudents.length > 0 && selectedStudentIds.length === enrolledStudents.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedStudentIds(enrolledStudents.map(s => s.studentId));
                      } else {
                        setSelectedStudentIds([]);
                      }
                    }}
                    className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4">Ảnh đại diện</th>
                <th className="py-3 px-4">Họ và tên</th>
                <th className="py-3 px-4">Mã học sinh</th>
                <th className="py-3 px-4 text-right">Tiền Vàng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-slate-300 text-xs">
              {enrolledStudents.map(student => {
                const isSelected = selectedStudentIds.includes(student.studentId);
                return (
                  <tr 
                    key={student.id} 
                    className={`transition cursor-pointer ${
                      isSelected ? 'bg-emerald-500/5 hover:bg-emerald-500/10' : 'hover:bg-slate-900/30'
                    }`}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedStudentIds(selectedStudentIds.filter(id => id !== student.studentId));
                      } else {
                        setSelectedStudentIds([...selectedStudentIds, student.studentId]);
                      }
                    }}
                  >
                    <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudentIds([...selectedStudentIds, student.studentId]);
                          } else {
                            setSelectedStudentIds(selectedStudentIds.filter(id => id !== student.studentId));
                          }
                        }}
                        className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-700 shrink-0">
                        <img 
                          src={student.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${student.fullName}`} 
                          alt="" 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-100">{student.fullName}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-400 select-all font-semibold">{student.email}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-yellow-400">{student.goldBalance} 🪙</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {enrolledStudents.length === 0 && (
            <div className="text-center py-8 text-slate-500 italic">
              Không có học sinh trong lớp học này. Vui lòng liên hệ Admin để thêm học sinh vào Lớp {rooms.find(r => r.id === activeRoomId)?.targetClass || 'mục tiêu'}.
            </div>
          )}
        </div>
      </div>

      {/* 3. QUEST CREATOR MATRIX */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 mb-2">
          <Sliders className="w-5 h-5 text-emerald-400" />
          Ma Trận Phát Hành Nhiệm Vụ (Quest Creator)
        </h2>
        <p className="text-xs text-slate-400 mb-6 pb-4 border-b border-slate-800">
          Chỉ định thử thách bài tập, lựa chọn thang thưởng/phạt tự động và thiết kế bảng câu hỏi trắc nghiệm tự chấm điểm.
        </p>

        <form onSubmit={handleDeployQuest} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left Column basic parameters */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Tiêu đề nhiệm vụ *</label>
                <input 
                  type="text" 
                  placeholder="Ví dụ: Lắp ráp bánh răng truyền lực, Lập trình vòng lặp Scratch..."
                  value={questTitle}
                  onChange={e => setQuestTitle(e.target.value)}
                  required
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Yêu cầu chi tiết bài tập *</label>
                <textarea 
                  placeholder="Mô tả cụ thể từng bước hướng dẫn và kết quả đầu ra mong đợi..."
                  value={questDesc}
                  onChange={e => setQuestDesc(e.target.value)}
                  required
                  rows={4}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Hình thức nộp bài</label>
                  <select
                    value={questType}
                    onChange={e => setQuestType(e.target.value as 'quiz' | 'file')}
                    className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
                  >
                    <option value="quiz">Trắc nghiệm (Tự chấm)</option>
                    <option value="file">Nộp File / Ảnh Chụp</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Hạn chót (Chọn ngày)
                  </label>
                  <input
                    type="date"
                    value={deadlineDate}
                    min={getTomorrowDateString()}
                    onChange={e => setDeadlineDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500 [&::-webkit-calendar-picker-indicator]:invert"
                    required
                  />
                </div>
              </div>

              {/* Advanced Matrix Parameters */}
              <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-xl space-y-4 text-left">
                <h4 className="text-xs font-bold tracking-wider text-emerald-400 uppercase flex items-center gap-1.5">
                  🛡️ CẤU HÌNH MA TRẬN NHIỆM VỤ NÂNG CAO
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Limit attempts selection */}
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                      Số lần làm bài tối đa
                    </label>
                    <select
                      value={maxAttempts}
                      onChange={e => setMaxAttempts(Number(e.target.value))}
                      className="w-full text-xs px-2.5 py-2 bg-slate-955 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500 bg-slate-950"
                    >
                      <option value={0}>∞ Không giới hạn</option>
                      <option value={1}>1 lần duy nhất</option>
                      <option value={2}>Thử lại tối đa 2 lần</option>
                      <option value={3}>Thử lại tối đa 3 lần</option>
                      <option value={5}>Thử lại tối đa 5 lần</option>
                    </select>
                  </div>

                  {/* Retry reduction switch */}
                  <div className="flex items-center justify-between p-2.5 bg-slate-950/80 rounded-lg border border-slate-900">
                    <div className="text-left pr-2">
                      <span className="text-[10px] uppercase font-bold text-slate-300 block">Phạt nộp lại</span>
                      <span className="text-[9px] text-slate-500 block leading-tight">Mỗi lần nộp lại giảm 20% XP & Vàng</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={reduceRewardOnRetry} 
                        onChange={e => setReduceRewardOnRetry(e.target.checked)} 
                        className="sr-only peer" 
                      />
                      <div className="w-8 h-4.5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-slate-100 peer-checked:after:border-white"></div>
                    </label>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-900">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Đảo ngẫu nhiên trắc nghiệm</span>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {/* Shuffle questions */}
                    <label className="flex items-center gap-2 p-2 bg-slate-950/60 rounded-lg border border-slate-900 cursor-pointer hover:border-slate-850 transition">
                      <input 
                        type="checkbox" 
                        checked={shuffleQuestions} 
                        onChange={e => setShuffleQuestions(e.target.checked)} 
                        className="rounded border-slate-850 bg-slate-950 text-emerald-500 focus:ring-emerald-500 w-3.5 h-3.5" 
                      />
                      <div>
                        <span className="text-[11px] font-semibold text-slate-300 block">Đảo câu hỏi</span>
                        <span className="text-[9px] text-slate-500 block">Đổi thứ tự câu</span>
                      </div>
                    </label>

                    {/* Shuffle options */}
                    <label className="flex items-center gap-2 p-2 bg-slate-950/60 rounded-lg border border-slate-900 cursor-pointer hover:border-slate-850 transition">
                      <input 
                        type="checkbox" 
                        checked={shuffleOptions} 
                        onChange={e => setShuffleOptions(e.target.checked)} 
                        className="rounded border-slate-850 bg-slate-950 text-emerald-500 focus:ring-emerald-500 w-3.5 h-3.5" 
                      />
                      <div>
                        <span className="text-[11px] font-semibold text-slate-300 block">Đảo đáp án</span>
                        <span className="text-[9px] text-slate-500 block">Xáo trộn A, B, C, D</span>
                      </div>
                    </label>
                  </div>

                  {/* Three level grading toggle */}
                  <div className="flex items-center justify-between p-2.5 bg-slate-950/80 rounded-lg border border-slate-900">
                    <div className="text-left pr-2">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] uppercase font-bold text-teal-400 block">Thang đánh giá 3 mức độ</span>
                      </div>
                      <span className="text-[9px] text-slate-400 block leading-normal mt-0.5">
                        • Đúng 100% → Nhận thưởng trọn vẹn.<br />
                        • Đúng &lt; 100% → Không thưởng, không phạt (Passed).<br />
                        • Quá hạn chưa nộp → Bị quét phạt trừ XP/Vàng.
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                      <input 
                        type="checkbox" 
                        checked={threeLevelGrading} 
                        onChange={e => setThreeLevelGrading(e.target.checked)} 
                        className="sr-only peer" 
                      />
                      <div className="w-8 h-4.5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-slate-100 peer-checked:after:border-white"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column game rewards configuration */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold tracking-wider text-slate-300 uppercase">Cấu hình thang điểm game hóa</h4>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 text-center">
                  <span className="text-[10px] text-slate-400 block mb-1">Thưởng kinh nghiệm</span>
                  <input 
                    type="number" 
                    value={rewardXp} 
                    onChange={e => setRewardXp(Number(e.target.value))}
                    className="w-full bg-transparent text-center text-sm font-mono font-bold text-emerald-400 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 font-bold block mt-1">XP</span>
                </div>

                <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 text-center">
                  <span className="text-[10px] text-slate-400 block mb-1">Thưởng tiền vàng</span>
                  <input 
                    type="number" 
                    value={rewardGold} 
                    onChange={e => setRewardGold(Number(e.target.value))}
                    className="w-full bg-transparent text-center text-sm font-mono font-bold text-yellow-400 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 font-bold block mt-1">VÀNG 🪙</span>
                </div>

                <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 text-center border-rose-500/10">
                  <span className="text-[10px] text-rose-400 font-semibold block mb-1 flex items-center justify-center gap-0.5">
                    <AlertTriangle className="w-3 h-3" /> Phạt trễ hạn XP
                  </span>
                  <input 
                    type="number" 
                    value={penaltyXp} 
                    onChange={e => setPenaltyXp(Number(e.target.value))}
                    className="w-full bg-transparent text-center text-sm font-mono font-bold text-rose-400 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 font-bold block mt-1">XP</span>
                </div>

                <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 text-center border-rose-500/10">
                  <span className="text-[10px] text-rose-400 font-semibold block mb-1 flex items-center justify-center gap-0.5">
                    <AlertTriangle className="w-3 h-3" /> Phạt trễ hạn Vàng
                  </span>
                  <input 
                    type="number" 
                    value={penaltyGold} 
                    onChange={e => setPenaltyGold(Number(e.target.value))}
                    className="w-full bg-transparent text-center text-sm font-mono font-bold text-rose-400 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 font-bold block mt-1">VÀNG 🪙</span>
                </div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-slate-400 space-y-1">
                <p>💡 <strong className="text-slate-300">Tính năng thông minh:</strong></p>
                <p>• Trắc nghiệm sẽ tự so đáp án khách quan khi học sinh làm xong.</p>
                <p>• Phạt trễ hạn tự quét giảm điểm qua tác vụ Cron 00:00 ngầm.</p>
              </div>

              {/* Quiz specific questions builder panel */}
              {questType === 'quiz' && (
                <div className="space-y-3">
                  {/* Import/Export Template Tools */}
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex flex-wrap gap-2.5 items-center justify-between">
                    <div className="text-left">
                      <span className="font-bold text-[10px] text-emerald-400 block tracking-wide font-mono uppercase">QUẢN LÝ BIỂU MẪU CÂU HỎI TRẮC NGHIỆM</span>
                      <span className="text-[9px] text-slate-400 block leading-tight">Sử dụng file JSON cấu trúc chuẩn mực để nạp câu hỏi và ảnh hàng loạt</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadQuizTemplate}
                        className="px-2.5 py-1 bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-705 text-slate-300 hover:text-slate-100 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                        title="Tải tệp mẫu câu hỏi trắc nghiệm dưới dạng tệp tin JSON"
                      >
                        📥 Tải Mẫu
                      </button>
                      <label className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shadow-sm">
                        📤 Nhập File JSON
                        <input
                          type="file"
                          accept=".json"
                          onChange={handleImportQuizTemplate}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="border border-slate-800/80 bg-slate-950 rounded-xl p-4 max-h-[360px] overflow-y-auto space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                      <span className="text-xs font-bold text-slate-300">Bộ Câu Hỏi Trắc Nghiệm ({quizQuestions.length})</span>
                      <button
                        type="button"
                        onClick={addQuizQuestionToForm}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-0.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> Thêm câu hỏi
                      </button>
                    </div>

                    {quizQuestions.map((q, qIdx) => (
                      <div key={qIdx} className="space-y-3 pb-4 border-b border-slate-900 last:border-0 text-xs text-left">
                        <div className="flex justify-between gap-2">
                          <span className="text-emerald-400 font-mono font-bold text-[11px]">Câu hỏi #{qIdx+1}</span>
                          {quizQuestions.length > 1 && (
                            <button 
                              type="button" 
                              onClick={() => removeQuizQuestionFromForm(qIdx)}
                              className="text-rose-400 hover:text-rose-300 text-[10px]"
                            >
                              Xóa câu hỏi
                            </button>
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <input 
                            type="text" 
                            placeholder="Nội dung câu hỏi của lớp..."
                            value={q.questionText}
                            onChange={e => updateQuizFormQuestion(qIdx, e.target.value)}
                            className="w-full text-xs p-1.5 bg-slate-900 border border-slate-800 rounded text-slate-100"
                            required
                          />
                          {/* Question image link & file upload */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input 
                              type="text" 
                              placeholder="URL ảnh câu hỏi (Tùy chọn)"
                              value={q.questionImage || ''}
                              onChange={e => updateQuizFormImage(qIdx, e.target.value)}
                              className="text-[10px] p-1 bg-slate-900 border border-slate-800/80 rounded text-slate-300 focus:outline-none focus:border-cyan-500"
                            />
                            <div className="flex gap-1.5 items-center">
                              <label className="px-2 py-1 bg-slate-850 hover:bg-slate-800 text-slate-300 text-[10px] rounded cursor-pointer leading-none text-center flex-1 font-semibold truncate border border-slate-750/50">
                                📁 {q.questionImage ? 'Có ảnh ✓' : 'Tải ảnh thiết bị'}
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={e => handleImageUploadForQuestion(qIdx, e.target.files?.[0] || null)}
                                  className="hidden"
                                />
                              </label>
                              {q.questionImage && (
                                <button
                                  type="button"
                                  onClick={() => updateQuizFormImage(qIdx, '')}
                                  className="text-rose-400 hover:text-rose-300 text-[10px] px-1"
                                  title="Xóa ảnh"
                                >
                                  🗑️
                                </button>
                              )}
                            </div>
                          </div>
                          {q.questionImage && (
                            <div className="flex items-center justify-start gap-2 p-1 border border-slate-900 bg-slate-900/40 rounded max-w-min">
                              <img src={q.questionImage} className="h-10 w-auto rounded object-contain border border-slate-800" referrerPolicy="no-referrer" alt="preview" />
                              <span className="text-[8px] text-slate-500 font-mono">Xem thử</span>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-1 border-t border-slate-900/30">
                          {q.options.map((opt, optIdx) => {
                            const optImg = q.optionImages?.[optIdx] || '';
                            return (
                              <div key={optIdx} className="p-2 bg-slate-900/45 border border-slate-850 rounded-lg space-y-1">
                                <div className="flex gap-1 items-center">
                                  <input 
                                    type="radio" 
                                    name={`correct_${qIdx}`}
                                    checked={q.correctOptionIndex === optIdx}
                                    onChange={() => updateQuizFormCorrect(qIdx, optIdx)}
                                    className="accent-emerald-500"
                                  />
                                  <input 
                                    type="text" 
                                    placeholder={`Đáp án ${optIdx+1}`}
                                    value={opt}
                                    onChange={e => updateQuizFormOption(qIdx, optIdx, e.target.value)}
                                    className="w-full text-[11px] p-1 bg-slate-900 border border-slate-800/50 rounded text-slate-200"
                                    required
                                  />
                                </div>
                                {/* Option image path & upload */}
                                <div className="flex gap-1 items-center pl-4">
                                  <input 
                                    type="text" 
                                    placeholder="Ảnh đáp án (Tùy chọn)"
                                    value={optImg}
                                    onChange={e => updateQuizFormOptionImage(qIdx, optIdx, e.target.value)}
                                    className="text-[9px] p-0.5 bg-slate-950 border border-slate-900 rounded text-slate-400 focus:outline-none flex-1"
                                  />
                                  <label className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[8px] px-1 py-0.5 rounded cursor-pointer shrink-0 border border-slate-700">
                                    🖼️ file
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={e => handleImageUploadForOption(qIdx, optIdx, e.target.files?.[0] || null)}
                                      className="hidden"
                                    />
                                  </label>
                                  {optImg && (
                                    <button
                                      type="button"
                                      onClick={() => updateQuizFormOptionImage(qIdx, optIdx, '')}
                                      className="text-rose-400 hover:text-rose-300 text-[9px]"
                                      title="Xóa"
                                    >
                                      ❌
                                    </button>
                                  )}
                                </div>
                                {optImg && (
                                  <div className="pl-4 flex items-center gap-1.5">
                                    <img src={optImg} className="h-6 w-6 rounded object-cover border border-slate-800" referrerPolicy="no-referrer" alt="preview choice" />
                                    <span className="text-[8px] text-slate-500 font-mono">Xem trước ảnh đáp án</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs tracking-wider uppercase transition shadow-md"
            >
              Phát Hành Thử Thách Ngay
            </button>
          </div>
        </form>
      </div>

      {/* 3.5. MANAGE PUBLISHED QUESTS & GRADING */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-emerald-400" />
              Bảng Quản Lý Thử Thách Đã Phát Hành & Bài Nộp
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Hủy, kết thúc sớm hoặc sửa đổi các nhiệm vụ; Phê duyệt/chấm điểm bài làm tự luận/file của học viên.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Lọc lớp:</span>
            <select
              value={filterRoomId}
              onChange={e => setFilterRoomId(e.target.value)}
              className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none"
            >
              <option value="all">Tất cả các lớp</option>
              {rooms.map(r => (
                <option key={r.id} value={r.id}>{r.roomName}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab selector */}
        <div className="flex border-b border-slate-800 pb-3 gap-2">
          <button
            onClick={() => setSubTab('quests')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              subTab === 'quests'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            Nhiệm Vụ Đã Phát Hành ({
              quests.filter(q => filterRoomId === 'all' || q.roomId === filterRoomId).length
            })
          </button>
          
          <button
            onClick={() => setSubTab('reviews')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              subTab === 'reviews'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            Duyệt Bài Làm / Bài Nộp ({
              submissions.filter(sub => {
                const q = quests.find(qu => qu.id === sub.questId);
                const matchesRoom = filterRoomId === 'all' || (q && q.roomId === filterRoomId);
                return matchesRoom && (sub.status === 'submitted' || sub.status === 'pending');
              }).length
            })
          </button>
        </div>

        {/* TAB CONTENTS */}
        {subTab === 'quests' ? (
          <div>
            {/* Editing Quest Panel Overlay/Card */}
            {editingQuestId && (
              <div className="mb-6 p-5 bg-slate-950 border border-emerald-500/30 rounded-xl space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                  <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Edit3 className="w-4 h-4" /> Chỉnh Sửa Nhiệm Vụ Đã Phát Hành
                  </h3>
                  <button
                    onClick={() => setEditingQuestId(null)}
                    className="text-slate-400 hover:text-rose-400 text-xs"
                  >
                    Đóng [X]
                  </button>
                </div>

                <form onSubmit={handleSaveEditedQuest} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tiêu đề nhiệm vụ *</label>
                      <input
                        type="text"
                        value={editQuestTitle}
                        onChange={e => setEditQuestTitle(e.target.value)}
                        required
                        className="w-full text-xs px-3 py-2 bg-slate-100/5 border border-slate-800 rounded-lg text-slate-100 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Yêu cầu chi tiết *</label>
                      <textarea
                        value={editQuestDesc}
                        onChange={e => setEditQuestDesc(e.target.value)}
                        required
                        rows={3}
                        className="w-full text-xs px-3 py-2 bg-slate-100/5 border border-slate-800 rounded-lg text-slate-100 focus:outline-none resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Loại nhiệm vụ</label>
                        <select
                          value={editQuestType}
                          onChange={e => setEditQuestType(e.target.value as 'quiz' | 'file')}
                          className="w-full text-xs px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
                        >
                          <option value="quiz">Trắc nghiệm</option>
                          <option value="file">Nộp File / Ảnh</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Hạn chót chỉnh sửa</label>
                        <input
                          type="date"
                          value={editDeadlineDate}
                          onChange={e => setEditDeadlineDate(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold text-slate-300 uppercase tracking-widest pb-1 border-b border-slate-800">
                      Điểm Số Thưởng / Phạt Tự Động
                    </h4>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-400 block mb-1">Thưởng khi đạt (XP)</span>
                        <input
                          type="number"
                          value={editRewardXp}
                          onChange={e => setEditRewardXp(Number(e.target.value))}
                          className="w-full bg-transparent text-xs font-mono font-bold text-emerald-400 focus:outline-none"
                        />
                      </div>

                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-[10px] text-slate-400 block mb-1">Thưởng khi đạt (Vàng)</span>
                        <input
                          type="number"
                          value={editRewardGold}
                          onChange={e => setEditRewardGold(Number(e.target.value))}
                          className="w-full bg-transparent text-xs font-mono font-bold text-yellow-400 focus:outline-none"
                        />
                      </div>

                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/80">
                        <span className="text-[10px] text-rose-400 block mb-1">Phạt trễ hạn (XP)</span>
                        <input
                          type="number"
                          value={editPenaltyXp}
                          onChange={e => setEditPenaltyXp(Number(e.target.value))}
                          className="w-full bg-transparent text-xs font-mono font-bold text-rose-400 focus:outline-none"
                        />
                      </div>

                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/80">
                        <span className="text-[10px] text-rose-400 block mb-1">Phạt trễ hạn (Vàng)</span>
                        <input
                          type="number"
                          value={editPenaltyGold}
                          onChange={e => setEditPenaltyGold(Number(e.target.value))}
                          className="w-full bg-transparent text-xs font-mono font-bold text-rose-400 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Edit Matrix Parameters Section */}
                    <div className="p-3 bg-slate-950/60 border border-slate-800/60 rounded-xl space-y-3.5 text-left">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block">
                        ⚙️ MA TRẬN NHIỆM VỤ NÂNG CAO
                      </span>

                      <div className="grid grid-cols-2 gap-3">
                        {/* Limit attempts selection */}
                        <div>
                          <label className="block text-[9px] uppercase font-bold text-slate-400 mb-1">
                            Số lần làm tối đa
                          </label>
                          <select
                            value={editMaxAttempts}
                            onChange={e => setEditMaxAttempts(Number(e.target.value))}
                            className="w-full text-xs px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-md text-slate-200 focus:outline-none"
                          >
                            <option value={0}>∞ Không giới hạn</option>
                            <option value={1}>1 lần duy nhất</option>
                            <option value={2}>Tối đa 2 lần</option>
                            <option value={3}>Tối đa 3 lần</option>
                            <option value={5}>Tối đa 5 lần</option>
                          </select>
                        </div>

                        {/* Retry reduction switch */}
                        <div className="flex items-center justify-between p-2 bg-slate-900 rounded-md border border-slate-850">
                          <div className="text-left pr-1">
                            <span className="text-[9px] uppercase font-bold text-slate-350 block leading-tight">Giảm phần thưởng</span>
                            <span className="text-[8px] text-slate-500 block leading-tight">-20%/lần nộp lại</span>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer select-none">
                            <input 
                              type="checkbox" 
                              checked={editReduceRewardOnRetry} 
                              onChange={e => setEditReduceRewardOnRetry(e.target.checked)} 
                              className="sr-only peer" 
                            />
                            <div className="w-7 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-slate-100 peer-checked:after:border-white"></div>
                          </label>
                        </div>
                      </div>

                      {/* Shuffle Toggles */}
                      <div className="grid grid-cols-2 gap-2.5">
                        <label className="flex items-center gap-2 p-1.5 bg-slate-900/40 rounded-md border border-slate-850 cursor-pointer hover:border-slate-800 transition">
                          <input 
                            type="checkbox" 
                            checked={editShuffleQuestions} 
                            onChange={e => setEditShuffleQuestions(e.target.checked)} 
                            className="rounded border-slate-800 bg-slate-950 text-emerald-500 focus:ring-emerald-500 w-3 h-3" 
                          />
                          <div>
                            <span className="text-[10px] font-semibold text-slate-300 block">Đảo câu hỏi</span>
                          </div>
                        </label>

                        <label className="flex items-center gap-2 p-1.5 bg-slate-900/40 rounded-md border border-slate-850 cursor-pointer hover:border-slate-800 transition">
                          <input 
                            type="checkbox" 
                            checked={editShuffleOptions} 
                            onChange={e => setEditShuffleOptions(e.target.checked)} 
                            className="rounded border-slate-800 bg-slate-950 text-emerald-500 focus:ring-emerald-500 w-3 h-3" 
                          />
                          <div>
                            <span className="text-[10px] font-semibold text-slate-300 block">Đảo đáp án</span>
                          </div>
                        </label>
                      </div>

                      {/* Three level grading toggle */}
                      <div className="flex items-center justify-between p-2 bg-slate-900 rounded-md border border-slate-850">
                        <div className="text-left pr-1">
                          <span className="text-[9px] uppercase font-bold text-teal-400 block leading-tight">Thang điểm 3 mức độ</span>
                          <span className="text-[8px] text-slate-400 block leading-normal mt-0.5">
                            Chính xác 100%: thưởng | &lt;100%: đạt, ko thưởng phạt | Trễ hạn: phạt
                          </span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                          <input 
                            type="checkbox" 
                            checked={editThreeLevelGrading} 
                            onChange={e => setEditThreeLevelGrading(e.target.checked)} 
                            className="sr-only peer" 
                          />
                          <div className="w-7 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-slate-100 peer-checked:after:border-white"></div>
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditingQuestId(null)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-lg transition"
                      >
                        Huỷ sửa
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition"
                      >
                        Lưu Cập Nhật
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {/* Quests Lists Grid */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/70 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-950/20">
                    <th className="py-2.5 px-3">Lớp học</th>
                    <th className="py-2.5 px-3">Nhiệm vụ</th>
                    <th className="py-2.5 px-4 text-center">Yêu cầu hình thức</th>
                    <th className="py-2.5 px-3">Thang điểm thưởng</th>
                    <th className="py-2.5 px-3">Thang phạt trễ</th>
                    <th className="py-2.5 px-3">Hạn chót</th>
                    <th className="py-2.5 px-3 text-right">Lệnh Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850/50 text-xs text-slate-300">
                  {quests
                    .filter(q => filterRoomId === 'all' || q.roomId === filterRoomId)
                    .map(quest => {
                      const roomObj = rooms.find(r => r.id === quest.roomId);
                      const isExpired = new Date(quest.deadline).getTime() < new Date().getTime();

                      return (
                        <tr key={quest.id} className="hover:bg-slate-850/20 transition">
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 bg-slate-950 text-emerald-400 border border-slate-800 rounded font-bold text-[9px]">
                              {roomObj ? roomObj.roomName : 'Lớp đã xóa'}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-100">{quest.title}</div>
                            <div className="text-[10px] text-slate-400 line-clamp-1 max-w-[280px]" title={quest.description}>
                              {quest.description}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded font-bold text-[9px] ${
                              quest.questType === 'quiz' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-amber-500/10 text-amber-400'
                            }`}>
                              {quest.questType === 'quiz' ? 'Trắc nghiệm tự chấm' : 'Nộp File / Tự luận'}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono">
                            <div className="text-emerald-400 font-bold">+{quest.rewardXp} XP</div>
                            <div className="text-yellow-400">+{quest.rewardGold} Vàng</div>
                          </td>
                          <td className="py-3 px-3 font-mono">
                            <div className="text-rose-400">-{quest.penaltyXp} XP</div>
                            {quest.penaltyGold ? (
                              <div className="text-rose-400">-{quest.penaltyGold} Vàng</div>
                            ) : null}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-mono text-[10px]">
                              {new Date(quest.deadline).toLocaleDateString('vi-VN')}
                            </div>
                            <span className={`text-[9px] font-bold ${
                              isExpired ? 'text-rose-400' : 'text-emerald-400'
                            }`}>
                              {isExpired ? 'Đã hết hạn' : 'Đang hoạt động'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-semibold">
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => handleStartEditQuest(quest)}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 hover:text-emerald-400 rounded transition cursor-pointer"
                                title="Sửa nội dung nhiệm vụ"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              
                              {!isExpired && (
                                <button
                                  onClick={() => handleEndQuestEarly(quest.id)}
                                  className="p-1.5 bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 rounded transition cursor-pointer"
                                  title="Kết thúc sớm hạn nộp"
                                >
                                  <Clock className="w-3.5 h-3.5" />
                                </button>
                              )}

                              <button
                                onClick={() => handleCancelQuest(quest.id)}
                                className="p-1.5 bg-slate-800 hover:bg-rose-600 hover:text-white rounded transition cursor-pointer"
                                title="Hủy / Xóa vĩnh viễn nhiệm vụ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>

              {quests.filter(q => filterRoomId === 'all' || q.roomId === filterRoomId).length === 0 && (
                <div className="text-center py-8 text-slate-500 italic text-xs">
                  Không tìm thấy nhiệm vụ nào phù hợp với bộ lọc lớp học đã chọn!
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            {/* Reviews list panel */}
            <div className="space-y-4">
              {submissions
                .filter(sub => {
                  const q = quests.find(qu => qu.id === sub.questId);
                  const matchesRoom = filterRoomId === 'all' || (q && q.roomId === filterRoomId);
                  return matchesRoom && (sub.status === 'submitted' || sub.status === 'pending');
                })
                .map(sub => {
                  const sUser = users.find(u => u.id === sub.studentId);
                  const sQuest = quests.find(q => q.id === sub.questId);
                  const sRoom = rooms.find(r => r.id === sQuest?.roomId);

                  if (!sQuest) return null;

                  return (
                    <div key={sub.id} className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-slate-700 transition">
                      <div className="space-y-2 max-w-xl">
                        <div className="flex items-center gap-2">
                          <img
                            src={sUser?.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${sUser?.fullName}`}
                            alt=""
                            className="w-7 h-7 rounded-full object-cover border border-slate-800"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <span className="font-bold text-slate-200 text-xs">{sUser?.fullName || 'Học sinh ẩn danh'}</span>
                            <span className="text-[9px] text-slate-500 ml-2">({sUser?.email || ''})</span>
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-slate-300">
                            Nộp bài: <span className="text-emerald-400">"{sQuest.title}"</span>
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Thời gian nộp: {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString('vi-VN') : 'Không rõ'} • Lớp: <span className="text-slate-400 font-bold">{sRoom?.roomName || 'Đã xoá'}</span>
                          </p>
                        </div>

                        {/* Submission answers */}
                        <div className="p-2.5 bg-slate-900 border border-slate-850 rounded-lg text-xs">
                          {sub.answers ? (
                            <div className="space-y-1">
                              <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">Đáp án trắc nghiệm đã làm:</span>
                              <pre className="text-[10px] font-mono text-slate-300">{JSON.stringify(sub.answers, null, 2)}</pre>
                            </div>
                          ) : sub.attachments && sub.attachments.length > 0 ? (
                            <div className="space-y-1.5">
                              <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">Tệp tin bài nộp học sinh đính kèm:</span>
                              {sub.attachments.map((fileUrl, fi) => {
                                const isImg = fileUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i);
                                return (
                                  <div key={fi} className="space-y-1">
                                    <a
                                      href={fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-emerald-400 underline font-mono text-[10px] break-all block"
                                    >
                                      🔗 {fileUrl} (Mở tệp tin kiểm tra)
                                    </a>
                                    {isImg && (
                                      <img
                                        src={fileUrl}
                                        alt="Bài nộp đính kèm"
                                        className="max-h-40 max-w-xs object-cover rounded-md border border-slate-800"
                                      />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-slate-500 italic text-[11px]">Không có đính kèm hoặc đã sử dụng VOUCHER thông thường.</p>
                          )}
                          
                          {sub.isVoucherUsed && (
                            <div className="mt-1 flex items-center gap-1">
                              <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded text-[9px] font-bold border border-amber-500/20">
                                🎫 Đã dùng phiếu miễn bài tập (Free Pass Voucher)
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Approval Buttons */}
                      <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto shrink-0 font-semibold">
                        <button
                          onClick={() => handleGradeSubmission(sub.id, 'passed')}
                          className="flex-1 py-2 px-3 text-center bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition shadow-sm cursor-pointer"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Duyệt ĐẠT
                        </button>
                        
                        <button
                          onClick={() => handleGradeSubmission(sub.id, 'failed')}
                          className="flex-1 py-2 px-3 text-center bg-slate-800 hover:bg-rose-500/10 hover:text-rose-400 text-slate-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                          Không Đạt (Miễn Phạt)
                        </button>
                      </div>
                    </div>
                  );
                })}

              {submissions.filter(sub => {
                const q = quests.find(qu => qu.id === sub.questId);
                const matchesRoom = filterRoomId === 'all' || (q && q.roomId === filterRoomId);
                return matchesRoom && (sub.status === 'submitted' || sub.status === 'pending');
              }).length === 0 && (
                <div className="text-center py-12 text-slate-500 italic text-xs">
                  Tuyệt vời! Hiện tại không có bài nộp tự luận / file đính kèm nào đang chờ phê duyệt.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. LUCKY WHEEL percentages sliders control */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-yellow-500" />
              Thiết Lập Tỷ Lệ Vòng Quay May Mắn
            </h2>
            <p className="text-xs text-slate-400 mt-1">Điều chỉnh xác suất trúng từng thẻ hoặc vàng của học sinh khi thăng cấp quay thưởng</p>
          </div>
          
          <button
            onClick={saveWheelProbabilities}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition uppercase"
          >
            <Save className="w-4 h-4" />
            Lưu Tỷ Lệ
          </button>
        </div>

        {/* Status sum */}
        <div className="mb-6 p-3 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center text-xs font-mono">
          <span className="text-slate-400">Yêu cầu cân bàng tổng tỷ lệ:</span>
          <span className={`font-bold py-0.5 px-2.5 rounded-full ${
            wheelConfig.reduce((acc, c) => acc + c.probability, 0) === 100 
              ? 'bg-emerald-500/10 text-emerald-400' 
              : 'bg-rose-500/10 text-rose-400 animate-pulse'
          }`}>
            Tổng xác suất: {wheelConfig.reduce((acc, c) => acc + c.probability, 0)}% / 100%
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {wheelConfig.map(wheel => {
            return (
              <div key={wheel.id} className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded" style={{ backgroundColor: wheel.color }} />
                    <span className="text-xs font-bold text-slate-100">{wheel.itemName}</span>
                  </div>
                  <span className="text-xs font-bold font-mono text-cyan-400">{wheel.probability}%</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-500 font-mono">0%</span>
                  <input 
                    type="range" 
                    min="0" 
                    max="60" 
                    step="5"
                    value={wheel.probability} 
                    onChange={e => handleSliderChange(wheel.id, Number(e.target.value))}
                    className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <span className="text-[10px] text-slate-500 font-mono">60%</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 italic">{wheel.rewardText}</p>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
