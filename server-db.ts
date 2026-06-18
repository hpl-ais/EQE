import { google } from 'googleapis';
import fs from 'fs';
import crypto from 'crypto';
import { 
  User, Classroom, RoomParticipant, Quest, 
  QuestSubmission, InventoryItem, LuckyWheelItemConfig, AppNotification
} from './src/types';

// Google Sheets Credentials & Config
// Fallback / backup reference credentials for seamless operation
const FALLBACK_SPREADSHEET_ID = '1PmjNCCl2UlA6F-XyNlau-ZKIVpYb6VdgmVj3XO_pFyA';
const FALLBACK_EMAIL = 'data-eqe@edu-quest-that2b.iam.gserviceaccount.com';
const FALLBACK_KEY = `-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDIBsVjsb0/AXyh\nvPTdxyEwgm5+PYidNDies3q4GOLGfwWCLK9zBFG9q6cXIrL+NY534T952FVwrnuC\nx4CPnMocTj6uhh0ORlIHc9ZlbBsPKX4Lkc6Llcuv3nvSAYa5AaopNdDHHoTWrjxz\nDg/SSIasR5W+DZXTeGhP6dtvyOD6w5DEGLuZOE2xcd5zPE0lKOjsRs3q5J91LA7h\nCcdrY17HhVx9+cwVW7cYfGJDzc1HlnLpQ0zen28bcgj5wIqzjsjvnU/ArdNUVSjk\naXWxG7s0+FQyw1jzA0EV5D+GTobCoJIrp6gGFtyVyF8ZHJNKwuK20oCkwzyeqbAJ\n56fhUIULAgMBAAECggEAEcNoLB5QrBO5ubNKG5fffqtWnKdiRnOow480yryLBw2o\ns5K8Uf6EM8/WmtteAe1HpaW/OVbY35TfKxIEfLxzxme8cUs/sVDVYAwNchxTmtkY\ndHaSXRsEZ63eWRwBltRrBBXfYI95RIdcnusUxJvkOdBxn9sc/xamTNJ7xkWUlTA4\nrKDm7aXfpCdDMaEW8orGmUfHm4K8MtPZb6rTpH6mzQmtKuirlhdvbw7x6bEFSppf\ngue+m7RS7iJfKLf7vWDDvMr+RW73LlaccM4D7dtNtexaSq+2TdwDHcMrzB2JLp7x\nrY+3HP7WR5W1gjt2QnPVS4ug1BDLyTwwq1vEnQl1gQKBgQDl0PsQhY7Uj9fPB3CX\nUP7zs1QpN2Nd/8ytDwFSZ59l7ySpwbFzGDnWghXT2eHNZ72XsZDxG56XO94+R3rm\nHvWRBXKaSCwRPeleqBYP8kkyYqBeOLxn5PhKjlDAmbXSsHa7i2PSjXRmACHMdRgy\n6qkawkmwLa86JjsRF1jqL6Os2wKBgQDe0OnIswhtQPfeHgP8wDTQ+a3PT6QbCKLu\n8xlgz5W6wBOJieGpczwGqGsWkTRbju1ZUFybTVfR9YNfO+YVpzn7rEo+g1xuR8hk\nCYuq5b1wqckVg1oeuz8s/pcfPdMPYSg94i7d4qTISt/h/pYJjN/oASlviGzeT/c/\nE8q9TobnkQKBgGv7EkxEBMVZRNRQsZVXiENnSi8HiFfdXgUeXMekSp/xim98w+zJ\nQDvK6YieAlup18pTsz+mc5Cpn5Xxrgw8FbPrNFrLeHEtft5r6dnaRIw5DRLYY6YJ\nTqRxU/36+xSgt1kNeHyw3DUk8LyJdDJQUd5x1X/DJ2cSGYTBTJTUh3orAoGAcd8I\nq2Y710INqvliBkjgdTA00K8d6ib2xfF9NcnA9qj1EyRhLG1U7v4hhG3++Q/JYwy7\n1y6mxAmZ8xC0nLpS2rkJVHtjwIR0+BMcyuEQeMR8nL79TplZRxBxgSjidYisvTub\nwg/zMN17H48xdH4HbBUz7Okm4lKxxA3EXg0EytECgYBf2e4tJ2KM8zkya/GhelJq\n9rUlkZp8AsY7aK7zcZidOFJh56yFQ8XM4IA+8KFvi05cDan58E3sWuQg/SQlPsSR\nVPUP2v7ES06yMLuYHzana/3NhP9FcQ2seakhSFMkxZBNOFeZ1Rw4GW6eWiF8K8TA\nHwc7x0zDXInEcEl0G0XMzg==\n-----END PRIVATE KEY-----\n`;

// Handle newline formatting for GCP service account private keys
const RAW_PRIVATE_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '';

// Clean trim whitespace and outer quotes (which can cause decoding failures)
let cleanKey = RAW_PRIVATE_KEY.trim();
if (cleanKey.startsWith('"') && cleanKey.endsWith('"')) {
  cleanKey = cleanKey.slice(1, -1);
}
if (cleanKey.startsWith("'") && cleanKey.endsWith("'")) {
  cleanKey = cleanKey.slice(1, -1);
}

// Convert escaped backslash-n sequences to real newlines
cleanKey = cleanKey.replace(/\\n/g, '\n').trim();

// Runtime validation using native crypto class parser
let isPEMValid = false;
if (cleanKey && cleanKey.includes('-----BEGIN PRIVATE KEY-----') && cleanKey.includes('-----END PRIVATE KEY-----')) {
  try {
    crypto.createPrivateKey(cleanKey);
    isPEMValid = true;
  } catch (err: any) {
    console.warn('⚠️ Environment private key exists but cannot be decrypted by crypto.createPrivateKey:', err.message);
  }
}

// Align matching credentials for consistency
const PRIVATE_KEY = isPEMValid ? cleanKey : FALLBACK_KEY;
const CLIENT_EMAIL = isPEMValid ? (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || FALLBACK_EMAIL) : FALLBACK_EMAIL;
const SPREADSHEET_ID = isPEMValid ? (process.env.GOOGLE_SPREADSHEET_ID || FALLBACK_SPREADSHEET_ID) : FALLBACK_SPREADSHEET_ID;

interface SyncStatus {
  initialized: boolean;
  timestamp: string;
  success: boolean;
  error: string | null;
}

let lastSyncStatus: SyncStatus = {
  initialized: false,
  timestamp: '',
  success: false,
  error: null
};

function saveDebugLog() {
  const debugData = {
    rawExists: !!RAW_PRIVATE_KEY,
    rawLength: RAW_PRIVATE_KEY ? RAW_PRIVATE_KEY.length : 0,
    cleanLength: cleanKey.length,
    isPEMValid,
    isFallbackUsed: PRIVATE_KEY === FALLBACK_KEY,
    clientEmailUsed: CLIENT_EMAIL,
    spreadsheetIdUsed: SPREADSHEET_ID,
    syncStatus: lastSyncStatus
  };

  console.log('🕵️ [PRIVATE_KEY_DEBUG]', debugData);

  try {
    fs.writeFileSync(new URL('./debug-log.json', import.meta.url), JSON.stringify(debugData, null, 2));
  } catch (e: any) {
    // Ignore filesystem errors in case of any package context
  }
}

// Initial print and write on boot
saveDebugLog();

// Google Sheets Tab Definitions (Worksheets)
const TABS = {
  USERS: 'Users',
  ROOMS: 'Rooms',
  PARTICIPANTS: 'Participants',
  QUESTS: 'Quests',
  SUBMISSIONS: 'Submissions',
  INVENTORY: 'Inventory',
  WHEEL: 'WheelConfig',
  NOTIFICATIONS: 'Notifications',
  CLASSES: 'Classes',
  SUBJECTS: 'Subjects'
};

// Default seed data as backup, identical to mockData defaults
const DEFAULTS = {
  USERS: [
    {
      id: 'admin-1',
      email: 'admin@eduquest.vn',
      fullName: 'Quản Trị Viên (System Admin)',
      avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
      role: 'admin',
      password: 'adminpassword',
      createdAt: new Date().toISOString()
    },
    {
      id: 'teacher-1',
      email: 'teacher@eduquest.vn',
      fullName: 'Cô Nguyễn Mai Hoa',
      avatarUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150',
      role: 'teacher',
      password: 'teacherpassword',
      createdAt: new Date().toISOString()
    },
    {
      id: 'student-an',
      email: 'student.an@eduquest.vn',
      fullName: 'Nguyễn Văn An',
      avatarUrl: 'https://api.dicebear.com/7.x/identicon/svg?seed=An',
      role: 'student',
      studentClass: '10A1',
      createdAt: new Date().toISOString()
    },
    {
      id: 'student-binh',
      email: 'student.binh@eduquest.vn',
      fullName: 'Lê Thị Bình',
      avatarUrl: 'https://api.dicebear.com/7.x/identicon/svg?seed=Binh',
      role: 'student',
      studentClass: '10A1',
      createdAt: new Date().toISOString()
    },
    {
      id: 'student-chi',
      email: 'student.chi@eduquest.vn',
      fullName: 'Phạm Minh Chi',
      avatarUrl: 'https://api.dicebear.com/7.x/identicon/svg?seed=Chi',
      role: 'student',
      studentClass: '10A2',
      createdAt: new Date().toISOString()
    }
  ],
  ROOMS: [],
  PARTICIPANTS: [],
  QUESTS: [],
  SUBMISSIONS: [],
  INVENTORY: [],
  WHEEL: [
    {
      id: 'wheel-1',
      itemType: 'free_pass_voucher',
      itemName: 'Thẻ Miễn Bài Tập 📝',
      probability: 15,
      color: '#EAB308',
      rewardText: 'Đã nhận Thẻ miễn bài tập! Dùng trong Kho Đồ học sinh.'
    },
    {
      id: 'wheel-2',
      itemType: 'double_xp_card',
      itemName: 'Nhân Đôi XP ⭐',
      probability: 20,
      color: '#10B981',
      rewardText: 'Được Thẻ x2 XP thần tốc!'
    },
    {
      id: 'wheel-3',
      itemType: 'custom_avatar_frame',
      itemName: 'Khung Avatar Hiếm ✨',
      probability: 10,
      color: '#EC4899',
      rewardText: 'Mở khóa Khung avatar lộng lẫy!'
    },
    {
      id: 'wheel-4',
      itemType: 'free_pass_voucher',
      itemName: 'Nhận +150 Tiền Vàng 🪙',
      probability: 25,
      color: '#F97316',
      rewardSpinsEffect: 150,
      rewardText: 'Tuyệt vời! Cộng ngay +150 tiền vàng tích lũy!'
    },
    {
      id: 'wheel-5',
      itemType: 'free_pass_voucher',
      itemName: 'Nhận +50 Tiền Vàng 🪙',
      probability: 20,
      color: '#3B82F6',
      rewardSpinsEffect: 50,
      rewardText: 'Nhận được +50 tiền vàng nhỏ tích cực!'
    },
    {
      id: 'wheel-6',
      itemType: 'double_xp_card',
      itemName: 'Lượt Quay Miễn Phí 🎰',
      probability: 10,
      color: '#8B5CF6',
      rewardSpinsEffect: 1,
      rewardText: 'Thêm +1 lượt quay may mắn hoàn toàn miễn phí!'
    }
  ],
  NOTIFICATIONS: [
    {
      id: 'notif-1',
      title: 'Chào mừng bạn đến với EduQuest Engine!',
      message: 'Hệ thống tự động hóa lớp học game hóa sẵn sàng vận hành. Chúc học tập vui vẻ!',
      timestamp: new Date().toISOString(),
      type: 'info'
    }
  ],
  CLASSES: ['10A1', '10A2', '11A1', '11A2', '12A1', '12A2'],
  SUBJECTS: ['Tin học Code', 'Toán Học Máy Tính', 'Lịch Sử Game Hóa']
};

// In-Memory Read-Through Cache to ensure sub-millisecond API response times
const CACHE: Record<string, any[]> = {
  users: [...DEFAULTS.USERS],
  rooms: [...DEFAULTS.ROOMS],
  participants: [...DEFAULTS.PARTICIPANTS],
  quests: [...DEFAULTS.QUESTS],
  submissions: [...DEFAULTS.SUBMISSIONS],
  inventory: [...DEFAULTS.INVENTORY],
  wheel: [...DEFAULTS.WHEEL],
  notifications: [...DEFAULTS.NOTIFICATIONS],
  classes: [...DEFAULTS.CLASSES],
  subjects: [...DEFAULTS.SUBJECTS]
};

// Helper: Authorize Google App Service Account Client
function getSheetsClient() {
  const auth = new google.auth.JWT({
    email: CLIENT_EMAIL,
    key: PRIVATE_KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  return google.sheets({ version: 'v4', auth });
}

// Map the client db keys to tab names
const keyToTabMap: Record<string, string> = {
  users: TABS.USERS,
  rooms: TABS.ROOMS,
  participants: TABS.PARTICIPANTS,
  quests: TABS.QUESTS,
  submissions: TABS.SUBMISSIONS,
  inventory: TABS.INVENTORY,
  wheel: TABS.WHEEL,
  notifications: TABS.NOTIFICATIONS,
  classes: TABS.CLASSES,
  subjects: TABS.SUBJECTS
};

// Map sheet columns based on types for seamless mapping
const columnHeadersMap: Record<string, string[]> = {
  users: ['id', 'email', 'fullName', 'avatarUrl', 'role', 'studentClass', 'createdAt', 'password'],
  rooms: ['id', 'name', 'subject', 'teacherId', 'inviteCode', 'targetClass', 'isJoint', 'createdAt', 'classes'],
  participants: ['id', 'roomId', 'studentId', 'currentXp', 'currentLevel', 'goldBalance', 'luckySpins', 'joinedAt'],
  quests: ['id', 'roomId', 'title', 'description', 'rewardXp', 'rewardGold', 'deadline', 'questType', 'threeLevelGrading', 'quizQuestions'],
  submissions: ['id', 'questId', 'studentId', 'status', 'submittedAt', 'content', 'feedback', 'grade', 'isVoucherUsed', 'earnedXp', 'earnedGold', 'logs'],
  inventory: ['id', 'studentId', 'itemType', 'itemName', 'status', 'acquiredAt', 'usedAt'],
  wheel: ['id', 'itemType', 'itemName', 'probability', 'color', 'rewardSpinsEffect', 'rewardText'],
  notifications: ['id', 'title', 'message', 'timestamp', 'type'],
  classes: ['className'],
  subjects: ['subjectName']
};

/**
 * Ensures all sheets exist inside the Google Spreadsheet. 
 * If sheets are missing, it adds them dynamically, appends headers, and seeds them with defaults.
 */
export async function initializeSpreadsheet() {
  console.log('🔄 Initializing Google Sheet Database Setup...');
  try {
    const sheets = getSheetsClient();
    
    // 1. Get info about current spreadsheet tabs
    const spreadsheetInfo = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID
    });
    
    const existingTitles = new Set(
      spreadsheetInfo.data.sheets?.map(s => s.properties?.title).filter(Boolean) || []
    );
    
    const missingTabs = Object.values(TABS).filter(title => !existingTitles.has(title));
    
    // 2. Add missing sheet tabs dynamically
    if (missingTabs.length > 0) {
      console.log(`➕ Adding missing sheet tabs to Google Spreadsheet: ${missingTabs.join(', ')}`);
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: missingTabs.map(title => ({
            addSheet: {
              properties: { title }
            }
          }))
        }
      });
    }

    // 3. Load or seed individual tabs
    for (const key of Object.keys(CACHE)) {
      const tabName = keyToTabMap[key];
      const headers = columnHeadersMap[key];
      
      // Determine if sheet is currently blank by reading row 1
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${tabName}!A1:Z2`
      });
      
      const rows = response.data.values || [];
      if (rows.length === 0) {
        console.log(`🌱 Seeding empty worksheet tab: "${tabName}" with standard schema and initial data...`);
        // Seed default dataset in CACHE to sheets
        await pushTableToGoogleSheet(key, CACHE[key]);
      } else {
        // Read sheet and populate in-memory database CACHE
        await fetchTableFromGoogleSheet(key);
      }
    }
    
    console.log('✅ Google Sheets Database fully initialized and synced in memory!');
    lastSyncStatus = {
      initialized: true,
      timestamp: new Date().toISOString(),
      success: true,
      error: null
    };
    saveDebugLog();
  } catch (error: any) {
    console.error('❌ Failed to initialize Google Spreadsheet sync:', error.message || error);
    console.log('⚠️ Running in Local Memory fallback mode.');
    lastSyncStatus = {
      initialized: true,
      timestamp: new Date().toISOString(),
      success: false,
      error: error.message || String(error)
    };
    saveDebugLog();
  }
}

/**
 * Loads a table from Google Sheet into memory Cache and parses values beautifully
 */
async function fetchTableFromGoogleSheet(key: string) {
  try {
    const sheets = getSheetsClient();
    const tabName = keyToTabMap[key];
    const headers = columnHeadersMap[key];
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${tabName}!A1:Z500`
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) {
      CACHE[key] = [];
      return;
    }

    const sheetHeaders = rows[0];
    const dataRows = rows.slice(1);

    const parsedRecords = dataRows.map(row => {
      const obj: any = {};
      headers.forEach((header, index) => {
        // Match columns precisely by header keys
        const cellIndex = sheetHeaders.indexOf(header);
        const cellValue = cellIndex !== -1 ? row[cellIndex] : undefined;
        
        if (cellValue === undefined || cellValue === '') {
          obj[header] = null;
          return;
        }

        // Try reading as Boolean or JSON formats for fields that are objects/arrays
        const lowerVal = cellValue.toString().toLowerCase();
        
        // Match specific types based on typical fields
        if (lowerVal === 'true') {
          obj[header] = true;
        } else if (lowerVal === 'false') {
          obj[header] = false;
        } else if (['currentxp', 'currentlevel', 'goldbalance', 'luckyspins', 'rewardxp', 'rewardgold', 'probability', 'rewardspinseffect', 'earnedxp', 'earnedgold'].includes(header.toLowerCase())) {
          obj[header] = isNaN(Number(cellValue)) ? cellValue : Number(cellValue);
        } else if ((cellValue.startsWith('[') && cellValue.endsWith(']')) || (cellValue.startsWith('{') && cellValue.endsWith('}'))) {
          try {
            obj[header] = JSON.parse(cellValue);
          } catch (e) {
            obj[header] = cellValue;
          }
        } else {
          // Plain values
          obj[header] = cellValue;
        }
      });
      return obj;
    }).filter(record => record.id !== null); // safety bypass

    CACHE[key] = parsedRecords;
    console.log(`📥 Loaded ${parsedRecords.length} records successfully from tab "${tabName}".`);
  } catch (err: any) {
    console.error(`🔴 Error fetching table "${key}" from Google Sheet:`, err.message || err);
  }
}

/**
 * Overwrites a Google Sheet tab from a local array of records
 */
export async function pushTableToGoogleSheet(key: string, data: any[]) {
  try {
    const sheets = getSheetsClient();
    const tabName = keyToTabMap[key];
    const headers = columnHeadersMap[key];

    // Format headers and rows
    const headerRow = headers;
    const valueRows = data.map(record => {
      return headers.map(header => {
        const value = record[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') {
          return JSON.stringify(value); // Stringify nested JSON
        }
        return value.toString();
      });
    });

    const spreadsheetValues = [headerRow, ...valueRows];

    // 1. Clear current cells
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `${tabName}!A1:Z1000`
    });

    // 2. Push full batch update
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${tabName}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: spreadsheetValues
      }
    });

    console.log(`📤 Synced ${data.length} records to Google Sheet Tab "${tabName}" successfully.`);
  } catch (err: any) {
    console.error(`🔴 Error pushing table "${key}" to Google Sheet:`, err.message || err);
  }
}

// Clean in-memory getters & setters
export const googleDb = {
  getCache: () => CACHE,
  setTable: async (key: string, data: any[]) => {
    // 1. Instantly update server side cache
    CACHE[key] = data;
    
    // 2. Perform write request in the background
    pushTableToGoogleSheet(key, data).catch(e => {
      console.error(`Background push failed for table ${key}:`, e);
    });
  }
};
