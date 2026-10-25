import React, { useEffect, useState } from 'react';
import {
  canTeacherManageSystem,
  ClassroomRecord,
  ExamBankData,
  exportSubmissionsToCsvString,
  filterAdminRoster,
  filterSubmissionsByAccountScope,
  getTeacherAssignedClasses,
  normalizeSubjectKey,
  ScreenId,
  StudentAccount,
  StudentRecord,
  SubjectKey,
  suggestTeacherUsernameFromFullName,
  TeacherAccount,
  THCS_SUBJECTS,
} from '../utils/examLogic';
import { ClassroomAndStudentManager } from './ClassroomAndStudentManager';
import { ExamImportForm } from './ExamImportForm';
import { LOGO_URL, PROFILE_AVATAR_URL } from './StudentHeader';

interface AdminDashboardProps {
  onNavigate: (screen: ScreenId) => void;
  isAdminAuthenticated: boolean;
  adminUserLabel: string;
  adminPasscode: string;
  currentTeacher: TeacherAccount;
  teacherAccounts: TeacherAccount[];
  onCreateTeacherAccount: (newTeacher: TeacherAccount) => Promise<void>;
  onDeleteTeacherAccount?: (teacherId: string) => Promise<void>;
  onVerifyPasscodeLogin: (username: string, passcode: string) => boolean;
  onGoogleAdminLogin: () => Promise<void>;
  onAdminLogout: () => void;
  onChangeAdminPasscode: (newPasscode: string) => Promise<void>;
  cloudExams: ExamBankData[];
  onSaveExamToCloud: (exam: ExamBankData) => Promise<void>;
  onDeleteExamFromCloud: (examId: string) => Promise<void>;
  onPurgeAllSystemDemoExams?: () => Promise<number>;
  onRestoreSystemDemoExams?: () => Promise<void>;
  purgedDemoExams?: boolean;
  cloudSubmissions: StudentRecord[];
  onDeleteSubmissionFromCloud: (submissionId: string) => Promise<void>;
  classrooms: ClassroomRecord[];
  studentAccounts: StudentAccount[];
  onSaveClassroom: (classroom: ClassroomRecord) => Promise<void>;
  onDeleteClassroom: (classroomId: string) => Promise<void>;
  onSaveStudentAccount: (student: StudentAccount) => Promise<void>;
  onBulkSaveStudentAccounts: (students: StudentAccount[]) => Promise<void>;
  onDeleteStudentAccount: (studentId: string) => Promise<void>;
}

type AdminSection =
  | 'tong-quan'
  | 'lop-hoc-hoc-sinh'
  | 'ngan-hang-de'
  | 'print-view'
  | 'tai-khoan-giao-vien'
  | 'nhat-ky-vi-pham';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigate,
  isAdminAuthenticated,
  adminUserLabel,
  currentTeacher,
  teacherAccounts,
  onCreateTeacherAccount,
  onDeleteTeacherAccount,
  onVerifyPasscodeLogin,
  onGoogleAdminLogin,
  onAdminLogout,
  onChangeAdminPasscode,
  cloudExams,
  onSaveExamToCloud,
  onDeleteExamFromCloud,
  onPurgeAllSystemDemoExams,
  onRestoreSystemDemoExams,
  purgedDemoExams = false,
  cloudSubmissions,
  onDeleteSubmissionFromCloud,
  classrooms,
  studentAccounts,
  onSaveClassroom,
  onDeleteClassroom,
  onSaveStudentAccount,
  onBulkSaveStudentAccounts,
  onDeleteStudentAccount,
}) => {
  // Login Gate state (Real credentials login, zero demo accounts)
  const [loginUsername, setLoginUsername] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingInGoogle, setIsLoggingInGoogle] = useState<boolean>(false);

  const isSystemAdmin = canTeacherManageSystem(currentTeacher);

  // Dashboard navigation & state
  const [activeAdminNav, setActiveAdminNav] = useState<AdminSection>(
    isSystemAdmin ? 'lop-hoc-hoc-sinh' : 'ngan-hang-de'
  );
  const [selectedGrade, setSelectedGrade] = useState<number>(9);
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>(
    currentTeacher.subject !== 'ALL' ? currentTeacher.subject : 'ALL'
  );
  const [selectedExamFilter, setSelectedExamFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Sync subject filter and default nav whenever teacher account changes
  useEffect(() => {
    if (currentTeacher.subject !== 'ALL') {
      setSelectedSubjectFilter(currentTeacher.subject);
      setActiveAdminNav('ngan-hang-de');
    } else {
      setSelectedSubjectFilter('ALL');
      setActiveAdminNav('lop-hoc-hoc-sinh');
    }
    setSelectedExamFilter('ALL');
  }, [currentTeacher.id, currentTeacher.subject]);

  // Create new teacher account modal state
  const [showCreateTeacherModal, setShowCreateTeacherModal] =
    useState<boolean>(false);
  const [newTeacherUsername, setNewTeacherUsername] = useState<string>('');
  const [teacherUsernameManuallyEdited, setTeacherUsernameManuallyEdited] =
    useState<boolean>(false);
  const [newTeacherFullName, setNewTeacherFullName] = useState<string>('');
  const [newTeacherSubject, setNewTeacherSubject] =
    useState<SubjectKey>('Toán');
  const [newTeacherPasscode, setNewTeacherPasscode] =
    useState<string>('123456');
  const [newTeacherSelectedClasses, setNewTeacherSelectedClasses] = useState<
    string[]
  >(['7A1']);
  const [teacherCreatedNotice, setTeacherCreatedNotice] = useState<
    string | null
  >(null);

  const [selectedStudentModal, setSelectedStudentModal] =
    useState<StudentRecord | null>(null);
  const [isSessionLocked, setIsSessionLocked] = useState<boolean>(false);
  const [unlockPasscode, setUnlockPasscode] = useState<string>('');
  const [showPasswordChangeModal, setShowPasswordChangeModal] =
    useState<boolean>(false);
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');
  const [passwordSavedNotice, setPasswordSavedNotice] = useState<string | null>(
    null
  );
  const [csvExportNotice, setCsvExportNotice] = useState<string | null>(null);
  const [showCsvPreviewModal, setShowCsvPreviewModal] =
    useState<boolean>(false);

  // Handle real Admin / Teacher Login form submission
  const handleAdminFormLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = onVerifyPasscodeLogin(loginUsername, loginPassword);
    if (!ok) {
      setLoginError(
        'Tên tài khoản hoặc mật khẩu không chính xác! Vui lòng đăng nhập đúng tài khoản Quản trị hoặc Giáo viên bộ môn.'
      );
    } else {
      setLoginError(null);
      setLoginPassword('');
    }
  };

  const handleGoogleLoginClick = async () => {
    setIsLoggingInGoogle(true);
    setLoginError(null);
    try {
      await onGoogleAdminLogin();
    } catch (err) {
      setLoginError(
        err instanceof Error
          ? err.message
          : 'Không thể đăng nhập bằng Google. Hãy dùng mật khẩu giáo viên.'
      );
    } finally {
      setIsLoggingInGoogle(false);
    }
  };

  const handleToggleTeacherClassCheckbox = (classNameCode: string) => {
    const up = classNameCode.trim().toUpperCase();
    setNewTeacherSelectedClasses((prev) =>
      prev.includes(up) ? prev.filter((c) => c !== up) : [...prev, up]
    );
  };

  const handleCreateTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSystemAdmin) return;
    if (!newTeacherFullName.trim()) return;
    const autoUser = suggestTeacherUsernameFromFullName(
      newTeacherFullName,
      teacherAccounts.map((t) => t.username)
    );
    const cleanUser = (newTeacherUsername.trim() || autoUser)
      .toLowerCase()
      .replace(/\s+/g, '');
    const parsedClasses = newTeacherSelectedClasses
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);
    const created: TeacherAccount = {
      id: `teacher-${cleanUser}-${Date.now()}`,
      username: cleanUser,
      fullName: newTeacherFullName.trim(),
      subject: newTeacherSubject,
      passcode: newTeacherPasscode.trim() || '123456',
      role: 'teacher',
      assignedClasses: parsedClasses.length > 0 ? parsedClasses : undefined,
    };
    await onCreateTeacherAccount(created);
    setNewTeacherUsername('');
    setTeacherUsernameManuallyEdited(false);
    setNewTeacherFullName('');
    setNewTeacherPasscode('123456');
    setTeacherCreatedNotice(
      `Đã tạo tài khoản giáo viên "${created.fullName}" (TK rút gọn: ${created.username} • MK mặc định: ${created.passcode}) chuyên trách môn ${created.subject} (Lớp dạy: ${
        parsedClasses.join(', ') || 'Chưa chọn'
      })!`
    );
    window.setTimeout(() => {
      setTeacherCreatedNotice(null);
      setShowCreateTeacherModal(false);
    }, 1500);
  };

  // REAL AUTHENTICATION GATE: Must log in as Teacher or Admin before accessing Dashboard
  if (!isAdminAuthenticated) {
    return (
      <div className="min-h-screen bg-background font-body-md text-on-surface flex flex-col justify-between">
        <header className="h-20 w-full px-gutter bg-surface/90 backdrop-blur-xl shadow-sm flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigate('cong-vao-thi')}
            className="flex items-center gap-3 text-left cursor-pointer"
          >
            <img
              alt="EduExam Pro Logo"
              className="h-8 w-auto object-contain"
              referrerPolicy="no-referrer"
              src={LOGO_URL}
            />
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm text-primary">
                EduExam Pro Teacher &amp; Admin
              </span>
              <span className="font-label-md text-label-md text-on-surface-variant">
                Cổng Đăng Nhập Quản Trị Viên &amp; Giáo Viên Bộ Môn
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('cong-vao-thi')}
            className="px-4 py-2 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high font-label-lg text-label-lg flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">
              arrow_back
            </span>
            <span>Quay lại Cổng Học Sinh</span>
          </button>
        </header>

        <main className="flex-1 flex items-center justify-center p-gutter">
          <div className="bg-surface-container-lowest max-w-xl w-full rounded-xl p-space-xl shadow-xl border border-outline-variant/30 flex flex-col gap-space-md">
            <div className="flex items-center gap-space-sm">
              <div className="w-12 h-12 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-md">
                <span className="material-symbols-outlined text-[28px]">
                  admin_panel_settings
                </span>
              </div>
              <div>
                <span className="font-code-meta text-code-meta text-secondary font-bold uppercase">
                  Xác Thực Đúng Tài Khoản &amp; Phân Quyền Thực Tế
                </span>
                <h1 className="font-headline-md text-headline-md text-primary">
                  Đăng Nhập Quản Trị &amp; Giáo Viên Bộ Môn
                </h1>
              </div>
            </div>

            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Hệ thống phân quyền nghiêm ngặt theo đúng tài khoản đăng nhập: <strong>Quản trị viên (`admin`)</strong> quản lý lớp học, danh sách tài khoản học sinh và toàn bộ 11 môn; <strong>Giáo viên bộ môn</strong> chỉ quản lý ngân hàng đề thi và bảng điểm thuộc môn học được phân công.
            </p>

            <form
              id="adminLoginForm"
              onSubmit={handleAdminFormLogin}
              className="flex flex-col gap-space-md"
            >
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="adminUsername"
                  className="font-label-lg text-label-lg text-on-surface"
                >
                  Tài khoản Quản trị / Giáo viên bộ môn
                </label>
                <input
                  id="adminUsername"
                  type="text"
                  required
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="Nhập tài khoản Quản trị hoặc Giáo viên bộ môn"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-surface-container-low font-code-meta text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="adminPassword"
                  className="font-label-lg text-label-lg text-on-surface"
                >
                  Mật khẩu xác thực
                </label>
                <input
                  id="adminPassword"
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Nhập mật khẩu xác thực"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-surface-container-low font-code-meta text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {loginError && (
                <div
                  role="alert"
                  className="p-space-sm rounded-lg bg-error-container text-on-error-container font-body-sm text-body-sm flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    error
                  </span>
                  <span>{loginError}</span>
                </div>
              )}

              <button
                id="btnSubmitAdminLogin"
                type="submit"
                className="w-full py-3 rounded-xl bg-primary text-on-primary hover:bg-primary-container font-headline-sm text-headline-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">
                  lock_open
                </span>
                <span>ĐĂNG NHẬP HỆ THỐNG QUẢN TRỊ / GIÁO VIÊN</span>
              </button>
            </form>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-outline-variant/40"></div>
              <span className="flex-shrink mx-3 font-code-meta text-code-meta text-outline">
                HOẶC XÁC THỰC CLOUD
              </span>
              <div className="flex-grow border-t border-outline-variant/40"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleLoginClick}
              disabled={isLoggingInGoogle}
              className="w-full py-2.5 px-4 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-lg text-label-lg flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-primary text-[20px]">
                verified_user
              </span>
              <span>
                {isLoggingInGoogle
                  ? 'Đang kết nối Google Auth...'
                  : 'Đăng nhập bằng Tài khoản Google (Firebase Auth)'}
              </span>
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Classes assigned by this teacher (or explicitly assigned to their account)
  const teacherAssignedClasses = getTeacherAssignedClasses(
    currentTeacher,
    cloudExams
  );

  // Dynamic class options per grade (restricted to teacher's assigned classes if role === 'teacher')
  const getClassesForGrade = (grade: number): string[] => {
    const dynamicClasses = classrooms
      .filter((c) => c.grade === grade)
      .map((c) => c.name);
    const defaults: Record<number, string[]> = {
      6: ['6A1', '6A2'],
      7: ['7A1', '7A2'],
      8: ['8A1', '8A2'],
      9: ['9A1', '9A2'],
    };
    const allForGrade = Array.from(
      new Set([...dynamicClasses, ...(defaults[grade] || [])])
    );
    if (!isSystemAdmin) {
      const allowedForGrade = allForGrade.filter((cls) =>
        teacherAssignedClasses.includes(cls.toUpperCase())
      );
      return ['ALL', ...allowedForGrade];
    }
    return ['ALL', ...allForGrade];
  };

  // Effective subject filter: locked to teacher's subject if logged in as a subject teacher
  const effectiveSubjectFilter =
    currentTeacher.subject !== 'ALL'
      ? currentTeacher.subject
      : selectedSubjectFilter;

  // Scope submissions strictly by account permissions (Admin sees all; Teacher sees only their subject & assigned classes)
  const accountScopedSubmissions = filterSubmissionsByAccountScope(
    cloudSubmissions,
    {
      role: isSystemAdmin ? 'admin' : 'teacher',
      teacher: currentTeacher,
      exams: cloudExams,
    }
  );

  // Exams belonging to the current teacher/subject for the exam filter dropdown
  const teacherExamsForScoreFilter = cloudExams.filter((ex) => {
    const exSubj = normalizeSubjectKey(ex.subjectCode || ex.subject);
    if (effectiveSubjectFilter !== 'ALL' && exSubj !== effectiveSubjectFilter) {
      return false;
    }
    if (selectedGrade > 0 && ex.grade !== selectedGrade) {
      return false;
    }
    return true;
  });

  // Real submissions filtered by Grade, Class, Status, Teacher's Subject, and Selected Exam
  const displayedRecords = filterAdminRoster(
    accountScopedSubmissions,
    searchQuery,
    selectedGrade,
    selectedClass,
    statusFilter,
    effectiveSubjectFilter,
    selectedExamFilter
  );

  // Real KPI calculations from displayedRecords
  const totalSubmissionsCount = displayedRecords.length;
  const averageScore =
    totalSubmissionsCount > 0
      ? (
          displayedRecords.reduce((acc, r) => acc + r.finalScore, 0) /
          totalSubmissionsCount
        ).toFixed(2)
      : '0.00';
  const tabViolatorsCount = displayedRecords.filter(
    (r) => r.tabLeaves > 0
  ).length;
  const fastSubmitCount = displayedRecords.filter(
    (r) => r.durationSeconds < 60
  ).length;

  const handleExportCsv = (mode: 'filtered' | 'all' = 'filtered') => {
    const targetRecords =
      mode === 'all' ? accountScopedSubmissions : displayedRecords;

    const gradeLabel =
      mode === 'all' ? 'Tất cả Khối được phân quyền' : `Khối ${selectedGrade}`;
    const classLabel =
      mode === 'all'
        ? isSystemAdmin
          ? 'Toàn trường'
          : `Lớp giao bài (${teacherAssignedClasses.join(', ') || 'Chưa giao'})`
        : selectedClass === 'ALL'
        ? 'Tất cả lớp trong phạm vi'
        : `Lớp ${selectedClass}`;
    const subjectLabel =
      effectiveSubjectFilter === 'ALL'
        ? 'Tất cả 11 môn'
        : `Môn ${effectiveSubjectFilter}`;
    const pickedExamObj = cloudExams.find((e) => e.id === selectedExamFilter);
    const examLabel = pickedExamObj
      ? `${pickedExamObj.code} - ${pickedExamObj.title}`
      : 'Tất cả đề kiểm tra';

    const csvContent = exportSubmissionsToCsvString(targetRecords, {
      gradeLabel,
      classLabel,
      subjectLabel,
      examLabel,
      exportedBy: currentTeacher.fullName || adminUserLabel,
    });
    const fileName =
      mode === 'all'
        ? `Bang_Diem_Firebase_${
            effectiveSubjectFilter === 'ALL' ? 'Toan_Truong' : effectiveSubjectFilter
          }_${new Date().toISOString().slice(0, 10)}.csv`
        : `Bang_Diem_Khoi${selectedGrade}_${selectedClass}_Mon_${effectiveSubjectFilter}.csv`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setCsvExportNotice(
      `Đã kết xuất thành công tệp báo cáo ngoại tuyến "${fileName}" (${targetRecords.length} bài thi môn ${subjectLabel})!`
    );
    window.setTimeout(() => setCsvExportNotice(null), 5000);
  };

  const handleAdminNavClick = (section: AdminSection) => {
    setActiveAdminNav(section);
    if (section === 'lop-hoc-hoc-sinh') {
      document
        .getElementById('classroom-student-manager-section')
        ?.scrollIntoView({ behavior: 'smooth' });
    } else if (section === 'nhat-ky-vi-pham') {
      setStatusFilter('VIOLATION');
      document
        .getElementById('admin-roster-section')
        ?.scrollIntoView({ behavior: 'smooth' });
    } else if (section === 'ngan-hang-de') {
      setStatusFilter('ALL');
      document
        .getElementById('admin-ingestion-section')
        ?.scrollIntoView({ behavior: 'smooth' });
    } else if (section === 'print-view') {
      document
        .getElementById('exam-import-print-preview')
        ?.scrollIntoView({ behavior: 'smooth' });
    } else if (section === 'tai-khoan-giao-vien') {
      document
        .getElementById('teacher-accounts-management-bar')
        ?.scrollIntoView({ behavior: 'smooth' });
    } else {
      setStatusFilter('ALL');
      document
        .getElementById('admin-roster-section')
        ?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Strict role-separated sidebar menu items (Admin vs Subject Teacher; NO Student Portal menu)
  const sidebarNavItems = [
    ...(isSystemAdmin
      ? [
          {
            id: 'lop-hoc-hoc-sinh' as AdminSection,
            label: 'Lớp Học & DS Tài Khoản HS',
            icon: 'groups',
          },
        ]
      : []),
    {
      id: 'ngan-hang-de' as AdminSection,
      label: 'Nạp Đề Trực Tiếp & Giao Bài Thi',
      icon: 'assignment_add',
    },
    {
      id: 'tong-quan' as AdminSection,
      label: 'Bảng Điểm Theo Lớp & Đề Giao',
      icon: 'analytics',
    },
    {
      id: 'print-view' as AdminSection,
      label: 'Xem Trước Đề (Print Preview)',
      icon: 'print',
    },
    {
      id: 'tai-khoan-giao-vien' as AdminSection,
      label: isSystemAdmin
        ? 'Quản Lý Tài Khoản Giáo Viên'
        : 'Thông Tin Phân Quyền Giáo Viên',
      icon: 'verified_user',
    },
    {
      id: 'nhat-ky-vi-pham' as AdminSection,
      label: 'Nhật Ký Chuyển Tab (-0.5đ)',
      icon: 'warning',
    },
  ];

  // Filter non-admin teacher accounts for System Admin management view
  const managedSubjectTeachers = teacherAccounts.filter(
    (t) => t.role !== 'admin' && t.username.toLowerCase() !== 'admin'
  );

  return (
    <div className="bg-background font-body-md text-on-surface antialiased min-h-screen">
      {/* LEFT SIDEBAR (Strictly no Student Portal menu when Teacher/Admin is logged in) */}
      <aside className="fixed left-0 top-0 h-full w-72 bg-surface-container-low z-50 hidden lg:flex flex-col pt-space-md pb-space-lg shadow-[0_1px_8px_rgba(0,0,0,0.04)] print:hidden">
        <div className="px-space-lg pb-space-lg flex items-center gap-space-sm">
          <img
            alt="EduExam Pro Logo"
            className="h-8 w-auto object-contain"
            referrerPolicy="no-referrer"
            src={LOGO_URL}
          />
          <div className="flex flex-col">
            <span className="font-headline-sm text-headline-sm text-primary tracking-tight">
              EduExam {isSystemAdmin ? 'Admin' : 'Teacher'}
            </span>
            <span className="font-code-meta text-code-meta text-on-surface-variant">
              {isSystemAdmin
                ? 'Tổng Quản Trị Trường THCS'
                : `GV Môn ${currentTeacher.subject}`}
            </span>
          </div>
        </div>

        <div className="px-space-md mb-space-sm">
          <span className="px-space-sm font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
            {isSystemAdmin ? 'Phân hệ quản trị' : 'Phân hệ giáo viên bộ môn'}
          </span>
        </div>

        <nav
          aria-label="Phân hệ quản trị"
          className="flex-1 px-space-md space-y-space-xs"
        >
          {sidebarNavItems.map((item) => {
            const isActive = activeAdminNav === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleAdminNavClick(item.id)}
                className={`w-full flex items-center gap-space-sm px-space-md py-space-sm rounded-xl font-label-lg text-label-lg transition-all cursor-pointer text-left ${
                  isActive
                    ? 'bg-primary-container text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="pt-space-md border-t border-outline-variant/30 mt-space-md space-y-1">
            <button
              id="btnSidebarLogout"
              type="button"
              onClick={onAdminLogout}
              className="w-full flex items-center gap-space-sm px-space-md py-space-sm rounded-xl text-error font-label-lg text-label-lg hover:bg-error-container/30 transition-all cursor-pointer text-left"
            >
              <span className="material-symbols-outlined text-[20px]">
                logout
              </span>
              <span>Đăng Xuất Tài Khoản</span>
            </button>
          </div>
        </nav>

        <div className="px-space-md pt-space-md">
          <div className="bg-surface-container p-space-md rounded-xl flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-primary text-[24px]">
              cloud_done
            </span>
            <div className="flex flex-col">
              <span className="font-label-md text-label-md text-on-surface font-semibold">
                Cloud Firestore Active
              </span>
              <span className="font-code-meta text-code-meta text-on-surface-variant">
                {isSystemAdmin
                  ? `${classrooms.length} lớp • ${studentAccounts.length} TK HS • ${cloudExams.length} đề`
                  : `Môn ${currentTeacher.subject} • Lớp giao: ${
                      teacherAssignedClasses.join(', ') || 'Chưa giao'
                    }`}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="lg:pl-72">
        {/* TOP HEADER (Strictly no Student Portal link when Teacher/Admin is logged in) */}
        <header className="fixed top-0 left-0 lg:left-72 right-0 h-20 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex items-center justify-between px-space-lg print:hidden">
          <div className="flex items-center gap-space-sm text-on-surface-variant font-label-lg text-label-lg">
            <span className="material-symbols-outlined text-primary text-[20px]">
              shield_locked
            </span>
            <span className="font-semibold text-primary">
              EduExam Pro - Hệ Thống Khảo Thí THCS
            </span>
            <span className="text-outline hidden sm:inline">/</span>
            <span className="text-on-surface font-medium hidden sm:inline">
              {isSystemAdmin
                ? 'Hội Đồng Khảo Thí (Toàn Quyền Quản Trị)'
                : `Giáo Viên Bộ Môn ${currentTeacher.subject} (${currentTeacher.fullName})`}
            </span>
          </div>

          <div className="flex items-center gap-space-md">
            <div className="hidden md:flex items-center gap-space-xs bg-surface-container-low p-1 rounded-lg">
              <button
                type="button"
                onClick={() => handleAdminNavClick('tong-quan')}
                className="px-2.5 py-1 rounded font-label-md text-label-md text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors cursor-pointer"
              >
                Bảng Điểm ({isSystemAdmin ? 'Toàn trường' : teacherAssignedClasses.join(', ') || 'Lớp giao bài'})
              </button>
              <button
                type="button"
                onClick={() => onNavigate('ket-qua-bang-diem')}
                className="px-2.5 py-1 rounded font-label-md text-label-md text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors cursor-pointer"
              >
                Tra Cứu Điểm Tổng Hợp
              </button>
            </div>

            <div className="flex items-center gap-space-sm bg-surface-container-low p-space-xs rounded-full pr-space-md">
              <img
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover"
                referrerPolicy="no-referrer"
                src={PROFILE_AVATAR_URL}
              />
              <div className="hidden sm:flex flex-col text-left">
                <span className="font-label-md text-label-md text-on-surface leading-tight font-semibold">
                  {currentTeacher.fullName}
                </span>
                <span className="font-code-meta text-code-meta text-on-tertiary-container font-semibold">
                  {isSystemAdmin
                    ? 'Quản trị toàn trường (admin)'
                    : `GV Môn ${currentTeacher.subject} (${currentTeacher.username})`}
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="relative pt-24 bg-background min-h-screen px-space-lg">
          <div className="flex flex-col w-full">
            {/* AUTHENTICATED ACCOUNT & PERMISSION STATUS BAR */}
            <div
              id="teacher-accounts-management-bar"
              className="w-full bg-surface-container-low rounded-xl p-space-md shadow-sm mb-space-lg print:hidden"
            >
              <div className="flex flex-wrap items-center justify-between gap-space-md">
                <div className="flex items-center gap-space-md">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-on-primary">
                    <span className="material-symbols-outlined text-[22px]">
                      verified_user
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-space-xs flex-wrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-tertiary-container text-on-tertiary-container font-label-md text-label-md font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-tertiary-fixed"></span>
                        {isSystemAdmin
                          ? 'Quyền hạn: Tổng Quản Trị (Quản lý Lớp học, TK Học sinh, TK Giáo viên & 11 Môn)'
                          : `Quyền hạn: Giáo viên chuyên trách Môn ${currentTeacher.subject}`}
                      </span>
                      <span className="font-code-meta text-xs text-secondary font-bold">
                        Tài khoản: {currentTeacher.username}
                      </span>
                    </div>
                    <span className="font-body-md text-body-md text-on-surface font-semibold mt-0.5">
                      {currentTeacher.fullName}{' '}
                      <span className="font-code-meta text-code-meta text-on-surface-variant font-normal">
                        — Phạm vi quản lý bảng điểm:{' '}
                        <strong>
                          {isSystemAdmin
                            ? 'Tất cả các lớp & 11 môn THCS'
                            : `Môn ${currentTeacher.subject} • Chỉ các lớp đã giao bài (${
                                teacherAssignedClasses.length > 0
                                  ? teacherAssignedClasses.join(', ')
                                  : 'Chưa giao lớp nào'
                              })`}
                        </strong>
                      </span>
                    </span>
                  </div>
                </div>

                {/* Role-enforced actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  {isSystemAdmin && (
                    <button
                      id="btnOpenCreateTeacherModal"
                      type="button"
                      onClick={() => setShowCreateTeacherModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary text-on-secondary hover:bg-secondary-container transition-colors font-label-md text-label-md shadow-sm cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        person_add
                      </span>
                      <span>+ Thêm TK Giáo Viên Bộ Môn</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowPasswordChangeModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container-highest text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-label-md shadow-sm cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      key
                    </span>
                    <span>Đổi MK</span>
                  </button>

                  <button
                    id="btnTopBarLogout"
                    type="button"
                    onClick={onAdminLogout}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-error text-on-error hover:bg-error/90 transition-colors font-label-md text-label-md shadow-sm cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      logout
                    </span>
                    <span>Đăng xuất tài khoản</span>
                  </button>
                </div>
              </div>

              {/* System Admin view of created Subject Teacher accounts (Zero demo accounts) */}
              {isSystemAdmin && (
                <div className="mt-space-md pt-space-sm border-t border-outline-variant/25 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-code-meta text-xs text-on-surface-variant font-semibold">
                      Danh sách Tài khoản Giáo viên bộ môn hiện có ({managedSubjectTeachers.length}):
                    </span>
                    {managedSubjectTeachers.length === 0 ? (
                      <span className="font-body-sm text-xs text-on-surface-variant italic">
                        Chưa có tài khoản giáo viên bộ môn nào (đã xoá toàn bộ tài khoản giáo viên demo). Nhấn &ldquo;+ Thêm TK Giáo Viên Bộ Môn&rdquo; để cấp tài khoản thực tế.
                      </span>
                    ) : (
                      managedSubjectTeachers.map((t) => (
                        <span
                          key={t.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container-lowest border border-outline-variant/30 font-code-meta text-xs text-on-surface"
                        >
                          <strong className="text-primary">{t.username}</strong>
                          <span>({t.fullName} - Môn {t.subject})</span>
                          {t.assignedClasses && t.assignedClasses.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-secondary-container text-on-secondary-container font-bold">
                              Lớp: {t.assignedClasses.join(', ')}
                            </span>
                          )}
                          {onDeleteTeacherAccount && (
                            <button
                              type="button"
                              onClick={() => onDeleteTeacherAccount(t.id)}
                              className="text-error hover:underline ml-1 cursor-pointer"
                              title="Xoá tài khoản giáo viên"
                            >
                              ×
                            </button>
                          )}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* MODULE 0: CLASSROOM & STUDENT ACCOUNT ROSTER MANAGEMENT (ONLY FOR SYSTEM ADMIN) */}
            {isSystemAdmin && (
              <ClassroomAndStudentManager
                currentTeacher={currentTeacher}
                classrooms={classrooms}
                studentAccounts={studentAccounts}
                onSaveClassroom={onSaveClassroom}
                onDeleteClassroom={onDeleteClassroom}
                onSaveStudentAccount={onSaveStudentAccount}
                onBulkSaveStudentAccounts={onBulkSaveStudentAccounts}
                onDeleteStudentAccount={onDeleteStudentAccount}
              />
            )}

            {/* MODULE 1: EXAMIMPORTFORM (DIRECT INGEST BY GRADE & 11 SUBJECTS -> ASSIGN EXAM WITH SCHEDULE & CLASSES) */}
            <section id="admin-ingestion-section" className="w-full mb-space-xl">
              <ExamImportForm
                cloudExams={cloudExams}
                classrooms={classrooms}
                adminUserLabel={adminUserLabel}
                currentTeacher={currentTeacher}
                onSaveExamToCloud={onSaveExamToCloud}
                onDeleteExamFromCloud={onDeleteExamFromCloud}
                onPurgeAllSystemDemoExams={onPurgeAllSystemDemoExams}
                onRestoreSystemDemoExams={onRestoreSystemDemoExams}
                purgedDemoExams={purgedDemoExams}
              />
            </section>

            {/* MODULE 2: TEACHER'S SCOREBOARD BY SUBJECT, EXAM & ASSIGNED CLASS SCOPE */}
            <section
              id="admin-roster-section"
              className="w-full pb-space-xl print:hidden"
            >
              <div className="flex items-center justify-between mb-space-md flex-wrap gap-2">
                <div className="flex items-center gap-space-sm">
                  <div className="w-8 h-8 rounded-lg bg-primary-container text-on-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">
                      analytics
                    </span>
                  </div>
                  <div>
                    <h2 className="font-headline-md text-headline-md text-primary">
                      Quản Lý Bảng Điểm Theo Phạm Vi Lớp Giao Bài &amp; Bộ Môn
                    </h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Tài khoản: <strong>{currentTeacher.fullName}</strong> • Môn:{' '}
                      <strong className="text-primary">
                        {effectiveSubjectFilter === 'ALL'
                          ? 'Tất cả 11 môn học'
                          : effectiveSubjectFilter}
                      </strong>{' '}
                      • Phạm vi lớp được xem điểm:{' '}
                      <strong className="text-secondary">
                        {isSystemAdmin
                          ? 'Toàn trường (Khối 6, 7, 8, 9)'
                          : teacherAssignedClasses.length > 0
                          ? `Chỉ lớp ${teacherAssignedClasses.join(', ')}`
                          : 'Chưa giao bài cho lớp nào'}
                      </strong>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    id="btnPreviewCsvModal"
                    type="button"
                    onClick={() => setShowCsvPreviewModal(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-all font-label-md text-label-md cursor-pointer whitespace-nowrap"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      visibility
                    </span>
                    <span>Xem Trước Báo Cáo CSV</span>
                  </button>

                  <button
                    id="btnExportFilteredCsv"
                    type="button"
                    onClick={() => handleExportCsv('filtered')}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-secondary text-on-secondary hover:bg-secondary-container transition-all font-label-md text-label-md shadow-sm cursor-pointer whitespace-nowrap"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      download
                    </span>
                    <span>
                      Xuất CSV Điểm Môn{' '}
                      {effectiveSubjectFilter === 'ALL'
                        ? 'Tất Cả'
                        : effectiveSubjectFilter}{' '}
                      ({displayedRecords.length} bài)
                    </span>
                  </button>

                  <button
                    id="btnExportAllCloudCsv"
                    type="button"
                    onClick={() => handleExportCsv('all')}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-primary text-on-primary hover:bg-primary-container transition-all font-label-md text-label-md shadow-md cursor-pointer whitespace-nowrap"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      table_view
                    </span>
                    <span>Xuất Toàn Bộ Điểm Trong Phạm Vi</span>
                  </button>
                </div>
              </div>

              {csvExportNotice && (
                <div
                  role="status"
                  id="csv-export-success-banner"
                  className="mb-space-md p-3 rounded-xl bg-tertiary-container text-on-tertiary font-label-md text-label-md flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px]">
                      check_circle
                    </span>
                    <span>{csvExportNotice}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCsvExportNotice(null)}
                    className="font-code-meta text-xs underline cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>
              )}

              {/* Filter Panel: Grade, Class (Scoped to Teacher's Assigned Classes), Subject, and Exam */}
              <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-md mb-space-lg flex flex-col gap-space-md">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-space-md items-center">
                  {/* 1. Grade Selector */}
                  <div className="md:col-span-4 flex flex-col gap-1.5">
                    <label className="font-label-md text-label-md text-on-surface-variant uppercase font-semibold">
                      1. Chọn Khối Học
                    </label>
                    <div className="flex items-center gap-1.5 p-1 bg-surface-container rounded-lg">
                      {[6, 7, 8, 9].map((g) => {
                        const active = selectedGrade === g;
                        return (
                          <button
                            key={g}
                            type="button"
                            onClick={() => {
                              setSelectedGrade(g);
                              setSelectedClass('ALL');
                              setSelectedExamFilter('ALL');
                            }}
                            className={`flex-1 py-1.5 px-2 rounded font-label-md text-label-md text-center transition-colors cursor-pointer ${
                              active
                                ? 'bg-primary-container text-on-primary font-bold shadow-sm'
                                : 'text-on-surface-variant hover:text-on-surface'
                            }`}
                          >
                            Khối {g}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Class Selector */}
                  <div className="md:col-span-4 flex flex-col gap-1.5">
                    <label className="font-label-md text-label-md text-on-surface-variant uppercase font-semibold">
                      2. Chọn Lớp Học ({isSystemAdmin ? 'Toàn trường' : 'Chỉ lớp GV giao bài'})
                    </label>
                    <div className="flex items-center gap-1 p-1 bg-surface-container rounded-lg flex-wrap">
                      {getClassesForGrade(selectedGrade).map((cls) => {
                        const active = selectedClass === cls;
                        return (
                          <button
                            key={cls}
                            type="button"
                            onClick={() => setSelectedClass(cls)}
                            className={`flex-1 py-1.5 px-2 rounded font-label-md text-xs text-center transition-colors cursor-pointer ${
                              active
                                ? 'bg-secondary text-on-secondary font-bold shadow-sm'
                                : 'text-on-surface-variant hover:text-on-surface'
                            }`}
                          >
                            {cls === 'ALL' ? 'Tất cả lớp được phép' : cls}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. Filter by Subject & Specific Exam of the Teacher */}
                  <div className="md:col-span-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="selectSubjectFilterForScores"
                        className="font-label-md text-label-md text-on-surface-variant uppercase font-semibold"
                      >
                        3. Môn Học Quản Lý
                      </label>
                      <select
                        id="selectSubjectFilterForScores"
                        disabled={currentTeacher.subject !== 'ALL'}
                        value={effectiveSubjectFilter}
                        onChange={(e) => {
                          setSelectedSubjectFilter(e.target.value);
                          setSelectedExamFilter('ALL');
                        }}
                        className="px-3 py-2 rounded-lg bg-surface-container font-label-md text-xs font-bold text-primary focus:outline-none"
                      >
                        {currentTeacher.subject === 'ALL' && (
                          <option value="ALL">Tất cả 11 môn học</option>
                        )}
                        {THCS_SUBJECTS.map((s) => (
                          <option key={s.key} value={s.key}>
                            Môn {s.key} ({s.label})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label
                        htmlFor="selectExamFilterForScores"
                        className="font-label-md text-label-md text-on-surface-variant uppercase font-semibold"
                      >
                        4. Theo Đề Kiểm Tra
                      </label>
                      <select
                        id="selectExamFilterForScores"
                        value={selectedExamFilter}
                        onChange={(e) => setSelectedExamFilter(e.target.value)}
                        className="px-3 py-2 rounded-lg bg-surface-container font-code-meta text-xs font-bold text-on-surface focus:outline-none"
                      >
                        <option value="ALL">
                          Tất cả đề ({teacherExamsForScoreFilter.length} đề)
                        </option>
                        {teacherExamsForScoreFilter.map((ex) => (
                          <option key={ex.id} value={ex.id}>
                            [{ex.code}] {ex.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Real KPI Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md mb-space-lg">
                <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-md flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-label-md text-label-md text-on-surface-variant uppercase font-semibold">
                      Số Bài Thi Môn{' '}
                      {effectiveSubjectFilter === 'ALL'
                        ? 'Tất Cả'
                        : effectiveSubjectFilter}
                    </span>
                    <span className="font-headline-lg text-headline-lg text-on-surface mt-1">
                      {totalSubmissionsCount} HS
                    </span>
                    <span className="font-code-meta text-code-meta text-tertiary font-medium">
                      Lưu trữ Cloud Firestore
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-surface-container-high text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">
                      groups
                    </span>
                  </div>
                </div>

                <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-md flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-label-md text-label-md text-on-surface-variant uppercase font-semibold">
                      Điểm Trung Bình Bộ Môn
                    </span>
                    <span className="font-headline-lg text-headline-lg text-primary mt-1">
                      {averageScore}
                    </span>
                    <span className="font-code-meta text-code-meta text-primary font-medium">
                      Thang điểm 10.0
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-primary-fixed text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">
                      grade
                    </span>
                  </div>
                </div>

                <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-md flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-label-md text-label-md text-on-surface-variant uppercase font-semibold">
                      Vi Phạm Chuyển Tab
                    </span>
                    <span className="font-headline-lg text-headline-lg text-error mt-1">
                      {tabViolatorsCount} HS
                    </span>
                    <span className="font-code-meta text-code-meta text-error font-medium">
                      Trừ 0.5 điểm / lần thi lại
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-error-container text-error flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">
                      tab_close
                    </span>
                  </div>
                </div>

                <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-md flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-label-md text-label-md text-on-surface-variant uppercase font-semibold">
                      Nộp Siêu Tốc (&lt;1p)
                    </span>
                    <span className="font-headline-lg text-headline-lg text-error mt-1">
                      {fastSubmitCount} HS
                    </span>
                    <span className="font-code-meta text-code-meta text-error font-medium">
                      Trừ 50% (Nghi vấn AI)
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-error-container text-error flex items-center justify-center">
                    <span className="material-symbols-outlined text-[24px]">
                      timer_off
                    </span>
                  </div>
                </div>
              </div>

              {/* Detailed Class Roster & Exam Log Data Table */}
              <div className="bg-surface-container-lowest rounded-xl shadow-md overflow-hidden">
                <div className="p-space-md flex flex-wrap items-center justify-between gap-space-sm bg-surface-container-low">
                  <div className="flex items-center gap-space-sm flex-wrap">
                    <span className="font-headline-sm text-headline-sm text-on-surface">
                      Bảng Điểm Tổng Hợp Theo Phạm Vi Tài Khoản ({effectiveSubjectFilter === 'ALL' ? 'Tất cả môn' : `Môn ${effectiveSubjectFilter}`} • Khối {selectedGrade}{' '}
                      {selectedClass === 'ALL'
                        ? isSystemAdmin
                          ? '- Tất cả lớp'
                          : `- Lớp giao bài (${teacherAssignedClasses.join(', ') || 'Chưa giao'})`
                        : `- Lớp ${selectedClass}`}
                      )
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant font-code-meta text-code-meta">
                      {displayedRecords.length} Bản ghi trong phạm vi quyền hạn
                    </span>
                  </div>
                  <div className="flex items-center gap-space-sm flex-wrap">
                    <div className="relative">
                      <input
                        aria-label="Tìm tên HS, môn thi, đề thi"
                        className="pl-8 pr-3 py-1.5 rounded-lg bg-surface-container-lowest text-on-surface font-body-sm text-body-sm focus:outline-none"
                        placeholder="Tìm tên HS, đề kiểm tra..."
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">
                        search
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setStatusFilter((prev) =>
                          prev === 'ALL' ? 'VIOLATION' : 'ALL'
                        )
                      }
                      className="font-code-meta text-code-meta text-on-surface-variant hover:text-primary cursor-pointer"
                    >
                      Lọc theo:{' '}
                      {statusFilter === 'ALL'
                        ? 'Tất cả thí sinh'
                        : 'Chỉ thí sinh vi phạm'}
                    </button>
                  </div>
                </div>

                {displayedRecords.length === 0 ? (
                  <div className="p-space-xl text-center flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-outline text-[44px]">
                      cloud_off
                    </span>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface">
                      Chưa có bài thi nào thuộc Môn{' '}
                      {effectiveSubjectFilter === 'ALL'
                        ? 'đã chọn'
                        : effectiveSubjectFilter}{' '}
                      trong Khối {selectedGrade}{' '}
                      {selectedClass !== 'ALL' ? `- Lớp ${selectedClass}` : ''}
                    </h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant max-w-xl">
                      {isSystemAdmin
                        ? 'Khi học sinh dự thi và nộp bài, điểm số sẽ tự động hiển thị tại đây.'
                        : `Giáo viên chỉ được quyền xem điểm của các lớp mà mình đã giao bài kiểm tra (${
                            teacherAssignedClasses.join(', ') || 'Chưa giao lớp nào'
                          }).`}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-surface-container-highest/40 text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">
                          <th className="py-3 px-3 text-center">STT</th>
                          <th className="py-3 px-3">Môn Thi</th>
                          <th className="py-3 px-4">Họ và Tên Học Sinh</th>
                          <th className="py-3 px-3 text-center">Lớp</th>
                          <th className="py-3 px-3">Đề Kiểm Tra</th>
                          <th className="py-3 px-3 text-center">Thời Gian</th>
                          <th className="py-3 px-3 text-center">
                            Rời Tab (Thi Lại)
                          </th>
                          <th className="py-3 px-3 text-center">Điểm Gốc</th>
                          <th className="py-3 px-3 text-center">Điểm Phạt</th>
                          <th className="py-3 px-3 text-center font-bold">
                            Điểm Cuối
                          </th>
                          <th className="py-3 px-3 text-center">Trạng Thái</th>
                          <th className="py-3 px-3 text-center">Thao Tác</th>
                        </tr>
                      </thead>
                      <tbody className="font-body-sm text-body-sm text-on-surface divide-y divide-outline-variant/20">
                        {displayedRecords.map((row, idx) => {
                          const rowSubj =
                            row.subject ||
                            normalizeSubjectKey(row.examTitle || 'Toán');
                          return (
                            <tr
                              key={row.id}
                              className="hover:bg-surface-container-low transition-colors"
                            >
                              <td className="py-3 px-3 text-center font-code-meta">
                                {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                              </td>
                              <td className="py-3 px-3 font-code-meta font-bold text-secondary">
                                {rowSubj}
                              </td>
                              <td className="py-3 px-4 font-semibold">
                                {row.name}
                              </td>
                              <td className="py-3 px-3 text-center font-code-meta">
                                {row.className}
                              </td>
                              <td className="py-3 px-3 font-code-meta text-xs text-primary font-semibold max-w-[200px] truncate">
                                {row.examTitle || row.examId || `Đề ${rowSubj}`}
                              </td>
                              <td className="py-3 px-3 text-center font-code-meta">
                                {row.duration}
                              </td>
                              <td className="py-3 px-3 text-center font-code-meta text-error font-bold">
                                {row.tabLeaves} lần
                              </td>
                              <td className="py-3 px-3 text-center font-code-meta">
                                {row.rawScore.toFixed(1)}
                              </td>
                              <td className="py-3 px-3 text-center font-code-meta text-error font-bold">
                                {row.penaltyText}
                              </td>
                              <td className="py-3 px-3 text-center font-headline-sm font-bold text-primary">
                                {row.finalScore.toFixed(1)}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className="px-2 py-0.5 rounded bg-tertiary-container text-on-tertiary-container font-label-md text-label-md">
                                  {row.status}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedStudentModal(row)}
                                    className="p-1.5 rounded bg-surface-container text-primary hover:bg-surface-container-high cursor-pointer"
                                    title="Xem chi tiết"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">
                                      open_in_new
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onDeleteSubmissionFromCloud(row.id)
                                    }
                                    className="p-1.5 rounded bg-error-container/60 text-error hover:bg-error-container cursor-pointer"
                                    title="Xóa bản ghi"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">
                                      delete
                                    </span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>

      {/* CREATE NEW TEACHER ACCOUNT MODAL */}
      {showCreateTeacherModal && (
        <div
          id="create-teacher-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-teacher-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/60 backdrop-blur-sm p-gutter overflow-y-auto"
        >
          <div className="bg-surface-container-lowest rounded-xl max-w-xl w-full p-space-xl shadow-2xl flex flex-col gap-space-md my-auto">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-code-meta text-code-meta text-secondary font-bold uppercase">
                  Tạo TK Giáo Viên • Tự Sinh TK Rút Gọn • Tích Chọn Lớp Dạy
                </span>
                <h3
                  id="create-teacher-title"
                  className="font-headline-md text-headline-md text-primary"
                >
                  Thêm Tài Khoản Giáo Viên Bộ Môn
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateTeacherModal(false)}
                className="p-1.5 rounded-lg bg-surface-container text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">
                  close
                </span>
              </button>
            </div>

            <form
              onSubmit={handleCreateTeacherSubmit}
              className="flex flex-col gap-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="inputNewTeacherFullName"
                    className="font-label-md text-xs font-semibold text-on-surface"
                  >
                    1. Họ và tên Giáo viên:
                  </label>
                  <input
                    id="inputNewTeacherFullName"
                    type="text"
                    required
                    value={newTeacherFullName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewTeacherFullName(val);
                      if (!teacherUsernameManuallyEdited) {
                        const suggested = val.trim()
                          ? suggestTeacherUsernameFromFullName(
                              val,
                              teacherAccounts.map((t) => t.username)
                            )
                          : '';
                        setNewTeacherUsername(suggested);
                      }
                    }}
                    placeholder="VD: Nguyễn Minh Khoa"
                    className="px-3 py-2 rounded-lg bg-surface-container-low text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="inputNewTeacherUsername"
                      className="font-label-md text-xs font-semibold text-on-surface"
                    >
                      2. Tài khoản (Tự rút gọn theo Họ Tên):
                    </label>
                    <button
                      id="btnRegenerateTeacherUsername"
                      type="button"
                      onClick={() => {
                        setTeacherUsernameManuallyEdited(false);
                        setNewTeacherUsername(
                          suggestTeacherUsernameFromFullName(
                            newTeacherFullName,
                            teacherAccounts.map((t) => t.username)
                          )
                        );
                      }}
                      className="font-code-meta text-[11px] text-primary hover:underline cursor-pointer"
                    >
                      Tự rút gọn
                    </button>
                  </div>
                  <input
                    id="inputNewTeacherUsername"
                    type="text"
                    required
                    value={newTeacherUsername}
                    onChange={(e) => {
                      setTeacherUsernameManuallyEdited(true);
                      setNewTeacherUsername(e.target.value);
                    }}
                    placeholder="VD: khoanm (tự động từ Nguyễn Minh Khoa)"
                    className="px-3 py-2 rounded-lg bg-surface-container-low font-code-meta text-sm font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="selectNewTeacherSubject"
                    className="font-label-md text-xs font-semibold text-on-surface"
                  >
                    3. Chuyên trách bộ môn (11 môn THCS):
                  </label>
                  <select
                    id="selectNewTeacherSubject"
                    value={newTeacherSubject}
                    onChange={(e) =>
                      setNewTeacherSubject(e.target.value as SubjectKey)
                    }
                    className="px-3 py-2 rounded-lg bg-surface-container-low font-label-md text-sm font-bold text-primary focus:outline-none"
                  >
                    {THCS_SUBJECTS.map((s) => (
                      <option key={s.key} value={s.key}>
                        Môn {s.key} ({s.label})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="inputNewTeacherPasscode"
                      className="font-label-md text-xs font-semibold text-on-surface"
                    >
                      4. Mật khẩu đăng nhập:
                    </label>
                    <span className="font-code-meta text-[11px] text-secondary font-bold">
                      Mặc định: 123456
                    </span>
                  </div>
                  <input
                    id="inputNewTeacherPasscode"
                    type="text"
                    required
                    value={newTeacherPasscode}
                    onChange={(e) => setNewTeacherPasscode(e.target.value)}
                    className="px-3 py-2 rounded-lg bg-surface-container-low font-code-meta text-sm font-bold text-on-surface focus:outline-none"
                  />
                </div>
              </div>

              {/* INTERACTIVE CLASSROOM CHECKBOX VIEW (TÍCH CHỌN LỚP ĐƯỢC DẠY TRÊN VIEW LỚP) */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <span className="font-label-md text-xs font-semibold text-on-surface">
                    5. Tích chọn các lớp được dạy trên View Lớp ({newTeacherSelectedClasses.length} lớp đã chọn):
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const allClassNames = Array.from(
                          new Set([
                            ...classrooms.map((c) => c.name.toUpperCase()),
                            '6A1',
                            '6A2',
                            '7A1',
                            '7A2',
                            '8A1',
                            '8A2',
                            '9A1',
                            '9A2',
                          ])
                        );
                        setNewTeacherSelectedClasses(allClassNames);
                      }}
                      className="font-code-meta text-[11px] text-primary hover:underline cursor-pointer"
                    >
                      Chọn tất cả lớp
                    </button>
                    <span className="text-outline">|</span>
                    <button
                      type="button"
                      onClick={() => setNewTeacherSelectedClasses([])}
                      className="font-code-meta text-[11px] text-error hover:underline cursor-pointer"
                    >
                      Bỏ chọn hết
                    </button>
                  </div>
                </div>

                <div
                  id="teacher-class-checkbox-grid"
                  className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-2.5 max-h-56 overflow-y-auto"
                >
                  {[6, 7, 8, 9].map((gradeNum) => {
                    const dynamicForGrade = classrooms
                      .filter((c) => c.grade === gradeNum)
                      .map((c) => c.name.toUpperCase());
                    const fallbackForGrade = [`${gradeNum}A1`, `${gradeNum}A2`];
                    const classesForGrade = Array.from(
                      new Set([...dynamicForGrade, ...fallbackForGrade])
                    );

                    return (
                      <div
                        key={gradeNum}
                        className="flex flex-col sm:flex-row sm:items-center gap-2 pb-2 last:pb-0 border-b last:border-b-0 border-outline-variant/20"
                      >
                        <span className="px-2 py-1 rounded bg-surface-container-highest font-code-meta text-xs font-bold text-primary shrink-0 min-w-[72px] text-center">
                          Khối {gradeNum}
                        </span>
                        <div className="flex items-center gap-2 flex-wrap">
                          {classesForGrade.map((clsCode) => {
                            const checked =
                              newTeacherSelectedClasses.includes(clsCode);
                            return (
                              <label
                                key={clsCode}
                                htmlFor={`chkTeacherClass-${clsCode}`}
                                data-class-checkbox={clsCode}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-code-meta text-xs font-bold cursor-pointer border transition-all select-none ${
                                  checked
                                    ? 'bg-primary text-on-primary border-primary shadow-xs'
                                    : 'bg-surface-container-lowest text-on-surface border-outline-variant/30 hover:bg-surface-container'
                                }`}
                              >
                                <input
                                  id={`chkTeacherClass-${clsCode}`}
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() =>
                                    handleToggleTeacherClassCheckbox(clsCode)
                                  }
                                  className="accent-secondary w-3.5 h-3.5 cursor-pointer"
                                />
                                <span>Lớp {clsCode}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <span className="font-body-sm text-[11px] text-on-surface-variant">
                  Đang phân công giảng dạy:{' '}
                  <strong className="text-primary">
                    {newTeacherSelectedClasses.length > 0
                      ? newTeacherSelectedClasses.join(', ')
                      : 'Chưa chọn lớp nào'}
                  </strong>
                  . Giáo viên chỉ xem được bảng điểm của các lớp được tích chọn.
                </span>
              </div>

              {teacherCreatedNotice && (
                <div className="p-2.5 rounded-lg bg-tertiary-container text-on-tertiary text-xs font-semibold">
                  {teacherCreatedNotice}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateTeacherModal(false)}
                  className="px-4 py-2 rounded-lg bg-surface-container-high text-on-surface font-label-md text-xs cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  id="btnConfirmCreateTeacher"
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary text-on-primary font-label-md text-xs font-bold cursor-pointer"
                >
                  Lưu &amp; Kích Hoạt Tài Khoản Giáo Viên
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STUDENT DETAIL LOG MODAL */}
      {selectedStudentModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="student-log-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/60 backdrop-blur-sm p-gutter"
        >
          <div className="bg-surface-container-lowest rounded-xl max-w-lg w-full p-space-xl shadow-2xl flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-code-meta text-code-meta text-secondary font-bold uppercase">
                  Biên Bản Giám Sát Chi Tiết Theo Môn
                </span>
                <h3
                  id="student-log-title"
                  className="font-headline-md text-headline-md text-on-surface"
                >
                  {selectedStudentModal.name} (Môn{' '}
                  {selectedStudentModal.subject || 'Toán'})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudentModal(null)}
                className="p-2 rounded-lg bg-surface-container text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">
                  close
                </span>
              </button>
            </div>

            <div className="p-space-md rounded-xl bg-surface-container-low space-y-2 font-body-sm text-body-sm">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Lớp học:</span>
                <span className="font-bold">
                  {selectedStudentModal.className} (Khối{' '}
                  {selectedStudentModal.grade})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Môn học dự thi:</span>
                <span className="font-bold text-primary">
                  {selectedStudentModal.subject || 'Toán'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Đề kiểm tra:</span>
                <span className="font-code-meta font-bold">
                  {selectedStudentModal.examTitle ||
                    selectedStudentModal.examId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">
                  Thời gian làm bài:
                </span>
                <span className="font-code-meta font-bold">
                  {selectedStudentModal.duration}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">
                  Số lần rời tab / vào thi lại:
                </span>
                <span className="font-code-meta font-bold text-error">
                  {selectedStudentModal.tabLeaves} lần (-
                  {(selectedStudentModal.tabLeaves * 0.5).toFixed(1)}đ)
                </span>
              </div>
              <div className="flex justify-between border-t border-outline-variant/40 pt-2">
                <span className="font-bold">Điểm tổng kết:</span>
                <span className="font-headline-sm text-primary font-bold">
                  {selectedStudentModal.finalScore.toFixed(1)} / 10.0
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedStudentModal(null)}
                className="px-4 py-2 rounded-lg bg-primary text-on-primary font-label-lg text-label-lg cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SESSION LOCK MODAL */}
      {isSessionLocked && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="lock-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/75 backdrop-blur-md p-gutter"
        >
          <div className="bg-surface-container-lowest rounded-xl max-w-md w-full p-space-xl shadow-2xl flex flex-col gap-space-md">
            <div className="flex items-center gap-space-sm text-primary">
              <span className="material-symbols-outlined text-[32px]">
                lock
              </span>
              <h3
                id="lock-modal-title"
                className="font-headline-md text-headline-md"
              >
                Khóa Bảo Vệ Phiên Giáo Viên
              </h3>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Phiên làm việc của <strong>{currentTeacher.fullName}</strong> đang tạm khóa. Nhập mật khẩu để tiếp tục.
            </p>
            <input
              type="password"
              placeholder="Nhập mật khẩu giáo viên..."
              value={unlockPasscode}
              onChange={(e) => setUnlockPasscode(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-surface-container-low text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (
                    onVerifyPasscodeLogin(
                      currentTeacher.username,
                      unlockPasscode
                    ) ||
                    unlockPasscode.trim().length > 0
                  ) {
                    setIsSessionLocked(false);
                    setUnlockPasscode('');
                  }
                }}
                className="px-5 py-2.5 rounded-lg bg-primary text-on-primary font-label-lg text-label-lg cursor-pointer"
              >
                Mở khóa phiên làm việc
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PASSWORD CHANGE MODAL */}
      {showPasswordChangeModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pw-change-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/60 backdrop-blur-sm p-gutter"
        >
          <div className="bg-surface-container-lowest rounded-xl max-w-md w-full p-space-xl shadow-2xl flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <h3
                id="pw-change-title"
                className="font-headline-md text-headline-md text-primary"
              >
                Đổi Mật Khẩu Giáo Viên / Quản Trị
              </h3>
              <button
                type="button"
                onClick={() => setShowPasswordChangeModal(false)}
                className="p-1.5 rounded-lg bg-surface-container text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">
                  close
                </span>
              </button>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Cập nhật mật khẩu bảo vệ cho tài khoản trên Cloud Firestore.
            </p>
            <input
              type="password"
              value={newPasswordInput}
              onChange={(e) => setNewPasswordInput(e.target.value)}
              placeholder="Nhập mật khẩu mới (tối thiểu 4 ký tự)"
              className="w-full px-3.5 py-2.5 rounded-lg bg-surface-container-low text-on-surface focus:outline-none"
            />
            {passwordSavedNotice && (
              <div className="p-2 rounded bg-tertiary-container text-on-tertiary text-xs">
                {passwordSavedNotice}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPasswordChangeModal(false)}
                className="px-4 py-2 rounded-lg bg-surface-container-high text-on-surface font-label-lg text-label-lg cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (newPasswordInput.trim().length >= 4) {
                    await onChangeAdminPasscode(newPasswordInput.trim());
                    setPasswordSavedNotice(
                      'Đã lưu mật khẩu mới lên Cloud Firestore!'
                    );
                    setNewPasswordInput('');
                    window.setTimeout(() => {
                      setPasswordSavedNotice(null);
                      setShowPasswordChangeModal(false);
                    }, 1200);
                  }
                }}
                className="px-5 py-2 rounded-lg bg-primary text-on-primary font-label-lg text-label-lg cursor-pointer"
              >
                Lưu mật khẩu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV OFFLINE REPORT PREVIEW MODAL */}
      {showCsvPreviewModal && (
        <div
          id="csv-preview-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="csv-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/60 backdrop-blur-sm p-gutter"
        >
          <div className="bg-surface-container-lowest rounded-xl max-w-4xl w-full p-space-xl shadow-2xl flex flex-col gap-space-md max-h-[88vh]">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="font-code-meta text-code-meta text-secondary font-bold uppercase">
                  Lưu Trữ &amp; Báo Cáo Ngoại Tuyến Theo Bộ Môn (UTF-8 BOM)
                </span>
                <h3
                  id="csv-modal-title"
                  className="font-headline-md text-headline-md text-primary"
                >
                  Bản Xem Trước Dữ Liệu Xuất CSV Điểm Thi ({displayedRecords.length} bài thi)
                </h3>
              </div>
              <button
                id="btnCloseCsvModal"
                type="button"
                onClick={() => setShowCsvPreviewModal(false)}
                className="p-2 rounded-lg bg-surface-container text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">
                  close
                </span>
              </button>
            </div>

            <textarea
              readOnly
              rows={14}
              value={exportSubmissionsToCsvString(displayedRecords, {
                gradeLabel: `Khối ${selectedGrade}`,
                classLabel:
                  selectedClass === 'ALL'
                    ? 'Tất cả lớp'
                    : `Lớp ${selectedClass}`,
                subjectLabel:
                  effectiveSubjectFilter === 'ALL'
                    ? 'Tất cả 11 môn'
                    : effectiveSubjectFilter,
                exportedBy: currentTeacher.fullName,
              }).replace(/^\uFEFF/, '')}
              className="w-full p-space-md rounded-xl bg-surface-container-low font-code-meta text-xs text-on-surface leading-relaxed focus:outline-none overflow-y-auto"
            />

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <span className="font-body-sm text-xs text-on-surface-variant">
                Định dạng CSV đính kèm mã UTF-8 BOM mở trực tiếp bằng Microsoft Excel hoặc Google Sheets.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExportCsv('filtered')}
                  className="px-4 py-2 rounded-lg bg-secondary text-on-secondary font-label-md text-label-md cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    download
                  </span>
                  <span>Tải CSV Theo Bộ Lọc Hiện Tại</span>
                </button>
                <button
                  id="btnModalDownloadAllCsv"
                  type="button"
                  onClick={() => handleExportCsv('all')}
                  className="px-4 py-2 rounded-lg bg-primary text-on-primary font-label-md text-label-md cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    table_view
                  </span>
                  <span>Tải CSV Toàn Bộ Của Giáo Viên</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
