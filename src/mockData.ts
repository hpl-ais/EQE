import { 
  User, Classroom, RoomParticipant, Quest, 
  QuestSubmission, InventoryItem, LuckyWheelItemConfig, AppNotification
} from './types';

// Helper: Calculate educational levels, titles, levels framing, and visual attributes based on XP
export interface LevelDetail {
  level: number;
  title: string;
  frameType: 'wood' | 'bronze' | 'silver' | 'gold';
  frameLabel: string;
  nextLevelXp: number;
  prevLevelXp: number;
  frameStyle: string; // Specific Tailwind and styled shadows
}

export function getLevelInfo(xp: number): LevelDetail {
  if (xp < 0) xp = 0;
  
  // XP intervals
  // Level 1: 0 - 200 (Tân thủ Học đường)
  // Level 2: 201 - 400
  // Level 3: 401 - 600
  // Level 4: 601 - 800
  // Level 5: 801 - 1000
  // Level 6: 1001-1350 (Học giả Tập sự)
  // Level 7: 1351-1700
  // Level 8: 1701-2050
  // Level 9: 2051-2400
  // Level 10: 2401-2800
  // Level 11: 2801-3300 (Chuyên gia Kiến thức)
  // Level 12: 3301-3800
  // Level 13: 3801-4300
  // Level 14: 4301-4800
  // Level 15: 4801-5300
  // Level 16+: Bậc thầy Học thuật (Gold)

  let level = 1;
  let title = 'Tân thủ Học đường';
  let frameType: 'wood' | 'bronze' | 'silver' | 'gold' = 'wood';
  let frameLabel = 'Khung Gỗ';
  let prevLevelXp = 0;
  let nextLevelXp = 200;

  if (xp <= 1000) {
    level = Math.floor(xp / 200) + 1;
    prevLevelXp = (level - 1) * 200;
    nextLevelXp = level * 200;
    title = 'Tân thủ Học đường';
    frameType = 'wood';
    frameLabel = 'Khung Gỗ Tân Thủ';
  } else if (xp <= 2800) {
    const rxp = xp - 1000;
    level = Math.floor(rxp / 350) + 6;
    prevLevelXp = 1000 + (level - 6) * 350;
    nextLevelXp = 1000 + (level - 5) * 350;
    title = 'Học giả Tập sự';
    frameType = 'bronze';
    frameLabel = 'Khung Đồng Kiên Cố';
  } else if (xp <= 5300) {
    const rxp = xp - 2800;
    level = Math.floor(rxp / 500) + 11;
    prevLevelXp = 2800 + (level - 11) * 500;
    nextLevelXp = 2800 + (level - 10) * 500;
    title = 'Chuyên gia Kiến thức';
    frameType = 'silver';
    frameLabel = 'Khung Bạc Lấp Lánh';
  } else {
    // 5300+
    const rxp = xp - 5300;
    level = Math.floor(rxp / 800) + 16;
    prevLevelXp = 5300 + (level - 16) * 800;
    nextLevelXp = 5300 + (level - 15) * 800;
    title = 'Bậc thầy Học thuật';
    frameType = 'gold';
    frameLabel = 'Khung Vàng Hoàng Kim 24K';
  }

  // Visual styled mapping classes for CSS border components
  let frameStyle = '';
  if (frameType === 'wood') {
    frameStyle = 'border-4 border-amber-800 rounded-lg shadow-[0_0_8px_rgba(146,64,14,0.4)]';
  } else if (frameType === 'bronze') {
    frameStyle = 'border-4 border-orange-700/80 rounded-xl shadow-[0_0_12px_rgba(194,65,12,0.5)]';
  } else if (frameType === 'silver') {
    frameStyle = 'border-4 border-slate-300 rounded-2xl shadow-[0_0_15px_rgba(203,213,225,0.7)] hover:brightness-110 transition duration-300';
  } else if (frameType === 'gold') {
    frameStyle = 'border-4 border-yellow-400 rounded-full shadow-[0_0_20px_rgba(250,204,21,0.9)] animate-pulse relative ring-2 ring-yellow-300';
  }

  return {
    level,
    title,
    frameType,
    frameLabel,
    prevLevelXp,
    nextLevelXp,
    frameStyle,
  };
}

// Default Users
export const DEFAULT_USERS: User[] = [
  {
    id: 'admin-1',
    email: 'admin@eduquest.vn',
    fullName: 'Quản Trị Viên (System Admin)',
    avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
    role: 'admin',
    password: 'adminpassword',
    createdAt: '2026-05-01T07:00:00Z'
  },
  {
    id: 'teacher-1',
    email: 'teacher@eduquest.vn',
    fullName: 'Cô Nguyễn Mai Hoa',
    avatarUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150',
    role: 'teacher',
    password: 'teacherpassword',
    createdAt: '2026-05-01T08:00:00Z'
  },
  {
    id: 'student-an',
    email: 'student.an@eduquest.vn',
    fullName: 'Nguyễn Văn An',
    avatarUrl: 'https://api.dicebear.com/7.x/identicon/svg?seed=An',
    role: 'student',
    studentClass: '10A1',
    createdAt: '2026-05-02T09:00:00Z'
  },
  {
    id: 'student-binh',
    email: 'student.binh@eduquest.vn',
    fullName: 'Lê Thị Bình',
    avatarUrl: 'https://api.dicebear.com/7.x/identicon/svg?seed=Binh',
    role: 'student',
    studentClass: '10A1',
    createdAt: '2026-05-02T09:10:00Z'
  },
  {
    id: 'student-chi',
    email: 'student.chi@eduquest.vn',
    fullName: 'Phạm Minh Chi',
    avatarUrl: 'https://api.dicebear.com/7.x/identicon/svg?seed=Chi',
    role: 'student',
    studentClass: '10A2',
    createdAt: '2026-05-02T09:20:00Z'
  }
];

// Default Rooms
export const DEFAULT_ROOMS: Classroom[] = [];

// Default Room Participants (student scores isolated by room)
export const DEFAULT_PARTICIPANTS: RoomParticipant[] = [];

// Default Quests
export const DEFAULT_QUESTS: Quest[] = [];

// Default Submissions
export const DEFAULT_SUBMISSIONS: QuestSubmission[] = [];

// Default Inventory Items (unclaimed or won vouchers)
export const DEFAULT_INVENTORY: InventoryItem[] = [];

// Default Lucky Wheel configuration (items with custom probability out of 100)
export const DEFAULT_WHEEL_CONFIG: LuckyWheelItemConfig[] = [
  {
    id: 'wheel-1',
    itemType: 'free_pass_voucher',
    itemName: 'Thẻ Miễn Bài Tập 📝',
    probability: 15,
    color: '#EAB308', // Gold
    rewardText: 'Đã nhận Thẻ miễn bài tập! Dùng trong Kho Đồ học sinh.'
  },
  {
    id: 'wheel-2',
    itemType: 'double_xp_card',
    itemName: 'Nhân Đôi XP ⭐',
    probability: 20,
    color: '#10B981', // Teal Emerald
    rewardText: 'Được Thẻ x2 XP thần tốc!'
  },
  {
    id: 'wheel-3',
    itemType: 'custom_avatar_frame',
    itemName: 'Khung Avatar Hiếm ✨',
    probability: 10,
    color: '#EC4899', // Pink
    rewardText: 'Mở khóa Khung avatar lộng lẫy!'
  },
  {
    id: 'wheel-4',
    itemType: 'free_pass_voucher', // Repurposed for physical gold
    itemName: 'Nhận +150 Tiền Vàng 🪙',
    probability: 25,
    color: '#F97316', // Orange
    rewardSpinsEffect: 150, // Flagging as gold amount
    rewardText: 'Tuyệt vời! Cộng ngay +150 tiền vàng tích lũy!'
  },
  {
    id: 'wheel-5',
    itemType: 'free_pass_voucher',
    itemName: 'Nhận +50 Tiền Vàng 🪙',
    probability: 20,
    color: '#3B82F6', // Blue
    rewardSpinsEffect: 50, // Gold Amount
    rewardText: 'Nhận được +50 tiền vàng nhỏ tích cực!'
  },
  {
    id: 'wheel-6',
    itemType: 'double_xp_card',
    itemName: 'Lượt Quay Miễn Phí 🎰',
    probability: 10,
    color: '#8B5CF6', // Purple
    rewardSpinsEffect: 1, // Additional spins flag!
    rewardText: 'Thêm +1 lượt quay may mắn hoàn toàn miễn phí!'
  }
];

// Seed storage system keys
export const KEYS = {
  USERS: 'eduquest_users',
  ROOMS: 'eduquest_rooms',
  PARTICIPANTS: 'eduquest_participants',
  QUESTS: 'eduquest_quests',
  SUBMISSIONS: 'eduquest_submissions',
  INVENTORY: 'eduquest_inventory',
  WHEEL: 'eduquest_wheel_config',
  CURRENT_USER_ID: 'eduquest_active_user_id',
  CURRENT_ROOM_ID: 'eduquest_active_room_id',
  NOTIFICATIONS: 'eduquest_notifications',
  CLASSES: 'eduquest_classes',
  SUBJECTS: 'eduquest_subjects'
};

let hasLoadedGoogleSheetsDb = false;

export function isDbSyncedWithSheets(): boolean {
  return hasLoadedGoogleSheetsDb;
}

export function syncWithGoogleSheets(onComplete?: () => void) {
  if (typeof window === 'undefined') return;
  
  fetch('/api/db/load-all')
    .then(res => res.json())
    .then(payload => {
      if (payload.success && payload.database) {
        const dbState = payload.database;
        
        // Map of spreadsheet keys to localStorage KEYS
        const keyMap: Record<string, string> = {
          users: KEYS.USERS,
          rooms: KEYS.ROOMS,
          participants: KEYS.PARTICIPANTS,
          quests: KEYS.QUESTS,
          submissions: KEYS.SUBMISSIONS,
          inventory: KEYS.INVENTORY,
          wheel: KEYS.WHEEL,
          notifications: KEYS.NOTIFICATIONS,
          classes: KEYS.CLASSES,
          subjects: KEYS.SUBJECTS
        };

        Object.keys(keyMap).forEach(sheetKey => {
          if (dbState[sheetKey]) {
            localStorage.setItem(keyMap[sheetKey], JSON.stringify(dbState[sheetKey]));
          }
        });

        hasLoadedGoogleSheetsDb = true;
        
        // Dispatch global sync event to trigger react view refreshers
        window.dispatchEvent(new Event('eduquest_db_sync'));
        
        if (onComplete) onComplete();
      }
    })
    .catch(err => {
      console.error('Failed to sync database with Google Sheets:', err);
    });
}

// Local storage safe parser-writers
export function initializeStorage() {
  if (typeof window === 'undefined') return;

  // Migration: If the old room 'room-tin-5a' is present, wipe storage cleanly so we have 0 classrooms to start
  const roomsRaw = localStorage.getItem(KEYS.ROOMS);
  if (roomsRaw && roomsRaw.includes('room-tin-5a')) {
    localStorage.removeItem(KEYS.ROOMS);
    localStorage.removeItem(KEYS.PARTICIPANTS);
    localStorage.removeItem(KEYS.QUESTS);
    localStorage.removeItem(KEYS.SUBMISSIONS);
    localStorage.removeItem(KEYS.INVENTORY);
    localStorage.removeItem(KEYS.CURRENT_ROOM_ID);
  }

  if (!localStorage.getItem(KEYS.USERS)) {
    localStorage.setItem(KEYS.USERS, JSON.stringify(DEFAULT_USERS));
  } else {
    try {
      const existing = JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
      const hasAdmin = existing.some((u: any) => u.role === 'admin');
      const needPasswordFill = existing.some((u: any) => !u.password);
      const hasOldDemo = existing.some((u: any) => u.id === 'teacher-1' || u.id === 'student-phuoc');
      if (!hasAdmin || needPasswordFill || hasOldDemo) {
        // Automatically upgrade data and purge old demo accounts, leaving only the official Admin
        localStorage.setItem(KEYS.USERS, JSON.stringify(DEFAULT_USERS));
        // clear old session since demo users are deleted
        localStorage.removeItem('eduquest_session_user_id');
        localStorage.removeItem('eduquest_session_expire');
      }
    } catch (e) {
      localStorage.setItem(KEYS.USERS, JSON.stringify(DEFAULT_USERS));
    }
  }
  if (!localStorage.getItem(KEYS.ROOMS)) {
    localStorage.setItem(KEYS.ROOMS, JSON.stringify(DEFAULT_ROOMS));
  }
  if (!localStorage.getItem(KEYS.PARTICIPANTS)) {
    localStorage.setItem(KEYS.PARTICIPANTS, JSON.stringify(DEFAULT_PARTICIPANTS));
  }
  if (!localStorage.getItem(KEYS.QUESTS)) {
    localStorage.setItem(KEYS.QUESTS, JSON.stringify(DEFAULT_QUESTS));
  }
  if (!localStorage.getItem(KEYS.SUBMISSIONS)) {
    localStorage.setItem(KEYS.SUBMISSIONS, JSON.stringify(DEFAULT_SUBMISSIONS));
  }
  if (!localStorage.getItem(KEYS.INVENTORY)) {
    localStorage.setItem(KEYS.INVENTORY, JSON.stringify(DEFAULT_INVENTORY));
  }
  if (!localStorage.getItem(KEYS.WHEEL)) {
    localStorage.setItem(KEYS.WHEEL, JSON.stringify(DEFAULT_WHEEL_CONFIG));
  }
  if (!localStorage.getItem(KEYS.CURRENT_USER_ID)) {
    // Default to the designated admin for standard fallback
    localStorage.setItem(KEYS.CURRENT_USER_ID, 'admin-1');
  }
  if (!localStorage.getItem(KEYS.CURRENT_ROOM_ID)) {
    const rooms = db.getRooms();
    if (rooms.length > 0) {
      localStorage.setItem(KEYS.CURRENT_ROOM_ID, rooms[0].id);
    }
  }
  if (!localStorage.getItem(KEYS.NOTIFICATIONS)) {
    const initialNotification: AppNotification[] = [
      {
        id: 'notif-1',
        title: 'Chào mừng bạn đến với EduQuest Engine!',
        message: 'Hệ thống tự động hóa lớp học game hóa sẵn sàng vận hành. Chúc học tập vui vẻ!',
        timestamp: new Date().toISOString(),
        type: 'info'
      }
    ];
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(initialNotification));
  }
  if (!localStorage.getItem(KEYS.CLASSES)) {
    localStorage.setItem(KEYS.CLASSES, JSON.stringify(['10A1', '10A2', '11A1', '11A2', '12A1', '12A2']));
  }
  if (!localStorage.getItem(KEYS.SUBJECTS)) {
    localStorage.setItem(KEYS.SUBJECTS, JSON.stringify([]));
  }

  // Trigger automated Google Sheets load & cache override
  syncWithGoogleSheets();
}

// Low level CRUD read / write operations simulating SQL responses
export function getData<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  const val = localStorage.getItem(key);
  return val ? JSON.parse(val) : [];
}

export function saveData<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));

  // Auto push to Google Sheet
  const tableMap: Record<string, string> = {
    'eduquest_users': 'users',
    'eduquest_rooms': 'rooms',
    'eduquest_participants': 'participants',
    'eduquest_quests': 'quests',
    'eduquest_submissions': 'submissions',
    'eduquest_inventory': 'inventory',
    'eduquest_wheel_config': 'wheel',
    'eduquest_notifications': 'notifications',
    'eduquest_classes': 'classes',
    'eduquest_subjects': 'subjects'
  };

  const table = tableMap[key];
  if (table) {
    fetch('/api/db/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ table, data })
    })
    .then(res => res.json())
    .then(res => {
      if (!res.success) {
        console.error(`Google Sheets sync fail to save table ${table}:`, res.error);
      }
    })
    .catch(e => {
      console.error(`Google Sheets sync connection failed for ${table}:`, e);
    });
  }
}

// High-level API utilities supporting UI changes
export const db = {
  getUsers: (): User[] => getData<User>(KEYS.USERS),
  setUsers: (users: User[]) => saveData(KEYS.USERS, users),

  getRooms: (): Classroom[] => getData<Classroom>(KEYS.ROOMS),
  setRooms: (rooms: Classroom[]) => saveData(KEYS.ROOMS, rooms),

  getParticipants: (): RoomParticipant[] => {
    const rawParts = getData<RoomParticipant>(KEYS.PARTICIPANTS);
    const users = db.getUsers();
    const students = users.filter(u => u.role === 'student');
    const rooms = db.getRooms();
    
    let hasChanges = false;
    const syncedParts: RoomParticipant[] = [];

    const partMap = new Map<string, RoomParticipant>();
    rawParts.forEach(p => {
      partMap.set(`${p.roomId}::${p.studentId}`, p);
    });

    rooms.forEach(room => {
      let allowedClasses: string[] = [];
      if (room.isJoint) {
        allowedClasses = room.classes && room.classes.length > 0 
          ? room.classes 
          : db.getClasses().filter(c => getGradeFromClass(c) === (room.targetClass ? room.targetClass.replace(/\D/g, '') : ''));
      } else if (room.targetClass) {
        allowedClasses = [room.targetClass];
      }

      const roomStudents = students.filter(s => s.studentClass && allowedClasses.includes(s.studentClass));

      roomStudents.forEach(student => {
        const key = `${room.id}::${student.id}`;
        if (partMap.has(key)) {
          syncedParts.push(partMap.get(key)!);
        } else {
          const newPart: RoomParticipant = {
            id: `part-${room.id}-${student.id}`,
            roomId: room.id,
            studentId: student.id,
            currentXp: 0,
            currentLevel: 1,
            goldBalance: 0,
            luckySpins: 0,
            joinedAt: new Date().toISOString()
          };
          syncedParts.push(newPart);
          hasChanges = true;
        }
      });
    });

    const isDifferent = rawParts.length !== syncedParts.length || 
      syncedParts.some((p, idx) => {
        const o = rawParts[idx];
        return !o || o.id !== p.id || o.roomId !== p.roomId || o.studentId !== p.studentId;
      });

    if (isDifferent) {
      saveData(KEYS.PARTICIPANTS, syncedParts);
    }

    return syncedParts;
  },
  setParticipants: (parts: RoomParticipant[]) => saveData(KEYS.PARTICIPANTS, parts),

  getQuests: (): Quest[] => getData<Quest>(KEYS.QUESTS),
  setQuests: (quests: Quest[]) => saveData(KEYS.QUESTS, quests),

  getSubmissions: (): QuestSubmission[] => getData<QuestSubmission>(KEYS.SUBMISSIONS),
  setSubmissions: (subs: QuestSubmission[]) => saveData(KEYS.SUBMISSIONS, subs),

  getInventory: (): InventoryItem[] => getData<InventoryItem>(KEYS.INVENTORY),
  setInventory: (items: InventoryItem[]) => saveData(KEYS.INVENTORY, items),

  getWheelConfig: (): LuckyWheelItemConfig[] => {
    const data = getData<LuckyWheelItemConfig>(KEYS.WHEEL);
    return data.length > 0 ? data : DEFAULT_WHEEL_CONFIG;
  },
  setWheelConfig: (wheel: LuckyWheelItemConfig[]) => saveData(KEYS.WHEEL, wheel),

  getNotifications: (): AppNotification[] => getData<AppNotification>(KEYS.NOTIFICATIONS),
  setNotifications: (notifs: AppNotification[]) => saveData(KEYS.NOTIFICATIONS, notifs),

  getCurrentUserId: (): string => {
    return localStorage.getItem(KEYS.CURRENT_USER_ID) || 'student-phuoc';
  },
  setCurrentUserId: (id: string) => {
    localStorage.setItem(KEYS.CURRENT_USER_ID, id);
    // Auto sync when active user changes
  },

  getCurrentRoomId: (): string => {
    const saved = localStorage.getItem(KEYS.CURRENT_ROOM_ID);
    if (saved) return saved;
    const rooms = db.getRooms();
    return rooms.length > 0 ? rooms[0].id : '';
  },
  setCurrentRoomId: (id: string) => {
    localStorage.setItem(KEYS.CURRENT_ROOM_ID, id);
  },
  getClasses: (): string[] => {
    if (typeof window === 'undefined') return ['10A1', '10A2', '11A1', '11A2', '12A1', '12A2'];
    const val = localStorage.getItem(KEYS.CLASSES);
    return val ? JSON.parse(val) : ['10A1', '10A2', '11A1', '11A2', '12A1', '12A2'];
  },
  setClasses: (classes: string[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(KEYS.CLASSES, JSON.stringify(classes));
    }
  },
  getSubjects: (): string[] => {
    if (typeof window === 'undefined') return [];
    const val = localStorage.getItem(KEYS.SUBJECTS);
    return val ? JSON.parse(val) : [];
  },
  setSubjects: (subjects: string[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(KEYS.SUBJECTS, JSON.stringify(subjects));
    }
  }
};

// Add automated system log helper
type NotificationListener = (title: string, message: string, type: 'success' | 'warning' | 'info' | 'level_up' | 'penalty') => void;
const notificationListeners: NotificationListener[] = [];

export function subscribeToNotifications(listener: NotificationListener) {
  notificationListeners.push(listener);
  return () => {
    const idx = notificationListeners.indexOf(listener);
    if (idx !== -1) {
      notificationListeners.splice(idx, 1);
    }
  };
}

export function addSystemNotification(title: string, message: string, type: 'success' | 'warning' | 'info' | 'level_up' | 'penalty') {
  const list = db.getNotifications();
  const newNot: AppNotification = {
    id: 'notif-' + Math.random().toString(36).substr(2, 9),
    title,
    message,
    timestamp: new Date().toISOString(),
    type
  };
  db.setNotifications([newNot, ...list].slice(0, 40)); // keep last 40 entries
  
  // Notify all active React toast listeners
  notificationListeners.forEach(listener => {
    try {
      listener(title, message, type);
    } catch (e) {
      console.error(e);
    }
  });
}

export function getGradeFromClass(className: string): string {
  if (!className) return '';
  const match = className.trim().match(/^(\d+)/);
  return match ? match[1] : '';
}

export function generateJointRooms(allRooms: Classroom[], adminClasses: string[]): Classroom[] {
  return [];
}
