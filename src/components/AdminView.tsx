import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { db, addSystemNotification } from '../mockData';
import { 
  UserPlus, Key, Trash2, Edit2, ShieldAlert, Check, X,
  Lock, Mail, User as UserIcon, RefreshCw, AlertCircle,
  FileSpreadsheet, Download, UploadCloud, Plus, Layers, Hash, Smartphone
} from 'lucide-react';

interface AdminViewProps {
  onDataModified: () => void;
  tick?: number;
}

export default function AdminView({ onDataModified, tick }: AdminViewProps) {
  const [activeTab, setActiveTab] = useState<'teachers' | 'students' | 'classes'>('teachers');

  const [teachers, setTeachers] = useState<User[]>(() => {
    return db.getUsers().filter(u => u.role === 'teacher');
  });

  // State for adding a new teacher
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forceChangeOnFirstLogin, setForceChangeOnFirstLogin] = useState(true);

  // State for editing / editing password
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editMustChange, setEditMustChange] = useState(false);

  // Class Management states
  const [classList, setClassList] = useState<string[]>(() => db.getClasses());
  const [newClassName, setNewClassName] = useState('');
  const [pendingDeleteClass, setPendingDeleteClass] = useState<string | null>(null);

  // Student specific state
  const [students, setStudents] = useState<User[]>(() => {
    return db.getUsers().filter(u => u.role === 'student');
  });
  const [selectedClass, setSelectedClass] = useState<string>('Tất cả');
  const [showAddStudentForm, setShowAddStudentForm] = useState(false);
  const [showImportPanel, setShowImportPanel] = useState(false);
  
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentFullName, setNewStudentFullName] = useState('');
  const [newStudentClass, setNewStudentClass] = useState(() => db.getClasses()[0] || '10A1');

  // Excel/CSV text states
  const [excelPasteText, setExcelPasteText] = useState('');
  const [parsedImportRows, setParsedImportRows] = useState<{ fullName: string; email: string; studentClass: string; status: 'valid' | 'invalid'; error?: string }[]>([]);
  const [importFeedback, setImportFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // State for editing student
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editStudentFullName, setEditStudentFullName] = useState('');
  const [editStudentEmail, setEditStudentEmail] = useState('');
  const [editStudentClass, setEditStudentClass] = useState('');

  // Synchronize internal state collections on external database modifications (tick updates)
  useEffect(() => {
    setClassList(db.getClasses());
    setStudents(db.getUsers().filter(u => u.role === 'student'));
    setTeachers(db.getUsers().filter(u => u.role === 'teacher'));
  }, [tick]);

  // Prevent selection/saving errors when classes sync or lists change asynchronously
  useEffect(() => {
    if (classList.length > 0) {
      if (!newStudentClass || !classList.includes(newStudentClass)) {
        setNewStudentClass(classList[0]);
      }
      if (editingStudentId && (!editStudentClass || !classList.includes(editStudentClass))) {
        setEditStudentClass(classList[0]);
      }
    }
  }, [classList, newStudentClass, editStudentClass, editingStudentId]);

  // Custom modal state for safe deletion without window.confirm
  const [pendingDeleteUser, setPendingDeleteUser] = useState<User | null>(null);
  const [pendingResetStudent, setPendingResetStudent] = useState<User | null>(null);

  const refreshTeachersList = () => {
    const list = db.getUsers().filter(u => u.role === 'teacher');
    setTeachers(list);
    onDataModified();
  };

  const refreshStudentsList = () => {
    const list = db.getUsers().filter(u => u.role === 'student');
    setStudents(list);
    onDataModified();
  };

  const handleResetDevice = (studentId: string) => {
    const student = db.getUsers().find(u => u.id === studentId);
    if (student) {
      setPendingResetStudent(student);
    }
  };

  const confirmResetDevice = () => {
    if (!pendingResetStudent) return;
    const studentId = pendingResetStudent.id;
    const allUsers = db.getUsers();
    const updated = allUsers.map(u => u.id === studentId ? { ...u, studentDevice: undefined } : u);
    db.setUsers(updated);
    refreshStudentsList();
    addSystemNotification(
      'Gỡ thiết bị', 
      `Đã giải phóng thiết bị đăng nhập cũ của học sinh [${pendingResetStudent.fullName}] thành công!`, 
      'success'
    );
    setPendingResetStudent(null);
  };

  const handleAddTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newFullName.trim() || !newPassword.trim()) {
      alert('Vui lòng nhập đầy đủ thông tin giáo viên!');
      return;
    }

    const allUsers = db.getUsers();
    // Validate email unique
    const emailExists = allUsers.some(u => u.email.toLowerCase() === newEmail.toLowerCase().trim());
    if (emailExists) {
      alert('Email này đã được sử dụng bởi một tài khoản khác trong hệ thống!');
      return;
    }

    const newTeacher: User = {
      id: 'teacher-' + Math.random().toString(36).substring(2, 9),
      email: newEmail.toLowerCase().trim(),
      fullName: newFullName.trim(),
      role: 'teacher',
      password: newPassword,
      mustChangePassword: forceChangeOnFirstLogin,
      avatarUrl: `https://images.unsplash.com/photo-${['1544717305-2782549b5136', '1535713875002-d1d0cf377fde', '1570295999919-56ceb5ecca61', '1494790108377-be9c29b29330'][Math.floor(Math.random() * 4)]}?w=150`,
      createdAt: new Date().toISOString()
    };

    allUsers.push(newTeacher);
    db.setUsers(allUsers);

    // Reset Form
    setNewEmail('');
    setNewFullName('');
    setNewPassword('');
    setForceChangeOnFirstLogin(true);
    setShowAddForm(false);

    addSystemNotification(
      'Tạo giáo viên thành công',
      `Đã khởi tạo tài khoản giáo viên: [${newTeacher.fullName}]. Yêu cầu đổi mật khẩu: ${newTeacher.mustChangePassword ? 'CÓ' : 'KHÔNG'}.`,
      'success'
    );
    
    refreshTeachersList();
  };

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentEmail.trim() || !newStudentFullName.trim() || !newStudentClass.trim()) {
      alert('Vui lòng nhập đầy đủ thông tin học sinh!');
      return;
    }

    const allUsers = db.getUsers();
    const emailExists = allUsers.some(u => u.email.toLowerCase() === newStudentEmail.toLowerCase().trim());
    if (emailExists) {
      alert('Mã học sinh này đã tồn tại trên hệ thống!');
      return;
    }

    const newStudent: User = {
      id: 'student-man-' + Math.random().toString(36).substring(2, 9),
      email: newStudentEmail.toLowerCase().trim(),
      fullName: newStudentFullName.trim(),
      role: 'student',
      studentClass: newStudentClass.toUpperCase().trim(),
      avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(newStudentFullName.trim())}`,
      createdAt: new Date().toISOString()
    };

    allUsers.push(newStudent);
    db.setUsers(allUsers);

    setNewStudentEmail('');
    setNewStudentFullName('');
    setShowAddStudentForm(false);

    addSystemNotification(
      'Thêm học sinh thành công',
      `Đã tạo tài khoản học sinh: [${newStudent.fullName}] thuộc lớp [${newStudent.studentClass}].`,
      'success'
    );

    refreshStudentsList();
  };

  // Add a class
  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newClassName.trim().toUpperCase();
    if (!cleanName) return;
    
    if (classList.includes(cleanName)) {
      alert('Lớp học này đã tồn tại!');
      return;
    }

    const updated = [...classList, cleanName].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    setClassList(updated);
    db.setClasses(updated);
    setNewClassName('');

    addSystemNotification(
      'Thêm lớp học thành công',
      `Lớp mới: [${cleanName}] đã được thành lập trên hệ thống trường học.`,
      'success'
    );
    onDataModified();
  };

  const handleConfirmDeleteClass = () => {
    if (!pendingDeleteClass) return;
    const key = pendingDeleteClass;
    
    // Check if class has students
    const hasStudents = db.getUsers().some(u => u.role === 'student' && u.studentClass === key);
    if (hasStudents) {
      alert(`Không loại bỏ được: Lớp [${key}] hiện đang có học sinh theo học. Hãy điều chuyển học sinh sang lớp khác trước khi xóa lớp.`);
      setPendingDeleteClass(null);
      return;
    }

    const updated = classList.filter(c => c !== key);
    setClassList(updated);
    db.setClasses(updated);
    if (selectedClass === key) {
      setSelectedClass('Tất cả');
    }

    addSystemNotification(
      'Xóa lớp học',
      `Đã loại bỏ lớp [${key}] ra khỏi hệ thống.`,
      'warning'
    );
    setPendingDeleteClass(null);
    onDataModified();
  };

  // Sample file download
  const downloadSampleTemplate = () => {
    const header = "Họ và Tên,Email,Lớp\n";
    const sampleRows = [
      "Nguyễn Văn An,student.an@eduquest.vn,10A1",
      "Lê Thị Hoa,student.hoa@eduquest.vn,10A2",
      "Phạm Minh Đức,student.duc@eduquest.vn,11A1"
    ].join("\n");

    const csvContent = "\ufeff" + header + sampleRows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "eduquest_sample_students.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Live Excel/CSV parser
  const handleParseExcelText = (text: string) => {
    setExcelPasteText(text);
    if (!text.trim()) {
      setParsedImportRows([]);
      setImportFeedback(null);
      return;
    }

    const lines = text.split('\n');
    const tempRows: typeof parsedImportRows = [];
    const allUsers = db.getUsers();

    // Track emails in parsed list itself to catch double entries inside the same file
    const fileSeenEmails = new Set<string>();

    lines.forEach((line, index) => {
      // clean line
      const cleanLine = line.trim();
      if (!cleanLine) return; // ignore empty lines

      // Header bypass if row contains "Họ và Tên" or "Email"
      if (index === 0 && (cleanLine.toLowerCase().includes('họ và tên') || cleanLine.toLowerCase().includes('email') || cleanLine.toLowerCase().includes('tên'))) {
        return; 
      }

      // Support split by tab (Excel copy-paste) or comma (standard CSV)
      let parts = cleanLine.split('\t');
      if (parts.length < 3) {
        parts = cleanLine.split(',');
      }

      if (parts.length < 3) {
        tempRows.push({
          fullName: parts[0] || 'Dòng không hợp lệ',
          email: parts[1] || '',
          studentClass: parts[2] || '',
          status: 'invalid',
          error: 'Thiếu cột. Phải có đủ: Họ tên, Email, Lớp.'
        });
        return;
      }

      const rawName = parts[0].trim();
      const rawEmail = parts[1].trim();
      const rawClass = parts[2].trim().toUpperCase();

      // Simple validations
      if (!rawName) {
        tempRows.push({
          fullName: 'Không có tên',
          email: rawEmail,
          studentClass: rawClass,
          status: 'invalid',
          error: 'Tên học sinh không được bỏ trống.'
        });
        return;
      }

      if (!rawEmail) {
        tempRows.push({
          fullName: rawName,
          email: 'Trống',
          studentClass: rawClass,
          status: 'invalid',
          error: 'Mã học sinh không được bỏ trống.'
        });
        return;
      }

      if (!rawClass) {
        tempRows.push({
          fullName: rawName,
          email: rawEmail,
          studentClass: 'Chưa chọn',
          status: 'invalid',
          error: 'Lớp học không được bỏ trống.'
        });
        return;
      }

      // Check duplicacy in database
      const dbEmailExists = allUsers.some(u => u.email.toLowerCase() === rawEmail.toLowerCase());
      const fileEmailExists = fileSeenEmails.has(rawEmail.toLowerCase());

      if (dbEmailExists) {
        tempRows.push({
          fullName: rawName,
          email: rawEmail,
          studentClass: rawClass,
          status: 'invalid',
          error: 'Mã học sinh này đã tồn tại trong hệ thống.'
        });
      } else if (fileEmailExists) {
        tempRows.push({
          fullName: rawName,
          email: rawEmail,
          studentClass: rawClass,
          status: 'invalid',
          error: 'Mã học sinh bị trùng lặp trong file import.'
        });
      } else {
        fileSeenEmails.add(rawEmail.toLowerCase());
        tempRows.push({
          fullName: rawName,
          email: rawEmail,
          studentClass: rawClass,
          status: 'valid'
        });
      }
    });

    setParsedImportRows(tempRows);
    
    const validCount = tempRows.filter(r => r.status === 'valid').length;
    const invalidCount = tempRows.filter(r => r.status === 'invalid').length;

    if (tempRows.length === 0) {
      setImportFeedback(null);
    } else if (invalidCount > 0) {
      setImportFeedback({
        type: 'error',
        message: `Phát hiện ${invalidCount} dòng lỗi. Vui lòng sửa lại trước khi nhập dứt điểm.`
      });
    } else {
      setImportFeedback({
        type: 'success',
        message: `Sẵn sàng ghi danh ${validCount} học sinh hợp lệ!`
      });
    }
  };

  // Handle uploaded file parse
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      handleParseExcelText(text);
    };
    reader.readAsText(file);
  };

  // Bulk register imported users
  const handleExecuteBulkImport = () => {
    const validRows = parsedImportRows.filter(r => r.status === 'valid');
    if (validRows.length === 0) {
      alert('Không có học sinh hợp lệ nào để import!');
      return;
    }

    const allUsers = db.getUsers();
    
    // Auto register dynamic classes if any class imported doesn't exist yet!
    const newClassesToRegister = Array.from(new Set(validRows.map(r => r.studentClass)));
    const updatedClassList = [...classList];
    let classAdded = false;
    newClassesToRegister.forEach(cls => {
      if (!updatedClassList.includes(cls)) {
        updatedClassList.push(cls);
        classAdded = true;
      }
    });
    if (classAdded) {
      updatedClassList.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
      setClassList(updatedClassList);
      db.setClasses(updatedClassList);
    }

    // Map rows to formal User schemas
    const newStudents: User[] = validRows.map(row => ({
      id: 'student-excel-' + Math.random().toString(36).substring(2, 9),
      email: row.email.toLowerCase().trim(),
      fullName: row.fullName.trim(),
      role: 'student',
      studentClass: row.studentClass,
      avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(row.fullName.trim())}`,
      createdAt: new Date().toISOString()
    }));

    const combinedList = [...allUsers, ...newStudents];
    db.setUsers(combinedList);

    setExcelPasteText('');
    setParsedImportRows([]);
    setImportFeedback({
      type: 'success',
      message: `Đã nhập và ghi danh thành công [${newStudents.length}] học sinh mới!`
    });
    setShowImportPanel(false);

    addSystemNotification(
      'Import học sinh hàng loạt',
      `Đã nhập thành công ${newStudents.length} tài khoản học sinh đại trà từ tệp Excel/CSV.`,
      'success'
    );

    refreshStudentsList();
  };

  const handleDeleteTeacher = (id: string, name: string) => {
    const usr = db.getUsers().find(u => u.id === id);
    if (usr) {
      setPendingDeleteUser(usr);
    }
  };

  const handleDeleteStudent = (student: User) => {
    setPendingDeleteUser(student);
  };

  const confirmDeleteUser = () => {
    if (!pendingDeleteUser) return;
    const { id, fullName, role } = pendingDeleteUser;

    const allUsers = db.getUsers();
    const updated = allUsers.filter(u => u.id !== id);
    db.setUsers(updated);

    addSystemNotification(
      `Xóa ${role === 'teacher' ? 'Giáo viên' : 'Học sinh'}`,
      `Bộ phận quản trị xóa tài khoản ${role === 'teacher' ? 'giáo viên' : 'học sinh'} [${fullName}].`,
      'warning'
    );

    setPendingDeleteUser(null);
    refreshTeachersList();
    refreshStudentsList();
  };

  const startEditTeacher = (teacher: User) => {
    setEditingTeacherId(teacher.id);
    setEditFullName(teacher.fullName);
    setEditPassword(teacher.password || '');
    setEditMustChange(teacher.mustChangePassword || false);
  };

  const handleSaveEditTeacher = (id: string) => {
    if (!editFullName.trim()) {
      alert('Tên hiển thị không được bỏ trống!');
      return;
    }

    const allUsers = db.getUsers();
    const updated = allUsers.map(u => {
      if (u.id === id) {
        return {
          ...u,
          fullName: editFullName.trim(),
          password: editPassword || u.password,
          mustChangePassword: editMustChange
        };
      }
      return u;
    });

    db.setUsers(updated);
    setEditingTeacherId(null);
    setEditPassword('');

    addSystemNotification(
      'Cập nhật giáo viên',
      `Đã sửa đổi cấu hình tài khoản giáo viên ID [${id}].`,
      'info'
    );

    refreshTeachersList();
  };

  const startEditStudent = (student: User) => {
    setEditingStudentId(student.id);
    setEditStudentFullName(student.fullName);
    setEditStudentEmail(student.email);
    
    let defaultClass = student.studentClass;
    if (!defaultClass || !classList.includes(defaultClass)) {
      defaultClass = classList.length > 0 ? classList[0] : '10A1';
    }
    setEditStudentClass(defaultClass);
  };

  const handleSaveEditStudent = (id: string) => {
    if (!editStudentFullName.trim() || !editStudentClass.trim() || !editStudentEmail.trim()) {
      alert('Họ tên, Email và Lớp của học sinh không được bỏ trống!');
      return;
    }

    const allUsers = db.getUsers();
    const updated = allUsers.map(u => {
      if (u.id === id) {
        return {
          ...u,
          fullName: editStudentFullName.trim(),
          email: editStudentEmail.toLowerCase().trim(),
          studentClass: editStudentClass.toUpperCase().trim()
        };
      }
      return u;
    });

    db.setUsers(updated);
    setEditingStudentId(null);

    addSystemNotification(
      'Cập nhật học sinh',
      `Đã sửa đổi thông tin học sinh [${editStudentFullName}] thuộc lớp [${editStudentClass.toUpperCase()}].`,
      'info'
    );

    refreshStudentsList();
  };

  return (
    <div id="admin-control-panel" className="space-y-6 text-left">
      
      {/* TABS SELECTION */}
      <div className="flex bg-slate-950 border border-slate-850 p-1.5 rounded-2xl max-w-2xl shadow-inner">
        <button
          type="button"
          onClick={() => {
            setActiveTab('teachers');
            setShowAddForm(false);
          }}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'teachers' 
              ? 'bg-amber-500 text-slate-950 shadow-lg font-extrabold' 
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60'
          }`}
        >
          <span>👨‍🏫 Danh sách Giáo viên</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('classes');
            setNewClassName('');
            setShowAddStudentForm(false);
          }}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'classes' 
              ? 'bg-blue-600 text-white shadow-lg font-extrabold' 
              : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60'
          }`}
        >
          <span>🏫 Quản lý Lớp & Học sinh ({classList.length} Lớp, {students.length} Học sinh)</span>
        </button>
      </div>

      {activeTab === 'teachers' ? (
        <>
          {/* HEADER EXPLAINER */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full" />
        
        <div className="space-y-1.5 z-10">
          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest font-mono">QUYỀN LỰC QUẢN TRỊ VIÊN</span>
          <h2 className="font-extrabold text-lg tracking-tight text-slate-100">QUẢN LÝ LỰC LƯỢNG GIÁO VIÊN</h2>
          <p className="text-xs text-slate-400 max-w-xl">
            Tạo lập tài khoản đồng nghiệp, định nghĩa mật khẩu kiểm soát nội bộ, cưỡng bức thay đổi thông tin xác thực cho lần đăng nhập đầu tiên để duy trì quy chuẩn mật an toàn.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-tr from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/10 cursor-pointer hover:scale-[1.01] transition-transform z-10"
        >
          {showAddForm ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          <span>{showAddForm ? 'HỦY BỎ' : 'THÊM GIÁO VIÊN'}</span>
        </button>
      </div>

      {/* ADD NEW TEACHER WIZARD */}
      {showAddForm && (
        <form 
          onSubmit={handleAddTeacher}
          className="bg-slate-900 border border-amber-500/20 rounded-3xl p-6 shadow-xl space-y-4 animate-fade-in"
        >
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <UserPlus className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Biểu mẫu thêm Giáo Viên chính thức
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 font-mono">Họ và Tên Giáo viên:</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                <input 
                  type="text"
                  placeholder="Ví dụ: Thầy Trần Quang Lâm"
                  value={newFullName}
                  onChange={e => setNewFullName(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-sans"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 font-mono">Địa chỉ Email:</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                <input 
                  type="email"
                  placeholder="teacher.lam@eduquest.vn"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 font-mono">Mật khẩu ban đầu:</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                <input 
                  type="text"
                  placeholder="Cung cấp password hoặc mã số"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
              <input 
                type="checkbox"
                checked={forceChangeOnFirstLogin}
                onChange={e => setForceChangeOnFirstLogin(e.target.checked)}
                className="accent-amber-400 w-4 h-4 rounded"
              />
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-yellow-400" />
                Yêu cầu đổi mật khẩu ngay trong lần đầu tiên đăng nhập
              </span>
            </label>

            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl tracking-wider uppercase shadow cursor-pointer transition"
            >
              KÍCH HOẠT TÀI KHOẢN CO-ADMIN
            </button>
          </div>
        </form>
      )}

      {/* TEACHERS DATATABLE CONTAINER */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="px-6 py-4.5 border-b border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            Danh sách Giáo viên trong hệ thống ({teachers.length})
          </span>
          <span className="text-[10px] text-slate-500 font-mono font-medium">Bảo mật chuẩn AES-Local</span>
        </div>

        <div className="overflow-x-auto">
          {teachers.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs italic">
              Bảng mục rỗng. Không tồn tại tài khoản giáo viên nào được khởi tạo.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-850 text-slate-400 text-[10px] uppercase tracking-wider font-mono">
                  <th className="py-3 px-6">Tên Giáo Viên</th>
                  <th className="py-3 px-4">Email Liên Lạc</th>
                  <th className="py-3 px-4">Mật Khẩu</th>
                  <th className="py-3 px-4">Bắt đổi MK lần đầu</th>
                  <th className="py-3 px-6 text-right">Tác Vụ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {teachers.map(teacher => {
                  const isEditing = editingTeacherId === teacher.id;
                  return (
                    <tr 
                      key={teacher.id} 
                      className={`hover:bg-slate-850/30 transition-colors ${
                        isEditing ? 'bg-amber-500/5 border-amber-500/20' : ''
                      }`}
                    >
                      <td className="py-3.5 px-6 font-semibold text-slate-200">
                        {isEditing ? (
                          <input 
                            type="text"
                            value={editFullName}
                            onChange={e => setEditFullName(e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-amber-400 w-full"
                          />
                        ) : (
                          teacher.fullName
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-400 select-all">
                        {teacher.email}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {isEditing ? (
                          <input 
                            type="text"
                            value={editPassword}
                            onChange={e => setEditPassword(e.target.value)}
                            placeholder="Mật khẩu mới..."
                            className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-100 focus:outline-none focus:border-amber-400 w-full"
                          />
                        ) : (
                          <span className="bg-slate-950/60 font-medium px-2 py-1 rounded inline-flex items-center gap-1 border border-slate-850">
                            <Lock className="w-3 h-3 text-slate-500" />
                            {teacher.password || '----------'}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {isEditing ? (
                          <label className="inline-flex items-center gap-1.5 cursor-pointer">
                            <input 
                              type="checkbox"
                              checked={editMustChange}
                              onChange={e => setEditMustChange(e.target.checked)}
                              className="accent-amber-400"
                            />
                            <span className="text-[11px] text-slate-400">Yêu cầu</span>
                          </label>
                        ) : (
                          teacher.mustChangePassword ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[10px] font-bold font-mono">
                              <AlertCircle className="w-3 h-3" /> CẦN ĐỔI CHƯA ĐĂNG NHẬP
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold font-mono">
                              ĐÃ AN TOÀN
                            </span>
                          )
                        )}
                      </td>

                      <td className="py-3.5 px-6 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleSaveEditTeacher(teacher.id)}
                              className="p-1 px-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[10px] tracking-wide uppercase cursor-pointer"
                              title="Lưu lại thay đổi"
                            >
                              LƯU
                            </button>
                            <button
                              onClick={() => setEditingTeacherId(null)}
                              className="p-1 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] tracking-wide uppercase cursor-pointer"
                              title="Hủy bỏ sửa đổi"
                            >
                              HỦY
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1.5 font-sans">
                            <button
                              onClick={() => startEditTeacher(teacher)}
                              className="p-1.5 hover:bg-slate-800/80 rounded-lg text-slate-400 hover:text-amber-400 transition"
                              title="Đổi tên / Reset Mật khẩu giáo viên"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTeacher(teacher.id, teacher.fullName)}
                              className="p-1.5 hover:bg-slate-800/80 rounded-lg text-slate-400 hover:text-rose-500 transition"
                              title="Xóa vĩnh viễn tài khoản giáo viên"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  ) : activeTab === 'classes' ? (
    <>
      {/* UNIFIED CLASSES & STUDENTS HEADER */}
      <div className="bg-slate-900 border border-slate-850 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left animate-fade-in mb-2">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full" />
        
        <div className="space-y-1.5 z-10 font-sans">
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest font-mono">HỆ THỐNG GIÁO VỤ (SCHOOL REGISTER)</span>
          <h2 className="font-extrabold text-lg tracking-tight text-slate-100">QUẢN LÝ LỚP & HỌC VIÊN</h2>
          <p className="text-xs text-slate-400 max-w-xl">
            Quản trị cơ cấu danh mục lớp biên chế, đồng thời xem chi tiết và đồng bộ hóa danh sách học sinh theo từng lớp nhanh gọn.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 z-10 shrink-0">
          <button
            type="button"
            onClick={downloadSampleTemplate}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-950 border border-slate-800 hover:border-slate-705 text-slate-300 hover:text-slate-100 font-bold text-xs rounded-xl transition cursor-pointer focus:outline-none"
            title="Tải tệp tin Excel mẫu"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>TẢI FILE MẪU</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowImportPanel(!showImportPanel);
              if (showAddStudentForm) setShowAddStudentForm(false);
            }}
            className={`flex items-center gap-1.5 px-3.5 py-2 border rounded-xl font-bold text-xs shadow transition cursor-pointer focus:outline-none ${
              showImportPanel 
                ? 'bg-blue-600/10 border-blue-500 text-blue-400' 
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5 animate-pulse" />
            <span>{showImportPanel ? 'ĐÓNG ĐỒNG BỘ' : 'NHẬP BẰNG EXCEL'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const nextState = !showAddStudentForm;
              setShowAddStudentForm(nextState);
              if (showImportPanel) setShowImportPanel(false);
              if (nextState) {
                if (selectedClass && selectedClass !== 'Tất cả' && classList.includes(selectedClass)) {
                  setNewStudentClass(selectedClass);
                } else if (classList.length > 0 && (!newStudentClass || !classList.includes(newStudentClass))) {
                  setNewStudentClass(classList[0]);
                }
              }
            }}
            className={`flex items-center gap-2 px-3.5 py-2 border rounded-xl font-bold text-xs transition cursor-pointer ${
              showAddStudentForm
                ? 'bg-emerald-600/10 border-emerald-500 text-emerald-400'
                : 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-slate-950 font-extrabold hover:from-emerald-500 hover:to-teal-400'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>{showAddStudentForm ? 'ĐÓNG FORM' : 'THÊM THỦ CÔNG'}</span>
          </button>
        </div>
      </div>

      {/* DETAILED FORMS CONTAINER IF TOGGLED */}
      {showAddStudentForm && (
        <form 
          onSubmit={handleAddStudent}
          className="bg-slate-900 border border-emerald-500/20 rounded-3xl p-6 shadow-xl space-y-4 animate-fade-in text-left font-sans"
        >
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <UserPlus className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Phom Đăng Ký Học Sinh Mới
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 font-mono">Họ tên Học sinh:</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                <input 
                  type="text"
                  placeholder="Ví dụ: Nguyễn Văn An"
                  value={newStudentFullName}
                  onChange={e => setNewStudentFullName(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-955 border border-slate-850 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-sans"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 font-mono">Mã học sinh đăng nhập:</label>
              <div className="relative">
                <Hash className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                <input 
                  type="text"
                  placeholder="Ví dụ: HS01 hoặc student-an"
                  value={newStudentEmail}
                  onChange={e => setNewStudentEmail(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-955 border border-slate-850 rounded-xl text-xs font-mono text-slate-200 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1.5 font-mono">Lớp học Biên chế:</label>
              <select
                value={newStudentClass}
                onChange={e => setNewStudentClass(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-955 border border-slate-850 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-sans cursor-pointer font-bold text-emerald-400"
              >
                {classList.map(c => (
                  <option key={c} value={c}>Lớp {c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
               type="submit"
               className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl tracking-wider uppercase shadow hover:scale-[1.01] transition cursor-pointer"
            >
              XÁC NHẬN GHI DANH HỌC SINH
            </button>
          </div>
        </form>
      )}

      {showImportPanel && (
        <div className="bg-slate-900 border border-blue-500/20 rounded-3xl p-6 shadow-xl space-y-6 animate-fade-in text-left font-sans">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                ĐỒNG BỘ DANH SÁCH HỌC SINH TỪ EXCEL / CSV
              </h3>
            </div>
            <button 
              type="button"
              onClick={downloadSampleTemplate} 
              className="text-[10px] text-blue-450 hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Tải tệp tin Excel mẫu tại đây
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase text-slate-400 font-mono">Cách 1: Tải lên tệp CSV/Excel dạng text (*.csv):</label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-800 border-dashed rounded-2xl cursor-pointer bg-slate-955 hover:bg-slate-900 hover:border-slate-750 transition duration-150">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <UploadCloud className="w-8 h-8 text-blue-400 mb-2 animate-bounce" />
                      <p className="mb-1 text-xs text-slate-300 font-bold">Kéo thả hoặc Chọn tệp tin tải lên</p>
                      <p className="text-[10px] text-slate-500">Hỗ trợ tệp định dạng CSV hoặc TXT (UTF-8)</p>
                    </div>
                    <input 
                      type="file" 
                      accept=".csv,.txt" 
                      className="hidden" 
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-bold uppercase text-slate-400 font-mono">Cách 2: Copy-Paste dữ liệu gốc từ Excel:</label>
                  <span className="text-[10px] text-slate-500 italic">Mẹo: Chọn 3 cột Họ Tên, Mã Học Sinh, Lớp rồi ấn Ctrl+C</span>
                </div>
                <textarea
                  value={excelPasteText}
                  onChange={e => handleParseExcelText(e.target.value)}
                  placeholder="Dán dữ liệu trực tiếp từ Excel vào đây...&#10;Ví dụ:&#10;Trần Đăng Khoa&#9;khoa.td@eduquest.vn&#9;10A1&#10;Nguyễn Thảo Nguyên&#9;nguyen.nt@eduquest.vn&#9;10A2"
                  rows={5}
                  className="w-full p-3 bg-slate-955 border border-slate-850 rounded-2xl text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500 placeholder-slate-600 resize-y"
                />
              </div>
            </div>

            {/* PREVIEW CONTAINER */}
            <div className="flex flex-col h-full bg-slate-955 border border-slate-855 rounded-2xl overflow-hidden min-h-[280px]">
              <div className="px-4 py-3 bg-slate-900 border-b border-slate-850 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Kết quả xem trước ({parsedImportRows.length})</span>
                {importFeedback && (
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    importFeedback.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-450'
                  }`}>
                    {importFeedback.message}
                  </span>
                )}
              </div>

              <div className="flex-1 overflow-y-auto max-h-[220px] divide-y divide-slate-855 text-[11px]">
                {parsedImportRows.length === 0 ? (
                  <div className="p-8 text-center text-slate-600 italic h-full flex flex-col justify-center items-center">
                    <FileSpreadsheet className="w-8 h-8 text-slate-700 mb-2" />
                    Chưa có dòng dữ liệu nào được phân tích. Hãy tải tệp lên hoặc dán nội dung từ Excel.
                  </div>
                ) : (
                  parsedImportRows.map((row, index) => (
                    <div key={index} className="p-3 hover:bg-slate-900/40 transition flex items-start gap-2.5 justify-between">
                      <div className="space-y-0.5 col-span-3 text-left">
                        <div className="font-bold text-slate-200 flex items-center gap-1.5 font-sans">
                          <span className="text-[10px] bg-slate-850 text-slate-400 w-4 h-4 rounded-full inline-flex items-center justify-center font-mono">{index + 1}</span>
                          {row.fullName}
                          <span className="text-[10px] text-blue-400 font-extrabold font-mono bg-blue-500/5 px-1.5 py-0.2 rounded font-sans">Lớp {row.studentClass}</span>
                        </div>
                        <div className="text-slate-450 font-mono text-[10px]">{row.email}</div>
                        {row.error && <p className="text-[10px] text-rose-400 font-bold">{row.error}</p>}
                      </div>

                      <div className="shrink-0 pt-0.5">
                        {row.status === 'valid' ? (
                          <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-full font-bold text-[10px] flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> Hợp lệ
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-rose-500/10 text-rose-400 rounded-full font-bold text-[10px] flex items-center gap-0.5">
                            <X className="w-3 h-3" /> Lỗi
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {parsedImportRows.length > 0 && (
                <div className="p-3 bg-slate-900 border-t border-slate-850 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setExcelPasteText('');
                      setParsedImportRows([]);
                      setImportFeedback(null);
                    }}
                    className="px-3 py-2 bg-slate-950 hover:bg-slate-855 hover:text-slate-200 border border-slate-800 rounded-lg text-[11px] font-bold text-slate-400 tracking-wider uppercase transition cursor-pointer"
                  >
                    XÓA TẤT CẢ
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteBulkImport}
                    disabled={!parsedImportRows.some(r => r.status === 'valid') || parsedImportRows.some(r => r.status === 'invalid')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-505 disabled:opacity-40 text-white font-bold text-[11px] rounded-lg tracking-wider uppercase shadow flex items-center gap-1 cursor-pointer transition disabled:cursor-not-allowed"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    ĐỒNG BỘ {parsedImportRows.filter(r => r.status === 'valid').length} HỌC SINH
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TWO-COLUMN BENTO GRID SYSTEM */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-sans">
        
        {/* LEFT COLUMN: INTERACTIVE CLASS DIRECTORY (lg:col-span-4) */}
        <div className="lg:col-span-5 space-y-5">
          {/* CREATE NEW CLASS BOX */}
          <form 
            onSubmit={handleAddClass}
            className="bg-slate-900 border border-slate-850 rounded-3xl p-5 shadow-xl space-y-3"
          >
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider font-mono">THÀNH LẬP LỚP BIÊN CHẾ MỚI</span>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Hash className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <input 
                  type="text"
                  placeholder="Ví dụ: 10A1, 11A3"
                  value={newClassName}
                  onChange={e => setNewClassName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-slate-205 focus:outline-none focus:border-blue-500 font-sans font-bold uppercase placeholder-slate-650"
                  required
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-650 hover:bg-blue-600 text-white font-extrabold text-xs rounded-xl uppercase flex items-center gap-1 cursor-pointer transition shrink-0 shadow-inner"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>TẠO LỚP</span>
              </button>
            </div>
          </form>

          {/* CLASSES DIRECTORY SCROLLER */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-slate-800/80">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-20 z-10 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                Bộ Lọc Cơ cấu Lớp ({classList.length})
              </span>
              <p className="text-[10px] text-slate-405 mt-1">Bấm chọn lớp biên chế để tải nhanh danh bạ học sinh bên phải</p>
            </div>

            <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-850/60 select-none">
              {/* Reset to show 'All' */}
              <div 
                onClick={() => setSelectedClass('Tất cả')}
                className={`flex items-center justify-between px-5 py-3.5 cursor-pointer transition ${
                  selectedClass === 'Tất cả'
                    ? 'bg-emerald-500/10 border-l-4 border-l-emerald-500 font-bold'
                    : 'hover:bg-slate-850/30'
                }`}
              >
                <span className="text-xs text-slate-205 flex items-center gap-1.5 font-semibold">
                  🌐 Tổng hợp tất cả lớp học
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-955 text-slate-400 border border-slate-850">
                  {students.length} em
                </span>
              </div>

              {/* Individual class list */}
              {classList.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs italic font-sans">
                  Chưa thành lập lớp biên chế nào.
                </div>
              ) : (
                classList.map((clsName) => {
                  const numStudents = students.filter(s => s.studentClass === clsName).length;
                  const isSelected = selectedClass === clsName;
                  return (
                    <div 
                      key={clsName}
                      onClick={() => setSelectedClass(clsName)}
                      className={`flex items-center justify-between px-5 py-3.5 cursor-pointer transition ${
                        isSelected
                          ? 'bg-blue-600/15 border-l-4 border-l-blue-500 font-extrabold'
                          : 'hover:bg-slate-850/30'
                      }`}
                    >
                      <span className="text-xs text-slate-200 font-bold">Lớp {clsName}</span>
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <span className={`px-2 py-0.5 rounded inline-flex items-center gap-1 text-[10px] font-bold ${
                          numStudents > 0 
                            ? 'bg-blue-500/10 text-blue-450 border border-blue-500/5' 
                            : 'bg-slate-955 text-slate-500 border border-slate-850'
                        }`}>
                          {numStudents} em
                        </span>
                        
                        <button
                          type="button"
                          onClick={() => {
                            if (numStudents > 0) {
                              alert(`Lớp ${clsName} đang có ${numStudents} học sinh. Vui lòng chuyển học sinh sang lớp khác trước khi xóa lớp.`);
                              return;
                            }
                            setPendingDeleteClass(clsName);
                          }}
                          className="p-1 bg-slate-955 hover:bg-rose-955 border border-slate-880 hover:border-rose-900 rounded-lg text-slate-405 hover:text-rose-400 transition cursor-pointer"
                          title="Hủy bỏ lớp biên chế khỏi trường"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: DETAILED STUDENT TABLE FOR THE SELECTED CLASS */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <div className="px-6 py-4.5 border-b border-slate-800/80 flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                Duyệt học viên: {selectedClass === 'Tất cả' ? 'Toàn trường' : `Lớp ${selectedClass}`} ({students.filter(s => selectedClass === 'Tất cả' || s.studentClass === selectedClass).length} học sinh)
              </span>
              <span className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">QUẢN LÝ ADMIN</span>
            </div>

            <div className="overflow-x-auto">
              {students.filter(s => selectedClass === 'Tất cả' || s.studentClass === selectedClass).length === 0 ? (
                <div className="p-16 text-center text-slate-500 text-xs italic flex flex-col items-center justify-center gap-2.5">
                  <UserIcon className="w-8 h-8 text-slate-700" />
                  <span>Không tồn tại học sinh nào thuộc danh sách {selectedClass === 'Tất cả' ? 'trường học' : `lớp [${selectedClass}]`}.</span>
                  <span className="text-[10px] text-slate-650 block">Hãy nhập bằng Excel hoặc chọn thêm học sinh thủ công từ nút phía trên.</span>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead>
                    <tr className="bg-slate-955 border-b border-slate-855 text-slate-400 text-[10px] uppercase tracking-wider font-mono">
                      <th className="py-2.5 px-5">Ảnh</th>
                      <th className="py-2.5 px-4">Họ và Tên Học Sinh</th>
                      <th className="py-2.5 px-4">Mã học sinh</th>
                      <th className="py-2.5 px-4">Lớp Biên Chế</th>
                      <th className="py-2.5 px-4">Thiết bị đăng nhập</th>
                      <th className="py-2.5 px-5 text-right">Tác Vụ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {students
                      .filter(s => selectedClass === 'Tất cả' || s.studentClass === selectedClass)
                      .map(student => {
                        const isEditing = editingStudentId === student.id;
                        return (
                          <tr 
                            key={student.id} 
                            className={`hover:bg-slate-855/30 transition-colors ${
                              isEditing ? 'bg-emerald-500/5' : ''
                            }`}
                          >
                            <td className="py-3 px-5">
                              <div className="w-9 h-9 rounded-xl overflow-hidden border border-slate-800 shadow shrink-0">
                                <img 
                                  src={student.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(student.fullName)}`} 
                                  alt={student.fullName}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </td>

                            <td className="py-3.5 px-4 font-semibold text-slate-205">
                              {isEditing ? (
                                <input 
                                  type="text"
                                  value={editStudentFullName}
                                  onChange={e => setEditStudentFullName(e.target.value)}
                                  className="bg-slate-955 border border-slate-800 rounded px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 w-full font-sans"
                                  required
                                />
                              ) : (
                                student.fullName
                              )}
                            </td>

                            <td className="py-3.5 px-4 font-mono text-slate-400 select-all">
                              {isEditing ? (
                                <input 
                                  type="text"
                                  value={editStudentEmail}
                                  onChange={e => setEditStudentEmail(e.target.value)}
                                  className="bg-slate-955 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500 w-full"
                                  required
                                />
                              ) : (
                                student.email
                              )}
                            </td>

                            <td className="py-3.5 px-4 font-bold text-blue-400 font-sans text-xs">
                              {isEditing ? (
                                <select
                                  value={editStudentClass}
                                  onChange={e => setEditStudentClass(e.target.value)}
                                  className="bg-slate-955 border border-slate-800 rounded px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer font-bold text-emerald-400 font-sans"
                                >
                                  {classList.map(c => (
                                    <option key={c} value={c}>Lớp {c}</option>
                                  ))}
                                </select>
                              ) : (
                                `Lớp ${student.studentClass || 'Chưa xếp lớp'}`
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-xs font-mono">
                              {student.studentDevice ? (
                                <div className="flex items-center gap-1.5 text-amber-400">
                                  <Smartphone className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                  <span className="truncate max-w-[130px] inline-block font-mono font-medium text-[11px]" title={student.studentDevice}>
                                    {student.studentDevice}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-650 italic font-mono text-[10px]">Chưa kết nối</span>
                              )}
                            </td>

                            <td className="py-3.5 px-5 text-right">
                              {isEditing ? (
                                <div className="flex justify-end gap-1.5 font-sans">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveEditStudent(student.id)}
                                    className="p-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-[10px] tracking-wide uppercase cursor-pointer"
                                  >
                                    LƯU
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingStudentId(null)}
                                    className="p-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-350 rounded text-[10px] tracking-wide uppercase cursor-pointer"
                                  >
                                    HỦY
                                  </button>
                                </div>
                              ) : (
                                <div className="flex justify-end gap-1 px-1 font-sans">
                                  {student.studentDevice && (
                                    <button
                                      type="button"
                                      onClick={() => handleResetDevice(student.id)}
                                      className="p-1 border border-slate-800 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-amber-400 transition cursor-pointer"
                                      title="Reset / Gỡ thiết bị đăng nhập"
                                    >
                                      <RefreshCw className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => startEditStudent(student)}
                                    className="p-1 border border-slate-800 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-emerald-400 transition cursor-pointer"
                                    title="Sửa thông tin học sinh"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteStudent(student)}
                                    className="p-1 border border-slate-800 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-500 transition cursor-pointer"
                                    title="Xóa học sinh này"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

      </div>
    </>
  ) : null}

      {/* DELETE CONFIRMATION DIALOG MODAL OVERLAY */}
      {pendingDeleteUser && (
        <div id="delete-user-modal" className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-fade-in text-left">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800 text-rose-500">
              <Trash2 className="w-5 h-5 text-rose-500" />
              <h3 className="font-extrabold text-sm text-slate-100 flex-1">
                XÓA TÀI KHOẢN {pendingDeleteUser.role === 'teacher' ? 'GIÁO VIÊN' : 'HỌC SINH'}
              </h3>
              <button 
                onClick={() => setPendingDeleteUser(null)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-slate-300 leading-relaxed">
                Hành động này sẽ <b className="text-rose-400">XÓA VĨNH VIỄN</b> tài khoản {pendingDeleteUser.role === 'teacher' ? 'giáo viên' : 'học sinh'}:
              </p>
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 flex items-center gap-3">
                {pendingDeleteUser.role !== 'teacher' && pendingDeleteUser.avatarUrl ? (
                  <img 
                    src={pendingDeleteUser.avatarUrl} 
                    alt={pendingDeleteUser.fullName}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-xl object-cover border border-slate-855"
                  />
                ) : (
                  <div className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-[10px] text-amber-500 font-extrabold uppercase">
                    GV
                  </div>
                )}
                <div>
                  <h4 className="text-xs font-bold text-slate-100">
                    {pendingDeleteUser.fullName} {pendingDeleteUser.studentClass ? `(Lớp ${pendingDeleteUser.studentClass})` : ''}
                  </h4>
                  <p className="text-[10px] font-mono text-slate-500">{pendingDeleteUser.email}</p>
                </div>
              </div>
              <p className="text-[10px] text-rose-400/90 font-medium leading-relaxed">
                ⚠️ Cảnh báo: Tài khoản {pendingDeleteUser.role === 'teacher' ? 'giáo viên' : 'học sinh'} này sẽ mất quyền xác thực phiên hoạt động và không thể khôi phục điểm học tập. Hành động không thể hoàn tác!
              </p>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={confirmDeleteUser}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl transition cursor-pointer uppercase tracking-wider"
              >
                XÁC NHẬN XÓA
              </button>
              <button
                type="button"
                onClick={() => setPendingDeleteUser(null)}
                className="flex-1 py-2.5 bg-slate-950 hover:bg-slate-850 text-slate-400 font-bold text-xs rounded-xl transition border border-slate-800 cursor-pointer uppercase tracking-wider"
              >
                HỦY BỎ
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingDeleteClass && (
        <div id="delete-class-modal" className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-fade-in text-left font-sans">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800 text-rose-500">
              <Trash2 className="w-5 h-5 text-rose-500" />
              <h3 className="font-extrabold text-sm text-slate-100 flex-1 uppercase">
                GỠ BỎ LỚP BIÊN CHẾ
              </h3>
              <button 
                onClick={() => setPendingDeleteClass(null)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-slate-300 leading-relaxed">
                Hành động này sẽ loại bỏ hoàn toàn mã lớp <b className="text-rose-450 font-extrabold">[{pendingDeleteClass}]</b> khỏi hệ thống quản lý trường học.
              </p>
              <p className="text-slate-400">
                Hãy chắc chắn không còn học sinh nào thuộc biên chế của lớp này.
              </p>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleConfirmDeleteClass}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl transition cursor-pointer uppercase tracking-wider"
              >
                GỠ LỚP NGAY
              </button>
              <button
                type="button"
                onClick={() => setPendingDeleteClass(null)}
                className="flex-1 py-2.5 bg-slate-950 hover:bg-slate-850 text-slate-400 font-bold text-xs rounded-xl transition border border-slate-800 cursor-pointer uppercase tracking-wider"
              >
                QUAY LẠI
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingResetStudent && (
        <div id="reset-device-modal" className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-fade-in text-left">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800 text-amber-500">
              <Smartphone className="w-5 h-5 text-amber-500" />
              <h3 className="font-extrabold text-sm text-slate-100 flex-1">
                GỠ LIÊN KẾT THIẾT BỊ
              </h3>
              <button 
                onClick={() => setPendingResetStudent(null)}
                className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Hệ thống yêu cầu xác nhận trước khi giải phóng thiết bị liên kết của học sinh sau:
              </p>
              
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 flex items-center gap-3">
                {pendingResetStudent.avatarUrl ? (
                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-855 shrink-0">
                    <img 
                      src={pendingResetStudent.avatarUrl} 
                      alt={pendingResetStudent.fullName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-[10px] text-amber-400 font-extrabold uppercase shrink-0">
                    HS
                  </div>
                )}
                <div>
                  <h4 className="text-xs font-bold text-slate-100">
                    {pendingResetStudent.fullName}
                  </h4>
                  <p className="text-[10px] text-blue-450 font-bold mb-0.5">Mã Lớp Học: {pendingResetStudent.studentClass || 'Chưa xếp lớp'}</p>
                  <p className="text-[10px] font-mono text-slate-500">Mã Học Sinh: {pendingResetStudent.email}</p>
                </div>
              </div>

              <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl text-[10px] text-amber-400 leading-relaxed space-y-1 bg-slate-950/20">
                <p className="font-bold flex items-center gap-1 text-xs">
                  <span>⚠️ CẢNH BÁO LIÊN QUAN:</span>
                </p>
                <p>
                  1. Tài khoản của học sinh này sẽ bị <span className="font-extrabold underline text-amber-300">BUỘC ĐĂNG XUẤT NGAY LẬP TỨC</span> khỏi tất cả các thiết bị cũ đang duy trì trạng thái đăng nhập.
                </p>
                <p>
                  2. Hệ thống sẽ giải phóng khóa thiết bị. Học sinh sẽ có thể đăng nhập lại từ một thiết bị mới hoàn toàn trong lần tiếp theo.
                </p>
              </div>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={confirmResetDevice}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-extrabold text-xs rounded-xl transition cursor-pointer uppercase tracking-wider"
              >
                XÁC NHẬN GỠ
              </button>
              <button
                type="button"
                onClick={() => setPendingResetStudent(null)}
                className="flex-1 py-2.5 bg-slate-950 hover:bg-slate-850 text-slate-400 font-bold text-xs rounded-xl transition border border-slate-800 cursor-pointer uppercase tracking-wider"
              >
                HỦY BỎ
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
