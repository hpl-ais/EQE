export type UserRole = 'teacher' | 'student' | 'admin';

export interface User {
  id: string; // matches student_id or teacher_id
  email: string;
  fullName: string;
  avatarUrl: string;
  role: UserRole;
  password?: string; // Credentials password
  mustChangePassword?: boolean; // Force change password on first login
  createdAt: string;
  studentClass?: string; // e.g. "10A1", "11B2", "12C3", etc.
  studentDevice?: string; // The registered device name for student login lock
}

export interface Classroom {
  id: string;
  roomName: string;
  description: string;
  teacherId: string;
  inviteCode: string;
  createdAt: string;
  sweepFrequency?: 'daily' | 'weekly';
  sweepDay?: number;
  targetClass?: string; // Target school class, e.g., "10A1", "11B2"
  subjectName?: string; // E.g., "Toán học", "Tin học"
  isJoint?: boolean;
  subrooms?: string[];
  classes?: string[];
}

// Maps student metrics isolated for each room (room_participants table)
export interface RoomParticipant {
  id: string;
  roomId: string;
  studentId: string;
  currentXp: number;
  currentLevel: number;
  goldBalance: number;
  luckySpins: number;
  joinedAt: string;
}

export interface QuizQuestion {
  id: string;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  questionImage?: string;
  optionImages?: string[];
}

export type QuestType = 'quiz' | 'file';

export interface Quest {
  id: string;
  roomId: string;
  title: string;
  description: string;
  questType: QuestType;
  quizData?: QuizQuestion[]; // list of questions for automated quiz grading
  rewardXp: number;
  rewardGold: number;
  penaltyXp: number;
  penaltyGold?: number; // Optional gold penalty if they do not complete the quest
  deadline: string; // ISO string
  createdAt: string;
  jointGroupId?: string;
  // Matrix parameters
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  maxAttempts?: number; // e.g. 1, 2, 3... undefined/0 means unlimited
  reduceRewardOnRetry?: boolean; // if true, reduces reward by 20% on each retry
  threeLevelGrading?: boolean; // true if 100% -> rewards, <100% -> no reward/no penalty, overdue -> penalty
}

export type SubmissionStatus = 'pending' | 'submitted' | 'passed' | 'failed';

export interface QuestSubmission {
  id: string;
  questId: string;
  studentId: string;
  submissionValue?: string; // Text answer, quiz answers list, or mock uploaded document URL
  status: SubmissionStatus;
  isVoucherUsed: boolean; // true if automatically verified by bypassing through "Homework Free Pass"
  gradedAt?: string;
  submittedAt?: string;
  statusLogs?: string; // detailed status log text
}

export type ItemType = 'free_pass_voucher' | 'double_xp_card' | 'custom_avatar_frame';

export interface InventoryItem {
  id: string;
  roomId: string;
  studentId: string;
  itemType: ItemType;
  itemName: string;
  description: string;
  status: 'unused' | 'used';
  acquiredAt: string;
}

export interface LuckyWheelItemConfig {
  id: string;
  itemType: ItemType;
  itemName: string;
  probability: number; // percentage, e.g. 20 for 20%
  color: string; // hex representation
  rewardSpinsEffect?: number; // e.g. if we roll an extra spin
  rewardText: string;
}

// App configuration for simulation and demo state
export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'success' | 'warning' | 'info' | 'level_up' | 'penalty';
}
