import React, { useState } from 'react';
import {
  canTeacherManageSystem,
  ExamBankData,
  filterSubmissionsByAccountScope,
  formatTimer,
  getTeacherAssignedClasses,
  normalizeSubjectKey,
  ScreenId,
  StudentAccount,
  StudentRecord,
  StudentRegistration,
  TeacherAccount,
  THCS_SUBJECTS,
} from '../utils/examLogic';

const RESULT_PORTRAIT_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuADsmID5bwi5-o4EHvdKsfkHdM1gD71Sq-upLhHh5_i8WHf5TJlkTQiOxbZQk1cYXlBfm8dhNETVy6DjHMngmt53CL5KhVYV_3-gpow2cVzvuCJ96Udb0qofaXt5qPB6fV5BBti3T6Kn-M25C8AJFbx_2svAPnQiNKJq5g6UabbuFO0R_eXdv2cffrrqkIYC6FG2JQChjzopq5Y8lUvKOrXOYBVqGQUy-N9LcMetJkOm_oEDw1DtKrM';

interface ResultsReportProps {
  exam: ExamBankData;
  registration: StudentRegistration;
  loggedInStudent?: StudentAccount | null;
  isAdminAuthenticated?: boolean;
  currentTeacher?: TeacherAccount | null;
  cloudExams?: ExamBankData[];
  selectedAnswers: Record<number, 'A' | 'B' | 'C' | 'D'>;
  fillBlanks: string[];
  shortAnswer: string;
  shortAnswerFeedback?: string;
  rawScore: number;
  tabPenalty: number;
  finalScore: number;
  rank: string;
  tabViolations: number;
  durationSeconds: number;
  hasCompletedCurrentExam: boolean;
  cloudSubmissions: StudentRecord[];
  onNavigate: (screen: ScreenId) => void;
}

export const ResultsReport: React.FC<ResultsReportProps> = ({
  exam,
  registration,
  loggedInStudent = null,
  isAdminAuthenticated = false,
  currentTeacher = null,
  cloudExams = [],
  selectedAnswers,
  fillBlanks,
  shortAnswer,
  shortAnswerFeedback = '',
  rawScore,
  tabPenalty,
  finalScore,
  rank,
  tabViolations,
  durationSeconds,
  hasCompletedCurrentExam,
  cloudSubmissions,
  onNavigate,
}) => {
  const isSystemAdmin =
    isAdminAuthenticated && canTeacherManageSystem(currentTeacher);
  const isSubjectTeacher =
    isAdminAuthenticated && Boolean(currentTeacher) && !isSystemAdmin;

  const teacherAssignedClasses = isSubjectTeacher
    ? getTeacherAssignedClasses(currentTeacher, cloudExams)
    : [];

  const [filterGrade, setFilterGrade] = useState<number>(
    loggedInStudent?.grade || registration.grade || 9
  );
  const [filterClass, setFilterClass] = useState<string>('ALL');
  const [filterSubject, setFilterSubject] = useState<string>('ALL');
  const [pdfNotice, setPdfNotice] = useState<string | null>(null);

  // Step 1: Strictly scope submissions by logged-in account (Student / Teacher / Admin)
  const accountScopedSubmissions = isSystemAdmin
    ? filterSubmissionsByAccountScope(cloudSubmissions, { role: 'admin' })
    : isSubjectTeacher
    ? filterSubmissionsByAccountScope(cloudSubmissions, {
        role: 'teacher',
        teacher: currentTeacher,
        exams: cloudExams,
      })
    : loggedInStudent
    ? filterSubmissionsByAccountScope(cloudSubmissions, {
        role: 'student',
        student: loggedInStudent,
      })
    : [];

  // Step 2: Apply UI sub-filters within the allowed account scope
  const filteredClassBoard = accountScopedSubmissions.filter((sub) => {
    if (loggedInStudent && !isAdminAuthenticated) {
      // Student is locked to their own class (e.g. 7A1); can only filter by subject
      if (filterSubject !== 'ALL') {
        const subSubj = normalizeSubjectKey(
          sub.subject || sub.examTitle || 'Toán'
        );
        if (subSubj !== normalizeSubjectKey(filterSubject)) {
          return false;
        }
      }
      return true;
    }

    if (isSubjectTeacher && currentTeacher) {
      // Teacher is locked to their subject and their assigned classes
      if (
        filterClass !== 'ALL' &&
        sub.className.toUpperCase() !== filterClass.toUpperCase()
      ) {
        return false;
      }
      return true;
    }

    // System Admin can filter across all grades, classes, and subjects
    if (sub.grade !== filterGrade) return false;
    if (
      filterClass !== 'ALL' &&
      sub.className.toUpperCase() !== filterClass.toUpperCase()
    ) {
      return false;
    }
    if (filterSubject !== 'ALL') {
      const subSubj = normalizeSubjectKey(sub.subject || sub.examTitle || 'Toán');
      if (subSubj !== normalizeSubjectKey(filterSubject)) {
        return false;
      }
    }
    return true;
  });

  const handleDownloadPdf = () => {
    const reportContent = [
      'PHIẾU BÁO ĐIỂM KHẢO THÍ TRỰC TUYẾN EDUEXAM PRO (CLOUD FIRESTORE)',
      '==================================================================',
      `Họ và tên thí sinh: ${registration.fullName || 'Chưa nộp bài'}`,
      `Lớp: ${registration.studentClass || '--'} - Khối ${registration.grade} THCS`,
      `Môn học dự thi: ${registration.selectedSubject || exam.subjectCode || exam.subject}`,
      `Đề thi: ${exam.title} (${exam.code})`,
      `Điểm Thô Máy Chấm: ${rawScore.toFixed(1)} / 10.0`,
      `Khấu Trừ Chuyển Tab / Thi Lại: -${tabPenalty.toFixed(1)} điểm (${tabViolations} lần x 0.5đ)`,
      `Điểm Tổng Kết Thực Nhận: ${finalScore.toFixed(1)} / 10.0 (Xếp loại: ${rank})`,
    ].join('\n');

    const blob = new Blob([reportContent], {
      type: 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Phieu_Diem_Mon_${registration.selectedSubject}_${
      registration.studentClass || 'HS'
    }.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setPdfNotice('Đã tải xuống Phiếu Điểm điện tử từ Cloud Firestore!');
    window.setTimeout(() => setPdfNotice(null), 3500);
  };

  return (
    <div className="flex flex-col w-full">
      <div className="w-full px-gutter py-space-lg flex flex-col gap-space-xl max-w-7xl mx-auto">
        {/* Top Breadcrumb & Verification Badges */}
        <div className="flex flex-wrap items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-sm font-label-md text-label-md text-on-surface-variant">
            <button
              type="button"
              onClick={() =>
                onNavigate(
                  isAdminAuthenticated ? 'khu-vuc-quan-tri' : 'cong-vao-thi'
                )
              }
              className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">
                school
              </span>
              {isAdminAuthenticated
                ? 'Về Trang Quản Lý Đề & Điểm'
                : 'Hệ Thống Khảo Thí THCS'}
            </button>
            <span className="text-outline-variant">/</span>
            <span className="text-primary font-semibold">
              {loggedInStudent && !isAdminAuthenticated
                ? `Bảng Điểm Phạm Vi Lớp ${loggedInStudent.studentClass} (Khối ${loggedInStudent.grade})`
                : isSubjectTeacher && currentTeacher
                ? `Bảng Điểm Giáo Viên Môn ${currentTeacher.subject} (Lớp Giao Bài: ${
                    teacherAssignedClasses.join(', ') || 'Chưa giao lớp'
                  })`
                : 'Bảng Điểm Tổng Hợp Toàn Trường (Quản Trị Hệ Thống)'}
            </span>
          </div>
          <div className="flex items-center gap-space-sm flex-wrap">
            <span className="inline-flex items-center gap-space-xs px-3 py-1 rounded-full bg-tertiary-container text-on-tertiary-container font-label-md text-label-md">
              <span className="material-symbols-outlined material-symbols-filled text-[16px]">
                verified_user
              </span>
              {loggedInStudent && !isAdminAuthenticated
                ? `Quyền xem: Chỉ Lớp ${loggedInStudent.studentClass} (${accountScopedSubmissions.length} bài)`
                : isSubjectTeacher && currentTeacher
                ? `Quyền xem GV: Môn ${currentTeacher.subject} • Lớp ${
                    teacherAssignedClasses.join(', ') || 'Đã giao'
                  } (${accountScopedSubmissions.length} bài)`
                : `Đồng bộ thời gian thực (${accountScopedSubmissions.length} bài thi)`}
            </span>
          </div>
        </div>

        {/* SECTION 1: CURRENT STUDENT RESULT (ONLY IF COMPLETED OR IN SESSION) */}
        {hasCompletedCurrentExam ? (
          <section className="relative w-full rounded-xl bg-surface-container-lowest shadow-xl overflow-hidden">
            <div className="relative p-space-lg md:p-space-xl flex flex-col gap-space-lg">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-space-lg">
                <div className="flex items-center gap-space-lg">
                  <div className="relative">
                    <img
                      alt={`Học sinh ${registration.fullName}`}
                      className="w-20 h-20 md:w-24 md:h-24 rounded-xl object-cover shadow-md"
                      referrerPolicy="no-referrer"
                      src={RESULT_PORTRAIT_URL}
                    />
                    <span className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-md bg-primary text-on-primary font-code-meta text-[11px] font-bold shadow">
                      LỚP {registration.studentClass}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-space-xs flex-wrap">
                      <h1 className="font-headline-lg text-headline-lg text-primary tracking-tight">
                        {registration.fullName}
                      </h1>
                      <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-md text-label-md font-bold">
                        Khối {registration.grade} THCS
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-secondary text-on-secondary font-label-md text-label-md font-bold">
                        Môn thi: {registration.selectedSubject}
                      </span>
                    </div>
                    <div className="flex items-center gap-space-md text-on-surface-variant font-body-sm text-body-sm mt-1 flex-wrap">
                      <span className="font-code-meta text-code-meta text-primary font-semibold">
                        Đề: {exam.title} ({exam.code})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-row items-center gap-space-md bg-surface-container-low p-space-md rounded-xl shadow-sm w-full lg:w-auto justify-between lg:justify-end">
                  <div className="flex flex-col text-right">
                    <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                      Điểm Tổng Kết
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="font-code-timer text-4xl text-primary font-bold tracking-tight">
                        {finalScore.toFixed(1)}
                      </span>
                      <span className="font-headline-sm text-headline-sm text-outline">
                        / 10.0
                      </span>
                    </div>
                  </div>
                  <div className="h-12 w-[1px] bg-outline-variant/30"></div>
                  <div className="flex flex-col items-center justify-center px-space-md py-space-xs bg-tertiary-container text-on-tertiary-container rounded-lg">
                    <span className="font-label-md text-label-md font-bold uppercase tracking-wider">
                      Xếp Loại
                    </span>
                    <span className="font-headline-sm text-headline-sm font-bold text-on-tertiary">
                      {rank}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md">
                <div className="p-space-md rounded-lg bg-surface-container-low flex flex-col justify-between shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-label-md text-label-md text-on-surface-variant font-semibold">
                      Điểm Thô Máy Chấm
                    </span>
                    <span className="material-symbols-outlined text-primary text-[20px]">
                      calculate
                    </span>
                  </div>
                  <div className="mt-space-md">
                    <div className="flex items-baseline gap-1">
                      <span className="font-headline-lg text-headline-lg text-primary">
                        {rawScore.toFixed(1)}
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        / 10 điểm
                      </span>
                    </div>
                    <p className="font-body-sm text-[13px] text-on-surface-variant mt-1">
                      Đã hoàn thành bài kiểm tra môn {registration.selectedSubject}
                    </p>
                  </div>
                </div>

                <div className="p-space-md rounded-lg bg-error-container/40 flex flex-col justify-between shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-label-md text-label-md text-error font-semibold">
                      Khấu Trừ Thi Lại / Chuyển Tab
                    </span>
                    <span className="material-symbols-outlined text-error text-[20px]">
                      warning
                    </span>
                  </div>
                  <div className="mt-space-md">
                    <div className="flex items-baseline gap-1">
                      <span className="font-headline-lg text-headline-lg text-error">
                        -{tabPenalty.toFixed(1)}
                      </span>
                      <span className="font-body-sm text-body-sm text-error/80">
                        điểm
                      </span>
                    </div>
                    <p className="font-body-sm text-[13px] text-error mt-1">
                      {tabViolations} lần rời tab / mở lại phòng (-0.5đ/lần)
                    </p>
                  </div>
                </div>

                <div className="p-space-md rounded-lg bg-surface-container-low flex flex-col justify-between shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-label-md text-label-md text-on-surface-variant font-semibold">
                      Thời Gian Làm Bài
                    </span>
                    <span className="material-symbols-outlined text-tertiary-container text-[20px]">
                      schedule
                    </span>
                  </div>
                  <div className="mt-space-md">
                    <div className="flex items-baseline gap-1">
                      <span className="font-code-timer text-2xl text-on-surface font-bold">
                        {formatTimer(durationSeconds)}
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        / {exam.durationMinutes}:00
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-on-tertiary-fixed-variant font-label-md text-[13px] font-semibold">
                      <span className="material-symbols-outlined text-[15px]">
                        verified
                      </span>
                      {durationSeconds < 60
                        ? 'Nộp < 1 phút (Phạt 50% điểm)'
                        : 'Hợp lệ (> 1 phút)'}
                    </div>
                  </div>
                </div>

                <div className="p-space-md rounded-lg bg-primary-container text-on-primary flex flex-col justify-between shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-label-md text-label-md text-primary-fixed font-semibold">
                      Điểm Thực Nhận (Đã Lưu Cloud)
                    </span>
                    <span className="material-symbols-outlined text-primary-fixed text-[20px]">
                      cloud_done
                    </span>
                  </div>
                  <div className="mt-space-md">
                    <div className="flex items-baseline gap-1">
                      <span className="font-headline-lg text-headline-lg text-white">
                        {finalScore.toFixed(1)}
                      </span>
                      <span className="font-body-sm text-body-sm text-primary-fixed">
                        / 10 điểm
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      className="mt-2 inline-flex items-center gap-1 text-xs bg-white/15 hover:bg-white/25 text-white px-2.5 py-1 rounded cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        download
                      </span>
                      Tải Phiếu Điểm (.TXT)
                    </button>
                  </div>
                </div>
              </div>

              {pdfNotice && (
                <div className="p-2.5 rounded-lg bg-tertiary-container text-on-tertiary font-label-md text-label-md">
                  {pdfNotice}
                </div>
              )}

              {/* Detailed Breakdown of student's answers (Only visible to Admin/Teachers, hidden from students after exam completion) */}
              {isAdminAuthenticated ? (
                <div className="pt-2 border-t border-outline-variant/30">
                  <h3 className="font-headline-sm text-headline-sm text-primary mb-3">
                    Đối Chiếu Bài Làm Của Thí Sinh (
                    {[
                      exam.questions.length > 0
                        ? `${exam.questions.length} câu trắc nghiệm`
                        : '',
                      exam.fillQuestion?.points > 0 &&
                      exam.fillQuestion?.promptTemplate?.trim()
                        ? '1 bài điền khuyết'
                        : '',
                      exam.shortQuestion?.points > 0 &&
                      exam.shortQuestion?.prompt?.trim()
                        ? '1 bài tự luận'
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' • ')}
                    )
                  </h3>
                  {exam.questions.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {exam.questions.map((q) => {
                        const userChoice = selectedAnswers[q.id];
                        const isCorrect = userChoice === q.correctAnswer;
                        return (
                          <div
                            key={q.id}
                            className={`p-3 rounded-lg border flex flex-col gap-1 ${
                              isCorrect
                                ? 'bg-tertiary-container/10 border-tertiary/30'
                                : 'bg-error-container/20 border-error/30'
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs font-code-meta">
                              <span className="font-bold text-primary">
                                Câu {q.id} [{q.subject}]
                              </span>
                              <span
                                className={
                                  isCorrect
                                    ? 'text-on-tertiary-container font-bold'
                                    : 'text-error font-bold'
                                }
                              >
                                Chọn: {userChoice || 'Chưa chọn'} | ĐA chuẩn:{' '}
                                {q.correctAnswer}
                              </span>
                            </div>
                            <p className="font-body-sm text-body-sm text-on-surface">
                              {q.prompt}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {((exam.fillQuestion?.points > 0 &&
                    exam.fillQuestion?.promptTemplate?.trim()) ||
                    (exam.shortQuestion?.points > 0 &&
                      exam.shortQuestion?.prompt?.trim())) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      {exam.fillQuestion?.points > 0 &&
                        exam.fillQuestion?.promptTemplate?.trim() && (
                          <div className="p-3 rounded-lg bg-surface-container-low text-xs">
                            <strong className="text-primary block mb-1">
                              Câu Điền Khuyết ({exam.fillQuestion.points}đ):
                            </strong>
                            <div>
                              Thí sinh điền:{' '}
                              <strong>
                                {fillBlanks.map((b) => b || '...').join(' | ')}
                              </strong>
                            </div>
                            <div className="text-on-surface-variant mt-0.5">
                              Đáp án chuẩn:{' '}
                              {exam.fillQuestion.blanks.join(' | ')}
                            </div>
                          </div>
                        )}
                      {exam.shortQuestion?.points > 0 &&
                        exam.shortQuestion?.prompt?.trim() && (
                          <div className="p-3 rounded-lg bg-surface-container-low text-xs">
                            <strong className="text-primary block mb-1">
                              Câu Tự Luận / Trả Lời Ngắn ({exam.shortQuestion.points}đ):
                            </strong>
                            <div>
                              Bài làm:{' '}
                              <em>{shortAnswer || '(Thí sinh bỏ trống)'}</em>
                            </div>
                            <div className="text-on-surface-variant mt-0.5">
                              Đáp án chuẩn: {exam.shortQuestion.sampleAnswer}
                            </div>
                            {shortAnswerFeedback && (
                              <div className="mt-2.5 p-2 rounded-lg bg-primary-container/20 border border-primary/30 text-xs text-on-surface">
                                <div className="font-bold text-primary flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[15px]">
                                    auto_awesome
                                  </span>
                                  <span>Đánh giá tự động từ AI (Gemini):</span>
                                </div>
                                <p className="mt-1 whitespace-pre-wrap leading-relaxed text-on-surface font-medium">
                                  {shortAnswerFeedback}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="pt-3 border-t border-outline-variant/30">
                  <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/20 flex items-center gap-3 text-on-surface-variant">
                    <span className="material-symbols-outlined text-primary text-[24px]">
                      lock
                    </span>
                    <div className="flex flex-col">
                      <span className="font-bold text-xs text-on-surface">
                        Đáp án chi tiết đề thi được bảo mật
                      </span>
                      <span className="text-xs">
                        Hệ thống đã ghi nhận và lưu điểm số bài thi của học sinh. Chi tiết đối chiếu đáp án không hiển thị trên trang học sinh theo quy định bảo mật đề thi.
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        ) : (
          <section className="bg-surface-container-lowest rounded-xl p-space-xl shadow-md flex flex-col sm:flex-row items-center justify-between gap-space-md">
            <div className="flex items-center gap-space-md">
              <div className="w-12 h-12 rounded-xl bg-primary-fixed text-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[28px]">
                  assignment_ind
                </span>
              </div>
              <div>
                <h2 className="font-headline-sm text-headline-sm text-on-surface">
                  {isAdminAuthenticated
                    ? `Bảng tổng hợp điểm theo phân quyền tài khoản (${currentTeacher?.fullName || 'Quản trị'})`
                    : loggedInStudent
                    ? `Bảng tổng hợp điểm phạm vi Lớp ${loggedInStudent.studentClass} của học sinh ${loggedInStudent.fullName}`
                    : 'Vui lòng đăng nhập tài khoản Học sinh hoặc Giáo viên để tra cứu Bảng Điểm theo phạm vi lớp học'}
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  {isSubjectTeacher && currentTeacher
                    ? `Giáo viên bộ môn ${currentTeacher.subject} chỉ được quyền xem điểm các lớp mình giao bài kiểm tra (${
                        teacherAssignedClasses.join(', ') || 'Chưa giao lớp nào'
                      }).`
                    : loggedInStudent
                    ? `Học sinh ${loggedInStudent.fullName} thuộc Lớp ${loggedInStudent.studentClass} chỉ được xem điểm trong phạm vi Lớp ${loggedInStudent.studentClass} (Khối ${loggedInStudent.grade}).`
                    : 'Mỗi tài khoản chỉ được phép xem điểm trong phạm vi lớp học được phân quyền.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                onNavigate(
                  isAdminAuthenticated ? 'khu-vuc-quan-tri' : 'cong-vao-thi'
                )
              }
              className="px-space-lg py-2.5 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg shadow-sm cursor-pointer shrink-0"
            >
              {isAdminAuthenticated
                ? 'Về Quản Lý Đề & Giao Bài'
                : loggedInStudent
                ? 'Về Chọn Môn & Đề Thi'
                : 'Đến Cổng Đăng Nhập'}
            </button>
          </section>
        )}

        {/* SECTION 2: REAL-TIME CLOUD SCOREBOARD SCOPED BY LOGGED-IN ACCOUNT */}
        <section
          id="account-scoped-scoreboard-section"
          className="bg-surface-container-lowest rounded-xl p-space-xl shadow-md flex flex-col gap-space-lg"
        >
          <div className="flex flex-wrap items-center justify-between gap-space-md">
            <div>
              <span className="font-code-meta text-code-meta text-secondary font-bold uppercase">
                {loggedInStudent && !isAdminAuthenticated
                  ? `Phạm Vi Tài Khoản Học Sinh • Chỉ Hiển Thị Lớp ${loggedInStudent.studentClass}`
                  : isSubjectTeacher && currentTeacher
                  ? `Phạm Vi Giáo Viên Bộ Môn ${currentTeacher.subject} • Chỉ Hiển Thị Lớp Đã Giao Bài`
                  : 'Quản Trị Hệ Thống • Bảng Điểm Toàn Trường Theo Khối & Lớp'}
              </span>
              <h2 className="font-headline-md text-headline-md text-primary">
                {loggedInStudent && !isAdminAuthenticated
                  ? `Bảng Điểm Phạm Vi Lớp ${loggedInStudent.studentClass} (Khối ${loggedInStudent.grade})`
                  : isSubjectTeacher && currentTeacher
                  ? `Bảng Điểm Môn ${currentTeacher.subject} — Lớp Giao Bài: ${
                      teacherAssignedClasses.length > 0
                        ? teacherAssignedClasses.join(', ')
                        : 'Chưa giao bài cho lớp nào'
                    }`
                  : `Bảng Điểm Trực Tuyến Theo Môn Học & Lớp (Khối ${filterGrade})`}
              </h2>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* STUDENT SCOPE CONTROLS: Locked to student's own class, only subject filter */}
              {loggedInStudent && !isAdminAuthenticated && (
                <>
                  <span className="px-3.5 py-1.5 rounded-lg bg-primary text-on-primary font-code-meta text-xs font-bold shadow-sm">
                    Khối {loggedInStudent.grade} • Lớp{' '}
                    {loggedInStudent.studentClass} (Cố định theo TK)
                  </span>
                  <select
                    aria-label="Lọc theo môn học"
                    value={filterSubject}
                    onChange={(e) => setFilterSubject(e.target.value)}
                    className="bg-surface-container-low text-primary font-label-md text-label-md px-3 py-1.5 rounded-lg cursor-pointer font-bold"
                  >
                    <option value="ALL">
                      Tất cả môn học (Lớp {loggedInStudent.studentClass})
                    </option>
                    {THCS_SUBJECTS.map((s) => (
                      <option key={s.key} value={s.key}>
                        Môn {s.key} ({s.label})
                      </option>
                    ))}
                  </select>
                </>
              )}

              {/* TEACHER SCOPE CONTROLS: Locked to teacher's subject and their assigned classes */}
              {isSubjectTeacher && currentTeacher && (
                <>
                  <span className="px-3.5 py-1.5 rounded-lg bg-secondary text-on-secondary font-code-meta text-xs font-bold shadow-sm">
                    Môn {currentTeacher.subject} (Cố định theo GV)
                  </span>
                  <select
                    aria-label="Lọc theo lớp đã giao bài"
                    value={filterClass}
                    onChange={(e) => setFilterClass(e.target.value)}
                    className="bg-surface-container-low text-on-surface font-label-md text-label-md px-3 py-1.5 rounded-lg cursor-pointer font-bold"
                  >
                    <option value="ALL">
                      Tất cả lớp đã giao (
                      {teacherAssignedClasses.join(', ') || '0 lớp'})
                    </option>
                    {teacherAssignedClasses
                      .filter((c) => c !== 'ALL')
                      .map((cls) => (
                        <option key={cls} value={cls}>
                          Lớp {cls}
                        </option>
                      ))}
                  </select>
                </>
              )}

              {/* SYSTEM ADMIN CONTROLS: Full school access */}
              {isSystemAdmin && (
                <>
                  {[6, 7, 8, 9].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        setFilterGrade(g);
                        setFilterClass('ALL');
                      }}
                      className={`px-3.5 py-1.5 rounded-lg font-label-md text-label-md cursor-pointer ${
                        filterGrade === g
                          ? 'bg-primary text-on-primary font-bold shadow-sm'
                          : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      Khối {g}
                    </button>
                  ))}

                  <select
                    aria-label="Lọc theo môn học"
                    value={filterSubject}
                    onChange={(e) => setFilterSubject(e.target.value)}
                    className="bg-surface-container-low text-primary font-label-md text-label-md px-3 py-1.5 rounded-lg cursor-pointer font-bold"
                  >
                    <option value="ALL">Tất cả 11 môn học</option>
                    {THCS_SUBJECTS.map((s) => (
                      <option key={s.key} value={s.key}>
                        Môn {s.key} ({s.label})
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label="Lọc theo lớp học"
                    value={filterClass}
                    onChange={(e) => setFilterClass(e.target.value)}
                    className="bg-surface-container-low text-on-surface font-label-md text-label-md px-3 py-1.5 rounded-lg cursor-pointer"
                  >
                    <option value="ALL">
                      Tất cả các lớp Khối {filterGrade}
                    </option>
                    <option value={`${filterGrade}A1`}>
                      Lớp {filterGrade}A1
                    </option>
                    <option value={`${filterGrade}A2`}>
                      Lớp {filterGrade}A2
                    </option>
                    <option value={`${filterGrade}A3`}>
                      Lớp {filterGrade}A3
                    </option>
                    <option value={`${filterGrade}B1`}>
                      Lớp {filterGrade}B1
                    </option>
                  </select>
                </>
              )}
            </div>
          </div>

          {filteredClassBoard.length === 0 ? (
            <div className="p-space-xl rounded-xl bg-surface-container-low text-center flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-outline text-[40px]">
                inbox
              </span>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">
                {loggedInStudent && !isAdminAuthenticated
                  ? `Chưa có bài nộp nào trong phạm vi Lớp ${loggedInStudent.studentClass} (Khối ${loggedInStudent.grade})`
                  : isSubjectTeacher && currentTeacher
                  ? `Chưa có bài nộp nào thuộc các lớp Giáo viên đã giao bài (${
                      teacherAssignedClasses.join(', ') || 'Chưa giao lớp nào'
                    })`
                  : !loggedInStudent && !isAdminAuthenticated
                  ? 'Vui lòng đăng nhập tài khoản Học sinh hoặc Giáo viên để xem bảng điểm theo phạm vi lớp học'
                  : `Chưa có học sinh nào nộp bài trong Khối ${filterGrade}`}
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant max-w-lg">
                Hệ thống phân quyền nghiêm ngặt: Học sinh lớp nào chỉ xem được điểm của lớp đó; Giáo viên giao bài kiểm tra cho lớp nào chỉ được xem điểm của lớp mình giao.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-highest/40 text-on-surface-variant font-label-md text-label-md uppercase">
                    <th className="py-3 px-3 text-center">STT</th>
                    <th className="py-3 px-3">Môn Thi</th>
                    <th className="py-3 px-4">Họ và Tên Học Sinh</th>
                    <th className="py-3 px-3 text-center">Lớp</th>
                    <th className="py-3 px-3">Đề Kiểm Tra</th>
                    <th className="py-3 px-3 text-center">Thời Gian</th>
                    <th className="py-3 px-3 text-center">Số Lần Thi Lại</th>
                    <th className="py-3 px-3 text-center">Điểm Gốc</th>
                    <th className="py-3 px-3 text-center">Điểm Trừ</th>
                    <th className="py-3 px-3 text-center font-bold">
                      Điểm Tổng Kết
                    </th>
                    <th className="py-3 px-3 text-center">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="font-body-sm text-body-sm divide-y divide-outline-variant/20">
                  {filteredClassBoard.map((row, idx) => {
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
                        <td className="py-3 px-4 font-semibold text-on-surface">
                          {row.name}
                        </td>
                        <td className="py-3 px-3 text-center font-code-meta">
                          {row.className}
                        </td>
                        <td className="py-3 px-3 font-code-meta text-xs text-primary font-semibold max-w-[180px] truncate">
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
                        <td className="py-3 px-3 text-center font-code-meta text-error font-semibold">
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
