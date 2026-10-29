import React, { useMemo, useRef, useState } from 'react';
import {
  canTeacherManageSystem,
  ClassroomRecord,
  exportStudentAccountsToCsvString,
  generateAutoStudentPassword,
  parseBulkStudentAccountsText,
  parseExcelStudentAccountsAutoCredentials,
  StudentAccount,
  suggestStudentUsername,
  TeacherAccount,
} from '../utils/examLogic';

interface ClassroomAndStudentManagerProps {
  currentTeacher: TeacherAccount;
  classrooms: ClassroomRecord[];
  studentAccounts: StudentAccount[];
  onSaveClassroom: (classroom: ClassroomRecord) => Promise<void>;
  onDeleteClassroom: (classroomId: string) => Promise<void>;
  onSaveStudentAccount: (account: StudentAccount) => Promise<void>;
  onBulkSaveStudentAccounts: (accounts: StudentAccount[]) => Promise<void>;
  onDeleteStudentAccount: (accountId: string) => Promise<void>;
  onRestoreDefaultSystemData?: () => Promise<void>;
}

export const ClassroomAndStudentManager: React.FC<
  ClassroomAndStudentManagerProps
> = ({
  currentTeacher,
  classrooms,
  studentAccounts,
  onSaveClassroom,
  onDeleteClassroom,
  onSaveStudentAccount,
  onBulkSaveStudentAccounts,
  onDeleteStudentAccount,
  onRestoreDefaultSystemData,
}) => {
  const isAdmin = canTeacherManageSystem(currentTeacher);

  // Filter states
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<
    number | 'ALL'
  >('ALL');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [studentSearch, setStudentSearch] = useState<string>('');

  // New Classroom form state
  const [newClassName, setNewClassName] = useState<string>('');
  const [newClassGrade, setNewClassGrade] = useState<number>(9);
  const [newHomeroomTeacher, setNewHomeroomTeacher] = useState<string>('');
  const [classroomNotice, setClassroomNotice] = useState<string | null>(null);
  const [classroomError, setClassroomError] = useState<string | null>(null);

  // New Student Account form state (Họ tên, Ngày sinh, Lớp học -> Tài khoản, Mật khẩu sinh tự động)
  const [stuFullName, setStuFullName] = useState<string>('');
  const [stuDob, setStuDob] = useState<string>('15/05/2013');
  const [stuClass, setStuClass] = useState<string>(
    classrooms[0]?.name || '6A10'
  );
  const [stuUsername, setStuUsername] = useState<string>('');
  const [stuPassword, setStuPassword] = useState<string>(() =>
    generateAutoStudentPassword(0, 2026)
  );
  const [studentNotice, setStudentNotice] = useState<string | null>(null);
  const [studentError, setStudentError] = useState<string | null>(null);

  // Excel Auto-Credential Import state (3 fields: Họ tên, Lớp, Ngày sinh -> Auto Tài khoản & Mật khẩu)
  const [showExcelModal, setShowExcelModal] = useState<boolean>(true);
  const [excelRawText, setExcelRawText] = useState<string>('');
  const [excelPasswordSeed, setExcelPasswordSeed] = useState<number>(2026);
  const [excelUploadedFileName, setExcelUploadedFileName] =
    useState<string>('');
  const excelFileInputRef = useRef<HTMLInputElement | null>(null);

  // Legacy bulk import state
  const [showBulkModal, setShowBulkModal] = useState<boolean>(false);
  const [bulkText, setBulkText] = useState<string>('');

  // Edit student password inline state
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editingPasswordVal, setEditingPasswordVal] = useState<string>('');

  // Reset all student passwords to 123456 state
  const [showResetConfirmModal, setShowResetConfirmModal] = useState<boolean>(false);
  const [isResettingPasswords, setIsResettingPasswords] = useState<boolean>(false);

  // Live preview of Excel 3-column rows with auto-generated username & password
  const excelPreviewAccounts = useMemo(() => {
    return parseExcelStudentAccountsAutoCredentials(excelRawText, {
      fallbackClass: stuClass || '6A10',
      existingUsernames: studentAccounts.map((s) => s.username),
      seed: excelPasswordSeed,
    });
  }, [excelRawText, stuClass, studentAccounts, excelPasswordSeed]);

  const filteredClassrooms = classrooms.filter((c) =>
    selectedGradeFilter === 'ALL' ? true : c.grade === selectedGradeFilter
  );

  const filteredStudents = studentAccounts.filter((s) => {
    if (selectedGradeFilter !== 'ALL' && s.grade !== selectedGradeFilter) {
      return false;
    }
    if (
      selectedClassFilter !== 'ALL' &&
      s.studentClass.toUpperCase() !== selectedClassFilter.toUpperCase()
    ) {
      return false;
    }
    const q = studentSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      s.fullName.toLowerCase().includes(q) ||
      s.username.toLowerCase().includes(q) ||
      s.studentClass.toLowerCase().includes(q) ||
      s.dateOfBirth.toLowerCase().includes(q)
    );
  });

  const handleAddClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setClassroomError(
        'Chỉ tài khoản Quản trị viên (admin) mới có quyền thêm hoặc xóa lớp học.'
      );
      return;
    }
    const cleanName = newClassName.trim().toUpperCase();
    if (!cleanName) {
      setClassroomError('Vui lòng nhập tên lớp học (VD: 9A3, 8A3, 7A2...).');
      return;
    }
    const gradeMatch = cleanName.match(/^([6789])/);
    const resolvedGrade = gradeMatch ? Number(gradeMatch[1]) : newClassGrade;

    const record: ClassroomRecord = {
      id: `class-${cleanName.toLowerCase()}-${Date.now()}`,
      name: cleanName,
      grade: resolvedGrade,
      homeroomTeacher:
        newHomeroomTeacher.trim() || 'Giáo viên chủ nhiệm phân công',
      schoolYear: '2024 - 2025',
      createdAt: new Date().toISOString(),
    };

    await onSaveClassroom(record);
    setNewClassName('');
    setNewHomeroomTeacher('');
    setClassroomError(null);
    setClassroomNotice(
      `Đã lưu lớp học "${record.name}" (Khối ${record.grade}) lên hệ thống Cloud Firestore!`
    );
    window.setTimeout(() => setClassroomNotice(null), 4000);
  };

  const handleAddStudentAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setStudentError(
        'Chỉ tài khoản Quản trị viên (admin) mới có quyền cấp mới tài khoản học sinh.'
      );
      return;
    }
    const cleanName = stuFullName.trim();
    const cleanDob = stuDob.trim();
    const cleanClass = stuClass.trim().toUpperCase();
    const cleanUser = (
      stuUsername.trim() || suggestStudentUsername(cleanName, cleanClass)
    )
      .toLowerCase()
      .replace(/\s+/g, '');
    const cleanPass =
      stuPassword.trim() ||
      generateAutoStudentPassword(studentAccounts.length, Date.now() % 10000);

    if (!cleanName || !cleanDob || !cleanClass || !cleanUser || !cleanPass) {
      setStudentError(
        'Vui lòng điền đầy đủ: Họ tên, Ngày sinh, Lớp học (Tài khoản và Mật khẩu được sinh tự động)!'
      );
      return;
    }

    const gradeMatch = cleanClass.match(/^([6789])/);
    const grade = gradeMatch ? Number(gradeMatch[1]) : 9;

    const account: StudentAccount = {
      id: `student-${cleanUser.replace(/[^a-z0-9]/g, '_')}-${Date.now()}`,
      fullName: cleanName,
      dateOfBirth: cleanDob,
      studentClass: cleanClass,
      grade,
      username: cleanUser,
      password: cleanPass,
      createdAt: new Date().toISOString(),
    };

    await onSaveStudentAccount(account);
    setStuFullName('');
    setStuUsername('');
    setStuPassword(
      generateAutoStudentPassword(studentAccounts.length + 1, Date.now() % 10000)
    );
    setStudentError(null);
    setStudentNotice(
      `Đã cấp tài khoản học sinh "${account.fullName}" — TK: ${account.username} / MK: ${account.password} (Lớp ${account.studentClass})!`
    );
    window.setTimeout(() => setStudentNotice(null), 4500);
  };

  // Handle uploading an Excel (.xls, .xlsx, .csv, .tsv) file
  const handleExcelFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelUploadedFileName(file.name);
    setStudentError(null);
    try {
      const rawText = await file.text();
      if (rawText && rawText.trim()) {
        setExcelRawText(rawText);
        setStudentNotice(
          `Đã đọc tệp danh sách Excel "${file.name}". Hệ thống đã tự động sinh Tài khoản và Mật khẩu bên dưới!`
        );
      }
    } catch (err) {
      setStudentError(
        `Không thể đọc tệp Excel "${file.name}": ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  };

  // Download sample 3-column Excel template (.csv / Excel-ready)
  const handleDownloadSampleExcelTemplate = () => {
    const sampleCsv = [
      '\uFEFFHọ tên,Lớp,Ngày sinh',
      '"Phạm Gia Bảo","6A1","14/08/2013"',
      '"Nguyễn Minh Châu","7A1","22/11/2012"',
      '"Lê Hoàng Nam","8A1","05/03/2011"',
      '"Trần Ngọc Ánh","9A1","19/07/2010"',
    ].join('\n');
    const blob = new Blob([sampleCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Mau_Excel_Danh_Sach_Hoc_Sinh_3_Cot.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Confirm importing the Excel student list with auto-generated credentials
  const handleExcelImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (excelPreviewAccounts.length === 0) {
      setStudentError(
        'Không tìm thấy dữ liệu học sinh hợp lệ. Vui lòng nhập hoặc tải lên danh sách Excel gồm 3 cột: Họ tên, Lớp, Ngày sinh!'
      );
      return;
    }
    await onBulkSaveStudentAccounts(excelPreviewAccounts);
    setStudentError(null);
    setStudentNotice(
      `Đã nạp thành công ${excelPreviewAccounts.length} học sinh từ danh sách Excel và tự động sinh Tài khoản + Mật khẩu (${excelPreviewAccounts
        .map((s) => `${s.username}/${s.password}`)
        .slice(0, 3)
        .join(', ')})!`
    );
    window.setTimeout(() => setStudentNotice(null), 6000);
  };

  const handleBulkImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    const parsed = parseBulkStudentAccountsText(bulkText, stuClass || '9A1', 9);
    if (parsed.length === 0) {
      setStudentError(
        'Không tìm thấy dòng dữ liệu hợp lệ. Hãy nhập theo định dạng: Họ tên | Ngày sinh | Lớp học | Tài khoản | Mật khẩu.'
      );
      return;
    }
    await onBulkSaveStudentAccounts(parsed);
    setShowBulkModal(false);
    setStudentError(null);
    setStudentNotice(
      `Đã nạp thành công ${parsed.length} tài khoản học sinh vào danh sách lớp học!`
    );
    window.setTimeout(() => setStudentNotice(null), 4500);
  };

  const handleSaveEditedPassword = async (student: StudentAccount) => {
    if (!isAdmin || !editingPasswordVal.trim()) return;
    await onSaveStudentAccount({
      ...student,
      password: editingPasswordVal.trim(),
    });
    setEditingStudentId(null);
    setEditingPasswordVal('');
    setStudentNotice(
      `Đã cập nhật mật khẩu mới cho học sinh "${student.fullName}" (${student.username})!`
    );
    window.setTimeout(() => setStudentNotice(null), 3500);
  };

  const handleExportStudentAccountsCsv = () => {
    const csv = exportStudentAccountsToCsvString(
      filteredStudents,
      selectedClassFilter === 'ALL'
        ? 'Toàn trường'
        : `Lớp ${selectedClassFilter}`
    );
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Danh_Sach_Tai_Khoan_Hoc_Sinh_${
      selectedClassFilter === 'ALL' ? 'Toan_Truong' : selectedClassFilter
    }.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setStudentNotice(
      `Đã kết xuất danh sách ${filteredStudents.length} tài khoản học sinh ra tệp CSV!`
    );
    window.setTimeout(() => setStudentNotice(null), 3500);
  };

  // Reset all student passwords to 123456
  const handleResetAllStudentPasswords = () => {
    if (!isAdmin) {
      setStudentError(
        'Chỉ tài khoản Quản trị viên (admin) mới có quyền reset mật khẩu toàn bộ học sinh.'
      );
      return;
    }
    if (studentAccounts.length === 0) {
      setStudentError('Chưa có tài khoản học sinh nào trong hệ thống để đặt lại mật khẩu.');
      return;
    }
    setShowResetConfirmModal(true);
  };

  const confirmResetAllPasswords = async () => {
    setIsResettingPasswords(true);
    try {
      const updatedList: StudentAccount[] = studentAccounts.map((s) => ({
        ...s,
        password: '123456',
      }));
      await onBulkSaveStudentAccounts(updatedList);
      setShowResetConfirmModal(false);
      setStudentError(null);
      setStudentNotice(
        `Thành công: Đã đặt lại mật khẩu của toàn bộ ${updatedList.length} học sinh thành "123456" trên cơ sở dữ liệu Cloud Firestore!`
      );
      window.setTimeout(() => setStudentNotice(null), 6000);
    } catch (err) {
      setStudentError(
        `Lỗi khi reset mật khẩu học sinh: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    } finally {
      setIsResettingPasswords(false);
    }
  };

  return (
    <section
      id="admin-classroom-student-section"
      className="w-full mb-space-xl flex flex-col gap-space-lg print:hidden"
    >
      {/* Top Role & Permission Header */}
      <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-md border border-outline-variant/30 flex flex-wrap items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-md">
          <div className="w-12 h-12 rounded-xl bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-sm">
            <span className="material-symbols-outlined text-[26px]">
              groups_2
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-code-meta text-xs text-secondary font-bold uppercase tracking-wider">
                Quản Trị Lớp Học &amp; Danh Sách Tài Khoản Học Sinh (Cloud Firestore)
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full font-code-meta text-xs font-bold ${
                  isAdmin
                    ? 'bg-tertiary-container text-on-tertiary-container'
                    : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                {isAdmin
                  ? 'Quyền Quản Trị Viên (Toàn quyền Thêm / Sửa / Xóa)'
                  : `Quyền Giáo Viên Môn ${currentTeacher.subject} (Chỉ xem danh sách)`}
              </span>
            </div>
            <h2 className="font-headline-md text-headline-md text-primary mt-0.5">
              Quản Lý Lớp Học &amp; Tài Khoản Học Sinh (Họ tên, Ngày sinh, Lớp, Tài khoản, Mật khẩu)
            </h2>
          </div>
        </div>

        {/* Grade Filter Pills */}
        <div className="flex items-center gap-1.5 bg-surface-container p-1.5 rounded-xl flex-wrap">
          {(['ALL', 6, 7, 8, 9] as const).map((g) => {
            const active = selectedGradeFilter === g;
            return (
              <button
                key={String(g)}
                type="button"
                onClick={() => {
                  setSelectedGradeFilter(g);
                  setSelectedClassFilter('ALL');
                }}
                className={`px-3 py-1.5 rounded-lg font-label-md text-xs cursor-pointer transition-all ${
                  active
                    ? 'bg-primary text-on-primary font-bold shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {g === 'ALL' ? 'Tất cả Khối (6-9)' : `Khối ${g}`}
              </button>
            );
          })}
        </div>
      </div>

      {/* GRID: LEFT = CLASSROOM MANAGEMENT (4 COLS), RIGHT = STUDENT ACCOUNTS ROSTER (8 COLS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* LEFT COLUMN: QUẢN LÝ LỚP HỌC */}
        <div className="lg:col-span-4 bg-surface-container-lowest rounded-xl p-space-lg shadow-md flex flex-col gap-space-md">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-code-meta text-xs text-secondary font-bold uppercase">
                Danh Mục Lớp Học
              </span>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">
                1. Quản Lý Lớp Học ({filteredClassrooms.length} lớp)
              </h3>
            </div>
            <span className="material-symbols-outlined text-primary text-[24px]">
              meeting_room
            </span>
          </div>

          {isAdmin ? (
            <form
              id="formAddClassroom"
              onSubmit={handleAddClassroom}
              className="bg-surface-container-low p-space-md rounded-xl flex flex-col gap-2.5 border border-outline-variant/30"
            >
              <span className="font-label-md text-xs font-bold text-primary">
                + Thêm Lớp Học Mới
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="inputNewClassName"
                    className="font-code-meta text-[11px] text-on-surface-variant"
                  >
                    Tên lớp học *
                  </label>
                  <input
                    id="inputNewClassName"
                    type="text"
                    required
                    value={newClassName}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setNewClassName(val);
                      const m = val.match(/^([6789])/);
                      if (m) setNewClassGrade(Number(m[1]));
                    }}
                    placeholder="VD: 9A3, 8A2..."
                    className="px-2.5 py-1.5 rounded-lg bg-surface-container-lowest text-xs font-bold text-on-surface uppercase focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="selectNewClassGrade"
                    className="font-code-meta text-[11px] text-on-surface-variant"
                  >
                    Khối lớp *
                  </label>
                  <select
                    id="selectNewClassGrade"
                    value={newClassGrade}
                    onChange={(e) => setNewClassGrade(Number(e.target.value))}
                    className="px-2.5 py-1.5 rounded-lg bg-surface-container-lowest text-xs font-bold text-primary focus:outline-none"
                  >
                    {[6, 7, 8, 9].map((g) => (
                      <option key={g} value={g}>
                        Khối {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label
                  htmlFor="inputHomeroomTeacher"
                  className="font-code-meta text-[11px] text-on-surface-variant"
                >
                  Giáo viên chủ nhiệm
                </label>
                <input
                  id="inputHomeroomTeacher"
                  type="text"
                  value={newHomeroomTeacher}
                  onChange={(e) => setNewHomeroomTeacher(e.target.value)}
                  placeholder="VD: Cô Nguyễn Thị Lan"
                  className="px-2.5 py-1.5 rounded-lg bg-surface-container-lowest text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {classroomError && (
                <div className="p-2 rounded bg-error-container text-on-error-container text-xs">
                  {classroomError}
                </div>
              )}
              {classroomNotice && (
                <div className="p-2 rounded bg-tertiary-container text-on-tertiary text-xs font-semibold">
                  {classroomNotice}
                </div>
              )}

              <button
                id="btnAddClassroom"
                type="submit"
                className="w-full py-2 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-label-md text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">
                  add_circle
                </span>
                <span>Thêm Lớp Học Vào Hệ Thống</span>
              </button>
            </form>
          ) : (
            <div className="p-3 rounded-xl bg-surface-container-low text-xs text-on-surface-variant">
              Bạn đang đăng nhập bằng tài khoản{' '}
              <strong>{currentTeacher.fullName}</strong> (Giáo viên bộ môn{' '}
              <strong>{currentTeacher.subject}</strong>). Để thêm hoặc xóa lớp
              học, vui lòng đăng nhập tài khoản Quản trị (<strong>admin</strong>).
            </div>
          )}

          {/* Classroom Cards List */}
          <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
            {filteredClassrooms.map((cls) => {
              const countInClass = studentAccounts.filter(
                (s) => s.studentClass.toUpperCase() === cls.name.toUpperCase()
              ).length;
              const isSelected =
                selectedClassFilter.toUpperCase() === cls.name.toUpperCase();

              return (
                <div
                  key={cls.id}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-primary-fixed/40 border-primary shadow-sm'
                      : 'bg-surface-container-low border-outline-variant/20 hover:bg-surface-container'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClassFilter(
                        isSelected ? 'ALL' : cls.name.toUpperCase()
                      );
                      setStuClass(cls.name.toUpperCase());
                    }}
                    className="flex items-center gap-2.5 text-left flex-1 cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary text-on-primary font-headline-sm text-xs font-bold flex items-center justify-center shrink-0">
                      {cls.name}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-headline-sm text-sm text-on-surface font-bold">
                          Lớp {cls.name}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed font-code-meta text-[10px] font-bold">
                          Khối {cls.grade}
                        </span>
                      </div>
                      <span className="font-body-sm text-xs text-on-surface-variant truncate">
                        GVCN: {cls.homeroomTeacher} •{' '}
                        <strong className="text-primary">
                          {countInClass} học sinh
                        </strong>
                      </span>
                    </div>
                  </button>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => onDeleteClassroom(cls.id)}
                      aria-label={`Xóa lớp ${cls.name}`}
                      className="p-1.5 rounded-lg text-error hover:bg-error-container/40 cursor-pointer"
                      title={`Xóa lớp ${cls.name}`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        delete
                      </span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: QUẢN LÝ DANH SÁCH TÀI KHOẢN HỌC SINH */}
        <div className="lg:col-span-8 bg-surface-container-lowest rounded-xl p-space-lg shadow-md flex flex-col gap-space-md">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-code-meta text-xs text-secondary font-bold uppercase">
                Cấp Tài Khoản &amp; Mật Khẩu Dự Thi Cho Học Sinh
              </span>
              <h3 className="font-headline-sm text-headline-sm text-on-surface">
                2. Danh Sách Tài Khoản Học Sinh ({filteredStudents.length} tài khoản)
              </h3>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {isAdmin && (
                <>
                  <button
                    id="btnOpenExcelStudentModal"
                    type="button"
                    onClick={() => setShowExcelModal((prev) => !prev)}
                    className="px-3.5 py-1.5 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-label-md text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      table_view
                    </span>
                    <span>
                      {showExcelModal
                        ? 'Thu gọn Nạp Excel Tự Sinh TK/MK'
                        : '+ Nạp DS Học Sinh Theo Excel (Tự Sinh TK & MK)'}
                    </span>
                  </button>
                  <button
                    id="btnOpenBulkStudentModal"
                    type="button"
                    onClick={() => setShowBulkModal((prev) => !prev)}
                    className="px-3 py-1.5 rounded-lg bg-secondary text-on-secondary hover:bg-secondary-container font-label-md text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      group_add
                    </span>
                    <span>
                      {showBulkModal
                        ? 'Đóng Nạp Thủ Công'
                        : '+ Nạp Nhanh Thủ Công'}
                    </span>
                  </button>
                  <button
                    id="btnResetAllStudentPasswords"
                    type="button"
                    onClick={handleResetAllStudentPasswords}
                    className="px-3.5 py-1.5 rounded-lg bg-error-container text-on-error-container hover:bg-error hover:text-on-error font-label-md text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                    title="Đặt lại mật khẩu toàn bộ học sinh về 123456"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      lock_reset
                    </span>
                    <span>Reset Mật Khẩu Toàn Bộ HS (123456)</span>
                  </button>
                  {onRestoreDefaultSystemData && (
                    <button
                      id="btnRestoreDefaultRosterData"
                      type="button"
                      onClick={async () => {
                        if (
                          window.confirm(
                            'Xác nhận khôi phục đầy đủ danh sách Lớp học, Tài khoản Giáo viên và Học sinh mặc định từ hệ thống?'
                          )
                        ) {
                          await onRestoreDefaultSystemData();
                          setStudentNotice(
                            'Thành công: Đã khôi phục toàn bộ dữ liệu Tài khoản Giáo viên, Học sinh và Lớp học lên Cloud Firestore!'
                          );
                          window.setTimeout(() => setStudentNotice(null), 5000);
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-label-md text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                      title="Khôi phục danh sách Lớp học & Tài khoản mặc định"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        settings_backup_restore
                      </span>
                      <span>Khôi Phục TK Mặc Định</span>
                    </button>
                  )}
                </>
              )}
              <button
                id="btnExportStudentAccountsCsv"
                type="button"
                onClick={handleExportStudentAccountsCsv}
                className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">
                  download
                </span>
                <span>Xuất CSV TK Học Sinh</span>
              </button>
            </div>
          </div>

          {/* EXCEL STUDENT IMPORT PANEL (3 FIELDS: HỌ TÊN, LỚP, NGÀY SINH -> AUTO GENERATE USERNAME & PASSWORD) */}
          {isAdmin && showExcelModal && (
            <form
              id="excel-student-import-panel"
              onSubmit={handleExcelImportSubmit}
              className="bg-primary-fixed/20 p-space-md rounded-xl border-2 border-primary/30 flex flex-col gap-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-outline-variant/30">
                <div>
                  <span className="px-2 py-0.5 rounded bg-primary text-on-primary font-code-meta text-[11px] font-bold uppercase">
                    TÍNH NĂNG MỚI • NẠP DANH SÁCH HỌC SINH THEO EXCEL (3 TRƯỜNG)
                  </span>
                  <h4 className="font-headline-sm text-sm text-primary font-bold mt-1">
                    Nạp Tài Khoản Học Sinh Theo Danh Sách Excel Gồm: Họ tên, Lớp, Ngày sinh (Tài khoản &amp; Mật khẩu sinh tự động)
                  </h4>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    ref={excelFileInputRef}
                    id="inputExcelStudentFile"
                    type="file"
                    accept=".xlsx,.xls,.csv,.tsv,.txt"
                    className="hidden"
                    onChange={handleExcelFileUpload}
                  />
                  <button
                    id="btnUploadExcelStudentFile"
                    type="button"
                    onClick={() => excelFileInputRef.current?.click()}
                    className="px-3 py-1.5 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-label-md text-xs font-bold flex items-center gap-1 cursor-pointer shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      upload_file
                    </span>
                    <span>
                      {excelUploadedFileName
                        ? `Tệp: ${excelUploadedFileName}`
                        : 'Chọn File Excel (.XLSX / .XLS / .CSV)'}
                    </span>
                  </button>

                  <button
                    id="btnDownloadSampleExcelTemplate"
                    type="button"
                    onClick={handleDownloadSampleExcelTemplate}
                    className="px-3 py-1.5 rounded-lg bg-surface-container-lowest text-primary border border-primary/30 hover:bg-surface-container font-label-md text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      download
                    </span>
                    <span>Tải File Excel Mẫu (3 Cột)</span>
                  </button>

                  <button
                    id="btnRegenerateExcelPasswords"
                    type="button"
                    onClick={() =>
                      setExcelPasswordSeed((prev) => prev + 137)
                    }
                    className="px-3 py-1.5 rounded-lg bg-secondary text-on-secondary font-label-md text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      autorenew
                    </span>
                    <span>Sinh Lại Mật Khẩu Ngẫu Nhiên</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
                {/* Left: Raw Excel Input (Copy-paste from Excel or uploaded file content) */}
                <div className="lg:col-span-5 flex flex-col gap-1">
                  <label
                    htmlFor="textareaExcelStudentInput"
                    className="font-code-meta text-xs text-on-surface font-semibold"
                  >
                    1. Dữ liệu bảng Excel 3 cột (Họ tên — Lớp — Ngày sinh):
                  </label>
                  <textarea
                    id="textareaExcelStudentInput"
                    rows={5}
                    value={excelRawText}
                    onChange={(e) => setExcelRawText(e.target.value)}
                    placeholder="Dán trực tiếp 3 cột từ Excel: Họ tên [Tab] Lớp [Tab] Ngày sinh"
                    className="w-full p-2.5 rounded-lg bg-surface-container-lowest font-code-meta text-xs text-on-surface border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <span className="font-body-sm text-[11px] text-on-surface-variant">
                    Hỗ trợ dán trực tiếp vùng chọn 3 cột từ Microsoft Excel / Google Sheets hoặc chọn tệp .xlsx, .xls, .csv.
                  </span>
                </div>

                {/* Right: Live Preview of Auto-Generated Accounts & Passwords */}
                <div className="lg:col-span-7 flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="font-code-meta text-xs text-primary font-bold">
                      2. Xem Trước Tài Khoản &amp; Mật Khẩu Sinh Tự Động ({excelPreviewAccounts.length} học sinh):
                    </span>
                    <span className="font-code-meta text-[11px] text-secondary font-bold">
                      Tự động nhận diện Khối 6, 7, 8, 9 từ tên Lớp
                    </span>
                  </div>
                  <div className="overflow-x-auto max-h-[160px] overflow-y-auto rounded-lg border border-outline-variant/30 bg-surface-container-lowest">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-surface-container-highest/60 text-on-surface-variant font-label-md text-[11px] uppercase">
                          <th className="py-1.5 px-2.5">Họ tên</th>
                          <th className="py-1.5 px-2 text-center">Lớp</th>
                          <th className="py-1.5 px-2 text-center">Ngày sinh</th>
                          <th className="py-1.5 px-2.5 text-primary">
                            Tài khoản (Tự sinh)
                          </th>
                          <th className="py-1.5 px-2.5 text-secondary">
                            Mật khẩu (Tự sinh)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/20 font-code-meta text-xs">
                        {excelPreviewAccounts.map((acc) => (
                          <tr key={acc.username}>
                            <td className="py-1.5 px-2.5 font-body-sm font-semibold text-on-surface">
                              {acc.fullName}
                            </td>
                            <td className="py-1.5 px-2 text-center font-bold text-primary">
                              {acc.studentClass} (K{acc.grade})
                            </td>
                            <td className="py-1.5 px-2 text-center text-on-surface-variant">
                              {acc.dateOfBirth}
                            </td>
                            <td className="py-1.5 px-2.5 font-bold text-primary">
                              {acc.username}
                            </td>
                            <td className="py-1.5 px-2.5 font-bold text-secondary">
                              {acc.password}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                <span className="font-code-meta text-xs text-on-surface-variant">
                  Hệ thống tự động kiểm tra trùng lặp và cấp mã Tài khoản + Mật khẩu 6 chữ số riêng biệt cho từng học sinh.
                </span>
                <button
                  id="btnConfirmExcelStudentImport"
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-label-md text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    cloud_upload
                  </span>
                  <span>
                    Nạp Danh Sách Excel &amp; Cấp Tự Động ({excelPreviewAccounts.length} Tài Khoản Học Sinh)
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* Form Add Single Student Account (Only for Admin) */}
          {isAdmin && (
            <form
              id="formAddStudentAccount"
              onSubmit={handleAddStudentAccount}
              className="bg-surface-container-low p-space-md rounded-xl border border-outline-variant/30 flex flex-col gap-3"
            >
              <div className="flex items-center justify-between flex-wrap gap-1">
                <span className="font-label-md text-xs font-bold text-primary">
                  + Thêm 1 Học Sinh Lẻ (Nhập Họ tên, Ngày sinh, Lớp học → Tự động gợi ý Tài khoản &amp; Mật khẩu)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (stuFullName.trim()) {
                      setStuUsername(
                        suggestStudentUsername(stuFullName, stuClass)
                      );
                    }
                    setStuPassword(
                      generateAutoStudentPassword(
                        studentAccounts.length + 1,
                        Date.now() % 10000
                      )
                    );
                  }}
                  className="font-code-meta text-[11px] text-secondary font-bold underline cursor-pointer"
                >
                  Sinh tự động TK &amp; MK mới
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="inputStudentFullName"
                    className="font-code-meta text-[11px] text-on-surface font-semibold"
                  >
                    1. Họ và tên *
                  </label>
                  <input
                    id="inputStudentFullName"
                    type="text"
                    required
                    value={stuFullName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setStuFullName(val);
                      if (val.trim()) {
                        setStuUsername(suggestStudentUsername(val, stuClass));
                      }
                    }}
                    placeholder="VD: Nguyễn Văn Nam"
                    className="px-2.5 py-2 rounded-lg bg-surface-container-lowest text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="inputStudentDob"
                    className="font-code-meta text-[11px] text-on-surface font-semibold"
                  >
                    2. Ngày sinh *
                  </label>
                  <input
                    id="inputStudentDob"
                    type="text"
                    required
                    value={stuDob}
                    onChange={(e) => setStuDob(e.target.value)}
                    placeholder="VD: 15/05/2013"
                    className="px-2.5 py-2 rounded-lg bg-surface-container-lowest text-xs font-code-meta text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="selectStudentClass"
                    className="font-code-meta text-[11px] text-on-surface font-semibold"
                  >
                    3. Lớp học *
                  </label>
                  <select
                    id="selectStudentClass"
                    value={stuClass}
                    onChange={(e) => {
                      const nextCls = e.target.value;
                      setStuClass(nextCls);
                      if (stuFullName.trim()) {
                        setStuUsername(
                          suggestStudentUsername(stuFullName, nextCls)
                        );
                      }
                    }}
                    className="px-2.5 py-2 rounded-lg bg-surface-container-lowest text-xs font-bold text-primary focus:outline-none"
                  >
                    {classrooms.map((c) => (
                      <option key={c.id} value={c.name}>
                        Lớp {c.name} (Khối {c.grade})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="inputStudentUsername"
                    className="font-code-meta text-[11px] text-on-surface font-semibold"
                  >
                    4. Tài khoản (Tự sinh) *
                  </label>
                  <input
                    id="inputStudentUsername"
                    type="text"
                    required
                    value={stuUsername}
                    onChange={(e) => setStuUsername(e.target.value)}
                    placeholder="Tự động sinh từ Họ tên + Lớp"
                    className="px-2.5 py-2 rounded-lg bg-surface-container-lowest text-xs font-code-meta font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label
                    htmlFor="inputStudentPassword"
                    className="font-code-meta text-[11px] text-on-surface font-semibold"
                  >
                    5. Mật khẩu (Tự sinh) *
                  </label>
                  <input
                    id="inputStudentPassword"
                    type="text"
                    required
                    value={stuPassword}
                    onChange={(e) => setStuPassword(e.target.value)}
                    placeholder="Mật khẩu tự sinh"
                    className="px-2.5 py-2 rounded-lg bg-surface-container-lowest text-xs font-code-meta font-bold text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  {studentError && (
                    <span className="text-xs text-error font-semibold">
                      {studentError}
                    </span>
                  )}
                  {studentNotice && (
                    <span
                      id="student-account-saved-notice"
                      className="text-xs text-on-tertiary-container font-semibold"
                    >
                      {studentNotice}
                    </span>
                  )}
                </div>
                <button
                  id="btnSubmitCreateStudentAccount"
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-label-md text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    person_add
                  </span>
                  <span>Lưu &amp; Cấp Tài Khoản Học Sinh</span>
                </button>
              </div>
            </form>
          )}

          {/* Bulk Student Import Panel */}
          {isAdmin && showBulkModal && (
            <form
              onSubmit={handleBulkImportSubmit}
              className="bg-secondary-fixed/20 p-space-md rounded-xl border border-secondary/30 flex flex-col gap-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-label-md text-xs font-bold text-primary">
                  Nạp Nhanh Danh Sách Học Sinh Thủ Công (Mỗi học sinh 1 dòng: Họ tên | Ngày sinh | Lớp học | Tài khoản | Mật khẩu)
                </span>
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="text-xs text-on-surface-variant underline cursor-pointer"
                >
                  Đóng
                </button>
              </div>
              <textarea
                id="textareaBulkStudentAccounts"
                rows={4}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                className="w-full p-2.5 rounded-lg bg-surface-container-lowest font-code-meta text-xs text-on-surface focus:outline-none"
              />
              <div className="flex justify-end">
                <button
                  id="btnConfirmBulkStudentImport"
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-secondary text-on-secondary font-label-md text-xs font-bold cursor-pointer"
                >
                  Nạp Danh Sách Học Sinh Vào Hệ Thống
                </button>
              </div>
            </form>
          )}

          {/* Filter & Search Bar for Student Roster */}
          <div className="flex flex-col gap-2.5 bg-surface-container-low p-3 rounded-xl border border-outline-variant/20">
            {/* Grade Selector */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-code-meta text-xs font-bold text-on-surface-variant flex items-center gap-1 shrink-0">
                <span className="material-symbols-outlined text-[16px] text-primary">filter_alt</span>
                Lọc Theo Khối:
              </span>
              {(['ALL', 6, 7, 8, 9] as const).map((g) => {
                const count =
                  g === 'ALL'
                    ? studentAccounts.length
                    : studentAccounts.filter((s) => s.grade === g).length;
                return (
                  <button
                    key={String(g)}
                    type="button"
                    onClick={() => {
                      setSelectedGradeFilter(g);
                      setSelectedClassFilter('ALL');
                    }}
                    className={`px-2.5 py-1 rounded-lg font-code-meta text-xs font-bold cursor-pointer transition-all ${
                      selectedGradeFilter === g
                        ? 'bg-primary text-on-primary shadow-xs'
                        : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    {g === 'ALL' ? 'Tất cả khối' : `Khối ${g}`} ({count})
                  </button>
                );
              })}
            </div>

            {/* Class Selector & Search Input */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-outline-variant/15">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-code-meta text-xs font-bold text-on-surface-variant shrink-0">
                  Lọc Theo Lớp:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedClassFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg font-code-meta text-xs font-bold cursor-pointer transition-all ${
                    selectedClassFilter === 'ALL'
                      ? 'bg-secondary text-on-secondary shadow-xs'
                      : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-high'
                  }`}
                >
                  Tất cả lớp ({selectedGradeFilter === 'ALL' ? studentAccounts.length : studentAccounts.filter((s) => s.grade === selectedGradeFilter).length})
                </button>
                {filteredClassrooms.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedClassFilter(c.name)}
                    className={`px-2.5 py-1 rounded-lg font-code-meta text-xs font-bold cursor-pointer transition-all ${
                      selectedClassFilter.toUpperCase() === c.name.toUpperCase()
                        ? 'bg-secondary text-on-secondary shadow-xs'
                        : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>

              <div className="relative min-w-[220px]">
                <input
                  type="text"
                  aria-label="Tìm kiếm tài khoản học sinh"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Tìm họ tên, ngày sinh, tài khoản..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-surface-container-lowest text-xs text-on-surface border border-outline-variant/20 focus:outline-none focus:ring-2 focus:ring-primary font-code-meta"
                />
                <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">
                  search
                </span>
              </div>
            </div>
          </div>

          {/* Student Accounts Table with STICKY HEADER */}
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto relative rounded-xl border border-outline-variant/20 shadow-inner">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-surface-container-high shadow-xs">
                <tr className="text-on-surface font-label-md text-xs uppercase font-bold border-b border-outline-variant/30">
                  <th className="py-2.5 px-3 text-center bg-surface-container-high">STT</th>
                  <th className="py-2.5 px-3 bg-surface-container-high">Họ và Tên Học Sinh</th>
                  <th className="py-2.5 px-3 text-center bg-surface-container-high">Ngày Sinh</th>
                  <th className="py-2.5 px-3 text-center bg-surface-container-high">Lớp Học</th>
                  <th className="py-2.5 px-3 bg-surface-container-high">Tài Khoản</th>
                  <th className="py-2.5 px-3 bg-surface-container-high">Mật Khẩu</th>
                  {isAdmin && (
                    <th className="py-2.5 px-3 text-center bg-surface-container-high">Quản Trị</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20 font-body-sm text-xs bg-surface-container-lowest">
                {filteredStudents.map((stu, idx) => (
                  <tr
                    key={stu.id}
                    className="hover:bg-surface-container-low transition-colors"
                  >
                    <td className="py-2.5 px-3 text-center font-code-meta">
                      {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                    </td>
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
                    <td className="py-2.5 px-3 font-code-meta">
                      {editingStudentId === stu.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            aria-label={`Mật khẩu mới cho ${stu.fullName}`}
                            value={editingPasswordVal}
                            onChange={(e) =>
                              setEditingPasswordVal(e.target.value)
                            }
                            className="w-24 px-2 py-1 rounded bg-surface-container-lowest border border-primary text-xs font-code-meta"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEditedPassword(stu)}
                            className="px-2 py-1 rounded bg-primary text-on-primary text-[11px] font-bold cursor-pointer"
                          >
                            Lưu
                          </button>
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-surface-container text-secondary font-bold">
                          {stu.password}
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingStudentId(stu.id);
                              setEditingPasswordVal(stu.password);
                            }}
                            className="p-1 rounded bg-surface-container text-primary hover:bg-surface-container-high cursor-pointer"
                            title="Đổi mật khẩu học sinh"
                          >
                            <span className="material-symbols-outlined text-[15px]">
                              key
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteStudentAccount(stu.id)}
                            className="p-1 rounded bg-surface-container text-error hover:bg-error-container/40 cursor-pointer"
                            title="Xóa tài khoản học sinh"
                          >
                            <span className="material-symbols-outlined text-[15px]">
                              delete
                            </span>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal xác nhận Reset toàn bộ mật khẩu học sinh thành 123456 */}
      {showResetConfirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="bg-surface-container-high rounded-2xl p-6 max-w-md w-full border border-outline-variant/30 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3 text-amber-500">
              <div className="p-2.5 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">lock_reset</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-on-surface">
                  Xác nhận Reset Mật Khẩu
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Áp dụng cho toàn bộ học sinh trong trường
                </p>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-on-surface flex flex-col gap-1.5">
              <p className="font-semibold text-amber-600 dark:text-amber-400">
                Thao tác này sẽ đặt lại mật khẩu của toàn bộ <strong>{studentAccounts.length}</strong> học sinh thành mặc định:
              </p>
              <div className="bg-surface-container-lowest px-3 py-2 rounded-lg font-mono font-bold text-sm text-center text-primary tracking-widest border border-outline-variant/20">
                123456
              </div>
              <p className="text-[11px] text-on-surface-variant">
                Mật khẩu mới sẽ được cập nhật đồng bộ trực tiếp lên cơ sở dữ liệu Cloud Firestore. Học sinh có thể dùng mật khẩu <strong>123456</strong> để đăng nhập ngay sau khi hoàn tất.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                disabled={isResettingPasswords}
                className="px-4 py-2 rounded-xl bg-surface-container-low text-on-surface hover:bg-surface-container font-semibold text-xs cursor-pointer transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                id="btnConfirmResetAllPasswords"
                type="button"
                onClick={confirmResetAllPasswords}
                disabled={isResettingPasswords}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-md disabled:opacity-50"
              >
                {isResettingPasswords ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">
                      progress_activity
                    </span>
                    <span>Đang cập nhật Firestore...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">
                      check_circle
                    </span>
                    <span>Đồng ý Reset (123456)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

