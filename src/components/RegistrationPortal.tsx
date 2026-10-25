import React, { useState } from 'react';
import {
  checkExamScheduleStatus,
  ExamBankData,
  filterExamsForStudentSubject,
  filterSubmissionsForStudent,
  formatExamScheduleWindow,
  formatTimer,
  getStudentScheduleReminders,
  getSubjectMeta,
  normalizeSubjectKey,
  ScreenId,
  StudentAccount,
  StudentRecord,
  StudentRegistration,
  SubjectKey,
  THCS_SUBJECTS,
} from '../utils/examLogic';

const STUDENT_PHOTO_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDY6z57xZHKdrRzl4GFGElfbAZG0Nj3wO4M9VOMfntGQbsK-sQyCKcNtmnBGP2vQpSMfNSyyhV5kvvNUicYq-pnN-tC3jXKgWuUtVXrPgO09vxJdbrYMdzSk7-fxiUYTQePKIsFN1gLaekFEvPwHZdhrLzgnEQcJCgWOvbRliC9ApxpfmaOK0UQR_KCRYzCfdfH7JJ6WvIPpltsc5ydUyhhqXp8s-7Lppi8V6mT89FG-UZMa2Lgq8oB';

const EXAM_ROOM_PHOTO_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDC8_69Ey9lrqkrpOIsPHiEI2n0ksBRacPmx9-5fWAQ93_R5hhUDaWHQesLf7ki1IPz8POAQWxkzATUNcZ047ozkz_gfSEa5kiYoCWCG0F8ljJWkaUxkPFjmwciZVF63GHw8jl7XtnMCj0rnJbJ4AjBHBbFsvWrwv_y6D6Ep9JrhD4s3lx1480YvUliFYRwG2Zznf8kiwkz04fNUnwTpW8c6Y4VDd9-klGF78Vq1FTgUqgfstCTxseJ';

export interface InterruptedSessionInfo {
  remainingSeconds: number;
  tabViolations: number;
  kickedOutAt: string;
  answeredCount: number;
}

interface RegistrationPortalProps {
  registration: StudentRegistration;
  onUpdateRegistration: (next: StudentRegistration) => void;
  loggedInStudent: StudentAccount | null;
  studentAccounts: StudentAccount[];
  onStudentLogin: (
    username: string,
    password: string
  ) => StudentAccount | null | boolean;
  onStudentLogout: () => void;
  cloudExams: ExamBankData[];
  activeExam: ExamBankData;
  availableExamsForGradeAndSubject: ExamBankData[];
  onSelectExamId: (examId: string) => void;
  interruptedSession: InterruptedSessionInfo | null;
  onStartExam: (examOverride?: ExamBankData) => void;
  onResumeInterruptedExam: () => void;
  cloudSubmissions: StudentRecord[];
  onNavigate: (screen: ScreenId) => void;
}

type StudentMainTab = 'chon-mon-thi' | 'ket-qua-cua-em';

export const RegistrationPortal: React.FC<RegistrationPortalProps> = ({
  registration,
  onUpdateRegistration,
  loggedInStudent,
  studentAccounts,
  onStudentLogin,
  onStudentLogout,
  cloudExams,
  activeExam,
  availableExamsForGradeAndSubject,
  onSelectExamId,
  interruptedSession,
  onStartExam,
  onResumeInterruptedExam,
  cloudSubmissions,
  onNavigate,
}) => {
  // Student Password Login Gate state
  const [loginUsername, setLoginUsername] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showRosterHint, setShowRosterHint] = useState<boolean>(true);

  // Student Main Screen state
  const [activeStudentTab, setActiveStudentTab] =
    useState<StudentMainTab>('chon-mon-thi');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingExamForModal, setPendingExamForModal] =
    useState<ExamBankData | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [dismissedToast, setDismissedToast] = useState(false);
  const [showAllScheduleReminders, setShowAllScheduleReminders] =
    useState(false);

  const studentGrade = loggedInStudent?.grade || registration.grade;
  const studentClassCode =
    loggedInStudent?.studentClass || registration.studentClass;

  const selectedSubjectMeta = getSubjectMeta(
    registration.selectedSubject || 'Tin'
  );

  // Strictly filter exams for the student's exact Grade & Class (e.g., 6A1 only receives Grade 6 exams)
  const subjectExamCards = filterExamsForStudentSubject(
    cloudExams,
    registration.selectedSubject,
    studentGrade,
    studentClassCode
  );

  // Total exams across all 11 subjects strictly for the student's grade & class
  const totalExamsForStudentGrade = cloudExams.filter((ex) => {
    if (ex.grade !== studentGrade) return false;
    if (
      Array.isArray(ex.assignedClasses) &&
      ex.assignedClasses.length > 0 &&
      !ex.assignedClasses.includes('ALL')
    ) {
      return ex.assignedClasses
        .map((c) => c.trim().toUpperCase())
        .includes(studentClassCode.trim().toUpperCase());
    }
    return true;
  }).length;

  // Submissions belonging to the logged-in student
  const studentPersonalSubmissions = filterSubmissionsForStudent(
    cloudSubmissions,
    loggedInStudent
  );

  // Upcoming & active exam schedule reminders based on startAt and endAt for the student's class
  const studentScheduleReminders = loggedInStudent
    ? getStudentScheduleReminders(cloudExams, {
        grade: loggedInStudent.grade,
        studentClass: loggedInStudent.studentClass,
      })
    : [];
  const upcomingRemindersCount = studentScheduleReminders.filter(
    (r) => r.status === 'upcoming'
  ).length;
  const activeRemindersCount = studentScheduleReminders.filter(
    (r) => r.status === 'closing-soon' || r.status === 'open'
  ).length;
  const topToastReminder =
    studentScheduleReminders.find((r) => r.status === 'upcoming') ||
    studentScheduleReminders[0] ||
    null;

  const handleStudentLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername.trim() || !loginPassword.trim()) {
      setLoginError(
        'Vui lòng nhập đầy đủ Tài khoản học sinh và Mật khẩu đã được nhà trường cấp!'
      );
      return;
    }
    const ok = onStudentLogin(loginUsername, loginPassword);
    if (!ok) {
      setLoginError(
        'Tài khoản hoặc mật khẩu học sinh không chính xác! Vui lòng kiểm tra lại trong danh sách cấp phát.'
      );
    } else {
      setLoginError(null);
      setLoginPassword('');
    }
  };

  const handleSelectSubject = (subjKey: SubjectKey) => {
    const subjMeta = getSubjectMeta(subjKey);
    const cls = registration.studentClass.trim() || `${registration.grade}A1`;
    const baseIdentifier =
      loggedInStudent?.username || registration.studentUsername || cls;
    onUpdateRegistration({
      ...registration,
      selectedSubject: subjKey,
      sbd: `${baseIdentifier}-${subjMeta.codePrefix}`,
    });
    const matchingExams = filterExamsForStudentSubject(
      cloudExams,
      subjKey,
      studentGrade,
      studentClassCode
    );
    if (matchingExams.length > 0) {
      onSelectExamId(matchingExams[0].id);
    }
    setValidationError(null);
  };

  const handlePickExamCardToEnter = (examItem: ExamBankData) => {
    onSelectExamId(examItem.id);
    const sched = checkExamScheduleStatus(examItem);
    if (!sched.canTake) {
      setValidationError(
        `Đề thi "${examItem.title}" hiện chưa thể vào thi: ${sched.label}`
      );
      return;
    }
    if (!registration.honorCommitted) {
      onUpdateRegistration({
        ...registration,
        honorCommitted: true,
      });
    }
    setValidationError(null);
    if (interruptedSession) {
      onResumeInterruptedExam();
      return;
    }
    setPendingExamForModal(examItem);
    setShowConfirmModal(true);
  };

  const handleEnterExamRoom = () => {
    const targetExam = pendingExamForModal || activeExam;
    setIsInitializing(true);
    setTimeout(() => {
      setIsInitializing(false);
      setShowConfirmModal(false);
      onStartExam(targetExam);
    }, 200);
  };

  const modalExam = pendingExamForModal || activeExam;
  const totalQuestionCount = (modalExam?.questions?.length || 10) + 2;

  // ============================================================================
  // GATE 1: STUDENT PASSWORD LOGIN SCREEN (IF NOT LOGGED IN)
  // ============================================================================
  if (!loggedInStudent) {
    return (
      <div className="flex flex-col w-full">
        {/* Top Academic Banner */}
        <div className="relative w-full bg-surface-container-high px-gutter py-space-xl overflow-hidden shadow-sm">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-space-lg relative z-10">
            <div className="flex flex-col gap-space-xs max-w-3xl">
              <div className="flex items-center gap-space-sm flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-on-primary font-label-md text-label-md">
                  <span className="material-symbols-outlined text-[14px]">
                    school
                  </span>
                  CỔNG ĐĂNG NHẬP HỌC SINH THCS (KHỐI 6 - 9)
                </span>
                <span className="px-3 py-1 rounded-full bg-surface-container text-on-surface-variant font-code-meta text-code-meta">
                  XÁC THỰC TÀI KHOẢN &amp; MẬT KHẨU HỌC SINH
                </span>
              </div>
              <h1 className="font-headline-lg text-headline-lg text-primary tracking-tight mt-1">
                Đăng Nhập Hệ Thống Thi &amp; Kiểm Tra Trực Tuyến Học Sinh
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Học sinh đăng nhập bằng <strong>Tài khoản</strong> và{' '}
                <strong>Mật khẩu</strong> do Quản trị nhà trường cấp theo lớp học
                để vào màn hình chính chọn môn thi, chọn đề thi của các thầy cô
                và xem kết quả kiểm tra.
              </p>
            </div>

            <div className="flex items-center gap-space-sm bg-surface-container-lowest/90 p-space-md rounded-xl shadow-sm">
              <span className="material-symbols-outlined text-primary text-[32px]">
                verified_user
              </span>
              <div className="flex flex-col">
                <span className="font-label-md text-xs text-on-surface-variant">
                  Danh sách học sinh đã cấp
                </span>
                <span className="font-headline-sm text-headline-sm text-primary">
                  {studentAccounts.length} Tài Khoản Học Sinh
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Login & Student Account Lookup Grid */}
        <div className="max-w-7xl mx-auto w-full px-gutter py-space-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
            {/* LEFT: STUDENT PASSWORD LOGIN FORM (5 COLS) */}
            <div className="lg:col-span-5 bg-surface-container-lowest rounded-xl p-space-xl shadow-lg border border-outline-variant/30 flex flex-col gap-space-md">
              <div className="flex items-center gap-space-sm">
                <div className="w-12 h-12 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-md">
                  <span className="material-symbols-outlined text-[28px]">
                    lock_person
                  </span>
                </div>
                <div>
                  <span className="font-code-meta text-xs text-secondary font-bold uppercase">
                    Xác Thực Thí Sinh Dự Thi
                  </span>
                  <h2 className="font-headline-md text-headline-md text-on-surface">
                    Đăng Nhập Học Sinh
                  </h2>
                </div>
              </div>

              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Nhập đúng <strong>Tài khoản</strong> và <strong>Mật khẩu</strong>{' '}
                học sinh để mở màn hình chính lựa chọn môn học và đề kiểm tra.
              </p>

              <form
                id="studentLoginForm"
                onSubmit={handleStudentLoginSubmit}
                className="flex flex-col gap-space-md mt-1"
                noValidate
              >
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="studentLoginUsername"
                    className="font-label-lg text-label-lg text-on-surface flex items-center gap-1"
                  >
                    <span>1. Tài khoản học sinh</span>
                    <span className="text-error">*</span>
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-3 text-primary text-[20px]">
                      person
                    </span>
                    <input
                      id="studentLoginUsername"
                      type="text"
                      required
                      value={loginUsername}
                      onChange={(e) => {
                        setLoginUsername(e.target.value);
                        setLoginError(null);
                      }}
                      placeholder="VD: hs.an9a1, hs.binh9a1, hs.minh9a2..."
                      className="w-full bg-surface-container-low text-on-surface rounded-lg pl-10 pr-4 py-3 font-code-meta text-sm font-bold focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="studentLoginPassword"
                    className="font-label-lg text-label-lg text-on-surface flex items-center gap-1"
                  >
                    <span>2. Mật khẩu đăng nhập</span>
                    <span className="text-error">*</span>
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-3 text-secondary text-[20px]">
                      key
                    </span>
                    <input
                      id="studentLoginPassword"
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => {
                        setLoginPassword(e.target.value);
                        setLoginError(null);
                      }}
                      placeholder="Nhập mật khẩu học sinh (VD: 123456)"
                      className="w-full bg-surface-container-low text-on-surface rounded-lg pl-10 pr-4 py-3 font-code-meta text-sm focus:outline-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                {loginError && (
                  <div
                    role="alert"
                    id="student-login-error"
                    className="p-space-sm rounded-lg bg-error-container text-on-error-container font-body-sm text-body-sm flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      error
                    </span>
                    <span>{loginError}</span>
                  </div>
                )}

                <button
                  id="btnSubmitStudentLogin"
                  type="submit"
                  className="w-full py-3.5 px-space-lg rounded-xl bg-primary text-on-primary hover:bg-primary-container font-headline-sm text-headline-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <span className="material-symbols-outlined text-[22px]">
                    login
                  </span>
                  <span>ĐĂNG NHẬP VÀO MÀN HÌNH CHÍNH HỌC SINH</span>
                </button>
              </form>

              <div className="p-3 rounded-xl bg-surface-container-low text-xs text-on-surface-variant flex items-start gap-2">
                <span className="material-symbols-outlined text-primary text-[18px] mt-0.5">
                  info
                </span>
                <span>
                  Nếu chưa có tài khoản hoặc quên mật khẩu, học sinh liên hệ Quản
                  trị viên nhà trường tại mục{' '}
                  <strong>Khu Vực Quản Trị → Quản Lý Lớp &amp; TK Học Sinh</strong>.
                </span>
              </div>
            </div>

            {/* RIGHT: ISSUED STUDENT ACCOUNTS REFERENCE TABLE (7 COLS) */}
            <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl p-space-xl shadow-md border border-outline-variant/30 flex flex-col gap-space-md">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-code-meta text-xs text-secondary font-bold uppercase">
                    Danh Sách Tài Khoản Học Sinh Đã Cấp Theo Lớp Học
                  </span>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">
                    Tra Cứu Thông Tin Tài Khoản Học Sinh ({studentAccounts.length} học sinh)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRosterHint((prev) => !prev)}
                  className="px-3 py-1.5 rounded-lg bg-surface-container text-primary font-label-md text-xs font-bold cursor-pointer"
                >
                  {showRosterHint ? 'Thu gọn danh sách' : 'Hiển thị danh sách'}
                </button>
              </div>

              {showRosterHint && (
                <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container-highest/50 text-on-surface-variant font-label-md text-xs uppercase">
                        <th className="py-2.5 px-3">Họ và Tên</th>
                        <th className="py-2.5 px-3 text-center">Ngày Sinh</th>
                        <th className="py-2.5 px-3 text-center">Lớp</th>
                        <th className="py-2.5 px-3">Tài Khoản</th>
                        <th className="py-2.5 px-3">Mật Khẩu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/20 font-body-sm text-xs">
                      {studentAccounts.map((stu) => (
                        <tr
                          key={stu.id}
                          className="hover:bg-surface-container-low transition-colors"
                        >
                          <td className="py-2.5 px-3 font-semibold text-on-surface">
                            {stu.fullName}
                          </td>
                          <td className="py-2.5 px-3 text-center font-code-meta text-on-surface-variant">
                            {stu.dateOfBirth}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="px-2 py-0.5 rounded bg-primary-fixed text-on-primary-fixed font-code-meta font-bold">
                              {stu.studentClass}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-code-meta font-bold text-primary">
                            {stu.username}
                          </td>
                          <td className="py-2.5 px-3 font-code-meta text-secondary font-bold">
                            {stu.password}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // GATE 2: STUDENT MAIN DASHBOARD SCREEN (AFTER PASSWORD LOGIN)
  // ============================================================================
  return (
    <div className="flex flex-col w-full">
      {/* Top Logged-in Student Profile & Navigation Banner */}
      <div className="relative w-full bg-surface-container-high px-gutter py-space-lg overflow-hidden shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-space-md relative z-10">
          <div className="flex items-center gap-space-md">
            <div className="w-16 h-16 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-md border-2 border-primary-container shrink-0">
              <span className="material-symbols-outlined text-[34px]">
                school
              </span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-primary text-on-primary font-code-meta text-xs font-bold">
                  LỚP {loggedInStudent.studentClass} • KHỐI{' '}
                  {loggedInStudent.grade}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-code-meta text-xs font-bold">
                  TK: {loggedInStudent.username}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-surface-container-lowest text-on-surface-variant font-code-meta text-xs">
                  Ngày sinh: {loggedInStudent.dateOfBirth}
                </span>
              </div>
              <h1 className="font-headline-md text-headline-md text-primary mt-1">
                Xin chào học sinh: {loggedInStudent.fullName}
              </h1>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Màn hình chính học sinh: Chọn môn học để hiển thị danh sách đề thi của các thầy cô hoặc xem kết quả thi, kiểm tra.
              </p>
            </div>
          </div>

          {/* Main Student Screen Tabs + Logout Button */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-surface-container-lowest p-1.5 rounded-xl shadow-sm">
              <button
                id="btnTabStudentSelectSubject"
                type="button"
                onClick={() => setActiveStudentTab('chon-mon-thi')}
                className={`px-3.5 py-2 rounded-lg font-label-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                  activeStudentTab === 'chon-mon-thi'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  grid_view
                </span>
                <span>
                  1. Chọn Môn &amp; Đề Thi Khối {loggedInStudent.grade} (
                  {totalExamsForStudentGrade} đề)
                </span>
              </button>

              <button
                id="btnTabStudentViewResults"
                type="button"
                onClick={() => setActiveStudentTab('ket-qua-cua-em')}
                className={`px-3.5 py-2 rounded-lg font-label-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                  activeStudentTab === 'ket-qua-cua-em'
                    ? 'bg-secondary text-on-secondary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  fact_check
                </span>
                <span>
                  2. Xem Kết Quả Thi, Kiểm Tra ({studentPersonalSubmissions.length})
                </span>
              </button>
            </div>

            <button
              id="btnLogoutStudent"
              type="button"
              onClick={onStudentLogout}
              className="px-3.5 py-2.5 rounded-xl bg-error text-on-error hover:bg-error/90 font-label-md text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">
                logout
              </span>
              <span>Đăng xuất TK Học sinh</span>
            </button>
          </div>
        </div>
      </div>

      {/* INTERRUPTED EXAM BANNER (IF STUDENT SWITCHED TABS AND ROOM WAS CLOSED) */}
      {interruptedSession && (
        <div className="max-w-7xl mx-auto w-full px-gutter pt-space-lg">
          <div
            role="alert"
            id="interrupted-session-banner"
            className="bg-error-container text-on-error-container rounded-xl p-space-lg shadow-lg border-2 border-error flex flex-col lg:flex-row items-start lg:items-center justify-between gap-space-md"
          >
            <div className="flex items-start gap-space-md">
              <div className="w-12 h-12 rounded-xl bg-error text-on-error flex items-center justify-center shrink-0 shadow-md">
                <span className="material-symbols-outlined text-[28px] animate-bounce">
                  lock_reset
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded bg-error text-on-error font-code-meta text-code-meta font-bold uppercase">
                    PHÒNG THI ĐÃ TỰ ĐỘNG ĐÓNG DO CHUYỂN TAB / RỜI MÀN HÌNH
                  </span>
                  <span className="font-code-meta text-code-meta font-bold">
                    Lúc: {interruptedSession.kickedOutAt}
                  </span>
                </div>
                <h2 className="font-headline-sm text-headline-sm text-on-error-container">
                  Thí sinh {loggedInStudent.fullName} (Môn{' '}
                  {registration.selectedSubject} - Lớp{' '}
                  {loggedInStudent.studentClass}) bắt buộc phải vào lại phòng
                  thi!
                </h2>
                <p className="font-body-sm text-body-sm text-on-error-container/90">
                  Hệ thống đã đóng phòng thi trực tuyến và bảo lưu thời điểm làm
                  bài tại{' '}
                  <strong className="underline">
                    {formatTimer(interruptedSession.remainingSeconds)}
                  </strong>{' '}
                  (Đã lưu {interruptedSession.answeredCount}/{totalQuestionCount}{' '}
                  câu). Mỗi lần mở lại phòng thi bị trừ <strong>0.5 điểm</strong>{' '}
                  (Hiện tại: {interruptedSession.tabViolations} lần vi phạm ={' '}
                  <strong>
                    -{(interruptedSession.tabViolations * 0.5).toFixed(1)} điểm
                  </strong>
                  ).
                </p>
              </div>
            </div>

            <button
              type="button"
              id="btnResumeInterruptedExam"
              onClick={onResumeInterruptedExam}
              className="px-space-lg py-3.5 rounded-xl bg-error text-on-error hover:bg-error/90 font-headline-sm text-headline-sm shadow-md flex items-center gap-2 shrink-0 cursor-pointer transition-transform active:scale-95"
            >
              <span className="material-symbols-outlined text-[22px]">
                replay
              </span>
              <span>
                VÀO LẠI PHÒNG THI (
                {formatTimer(interruptedSession.remainingSeconds)} • -0.5Đ)
              </span>
            </button>
          </div>
        </div>
      )}

      {/* UPCOMING & ACTIVE EXAM SCHEDULE REMINDER BANNER (BASED ON startAt & endAt FOR STUDENT'S CLASS) */}
      {studentScheduleReminders.length > 0 && (
        <div className="max-w-7xl mx-auto w-full px-gutter pt-space-lg">
          <div
            id="student-exam-schedule-reminder-banner"
            role="region"
            aria-label="Thông báo lịch kiểm tra sắp tới và đang mở"
            className="bg-surface-container-lowest rounded-xl p-space-lg shadow-md border-l-4 border-primary flex flex-col gap-space-md"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary-fixed text-on-primary-fixed flex items-center justify-center shrink-0 shadow-sm">
                  <span className="material-symbols-outlined text-[24px]">
                    notifications_active
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full bg-primary text-on-primary font-code-meta text-xs font-bold uppercase">
                      NHẮC LỊCH KIỂM TRA LỚP {loggedInStudent.studentClass}
                    </span>
                    {upcomingRemindersCount > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-code-meta text-xs font-bold">
                        {upcomingRemindersCount} bài sắp diễn ra
                      </span>
                    )}
                    {activeRemindersCount > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-code-meta text-xs font-bold">
                        {activeRemindersCount} bài đang mở ca thi
                      </span>
                    )}
                  </div>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface mt-0.5">
                    Lịch Thi &amp; Bài Kiểm Tra Được Giao Cho Lớp{' '}
                    {loggedInStudent.studentClass} (Theo Khung Giờ Mở/Đóng Đề)
                  </h2>
                </div>
              </div>

              {studentScheduleReminders.length > 3 && (
                <button
                  id="btnToggleAllScheduleReminders"
                  type="button"
                  onClick={() => setShowAllScheduleReminders((prev) => !prev)}
                  className="px-3 py-1.5 rounded-lg bg-surface-container text-primary font-label-md text-xs font-bold cursor-pointer hover:bg-surface-container-high"
                >
                  {showAllScheduleReminders
                    ? 'Thu gọn lịch nhắc'
                    : `Xem tất cả (${studentScheduleReminders.length} lịch thi)`}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(showAllScheduleReminders
                ? studentScheduleReminders
                : studentScheduleReminders.slice(0, 3)
              ).map((item) => {
                const subjKey = normalizeSubjectKey(
                  item.exam.subjectCode || item.exam.subject
                );
                const isUpcoming = item.status === 'upcoming';
                const isClosingSoon = item.status === 'closing-soon';

                return (
                  <div
                    key={item.exam.id}
                    data-reminder-exam-id={item.exam.id}
                    data-reminder-status={item.status}
                    className={`rounded-xl p-3.5 border flex flex-col justify-between gap-2.5 transition-all ${
                      isUpcoming
                        ? 'bg-secondary-fixed/25 border-secondary/40'
                        : isClosingSoon
                        ? 'bg-error-container/20 border-error/40'
                        : 'bg-surface-container-low border-outline-variant/30'
                    }`}
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-1.5 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded font-code-meta text-[11px] font-bold uppercase ${
                            isUpcoming
                              ? 'bg-secondary text-on-secondary'
                              : isClosingSoon
                              ? 'bg-error text-on-error'
                              : 'bg-primary text-on-primary'
                          }`}
                        >
                          {item.badgeLabel} • MÔN {subjKey.toUpperCase()}
                        </span>
                        <span className="font-code-meta text-[11px] font-bold text-primary">
                          {item.countdownText}
                        </span>
                      </div>

                      <h3 className="font-label-lg text-sm font-bold text-on-surface line-clamp-1 mt-0.5">
                        {item.exam.title}
                      </h3>

                      <div className="font-code-meta text-[11px] text-on-surface-variant flex flex-col gap-0.5 mt-0.5">
                        <span>
                          • Mở đề (startAt):{' '}
                          <strong className="text-on-surface">
                            {item.startFormatted}
                          </strong>
                        </span>
                        <span>
                          • Đóng đề (endAt):{' '}
                          <strong className="text-on-surface">
                            {item.endFormatted}
                          </strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-outline-variant/20">
                      <span className="font-body-sm text-[11px] text-on-surface-variant truncate">
                        GV: {item.exam.teacherName || item.exam.createdBy || 'Hội đồng THCS'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveStudentTab('chon-mon-thi');
                          handleSelectSubject(subjKey);
                          onSelectExamId(item.exam.id);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-primary text-on-primary font-label-md text-[11px] font-bold cursor-pointer hover:bg-primary-container shrink-0"
                      >
                        {isUpcoming ? 'Xem môn thi' : 'Chọn đề ngay'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* FLOATING REMINDER TOAST NOTIFICATION FOR STUDENT (startAt / endAt) */}
      {!dismissedToast && topToastReminder && (
        <div
          id="student-exam-schedule-toast"
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-40 max-w-md w-[calc(100%-2.5rem)] bg-surface-container-lowest text-on-surface rounded-2xl p-4 shadow-2xl border-2 border-primary flex items-start gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-md">
            <span className="material-symbols-outlined text-[22px]">
              alarm_on
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="px-2 py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed font-code-meta text-[11px] font-bold uppercase">
                {topToastReminder.badgeLabel} • LỚP {loggedInStudent.studentClass}
              </span>
              <button
                id="btnDismissStudentScheduleToast"
                type="button"
                onClick={() => setDismissedToast(true)}
                className="text-on-surface-variant hover:text-on-surface text-xs font-bold cursor-pointer px-1.5 py-0.5 rounded"
                aria-label="Đóng thông báo nhắc lịch thi"
              >
                ✕
              </button>
            </div>
            <p className="font-label-lg text-xs font-bold text-primary mt-1 truncate">
              {topToastReminder.exam.title}
            </p>
            <p className="font-code-meta text-[11px] text-on-surface-variant mt-0.5">
              {topToastReminder.countdownText} • Mở:{' '}
              {topToastReminder.startFormatted} → Đóng:{' '}
              {topToastReminder.endFormatted}
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================
          TAB 1: LỰA CHỌN MÔN HỌC ĐỂ THI & HIỂN THỊ NHIỀU ĐỀ THI DẠNG VIEW
         ======================================================================== */}
      {activeStudentTab === 'chon-mon-thi' && (
        <div className="max-w-7xl mx-auto w-full px-gutter py-space-xl flex flex-col gap-space-xl">
          {/* STEP 1: LỰA CHỌN MÔN HỌC ĐỂ THI (11 BỘ MÔN THCS) */}
          <section className="bg-surface-container-lowest rounded-xl p-space-xl shadow-md border border-outline-variant/20 flex flex-col gap-space-md">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-code-meta text-xs text-secondary font-bold uppercase tracking-wider">
                  Bước 1 / Lựa Chọn Môn Học Dự Thi — Dành Riêng Cho Khối{' '}
                  {loggedInStudent.grade} (Lớp {loggedInStudent.studentClass})
                </span>
                <h2 className="font-headline-md text-headline-md text-on-surface">
                  Chọn Môn Học Để Nhận Đề Kiểm Tra Khối {loggedInStudent.grade}
                </h2>
              </div>

              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-primary-fixed text-on-primary-fixed font-code-meta text-xs font-bold shadow-sm">
                <span className="material-symbols-outlined text-[18px]">
                  verified_user
                </span>
                <span>
                  Phân quyền chặt chẽ: Học sinh Lớp {loggedInStudent.studentClass}{' '}
                  chỉ nhận đề kiểm tra Khối {loggedInStudent.grade}
                </span>
              </div>
            </div>

            <div
              id="studentQuickSubjectGrid"
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5"
            >
              {THCS_SUBJECTS.map((subj) => {
                const isSelected = registration.selectedSubject === subj.key;
                const countForSubj = filterExamsForStudentSubject(
                  cloudExams,
                  subj.key,
                  studentGrade,
                  studentClassCode
                ).length;

                return (
                  <button
                    key={subj.key}
                    id={`btnStudentSubject-${subj.codePrefix}`}
                    type="button"
                    onClick={() => handleSelectSubject(subj.key)}
                    className={`p-3 rounded-xl flex flex-col items-start gap-1 text-left cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-primary text-on-primary border-primary shadow-md ring-2 ring-secondary'
                        : 'bg-surface-container-low text-on-surface border-outline-variant/20 hover:bg-surface-container'
                    }`}
                  >
                    <div className="w-full flex items-center justify-between">
                      <span className="material-symbols-outlined text-[22px]">
                        {subj.icon}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full font-code-meta text-[11px] font-bold ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-surface-container-highest text-primary'
                        }`}
                      >
                        {countForSubj} đề
                      </span>
                    </div>
                    <span className="font-headline-sm text-sm font-bold mt-1">
                      Môn {subj.key}
                    </span>
                    <span
                      className={`font-body-sm text-[11px] ${
                        isSelected
                          ? 'text-primary-fixed'
                          : 'text-on-surface-variant'
                      }`}
                    >
                      {subj.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* STEP 2: HIỂN THỊ NHIỀU ĐỀ THI DẠNG VIEW THEO MÔN HỌC ĐÃ CHỌN */}
          <section
            id="student-multi-exam-view-section"
            className="flex flex-col gap-space-md"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-secondary text-on-secondary flex items-center justify-center shadow-sm">
                  <span className="material-symbols-outlined text-[22px]">
                    {selectedSubjectMeta.icon}
                  </span>
                </div>
                <div>
                  <span className="font-code-meta text-xs text-secondary font-bold uppercase">
                    Bước 2 / Danh Sách Đề Thi Khối {loggedInStudent.grade} (Lớp{' '}
                    {loggedInStudent.studentClass}) — Môn{' '}
                    {registration.selectedSubject} ({selectedSubjectMeta.label})
                  </span>
                  <h2 className="font-headline-md text-headline-md text-primary">
                    Các Đề Thi Môn {registration.selectedSubject} Khối{' '}
                    {loggedInStudent.grade} Đang Mở ({subjectExamCards.length}{' '}
                    đề thi)
                  </h2>
                </div>
              </div>

              {/* Honor commitment checkbox right above the exam cards */}
              <label
                htmlFor="honorCommitment"
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-container-lowest shadow-sm border border-outline-variant/30 cursor-pointer"
              >
                <input
                  id="honorCommitment"
                  type="checkbox"
                  checked={registration.honorCommitted}
                  onChange={(e) => {
                    onUpdateRegistration({
                      ...registration,
                      honorCommitted: e.target.checked,
                    });
                    if (e.target.checked) setValidationError(null);
                  }}
                  className="h-4 w-4 rounded accent-primary cursor-pointer"
                />
                <span className="font-label-md text-xs text-on-surface font-semibold">
                  Cam kết tự làm bài nghiêm túc (Rời tab đóng phòng &amp; -0.5đ/lần)
                </span>
              </label>
            </div>

            {validationError && (
              <div
                role="alert"
                className="p-space-md rounded-xl bg-error-container text-on-error-container font-body-sm text-sm flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">
                  error
                </span>
                <span>{validationError}</span>
              </div>
            )}

            {/* MULTI-EXAM CARDS GRID VIEW */}
            <div
              id="studentExamCardsGrid"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-lg"
            >
              {subjectExamCards.map((examCard) => {
                const isSelectedCard = activeExam.id === examCard.id;
                const cardSched = checkExamScheduleStatus(examCard);
                const cardQCount = (examCard.questions?.length || 10) + 2;
                const studentDoneRecord = studentPersonalSubmissions.find(
                  (sub) =>
                    sub.examId === examCard.id ||
                    sub.examTitle === examCard.title
                );

                return (
                  <article
                    key={examCard.id}
                    data-testid={`exam-view-card-${examCard.code}`}
                    className={`rounded-xl p-space-lg flex flex-col justify-between gap-space-md transition-all border-2 ${
                      isSelectedCard
                        ? 'bg-surface-container-lowest border-primary shadow-lg'
                        : 'bg-surface-container-lowest border-outline-variant/30 shadow-md hover:border-primary/60'
                    }`}
                  >
                    <div className="flex flex-col gap-2.5">
                      {/* Top Badges: Subject, Exam Code, Schedule Status */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2.5 py-0.5 rounded-md bg-primary text-on-primary font-label-md text-xs font-bold">
                            Môn {examCard.subjectCode || examCard.subject}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-md bg-secondary-fixed text-on-secondary-fixed font-code-meta text-xs font-bold">
                            Mã đề: {examCard.code}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded font-code-meta text-[11px] font-bold ${
                            cardSched.canTake
                              ? 'bg-tertiary-container text-on-tertiary-container'
                              : 'bg-error-container text-on-error-container'
                          }`}
                        >
                          {cardSched.canTake ? 'Đang mở thi' : 'Tạm khóa'}
                        </span>
                      </div>

                      {/* Exam Title (e.g., "Đề thi môn Tin - Thầy Trường", "Đề thi môn Văn - Thầy Tuân", "Đề thi môn Văn - Cô Hằng") */}
                      <h3 className="font-headline-sm text-base text-on-surface font-bold leading-snug">
                        {examCard.title}
                      </h3>

                      {/* Teacher Badge */}
                      <div className="p-2.5 rounded-lg bg-surface-container-low flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[20px]">
                          person_apron
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className="font-code-meta text-[11px] text-on-surface-variant">
                            Giáo viên phụ trách đề thi:
                          </span>
                          <span className="font-label-md text-xs text-primary font-bold truncate">
                            {examCard.teacherName ||
                              examCard.createdBy ||
                              `Giáo viên môn ${examCard.subject}`}
                          </span>
                        </div>
                      </div>

                      {/* Exam Metadata Pills */}
                      <div className="grid grid-cols-3 gap-2 text-center bg-surface-container-low/60 p-2 rounded-lg font-code-meta text-xs">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-on-surface-variant">
                            Khối lớp
                          </span>
                          <strong className="text-on-surface">
                            Khối {examCard.grade}
                          </strong>
                        </div>
                        <div className="flex flex-col border-x border-outline-variant/30">
                          <span className="text-[10px] text-on-surface-variant">
                            Thời gian
                          </span>
                          <strong className="text-secondary">
                            {examCard.durationMinutes} phút
                          </strong>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-on-surface-variant">
                            Cấu trúc
                          </span>
                          <strong className="text-primary">
                            {cardQCount} câu
                          </strong>
                        </div>
                      </div>

                      {/* Schedule Window */}
                      <div className="text-[11px] font-code-meta text-on-surface-variant flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-primary">
                          calendar_clock
                        </span>
                        <span className="truncate">
                          {formatExamScheduleWindow(
                            examCard.startAt,
                            examCard.endAt
                          )}
                        </span>
                      </div>

                      {/* If student already completed this exam, show their score badge */}
                      {studentDoneRecord && (
                        <div className="p-2 rounded-lg bg-tertiary-container/30 border border-tertiary/40 flex items-center justify-between text-xs">
                          <span className="font-semibold text-on-tertiary-container flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">
                              check_circle
                            </span>
                            Đã dự thi đề này:
                          </span>
                          <strong className="font-code-meta text-primary font-bold">
                            {studentDoneRecord.finalScore.toFixed(1)} / 10.0 điểm
                          </strong>
                        </div>
                      )}
                    </div>

                    {/* Card Footer Action Button */}
                    <div className="pt-2 border-t border-outline-variant/20 flex items-center gap-2">
                      <button
                        id={`btnStartExamCard-${examCard.code}`}
                        type="button"
                        onClick={() => handlePickExamCardToEnter(examCard)}
                        className="w-full py-2.5 px-4 rounded-xl bg-primary text-on-primary hover:bg-primary-container font-headline-sm text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          play_arrow
                        </span>
                        <span>VÀO THI ĐỀ NÀY ({examCard.code})</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {/* ========================================================================
          TAB 2: XEM KẾT QUẢ THI, KIỂM TRA CỦA HỌC SINH ĐANG ĐĂNG NHẬP
         ======================================================================== */}
      {activeStudentTab === 'ket-qua-cua-em' && (
        <div
          id="student-personal-results-section"
          className="max-w-7xl mx-auto w-full px-gutter py-space-xl flex flex-col gap-space-xl"
        >
          {/* Student Personal KPI Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
            <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-md flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-code-meta text-xs text-on-surface-variant uppercase font-bold">
                  Số Bài Thi &amp; Kiểm Tra Đã Nộp
                </span>
                <span className="font-headline-lg text-2xl text-primary font-bold mt-1">
                  {studentPersonalSubmissions.length} bài thi
                </span>
                <span className="font-body-sm text-xs text-on-surface-variant">
                  Học sinh: {loggedInStudent.fullName} ({loggedInStudent.studentClass})
                </span>
              </div>
              <span className="material-symbols-outlined text-primary text-[32px]">
                assignment_turned_in
              </span>
            </div>

            <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-md flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-code-meta text-xs text-on-surface-variant uppercase font-bold">
                  Điểm Trung Bình Các Bài Thi
                </span>
                <span className="font-headline-lg text-2xl text-secondary font-bold mt-1">
                  {studentPersonalSubmissions.length > 0
                    ? (
                        studentPersonalSubmissions.reduce(
                          (acc, s) => acc + s.finalScore,
                          0
                        ) / studentPersonalSubmissions.length
                      ).toFixed(2)
                    : '0.00'}{' '}
                  / 10
                </span>
                <span className="font-body-sm text-xs text-on-surface-variant">
                  Lưu trữ thời gian thực trên Cloud Firestore
                </span>
              </div>
              <span className="material-symbols-outlined text-secondary text-[32px]">
                workspace_premium
              </span>
            </div>

            <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-md flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-code-meta text-xs text-on-surface-variant uppercase font-bold">
                  Bảng Điểm Phạm Vi Lớp {loggedInStudent.studentClass}
                </span>
                <span className="font-headline-sm text-sm text-on-surface font-bold mt-1">
                  Tổng hợp điểm học sinh Lớp {loggedInStudent.studentClass}
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate('ket-qua-bang-diem')}
                  className="mt-1.5 text-left font-label-md text-xs text-primary underline cursor-pointer"
                >
                  Mở Bảng Điểm Lớp {loggedInStudent.studentClass} →
                </button>
              </div>
              <span className="material-symbols-outlined text-on-tertiary-container text-[32px]">
                leaderboard
              </span>
            </div>
          </div>

          {/* Student's Completed Exams Table */}
          <div className="bg-surface-container-lowest rounded-xl p-space-xl shadow-md flex flex-col gap-space-md">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-code-meta text-xs text-secondary font-bold uppercase">
                  Hồ Sơ Điểm Số Cá Nhân
                </span>
                <h2 className="font-headline-md text-headline-md text-primary">
                  Kết Quả Thi &amp; Kiểm Tra Của {loggedInStudent.fullName} (Lớp{' '}
                  {loggedInStudent.studentClass})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveStudentTab('chon-mon-thi')}
                className="px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md text-xs font-bold cursor-pointer"
              >
                + Chọn Môn Thi Khác
              </button>
            </div>

            {studentPersonalSubmissions.length === 0 ? (
              <div className="p-space-xl rounded-xl bg-surface-container-low text-center flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-outline text-[42px]">
                  quiz
                </span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">
                  Em chưa có bài thi hoặc bài kiểm tra nào hoàn thành
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md">
                  Hãy chuyển sang mục <strong>1. Chọn Môn &amp; Đề Thi</strong>,
                  lựa chọn môn học và đề kiểm tra của thầy cô để bắt đầu làm bài!
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-highest/50 text-on-surface-variant font-label-md text-xs uppercase">
                      <th className="py-3 px-3 text-center">STT</th>
                      <th className="py-3 px-3">Môn Học</th>
                      <th className="py-3 px-4">Đề Thi / Bài Kiểm Tra</th>
                      <th className="py-3 px-3">Giáo Viên Bộ Môn</th>
                      <th className="py-3 px-3 text-center">Thời Gian Làm</th>
                      <th className="py-3 px-3 text-center">Điểm Gốc</th>
                      <th className="py-3 px-3 text-center">Điểm Trừ Tab</th>
                      <th className="py-3 px-3 text-center font-bold">
                        Điểm Tổng Kết
                      </th>
                      <th className="py-3 px-3 text-center">Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/20 font-body-sm text-xs">
                    {studentPersonalSubmissions.map((sub, idx) => {
                      const subj =
                        sub.subject ||
                        normalizeSubjectKey(sub.examTitle || 'Tin');
                      return (
                        <tr
                          key={sub.id}
                          className="hover:bg-surface-container-low transition-colors"
                        >
                          <td className="py-3 px-3 text-center font-code-meta">
                            {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                          </td>
                          <td className="py-3 px-3 font-code-meta font-bold text-secondary">
                            Môn {subj}
                          </td>
                          <td className="py-3 px-4 font-semibold text-on-surface">
                            {sub.examTitle || sub.examId}
                          </td>
                          <td className="py-3 px-3 text-primary font-medium">
                            {sub.teacherName || `GV Môn ${subj}`}
                          </td>
                          <td className="py-3 px-3 text-center font-code-meta">
                            {sub.duration}
                          </td>
                          <td className="py-3 px-3 text-center font-code-meta">
                            {sub.rawScore.toFixed(1)}
                          </td>
                          <td className="py-3 px-3 text-center font-code-meta text-error font-bold">
                            {sub.penaltyText}
                          </td>
                          <td className="py-3 px-3 text-center font-headline-sm text-sm font-bold text-primary">
                            {sub.finalScore.toFixed(1)} / 10
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="px-2 py-0.5 rounded bg-tertiary-container text-on-tertiary-container font-label-md text-[11px] font-bold">
                              {sub.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Interactive Confirmation Modal Before Entering Online Exam Room */}
      {showConfirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-ready-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-gutter bg-on-surface/60 backdrop-blur-sm transition-all duration-200"
          id="readyConfirmationModal"
        >
          <div className="bg-surface-container-lowest rounded-xl max-w-lg w-full p-space-xl shadow-xl flex flex-col gap-space-md">
            <div className="flex items-center gap-space-sm text-primary">
              <span className="material-symbols-outlined text-[36px]">
                verified
              </span>
              <h3
                id="modal-ready-title"
                className="font-headline-md text-headline-md"
              >
                Xác Nhận Vào Phòng Thi Môn{' '}
                {modalExam.subjectCode || modalExam.subject}!
              </h3>
            </div>
            <div
              className="font-body-md text-body-md text-on-surface-variant space-y-1"
              id="modalConfirmationDetails"
            >
              <div>
                Thí sinh: <strong>{loggedInStudent.fullName}</strong> (TK:{' '}
                <code>{loggedInStudent.username}</code> • Lớp{' '}
                <strong>{loggedInStudent.studentClass}</strong>)
              </div>
              <div>
                Đề thi đã chọn: <strong className="text-primary">{modalExam.title}</strong> (Mã:{' '}
                <code>{modalExam.code}</code>)
              </div>
              <div>
                Giáo viên ra đề:{' '}
                <strong>
                  {modalExam.teacherName ||
                    modalExam.createdBy ||
                    `GV Môn ${modalExam.subject}`}
                </strong>
              </div>
              <div>
                Thời gian làm bài: <strong>{modalExam.durationMinutes} phút</strong> ({totalQuestionCount} câu hỏi).
              </div>
            </div>
            <div className="p-space-sm rounded-lg bg-error-container text-on-error-container font-body-sm text-body-sm flex items-start gap-2">
              <span className="material-symbols-outlined text-[20px] mt-0.5">
                warning
              </span>
              <span>
                Lưu ý nghiêm ngặt: Trong quá trình làm bài, nếu chuyển sang tab
                khác hoặc rời cửa sổ,{' '}
                <strong>phòng thi sẽ lập tức đóng lại</strong>, bảo lưu thời điểm
                hiện tại và <strong>trừ 0.5 điểm mỗi lần vào thi lại</strong>.
              </span>
            </div>
            <div className="flex items-center justify-end gap-space-sm pt-space-sm">
              <button
                className="px-space-md py-2.5 rounded-lg bg-surface-container text-on-surface font-label-lg text-label-lg hover:bg-surface-container-high transition-colors cursor-pointer"
                onClick={() => setShowConfirmModal(false)}
                type="button"
              >
                Chọn đề khác
              </button>
              <button
                id="btnConfirmEnterRoom"
                className="px-space-lg py-2.5 rounded-lg bg-primary text-on-primary font-label-lg text-label-lg shadow-md hover:bg-primary-container transition-colors flex items-center gap-1.5 cursor-pointer"
                onClick={handleEnterExamRoom}
                type="button"
              >
                {isInitializing ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">
                      refresh
                    </span>
                    <span>Đang mở phòng...</span>
                  </>
                ) : (
                  <>
                    <span>BẮT ĐẦU LÀM BÀI NGAY</span>
                    <span className="material-symbols-outlined text-[18px]">
                      arrow_forward
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
