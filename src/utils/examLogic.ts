import JSZip from 'jszip';

export type ScreenId =
  | 'cong-vao-thi'
  | 'phong-thi-truc-tuyen'
  | 'ket-qua-bang-diem'
  | 'khu-vuc-quan-tri';

export type SubjectKey =
  | 'Tin'
  | 'Toán'
  | 'Văn'
  | 'Anh'
  | 'Sử'
  | 'Địa'
  | 'Công Nghệ'
  | 'GDCD'
  | 'Lý'
  | 'Hoá'
  | 'Sinh';

export interface SubjectMeta {
  key: SubjectKey;
  label: string;
  codePrefix: string;
  icon: string;
}

export const THCS_SUBJECTS: SubjectMeta[] = [
  { key: 'Tin', label: 'Tin học', codePrefix: 'TIN', icon: 'computer' },
  { key: 'Toán', label: 'Toán học', codePrefix: 'TOAN', icon: 'calculate' },
  { key: 'Văn', label: 'Ngữ văn', codePrefix: 'VAN', icon: 'menu_book' },
  { key: 'Anh', label: 'Tiếng Anh', codePrefix: 'ANH', icon: 'translate' },
  { key: 'Sử', label: 'Lịch sử', codePrefix: 'SU', icon: 'history_edu' },
  { key: 'Địa', label: 'Địa lý', codePrefix: 'DIA', icon: 'public' },
  {
    key: 'Công Nghệ',
    label: 'Công nghệ',
    codePrefix: 'CN',
    icon: 'precision_manufacturing',
  },
  { key: 'GDCD', label: 'GDCD', codePrefix: 'GDCD', icon: 'gavel' },
  { key: 'Lý', label: 'Vật lý', codePrefix: 'LY', icon: 'bolt' },
  { key: 'Hoá', label: 'Hóa học', codePrefix: 'HOA', icon: 'science' },
  { key: 'Sinh', label: 'Sinh học', codePrefix: 'SINH', icon: 'biotech' },
];

export function normalizeSubjectKey(raw?: string | SubjectMeta): SubjectKey {
  if (!raw) return 'Toán';
  if (typeof raw === 'object' && 'key' in raw) return raw.key;
  const trimmed = String(raw).trim();
  const exact = THCS_SUBJECTS.find(
    (s) =>
      s.key.toLowerCase() === trimmed.toLowerCase() ||
      s.label.toLowerCase() === trimmed.toLowerCase() ||
      s.codePrefix.toLowerCase() === trimmed.toLowerCase()
  );
  if (exact) return exact.key;
  const lower = trimmed.toLowerCase();
  if (lower.includes('tin')) return 'Tin';
  if (lower.includes('toán') || lower.includes('đại') || lower.includes('hình'))
    return 'Toán';
  if (lower.includes('văn')) return 'Văn';
  if (lower.includes('anh') || lower.includes('english')) return 'Anh';
  if (lower.includes('sử')) return 'Sử';
  if (lower.includes('địa')) return 'Địa';
  if (lower.includes('công nghệ')) return 'Công Nghệ';
  if (lower.includes('gdcd') || lower.includes('công dân')) return 'GDCD';
  if (lower.includes('lý') || lower.includes('lí')) return 'Lý';
  if (lower.includes('hoá') || lower.includes('hóa')) return 'Hoá';
  if (lower.includes('sinh')) return 'Sinh';
  return 'Toán';
}

export function getSubjectMeta(subject: SubjectKey | string): SubjectMeta {
  const key = normalizeSubjectKey(subject);
  return THCS_SUBJECTS.find((s) => s.key === key) || THCS_SUBJECTS[1];
}

export interface TeacherAccount {
  id: string;
  username: string;
  fullName: string;
  subject: SubjectKey | 'ALL';
  passcode: string;
  role: 'teacher' | 'admin';
  assignedClasses?: string[];
}

export const LEGACY_DEMO_TEACHER_IDS = new Set<string>([
  'teacher-tin-01',
  'teacher-toan-01',
  'teacher-van-01',
  'teacher-anh-01',
  'teacher-ly-01',
  'teacher-hoa-01',
  'teacher-sinh-01',
  'teacher-su-01',
  'teacher-dia-01',
  'teacher-congnghe-01',
  'teacher-gdcd-01',
]);
export const LEGACY_DEMO_TEACHER_USERNAMES = new Set<string>([
  'gv.tin',
  'gv.toan',
  'gv.van',
  'gv.anh',
  'gv.ly',
  'gv.hoa',
  'gv.sinh',
  'gv.su',
  'gv.dia',
  'gv.congnghe',
  'gv.gdcd',
]);

export function isLegacyDemoTeacherAccount(
  account?: Partial<TeacherAccount> | null
): boolean {
  if (!account) return false;
  if (account.id && LEGACY_DEMO_TEACHER_IDS.has(account.id)) return true;
  if (
    account.username &&
    LEGACY_DEMO_TEACHER_USERNAMES.has(account.username.toLowerCase())
  ) {
    return true;
  }
  return false;
}

export const DEFAULT_TEACHER_ACCOUNTS: TeacherAccount[] = [
  {
    id: 'admin-master',
    username: 'admin',
    fullName: 'Ban Giám Hiệu & Quản Trị Hệ Thống',
    subject: 'ALL',
    passcode: '123',
    role: 'admin',
  },
];

export interface ClassroomRecord {
  id: string;
  name: string;
  grade: number;
  homeroomTeacher: string;
  schoolYear: string;
  createdAt: string;
}

export const DEFAULT_CLASSROOMS: ClassroomRecord[] = [
  // Khối 6: 6A10, 6A11, 6A12, 6A13
  {
    id: 'class-6a10',
    name: '6A10',
    grade: 6,
    homeroomTeacher: '',
    schoolYear: '2024 - 2025',
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'class-6a11',
    name: '6A11',
    grade: 6,
    homeroomTeacher: '',
    schoolYear: '2024 - 2025',
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'class-6a12',
    name: '6A12',
    grade: 6,
    homeroomTeacher: '',
    schoolYear: '2024 - 2025',
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'class-6a13',
    name: '6A13',
    grade: 6,
    homeroomTeacher: '',
    schoolYear: '2024 - 2025',
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  // Khối 7: 7A10, 7A11, 7A12, 7A13
  {
    id: 'class-7a10',
    name: '7A10',
    grade: 7,
    homeroomTeacher: '',
    schoolYear: '2024 - 2025',
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'class-7a11',
    name: '7A11',
    grade: 7,
    homeroomTeacher: '',
    schoolYear: '2024 - 2025',
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'class-7a12',
    name: '7A12',
    grade: 7,
    homeroomTeacher: '',
    schoolYear: '2024 - 2025',
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'class-7a13',
    name: '7A13',
    grade: 7,
    homeroomTeacher: '',
    schoolYear: '2024 - 2025',
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  // Khối 8: 8A11, 8A12, 8A13
  {
    id: 'class-8a11',
    name: '8A11',
    grade: 8,
    homeroomTeacher: '',
    schoolYear: '2024 - 2025',
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'class-8a12',
    name: '8A12',
    grade: 8,
    homeroomTeacher: '',
    schoolYear: '2024 - 2025',
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'class-8a13',
    name: '8A13',
    grade: 8,
    homeroomTeacher: '',
    schoolYear: '2024 - 2025',
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  // Khối 9: 9A13, 9A14, 9A15, 9A16
  {
    id: 'class-9a13',
    name: '9A13',
    grade: 9,
    homeroomTeacher: '',
    schoolYear: '2024 - 2025',
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'class-9a14',
    name: '9A14',
    grade: 9,
    homeroomTeacher: '',
    schoolYear: '2024 - 2025',
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'class-9a15',
    name: '9A15',
    grade: 9,
    homeroomTeacher: '',
    schoolYear: '2024 - 2025',
    createdAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'class-9a16',
    name: '9A16',
    grade: 9,
    homeroomTeacher: '',
    schoolYear: '2024 - 2025',
    createdAt: '2025-01-01T00:00:00.000Z',
  },
];

export interface StudentAccount {
  id: string;
  fullName: string;
  dateOfBirth: string;
  studentClass: string;
  grade: number;
  username: string;
  password: string;
  createdAt: string;
}

export const DEFAULT_STUDENT_ACCOUNTS: StudentAccount[] = [];

export interface StudentRegistration {
  grade: number;
  studentClass: string;
  selectedSubject: SubjectKey;
  sbd: string; // Automatically populated from student username / class + subject so Firestore rules remain satisfied
  fullName: string;
  dateOfBirth?: string;
  studentUsername?: string;
  studentAccountId?: string;
  honorCommitted: boolean;
}

export interface MultipleChoiceOption {
  key: 'A' | 'B' | 'C' | 'D';
  text: string;
}

export interface ExamQuestion {
  id: number;
  subject: string;
  type: 'mcq' | 'fill' | 'short';
  points: number;
  prompt: string;
  codeFormula?: string;
  options?: MultipleChoiceOption[];
  correctAnswer?: 'A' | 'B' | 'C' | 'D';
  explanation?: string;
}

export interface FillBlankQuestion {
  promptTemplate: string; // Uses [1], [2], ..., [N] placeholders
  blanks: string[];
  points: number;
}

export interface ShortAnswerQuestion {
  prompt: string;
  requirement: string;
  keywords: string[];
  sampleAnswer: string;
  points: number;
}

export interface ExamScheduleParts {
  hour: number; // 0-23
  minute: number; // 0-59
  date: string; // YYYY-MM-DD
}

export interface ExamBankData {
  id: string;
  code: string;
  title: string;
  subject: string;
  subjectCode?: SubjectKey;
  grade: number;
  durationMinutes: number;
  questions: ExamQuestion[];
  fillQuestion: FillBlankQuestion;
  shortQuestion: ShortAnswerQuestion;
  createdAt: string;
  createdBy?: string;
  teacherId?: string;
  teacherUsername?: string;
  teacherName?: string;
  assignedClasses?: string[];
  isActive?: boolean;
  isAssigned?: boolean;
  startAt?: string;
  endAt?: string;
}

export interface StudentRecord {
  stt: string;
  id: string;
  sbd?: string;
  studentUsername?: string;
  dateOfBirth?: string;
  subject?: SubjectKey | string;
  name: string;
  badge?: 'NGHI VẤN AI' | 'Cảnh báo';
  grade: number;
  className: string;
  examId?: string;
  examCode?: string;
  examTitle?: string;
  teacherId?: string;
  teacherUsername?: string;
  teacherName?: string;
  duration: string;
  durationSeconds: number;
  tabLeaves: number;
  reEntryCount?: number;
  warningText: string;
  warningType: 'ai-suspect' | 'tab-warning' | 'fullscreen-exit' | 'clean';
  rawScore: number;
  penaltyScore?: number;
  penaltyText: string;
  finalScore: number;
  rank?: string;
  status: 'Tạm giữ chấm' | 'Đã trừ điểm' | 'Hợp lệ' | 'Đạt chuẩn';
  shortAnswerScore?: number;
  shortAnswerFeedback?: string;
  shortAnswerGradedBy?: string;
  submittedAt?: string;
  answersJson?: string;
}

/**
 * Schedule helpers for exam assignment (Giờ, Phút, Ngày bắt đầu -> Giờ, Phút, Ngày kết thúc).
 */
export function buildIsoFromScheduleParts(parts: ExamScheduleParts): string {
  const safeHour = Math.max(0, Math.min(23, Math.floor(Number(parts.hour) || 0)));
  const safeMinute = Math.max(
    0,
    Math.min(59, Math.floor(Number(parts.minute) || 0))
  );
  const datePart =
    parts.date && /^\d{4}-\d{2}-\d{2}$/.test(parts.date.trim())
      ? parts.date.trim()
      : new Date().toISOString().slice(0, 10);
  const hh = safeHour < 10 ? `0${safeHour}` : `${safeHour}`;
  const mm = safeMinute < 10 ? `0${safeMinute}` : `${safeMinute}`;
  const localConstructed = new Date(`${datePart}T${hh}:${mm}:00`);
  if (Number.isNaN(localConstructed.getTime())) {
    return new Date().toISOString();
  }
  return localConstructed.toISOString();
}

export function parseIsoToScheduleParts(
  iso?: string,
  fallbackOffsetMinutes: number = 0
): ExamScheduleParts {
  const d = iso ? new Date(iso) : new Date(Date.now() + fallbackOffsetMinutes * 60000);
  const validDate = Number.isNaN(d.getTime())
    ? new Date(Date.now() + fallbackOffsetMinutes * 60000)
    : d;
  const yyyy = validDate.getFullYear();
  const mm = String(validDate.getMonth() + 1).padStart(2, '0');
  const dd = String(validDate.getDate()).padStart(2, '0');
  return {
    hour: validDate.getHours(),
    minute: validDate.getMinutes(),
    date: `${yyyy}-${mm}-${dd}`,
  };
}

export function formatSchedulePartsDisplay(parts: ExamScheduleParts): string {
  const hh = String(Math.max(0, Math.min(23, parts.hour))).padStart(2, '0');
  const min = String(Math.max(0, Math.min(59, parts.minute))).padStart(2, '0');
  const [yyyy, mm, dd] = (parts.date || '').split('-');
  if (yyyy && mm && dd) {
    return `${hh}:${min} ngày ${dd}/${mm}/${yyyy}`;
  }
  return `${hh}:${min} (${parts.date})`;
}

export function formatExamScheduleWindow(
  startAt?: string,
  endAt?: string
): string {
  if (!startAt && !endAt) {
    return 'Mở tự do (Chưa giới hạn khung giờ)';
  }
  const startStr = startAt
    ? formatSchedulePartsDisplay(parseIsoToScheduleParts(startAt))
    : 'Bất kỳ lúc nào';
  const endStr = endAt
    ? formatSchedulePartsDisplay(parseIsoToScheduleParts(endAt))
    : 'Không giới hạn';
  return `Bắt đầu: ${startStr} → Kết thúc: ${endStr}`;
}

export function checkExamScheduleStatus(
  exam: Pick<ExamBankData, 'startAt' | 'endAt' | 'isAssigned'>,
  nowMs: number = Date.now()
): {
  canTake: boolean;
  status: 'open' | 'upcoming' | 'expired';
  label: string;
} {
  const startMs = exam.startAt ? new Date(exam.startAt).getTime() : null;
  const endMs = exam.endAt ? new Date(exam.endAt).getTime() : null;

  if (startMs && !Number.isNaN(startMs) && nowMs < startMs) {
    const startParts = parseIsoToScheduleParts(exam.startAt);
    return {
      canTake: false,
      status: 'upcoming',
      label: `Chưa đến giờ mở đề (Mở lúc ${formatSchedulePartsDisplay(startParts)})`,
    };
  }

  if (endMs && !Number.isNaN(endMs) && nowMs > endMs) {
    const endParts = parseIsoToScheduleParts(exam.endAt);
    return {
      canTake: false,
      status: 'expired',
      label: `Đã hết hạn làm bài (Đóng lúc ${formatSchedulePartsDisplay(endParts)})`,
    };
  }

  return {
    canTake: true,
    status: 'open',
    label: exam.startAt || exam.endAt ? 'Đang trong thời gian mở đề thi' : 'Đang mở cho học sinh dự thi',
  };
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function formatTimer(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  const mStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
  const sStr = seconds < 10 ? `0${seconds}` : `${seconds}`;
  return `${mStr}:${sStr}`;
}

/**
 * Calculates the student's exam score.
 * Each tab violation / forced room closure & re-entry deducts 0.5 points.
 */
export function calculateExamScore(params: {
  multipleChoiceCorrect: number;
  totalMcqQuestions?: number;
  mcqPointsTotal?: number;
  fillBlankScore: number;
  shortAnswerScore: number;
  tabViolations: number;
  durationSeconds: number;
}): {
  rawScore: number;
  tabPenalty: number;
  fastSubmitPenalty: number;
  finalScore: number;
  rank: string;
  isFastSubmit: boolean;
} {
  const totalMcq =
    params.totalMcqQuestions && params.totalMcqQuestions > 0
      ? params.totalMcqQuestions
      : 10;
  const mcqPool =
    params.mcqPointsTotal && params.mcqPointsTotal > 0
      ? params.mcqPointsTotal
      : 5.0;
  const pointsPerMcq = mcqPool / totalMcq;
  const mcqScore = params.multipleChoiceCorrect * pointsPerMcq;

  const rawScore = Number(
    Math.min(
      10,
      mcqScore + params.fillBlankScore + params.shortAnswerScore
    ).toFixed(2)
  );
  // 0.5 points deducted per tab switch / exam re-entry
  const tabPenalty = Number((params.tabViolations * 0.5).toFixed(2));
  const isFastSubmit = params.durationSeconds < 60;
  const afterTab = Math.max(0, rawScore - tabPenalty);
  const fastSubmitPenalty = isFastSubmit
    ? Number((afterTab * 0.5).toFixed(2))
    : 0;
  const finalScore = Number(
    Math.max(0, afterTab - fastSubmitPenalty).toFixed(1)
  );

  let rank = 'TRUNG BÌNH';
  if (finalScore >= 8.0) {
    rank = 'GIỎI';
  } else if (finalScore >= 6.5) {
    rank = 'KHÁ';
  } else if (finalScore < 5.0) {
    rank = 'YẾU';
  }

  return {
    rawScore: Number(rawScore.toFixed(1)),
    tabPenalty: Number(tabPenalty.toFixed(1)),
    fastSubmitPenalty: Number(fastSubmitPenalty.toFixed(1)),
    finalScore,
    rank,
    isFastSubmit,
  };
}

export function evaluateStudentSubmission(params: {
  exam: ExamBankData;
  selectedAnswers: Record<number, 'A' | 'B' | 'C' | 'D'>;
  fillBlanks: string[];
  shortAnswer: string;
  tabViolations: number;
  durationSeconds: number;
  overrideShortAnswerScore?: number;
}): {
  correctMcqCount: number;
  fillBlankScore: number;
  shortAnswerScore: number;
  matchedKeywords: string[];
  rawScore: number;
  tabPenalty: number;
  fastSubmitPenalty: number;
  finalScore: number;
  rank: string;
  isFastSubmit: boolean;
} {
  const {
    exam,
    selectedAnswers,
    fillBlanks,
    shortAnswer,
    tabViolations,
    durationSeconds,
    overrideShortAnswerScore,
  } = params;
  let correctMcqCount = 0;
  for (const q of exam.questions) {
    if (selectedAnswers[q.id] === q.correctAnswer) {
      correctMcqCount++;
    }
  }

  // Evaluate fill blanks dynamically based on scanned blanks count
  const hasFillSection =
    Boolean(exam.fillQuestion?.promptTemplate?.trim()) &&
    Number(exam.fillQuestion?.points) > 0;
  const fillMax = hasFillSection ? Number(exam.fillQuestion.points) : 0;
  let fillBlankScore = 0;

  if (hasFillSection) {
    const expectedBlanks = (exam.fillQuestion.blanks || []).filter(
      (b) => typeof b === 'string'
    );
    const slotMatches = exam.fillQuestion.promptTemplate.match(/\[\d+\]/g);
    const totalSlots = Math.max(
      expectedBlanks.length,
      slotMatches ? slotMatches.length : 0,
      1
    );
    let matchedBlanks = 0;
    for (let i = 0; i < totalSlots; i++) {
      const studentVal = (fillBlanks[i] || '').trim().toLowerCase();
      const targetVal = (expectedBlanks[i] || '').trim().toLowerCase();
      if (studentVal && targetVal) {
        if (
          studentVal === targetVal ||
          targetVal.includes(studentVal) ||
          studentVal.includes(targetVal)
        ) {
          matchedBlanks++;
        }
      } else if (studentVal && !targetVal) {
        matchedBlanks++;
      }
    }
    fillBlankScore = Number(((matchedBlanks / totalSlots) * fillMax).toFixed(2));
  }

  // Evaluate short answer / essay by keywords + length or AI override
  const hasShortSection =
    Boolean(exam.shortQuestion?.prompt?.trim()) &&
    Number(exam.shortQuestion?.points) > 0;
  const shortMax = hasShortSection ? Number(exam.shortQuestion.points) : 0;
  const keywords = exam.shortQuestion?.keywords || [];
  const lowerShort = shortAnswer.trim().toLowerCase();
  const matchedKeywords = keywords.filter((kw) =>
    lowerShort.includes(kw.trim().toLowerCase())
  );

  let shortAnswerScore = 0;
  if (hasShortSection) {
    if (
      typeof overrideShortAnswerScore === 'number' &&
      !isNaN(overrideShortAnswerScore)
    ) {
      shortAnswerScore = Number(
        Math.min(shortMax, Math.max(0, overrideShortAnswerScore)).toFixed(2)
      );
    } else if (lowerShort.length > 0) {
      if (keywords.length > 0) {
        const ratio = matchedKeywords.length / keywords.length;
        shortAnswerScore = Number(
          Math.min(shortMax, Math.max(0.5, ratio * shortMax)).toFixed(2)
        );
      } else {
        shortAnswerScore =
          countWords(shortAnswer) >= 10
            ? shortMax
            : Number((shortMax * 0.5).toFixed(2));
      }
    }
  }

  const explicitMcqSum = Number(
    exam.questions.reduce((acc, q) => acc + (Number(q.points) || 0.5), 0).toFixed(2)
  );
  const remainingPool = Number((10 - fillMax - shortMax).toFixed(2));
  const mcqPointsTotal =
    exam.questions.length === 0
      ? 0
      : remainingPool > 0
      ? remainingPool
      : explicitMcqSum > 0
      ? explicitMcqSum
      : 5.0;

  const computed = calculateExamScore({
    multipleChoiceCorrect: correctMcqCount,
    totalMcqQuestions: exam.questions.length || 1,
    mcqPointsTotal,
    fillBlankScore,
    shortAnswerScore,
    tabViolations,
    durationSeconds,
  });

  return {
    correctMcqCount,
    fillBlankScore,
    shortAnswerScore,
    matchedKeywords,
    ...computed,
  };
}

export function filterAdminRoster(
  records: StudentRecord[],
  query: string,
  grade: number,
  className: string,
  statusFilter: string = 'ALL',
  subjectFilter: string = 'ALL',
  examIdFilter: string = 'ALL'
): StudentRecord[] {
  const q = query.trim().toLowerCase();
  return records.filter((r) => {
    if (grade > 0 && r.grade !== grade) return false;
    if (
      className &&
      className !== 'ALL' &&
      r.className.toUpperCase() !== className.toUpperCase()
    ) {
      return false;
    }
    if (subjectFilter && subjectFilter !== 'ALL') {
      const recSubj = normalizeSubjectKey(r.subject || r.examTitle || '');
      if (recSubj !== normalizeSubjectKey(subjectFilter)) {
        return false;
      }
    }
    if (examIdFilter && examIdFilter !== 'ALL') {
      if (r.examId !== examIdFilter && r.examCode !== examIdFilter) {
        return false;
      }
    }
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'VIOLATION' && r.warningType === 'clean')
        return false;
      if (statusFilter === 'CLEAN' && r.warningType !== 'clean') return false;
    }
    if (!q) return true;
    return (
      r.name.toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q) ||
      (r.sbd && r.sbd.toLowerCase().includes(q)) ||
      (r.subject && String(r.subject).toLowerCase().includes(q)) ||
      (r.examTitle && r.examTitle.toLowerCase().includes(q)) ||
      r.status.toLowerCase().includes(q)
    );
  });
}

export const INITIAL_EXAM_QUESTIONS: ExamQuestion[] = [
  {
    id: 1,
    subject: 'Toán',
    type: 'mcq',
    points: 0.5,
    prompt:
      'Cho phương trình bậc hai: x² - 5x + 6 = 0. Tập nghiệm S của phương trình đã cho là:',
    codeFormula: 'x² - 5x + 6 = 0',
    options: [
      { key: 'A', text: 'A. S = {-2; -3}' },
      { key: 'B', text: 'B. S = {2; 3}' },
      { key: 'C', text: 'C. S = {1; 6}' },
      { key: 'D', text: 'D. S = {-1; -6}' },
    ],
    correctAnswer: 'B',
    explanation:
      'Phương trình x² - 5x + 6 = 0 có (x - 2)(x - 3) = 0 nên tập nghiệm S = {2; 3}.',
  },
  {
    id: 2,
    subject: 'Toán',
    type: 'mcq',
    points: 0.5,
    prompt:
      'Trong một đường tròn tâm (O; R), góc nội tiếp chắn nửa đường tròn có số đo bằng bao nhiêu?',
    options: [
      { key: 'A', text: 'A. 45°' },
      { key: 'B', text: 'B. 90°' },
      { key: 'C', text: 'C. 180°' },
      { key: 'D', text: 'D. 60°' },
    ],
    correctAnswer: 'B',
    explanation:
      'Góc nội tiếp chắn nửa đường tròn là góc vuông và luôn có số đo bằng 90°.',
  },
  {
    id: 3,
    subject: 'Toán',
    type: 'mcq',
    points: 0.5,
    prompt: 'Biểu thức căn thức √(2x - 4) có nghĩa khi và chỉ khi:',
    codeFormula: '√(2x - 4)',
    options: [
      { key: 'A', text: 'A. x ≥ 2' },
      { key: 'B', text: 'B. x > 2' },
      { key: 'C', text: 'C. x ≤ 2' },
      { key: 'D', text: 'D. x ≤ -2' },
    ],
    correctAnswer: 'A',
    explanation: 'Căn thức √A có nghĩa khi A ≥ 0, tức là 2x - 4 ≥ 0 ⇔ x ≥ 2.',
  },
  {
    id: 4,
    subject: 'Toán',
    type: 'mcq',
    points: 0.5,
    prompt:
      'Cho tam giác ABC vuông tại A có đường cao AH. Hệ thức lượng nào sau đây là sai?',
    options: [
      { key: 'A', text: 'A. AB² = BH . BC' },
      { key: 'B', text: 'B. AH² = BH . CH' },
      { key: 'C', text: 'C. AH . BC = AB² + AC²' },
      { key: 'D', text: 'D. 1/AH² = 1/AB² + 1/AC²' },
    ],
    correctAnswer: 'C',
    explanation:
      'Hệ thức đúng là AH . BC = AB . AC (cùng bằng 2 lần diện tích tam giác ABC), nên C là phương án sai.',
  },
  {
    id: 5,
    subject: 'Toán',
    type: 'mcq',
    points: 0.5,
    prompt:
      'Đồ thị của hàm số bậc nhất y = 2x - 4 cắt trục hoành Ox tại điểm có tọa độ là:',
    options: [
      { key: 'A', text: 'A. (0; -4)' },
      { key: 'B', text: 'B. (2; 0)' },
      { key: 'C', text: 'C. (-2; 0)' },
      { key: 'D', text: 'D. (4; 0)' },
    ],
    correctAnswer: 'B',
    explanation: 'Cho y = 0 ⇒ 2x - 4 = 0 ⇒ x = 2. Vậy giao điểm với Ox là (2; 0).',
  },
  {
    id: 6,
    subject: 'Toán',
    type: 'mcq',
    points: 0.5,
    prompt:
      'Hệ phương trình bậc nhất hai ẩn { x + y = 5 ; x - y = 1 } có nghiệm duy nhất (x; y) là:',
    options: [
      { key: 'A', text: 'A. (3; 2)' },
      { key: 'B', text: 'B. (2; 3)' },
      { key: 'C', text: 'C. (4; 1)' },
      { key: 'D', text: 'D. (1; 4)' },
    ],
    correctAnswer: 'A',
    explanation: 'Cộng vế theo vế: 2x = 6 ⇒ x = 3, suy ra y = 2.',
  },
  {
    id: 7,
    subject: 'Toán',
    type: 'mcq',
    points: 0.5,
    prompt: 'Giá trị rút gọn của biểu thức P = √36 + √9 - √16 bằng bao nhiêu?',
    options: [
      { key: 'A', text: 'A. 5' },
      { key: 'B', text: 'B. 7' },
      { key: 'C', text: 'C. 9' },
      { key: 'D', text: 'D. 11' },
    ],
    correctAnswer: 'A',
    explanation: 'P = 6 + 3 - 4 = 5.',
  },
  {
    id: 8,
    subject: 'Toán',
    type: 'mcq',
    points: 0.5,
    prompt:
      'Trong tam giác vuông, tỉ số giữa cạnh đối và cạnh huyền của góc nhọn α được gọi là:',
    options: [
      { key: 'A', text: 'A. sin α' },
      { key: 'B', text: 'B. cos α' },
      { key: 'C', text: 'C. tan α' },
      { key: 'D', text: 'D. cot α' },
    ],
    correctAnswer: 'A',
    explanation: 'Theo định nghĩa tỉ số lượng giác: sin α = Cạnh đối / Cạnh huyền.',
  },
  {
    id: 9,
    subject: 'Toán',
    type: 'mcq',
    points: 0.5,
    prompt:
      'Một hình trụ có bán kính đáy r = 3 cm và chiều cao h = 5 cm. Thể tích V của hình trụ đó là:',
    options: [
      { key: 'A', text: 'A. 15π cm³' },
      { key: 'B', text: 'B. 45π cm³' },
      { key: 'C', text: 'C. 30π cm³' },
      { key: 'D', text: 'D. 90π cm³' },
    ],
    correctAnswer: 'B',
    explanation: 'Thể tích hình trụ V = π.r².h = π . 3² . 5 = 45π cm³.',
  },
  {
    id: 10,
    subject: 'Toán',
    type: 'mcq',
    points: 0.5,
    prompt:
      'Gieo một con xúc xắc cân đối và đồng chất 1 lần. Xác suất để xuất hiện mặt có số chấm chẵn là:',
    options: [
      { key: 'A', text: 'A. 1/2' },
      { key: 'B', text: 'B. 1/3' },
      { key: 'C', text: 'C. 1/6' },
      { key: 'D', text: 'D. 2/3' },
    ],
    correctAnswer: 'A',
    explanation: 'Có 3 mặt chẵn (2, 4, 6) trên tổng số 6 mặt nên xác suất là 3/6 = 1/2.',
  },
];

export const DEFAULT_EXAM_BANK_ITEM: ExamBankData = {
  id: 'default-toan-9-01',
  code: 'TOAN-9-01',
  title: 'Đề Kiểm Tra Định Kỳ Môn Toán - Khối 9 (Đề Chuẩn Số 01)',
  subject: 'Toán',
  subjectCode: 'Toán',
  grade: 9,
  durationMinutes: 45,
  questions: INITIAL_EXAM_QUESTIONS,
  fillQuestion: {
    promptTemplate:
      'Hàm số bậc hai y = ax² (a ≠ 0) có đồ thị là một đường [1] đi qua gốc tọa độ O(0; 0). Nếu a > 0 thì hàm số đồng biến khi [2] và nghịch biến khi [3].',
    blanks: ['parabol', 'x > 0', 'x < 0'],
    points: 2.0,
  },
  shortQuestion: {
    prompt:
      'Một mảnh vườn hình chữ nhật có chu vi bằng 56 m và chiều dài lớn hơn chiều rộng 4 m. Người ta dự định lát gạch toàn bộ diện tích mảnh vườn.',
    requirement:
      'Hãy tính chiều dài, chiều rộng và diện tích của mảnh vườn hình chữ nhật đó (theo đơn vị m²).',
    keywords: ['16', '12', '192', 'diện tích'],
    sampleAnswer:
      'Nửa chu vi mảnh vườn là 56 : 2 = 28 (m). Chiều dài là (28 + 4) : 2 = 16 (m). Chiều rộng là 16 - 4 = 12 (m). Diện tích mảnh vườn là 16 . 12 = 192 (m²).',
    points: 3.0,
  },
  createdAt: '2025-01-01T08:00:00.000Z',
  createdBy: 'Cô Nguyễn Thị Lan (GV Toán)',
  teacherId: 'teacher-toan',
  teacherName: 'Cô Nguyễn Thị Lan (GV Toán)',
  isActive: true,
  isAssigned: true,
  startAt: '2025-01-01T00:00:00.000Z',
  endAt: '2029-12-31T23:59:00.000Z',
};

// Demo data removed as requested: INITIAL_ADMIN_ROSTER is empty
export const INITIAL_ADMIN_ROSTER: StudentRecord[] = [];

interface SubjectTemplatePack {
  codePrefix: string;
  subjectLabel: string;
  teacherId: string;
  teacherName: string;
  mcqList: Array<{
    prompt: string;
    options: [string, string, string, string];
    correctAnswer: 'A' | 'B' | 'C' | 'D';
    explanation: string;
  }>;
  fillTemplate: string;
  fillBlanks: string[];
  shortPrompt: string;
  shortRequirement: string;
  shortKeywords: string[];
  shortSample: string;
}

const SUBJECT_TEMPLATE_PACKS: Record<SubjectKey, SubjectTemplatePack> = {
  Tin: {
    codePrefix: 'TIN',
    subjectLabel: 'Tin',
    teacherId: 'teacher-tin',
    teacherName: 'Thầy Trường (GV Tin học)',
    mcqList: [
      {
        prompt: 'Trong thuật toán và lập trình, cấu trúc rẽ nhánh dùng để thực hiện công việc gì?',
        options: [
          'A. Lặp đi lặp lại một khối lệnh với số lần biết trước',
          'B. Kiểm tra điều kiện để quyết định thực hiện hay bỏ qua câu lệnh',
          'C. Khai báo thư viện phần cứng máy tính',
          'D. Tắt nguồn hệ điều hành ngay lập tức',
        ],
        correctAnswer: 'B',
        explanation: 'Cấu trúc rẽ nhánh (IF...THEN...ELSE) kiểm tra điều kiện logic để chọn nhánh thực hiện.',
      },
      {
        prompt: 'Đơn vị đo dung lượng thông tin nào sau đây lớn nhất trong các đơn vị dưới đây?',
        options: ['A. Kilobyte (KB)', 'B. Megabyte (MB)', 'C. Gigabyte (GB)', 'D. Terabyte (TB)'],
        correctAnswer: 'D',
        explanation: 'Thứ tự tăng dần: KB < MB < GB < TB (1 TB = 1024 GB).',
      },
      {
        prompt: 'Trong bảng tính điện tử Excel, hàm nào dùng để tính trung bình cộng của các số?',
        options: ['A. =SUM()', 'B. =AVERAGE()', 'C. =MAX()', 'D. =COUNT()'],
        correctAnswer: 'B',
        explanation: 'Hàm AVERAGE dùng để tính giá trị trung bình cộng.',
      },
      {
        prompt: 'Giao thức nào dưới đây đảm bảo truyền tải siêu văn bản an toàn có mã hóa trên Internet?',
        options: ['A. FTP', 'B. HTTP', 'C. HTTPS', 'D. SMTP'],
        correctAnswer: 'C',
        explanation: 'HTTPS tích hợp chứng chỉ bảo mật SSL/TLS giúp mã hóa dữ liệu truyền tải.',
      },
    ],
    fillTemplate:
      'Một hệ thống máy tính hoàn chỉnh bao gồm hai thành phần chính là [1] (Hardware) và [2] (Software). Bộ xử lý trung tâm viết tắt là [3] đóng vai trò như bộ não của máy tính.',
    fillBlanks: ['phần cứng', 'phần mềm', 'CPU'],
    shortPrompt:
      'Viết thuật toán (hoặc mô tả từng bước) để kiểm tra một số nguyên dương N nhập từ bàn phím là số chẵn hay số lẻ.',
    shortRequirement:
      'Nêu rõ bước kiểm tra phép chia lấy dư cho 2 và kết luận đầu ra.',
    shortKeywords: ['chia', 'dư', 'chẵn', 'lẻ'],
    shortSample:
      'Bước 1: Nhập số nguyên N. Bước 2: Kiểm tra phần dư của N chia cho 2. Nếu N % 2 == 0 thì thông báo N là số chẵn, ngược lại thông báo N là số lẻ.',
  },
  Toán: {
    codePrefix: 'TOAN',
    subjectLabel: 'Toán',
    teacherId: 'teacher-toan',
    teacherName: 'Cô Nguyễn Thị Lan (GV Toán)',
    mcqList: [
      {
        prompt: 'Cho phương trình bậc hai x² - 5x + 6 = 0. Tập nghiệm S của phương trình đã cho là:',
        options: ['A. S = {-2; -3}', 'B. S = {2; 3}', 'C. S = {1; 6}', 'D. S = {-1; -6}'],
        correctAnswer: 'B',
        explanation: 'Phương trình có (x - 2)(x - 3) = 0 nên S = {2; 3}.',
      },
      {
        prompt: 'Trong một đường tròn tâm (O; R), góc nội tiếp chắn nửa đường tròn có số đo bằng:',
        options: ['A. 45°', 'B. 90°', 'C. 180°', 'D. 60°'],
        correctAnswer: 'B',
        explanation: 'Góc nội tiếp chắn nửa đường tròn là góc vuông bằng 90°.',
      },
      {
        prompt: 'Biểu thức căn thức √(2x - 4) xác định khi và chỉ khi:',
        options: ['A. x ≥ 2', 'B. x > 2', 'C. x ≤ 2', 'D. x ≤ -2'],
        correctAnswer: 'A',
        explanation: 'Điều kiện 2x - 4 ≥ 0 ⇔ x ≥ 2.',
      },
      {
        prompt: 'Đồ thị hàm số y = 2x - 4 cắt trục hoành Ox tại điểm có tọa độ:',
        options: ['A. (0; -4)', 'B. (2; 0)', 'C. (-2; 0)', 'D. (4; 0)'],
        correctAnswer: 'B',
        explanation: 'Cho y = 0 ⇒ 2x - 4 = 0 ⇒ x = 2.',
      },
    ],
    fillTemplate:
      'Hàm số bậc hai y = ax² (a ≠ 0) có đồ thị là một đường [1] đi qua gốc tọa độ. Nếu a > 0 thì hàm số đồng biến khi [2] và nghịch biến khi [3].',
    fillBlanks: ['parabol', 'x > 0', 'x < 0'],
    shortPrompt:
      'Một mảnh vườn hình chữ nhật có chu vi bằng 56 m và chiều dài lớn hơn chiều rộng 4 m.',
    shortRequirement: 'Hãy tính chiều dài, chiều rộng và diện tích của mảnh vườn (m²).',
    shortKeywords: ['16', '12', '192', 'diện tích'],
    shortSample:
      'Nửa chu vi là 28 m. Chiều dài = (28 + 4)/2 = 16 m, chiều rộng = 12 m. Diện tích = 16 x 12 = 192 m².',
  },
  Văn: {
    codePrefix: 'VAN',
    subjectLabel: 'Văn',
    teacherId: 'teacher-van-tuan',
    teacherName: 'Thầy Tuân (GV Ngữ văn)',
    mcqList: [
      {
        prompt: 'Tác phẩm "Truyện Kiều" của đại thi hào Nguyễn Du được viết theo thể thơ nào?',
        options: ['A. Thất ngôn bát cú', 'B. Song thất lục bát', 'C. Thơ lục bát', 'D. Thơ tự do'],
        correctAnswer: 'C',
        explanation: 'Truyện Kiều gồm 3254 câu thơ viết theo thể thơ lục bát truyền thống của dân tộc.',
      },
      {
        prompt: 'Biện pháp tu từ nào được sử dụng trong câu: "Mặt trời của bắp thì nằm trên đồi / Mặt trời của mẹ, em nằm trên lưng"?',
        options: ['A. Nói quá', 'B. Ẩn dụ', 'C. Nói giảm nói tránh', 'D. Liệt kê'],
        correctAnswer: 'B',
        explanation: 'Hình ảnh "Mặt trời của mẹ" là ẩn dụ chỉ em bé – nguồn sống và niềm tin của người mẹ.',
      },
      {
        prompt: 'Phương thức biểu đạt chính của văn bản nghị luận xã hội là gì?',
        options: ['A. Tự sự', 'B. Biểu cảm', 'C. Nghị luận', 'D. Miêu tả'],
        correctAnswer: 'C',
        explanation: 'Văn bản nghị luận xã hội sử dụng phương thức biểu đạt chính là nghị luận.',
      },
      {
        prompt: 'Thành phần biệt lập nào dùng để bộc lộ tâm lý, cảm xúc của người nói trong câu?',
        options: ['A. Thành phần tình thái', 'B. Thành phần cảm thán', 'C. Thành phần gọi đáp', 'D. Thành phần phụ chú'],
        correctAnswer: 'B',
        explanation: 'Thành phần cảm thán được dùng để bộc lộ trực tiếp tâm lý, cảm xúc.',
      },
    ],
    fillTemplate:
      'Phép liên kết câu trong văn bản gồm phép lặp từ ngữ, phép [1], phép nối và phép [2]. Các phép liên kết này giúp đoạn văn đảm bảo tính mạch lạc và [3] chặt chẽ.',
    fillBlanks: ['thế', 'liên tưởng', 'thống nhất'],
    shortPrompt:
      'Viết một đoạn văn ngắn (khoảng 3-5 câu) nêu suy nghĩ của em về lòng biết ơn truyền thống "Uống nước nhớ nguồn" của dân tộc Việt Nam.',
    shortRequirement: 'Trình bày rõ ý nghĩa của lòng biết ơn và hành động thiết thực của học sinh.',
    shortKeywords: ['biết ơn', 'truyền thống', 'cội nguồn', 'trân trọng'],
    shortSample:
      'Lòng biết ơn và truyền thống Uống nước nhớ nguồn là đạo lý cao đẹp của dân tộc Việt Nam. Mỗi học sinh cần trân trọng công lao của thế hệ đi trước, nỗ lực học tập và rèn luyện đạo đức để xứng đáng với cội nguồn.',
  },
  Anh: {
    codePrefix: 'ANH',
    subjectLabel: 'Anh',
    teacherId: 'teacher-anh',
    teacherName: 'Cô Lê Mai Hương (GV Tiếng Anh)',
    mcqList: [
      {
        prompt: 'Choose the correct form: "If we _____ more trees, the air will become cleaner."',
        options: ['A. plant', 'B. planted', 'C. will plant', 'D. planting'],
        correctAnswer: 'A',
        explanation: 'Conditional sentence Type 1 uses Present Simple in the If-clause: If + S + V(s/es), S + will + V.',
      },
      {
        prompt: 'She has lived in Hanoi _____ 2018.',
        options: ['A. for', 'B. since', 'C. in', 'D. ago'],
        correctAnswer: 'B',
        explanation: '"Since" is used before a specific point in time (2018) with Present Perfect.',
      },
      {
        prompt: 'The book _____ I bought yesterday is very interesting.',
        options: ['A. who', 'B. whom', 'C. which', 'D. whose'],
        correctAnswer: 'C',
        explanation: '"Which" is a relative pronoun referring to things ("The book").',
      },
      {
        prompt: 'They suggested _____ public transport to reduce air pollution.',
        options: ['A. use', 'B. to use', 'C. using', 'D. used'],
        correctAnswer: 'C',
        explanation: 'Structure: suggest + V-ing.',
      },
    ],
    fillTemplate:
      'Complete the grammar rule: In the Present Perfect tense, we use [1] or has followed by the [2] participle. We use [3] to talk about a period of time (e.g., 5 years).',
    fillBlanks: ['have', 'past', 'for'],
    shortPrompt:
      'Write 2-3 sentences in English about how students can protect the environment at school.',
    shortRequirement: 'Include actions such as saving electricity, recycling, or planting trees.',
    shortKeywords: ['environment', 'recycle', 'trees', 'save'],
    shortSample:
      'Students can protect the environment by planting more trees and recycling plastic waste. We should also save electricity and water at school.',
  },
  Sử: {
    codePrefix: 'SU',
    subjectLabel: 'Sử',
    teacherId: 'teacher-su',
    teacherName: 'Thầy Hoàng Văn Nam (GV Lịch sử)',
    mcqList: [
      {
        prompt: 'Chiến thắng Điện Biên Phủ năm 1954 kết thúc thắng lợi vào ngày tháng năm nào?',
        options: ['A. 07/05/1954', 'B. 30/04/1975', 'C. 02/09/1945', 'D. 19/08/1945'],
        correctAnswer: 'A',
        explanation: 'Chiến dịch Điện Biên Phủ toàn thắng vào ngày 07/05/1954.',
      },
      {
        prompt: 'Chủ tịch Hồ Chí Minh đọc bản Tuyên ngôn Độc lập khai sinh nước Việt Nam Dân chủ Cộng hòa tại đâu?',
        options: ['A. Quảng trường Ba Đình', 'B. Tân Trào - Tuyên Quang', 'C. Pác Bó - Cao Bằng', 'D. Dinh Độc Lập'],
        correctAnswer: 'A',
        explanation: 'Ngày 02/09/1945 tại Quảng trường Ba Đình (Hà Nội), Bác Hồ đọc Tuyên ngôn Độc lập.',
      },
      {
        prompt: 'Hội nghị thành lập Đảng Cộng sản Việt Nam đầu năm 1930 do ai chủ trì?',
        options: ['A. Phan Bội Châu', 'B. Nguyễn Ái Quốc', 'C. Trần Phú', 'D. Lê Hồng Phong'],
        correctAnswer: 'B',
        explanation: 'Lãnh tụ Nguyễn Ái Quốc chủ trì Hội nghị hợp nhất các tổ chức cộng sản thành lập Đảng.',
      },
      {
        prompt: 'Cuộc kháng chiến chống quân Nguyên - Mông ở thế kỷ XIII gắn liền với triều đại nào?',
        options: ['A. Nhà Lý', 'B. Nhà Trần', 'C. Nhà Lê sơ', 'D. Nhà Nguyễn'],
        correctAnswer: 'B',
        explanation: 'Quân dân nhà Trần ba lần đánh thắng quân xâm lược Mông - Nguyên.',
      },
    ],
    fillTemplate:
      'Cách mạng tháng Tám năm [1] đã lật đổ ách thống trị của thực dân và phong kiến, lập nên nước Việt Nam Dân chủ Cộng hòa vào ngày [2] tại quảng trường [3].',
    fillBlanks: ['1945', '02/09/1945', 'Ba Đình'],
    shortPrompt:
      'Trình bày ngắn gọn ý nghĩa lịch sử của Cách mạng tháng Tám năm 1945 đối với dân tộc Việt Nam.',
    shortRequirement: 'Nêu rõ bước ngoặt độc lập dân tộc và kỷ nguyên mới của đất nước.',
    shortKeywords: ['độc lập', 'tự do', 'kỷ nguyên', 'dân chủ'],
    shortSample:
      'Cách mạng tháng Tám năm 1945 mở ra kỷ nguyên mới của dân tộc Việt Nam: kỷ nguyên độc lập, tự do và nhân dân làm chủ đất nước.',
  },
  Địa: {
    codePrefix: 'DIA',
    subjectLabel: 'Địa',
    teacherId: 'teacher-dia',
    teacherName: 'Cô Vũ Thị Hồng (GV Địa lý)',
    mcqList: [
      {
        prompt: 'Khí hậu nước ta mang tính chất đặc trưng nào dưới đây?',
        options: [
          'A. Ôn đới hải dương',
          'B. Nhiệt đới ẩm gió mùa',
          'C. Hàn đới lục địa',
          'D. Cận nhiệt Địa Trung Hải',
        ],
        correctAnswer: 'B',
        explanation: 'Việt Nam nằm trong vùng nội chí tuyến và chịu ảnh hưởng sâu sắc của biển Đông cùng gió mùa châu Á.',
      },
      {
        prompt: 'Vùng kinh tế nào có diện tích trồng cây công nghiệp lâu năm (cà phê, cao su, hồ tiêu) lớn nhất nước ta?',
        options: [
          'A. Đồng bằng sông Hồng',
          'B. Tây Nguyên và Đông Nam Bộ',
          'C. Bắc Trung Bộ',
          'D. Đồng bằng sông Cửu Long',
        ],
        correctAnswer: 'B',
        explanation: 'Tây Nguyên và Đông Nam Bộ có đất đỏ bazan và đất xám phù hợp cây công nghiệp lâu năm.',
      },
      {
        prompt: 'Vựa lúa lớn nhất của cả nước tập trung ở vùng nào?',
        options: ['A. Đồng bằng sông Cửu Long', 'B. Trung du miền núi Bắc Bộ', 'C. Tây Nguyên', 'D. Duyên hải Nam Trung Bộ'],
        correctAnswer: 'A',
        explanation: 'Đồng bằng sông Cửu Long chiếm trên 50% sản lượng lúa cả nước.',
      },
      {
        prompt: 'Đường bờ biển của Việt Nam dài khoảng bao nhiêu kilômét?',
        options: ['A. 1.500 km', 'B. 2.100 km', 'C. 3.260 km', 'D. 4.500 km'],
        correctAnswer: 'C',
        explanation: 'Đường bờ biển nước ta dài 3.260 km từ Móng Cái (Quảng Ninh) đến Hà Tiên (Kiên Giang).',
      },
    ],
    fillTemplate:
      'Địa hình Việt Nam có [1] diện tích là đồi núi, phần lớn là đồi núi thấp. Hai đồng bằng châu thổ lớn nhất nước ta là Đồng bằng sông Hồng và Đồng bằng [2], giáp với vùng biển [3] giàu tài nguyên.',
    fillBlanks: ['3/4', 'sông Cửu Long', 'Biển Đông'],
    shortPrompt:
      'Giải thích vì sao vùng Đồng bằng sông Cửu Long trở thành vùng sản xuất lương thực lớn nhất cả nước?',
    shortRequirement: 'Nêu các điều kiện thuận lợi về địa hình, đất phù sa, khí hậu và mạng lưới sông ngòi.',
    shortKeywords: ['phù sa', 'khí hậu', 'sông ngòi', 'diện tích'],
    shortSample:
      'Đồng bằng sông Cửu Long có diện tích rộng lớn, đất phù sa màu mỡ được sông Tiền và sông Hậu bồi đắp, khí hậu cận xích đạo nóng ẩm quanh năm và mạng lưới sông ngòi dày đặc.',
  },
  'Công Nghệ': {
    codePrefix: 'CN',
    subjectLabel: 'Công Nghệ',
    teacherId: 'teacher-congnghe',
    teacherName: 'Thầy Đặng Quốc Bảo (GV Công nghệ)',
    mcqList: [
      {
        prompt: 'Trong mạng điện trong nhà, thiết bị nào dùng để tự động cắt mạch điện khi xảy ra sự cố quá tải hoặc ngắn mạch?',
        options: ['A. Công tắc hai cực', 'B. Ổ cắm điện', 'C. Aptomat (Cầu dao tự động)', 'D. Phích cắm điện'],
        correctAnswer: 'C',
        explanation: 'Aptomat vừa đóng cắt mạch điện vừa bảo vệ quá tải và ngắn mạch tự động.',
      },
      {
        prompt: 'Dụng cụ nào sau đây dùng để kiểm tra xem dây dẫn hoặc thiết bị điện có bị rò điện hay không?',
        options: ['A. Thước cặp', 'B. Bút thử điện', 'C. Tua vít thường', 'D. Kìm cắt dây'],
        correctAnswer: 'B',
        explanation: 'Bút thử điện phát sáng khi chạm vào phần tử mang điện xoay chiều.',
      },
      {
        prompt: 'Trên bản vẽ kỹ thuật, hình chiếu đứng có hướng chiếu từ đâu tới vật thể?',
        options: ['A. Từ trước tới', 'B. Từ trên xuống', 'C. Từ trái sang', 'D. Từ dưới lên'],
        correctAnswer: 'A',
        explanation: 'Hình chiếu đứng có hướng chiếu từ trước tới mặt phẳng chiếu đứng.',
      },
      {
        prompt: 'Vật liệu nào dưới đây thuộc nhóm vật liệu cách điện an toàn?',
        options: ['A. Đồng nguyên chất', 'B. Nhôm hợp kim', 'C. Sứ và nhựa PVC', 'D. Sắt thép'],
        correctAnswer: 'C',
        explanation: 'Sứ, thủy tinh, cao su và nhựa PVC là các vật liệu cách điện.',
      },
    ],
    fillTemplate:
      'Khi lắp đặt mạch điện chiếu sáng cơ bản, cầu chì và công tắc luôn phải được mắc trên dây [1] (dây nóng) và mắc [2] với bóng đèn để đảm bảo [3] điện cho người sử dụng.',
    fillBlanks: ['pha', 'nối tiếp', 'an toàn'],
    shortPrompt:
      'Nêu các nguyên tắc cơ bản đảm bảo an toàn điện khi sử dụng và sửa chữa mạng điện gia đình.',
    shortRequirement: 'Trình bày ít nhất 3 biện pháp an toàn điện thiết thực.',
    shortKeywords: ['ngắt nguồn', 'cách điện', 'bút thử điện', 'an toàn'],
    shortSample:
      'Phải ngắt nguồn điện (cầu dao/aptomat) trước khi sửa chữa, kiểm tra bằng bút thử điện, sử dụng dụng cụ có vỏ bọc cách điện và không chạm vào chỗ hở của dây dẫn.',
  },
  GDCD: {
    codePrefix: 'GDCD',
    subjectLabel: 'GDCD',
    teacherId: 'teacher-gdcd',
    teacherName: 'Cô Bùi Thanh Tâm (GV GDCD)',
    mcqList: [
      {
        prompt: 'Hành vi nào dưới đây thể hiện phẩm chất tự lập của học sinh THCS?',
        options: [
          'A. Nhờ bạn chép hộ bài tập về nhà',
          'B. Tự giác lập kế hoạch học tập và hoàn thành nhiệm vụ cá nhân',
          'C. Đợi bố mẹ nhắc nhở mới chuẩn bị sách vở',
          'D. Bỏ cuộc ngay khi gặp bài toán khó',
        ],
        correctAnswer: 'B',
        explanation: 'Tự lập là tự làm lấy công việc của mình, chủ động trong học tập và sinh hoạt.',
      },
      {
        prompt: 'Theo quy định pháp luật Việt Nam, văn bản nào có hiệu lực pháp lý cao nhất?',
        options: ['A. Luật Giáo dục', 'B. Nghị định Chính phủ', 'C. Hiến pháp', 'D. Thông tư Bộ GD&ĐT'],
        correctAnswer: 'C',
        explanation: 'Hiến pháp là đạo luật cơ bản của Nhà nước, có hiệu lực pháp lý cao nhất.',
      },
      {
        prompt: 'Khi tham gia giao thông bằng xe đạp điện, học sinh bắt buộc phải thực hiện quy định nào?',
        options: [
          'A. Đội mũ bảo hiểm cài quai đúng quy cách',
          'B. Đi dàn hàng ngang từ 3 xe trở lên',
          'C. Vừa điều khiển xe vừa sử dụng điện thoại',
          'D. Vượt đèn đỏ khi đường vắng',
        ],
        correctAnswer: 'A',
        explanation: 'Người điều khiển và người ngồi trên xe đạp máy/xe đạp điện bắt buộc phải đội mũ bảo hiểm.',
      },
      {
        prompt: 'Biểu hiện nào sau đây thể hiện sự tôn trọng lẽ phải?',
        options: [
          'A. Gió chiều nào che chiều ấy',
          'B. Bảo vệ cái đúng, phê phán những hành vi sai trái, gian lận',
          'C. Bao che lỗi vi phạm quy chế của bạn thân',
          'D. Chỉ làm theo ý kiến của số đông dù sai',
        ],
        correctAnswer: 'B',
        explanation: 'Tôn trọng lẽ phải là công nhận, ủng hộ, tuân theo và bảo vệ những điều đúng đắn.',
      },
    ],
    fillTemplate:
      'Mọi công dân đều bình đẳng trước [1], vừa được hưởng các quyền công dân vừa phải thực hiện đầy đủ [2] đối với Nhà nước và xã hội trên tinh thần thượng tôn [3].',
    fillBlanks: ['pháp luật', 'nghĩa vụ', 'Hiến pháp'],
    shortPrompt:
      'Tại sao học sinh cần phải trung thực trong học tập và thi cử? Hãy nêu tác hại của hành vi gian lận trong phòng thi.',
    shortRequirement: 'Làm rõ giá trị của lòng tự trọng và hậu quả của việc gian lận.',
    shortKeywords: ['trung thực', 'tự trọng', 'công bằng', 'kiến thức'],
    shortSample:
      'Trung thực trong thi cử giúp đánh giá đúng kiến thức thực chất, rèn luyện lòng tự trọng và tạo sự công bằng. Gian lận làm mất uy tín cá nhân và tạo thói quen ỷ lại.',
  },
  Lý: {
    codePrefix: 'LY',
    subjectLabel: 'Lý',
    teacherId: 'teacher-ly',
    teacherName: 'Thầy Ngô Quang Huy (GV Vật lý)',
    mcqList: [
      {
        prompt: 'Hệ thức của định luật Ôm đối với đoạn mạch có điện trở R là:',
        options: ['A. I = U . R', 'B. I = U / R', 'C. I = R / U', 'D. U = I / R'],
        correctAnswer: 'B',
        explanation: 'Cường độ dòng điện tỉ lệ thuận với hiệu điện thế và tỉ lệ nghịch với điện trở: I = U/R.',
      },
      {
        prompt: 'Hệ thức của định luật Jun – Len-xơ tính nhiệt lượng tỏa ra trên dây dẫn là:',
        options: ['A. Q = I . R . t', 'B. Q = I² . R . t', 'C. Q = I . R² . t', 'D. Q = I² . R / t'],
        correctAnswer: 'B',
        explanation: 'Nhiệt lượng tỏa ra trên dây dẫn Q = I²Rt.',
      },
      {
        prompt: 'Thấu kính phân kì có đặc điểm hình dạng quang học nào dưới đây?',
        options: [
          'A. Phần rìa dày hơn phần giữa',
          'B. Phần rìa mỏng hơn phần giữa',
          'C. Luôn cho ảnh thật lớn hơn vật',
          'D. Hội tụ chùm tia sáng song song tại 1 điểm',
        ],
        correctAnswer: 'A',
        explanation: 'Thấu kính phân kì có phần rìa dày hơn phần giữa.',
      },
      {
        prompt: 'Đơn vị đo công suất điện trong hệ SI là gì?',
        options: ['A. Jun (J)', 'B. Oát (W)', 'C. Vôn (V)', 'D. Ampe (A)'],
        correctAnswer: 'B',
        explanation: 'Công suất P được đo bằng đơn vị Oát (W).',
      },
    ],
    fillTemplate:
      'Hiện tượng khúc xạ ánh sáng là hiện tượng tia sáng tới khi truyền từ môi trường trong suốt này sang môi trường trong suốt khác bị [1] tại mặt phân cách giữa hai môi trường. Khi góc tới tăng (hoặc giảm) thì góc khúc xạ cũng [2]. Đặc biệt, khi góc tới bằng 0° thì tia sáng sẽ [3] mà không bị khúc xạ.',
    fillBlanks: ['gãy khúc', 'tăng (hoặc giảm)', 'truyền thẳng'],
    shortPrompt:
      'Một ấm điện có ghi 220V - 1000W được sử dụng với hiệu điện thế đúng bằng 220V để đun sôi 2 lít nước từ nhiệt độ ban đầu là 20°C (c = 4200 J/kg.K).',
    shortRequirement:
      'Hãy tính thời gian đun sôi nước (tính theo đơn vị giây) và giải thích cách áp dụng bảo toàn năng lượng.',
    shortKeywords: ['672', '4200', 'bảo toàn', 'nhiệt lượng'],
    shortSample:
      'Nhiệt lượng Q = m.c.Δt = 2 . 4200 . 80 = 672000 (J). Thời gian đun sôi t = Q / P = 672000 / 1000 = 672 giây.',
  },
  Hoá: {
    codePrefix: 'HOA',
    subjectLabel: 'Hoá',
    teacherId: 'teacher-hoa',
    teacherName: 'Cô Đỗ Thúy Quỳnh (GV Hóa học)',
    mcqList: [
      {
        prompt: 'Dãy kim loại nào sau đây được sắp xếp theo chiều mức độ hoạt động hóa học giảm dần?',
        options: [
          'A. K, Na, Mg, Al, Fe, Cu',
          'B. Cu, Fe, Al, Mg, Na, K',
          'C. Na, K, Al, Mg, Fe, Cu',
          'D. Al, Fe, Cu, K, Na, Mg',
        ],
        correctAnswer: 'A',
        explanation: 'Chiều giảm dần mức độ hoạt động hóa học: K, Na, Mg, Al, Zn, Fe, Pb, (H), Cu, Ag, Au.',
      },
      {
        prompt: 'Thuốc thử dùng để nhận biết khí cacbonic (CO2) và khí metan (CH4) là:',
        options: ['A. Dung dịch quỳ tím', 'B. Dung dịch nước vôi trong Ca(OH)2', 'C. Dung dịch NaCl', 'D. Dung dịch HCl'],
        correctAnswer: 'B',
        explanation: 'CO2 làm đục nước vôi trong Ca(OH)2 tạo kết tủa trắng CaCO3.',
      },
      {
        prompt: 'Dung dịch axit làm đổi màu giấy quỳ tím sang màu gì?',
        options: ['A. Màu xanh', 'B. Màu đỏ (hoặc hồng)', 'C. Màu vàng', 'D. Không đổi màu'],
        correctAnswer: 'B',
        explanation: 'Dung dịch axit làm quỳ tím hóa đỏ.',
      },
      {
        prompt: 'Kim loại nào dưới đây tác dụng mạnh với nước ở nhiệt độ thường tạo dung dịch kiềm và giải phóng khí H2?',
        options: ['A. Sắt (Fe)', 'B. Đồng (Cu)', 'C. Natri (Na)', 'D. Bạc (Ag)'],
        correctAnswer: 'C',
        explanation: '2Na + 2H2O → 2NaOH + H2↑.',
      },
    ],
    fillTemplate:
      'Phản ứng trung hòa giữa axit và bazơ luôn tạo thành [1] và [2]. Trong hợp chất hữu cơ, nguyên tố [3] luôn có hóa trị IV.',
    fillBlanks: ['muối', 'nước', 'cacbon'],
    shortPrompt:
      'Cho 5,6 gam sắt (Fe) tác dụng hoàn toàn với dung dịch axit clohiđric (HCl) dư. Hãy tính thể tích khí hiđro (H2) thu được ở điều kiện chuẩn (24,79 lít/mol).',
    shortRequirement: 'Viết phương trình hóa học Fe + 2HCl → FeCl2 + H2 và tính số mol.',
    shortKeywords: ['0,1', 'FeCl2', '2,479', 'phương trình'],
    shortSample:
      'Số mol Fe = 5,6 / 56 = 0,1 mol. Phương trình: Fe + 2HCl → FeCl2 + H2↑. Số mol H2 = 0,1 mol ⇒ V = 0,1 x 24,79 = 2,479 lít.',
  },
  Sinh: {
    codePrefix: 'SINH',
    subjectLabel: 'Sinh',
    teacherId: 'teacher-sinh',
    teacherName: 'Cô Trịnh Ngọc Ánh (GV Sinh học)',
    mcqList: [
      {
        prompt: 'Theo Menđen, khi lai hai cơ thể bố mẹ thuần chủng khác nhau về một cặp tính trạng tương phản thì tỉ lệ kiểu hình ở F2 là:',
        options: ['A. 1 trội : 1 lặn', 'B. 3 trội : 1 lặn', 'C. 100% trội', 'D. 9 : 3 : 3 : 1'],
        correctAnswer: 'B',
        explanation: 'Quy luật phân li của Menđen xác định F2 có tỉ lệ kiểu hình xấp xỉ 3 trội : 1 lặn.',
      },
      {
        prompt: 'Đột biến cấu trúc nhiễm sắc thể gồm các dạng cơ bản nào sau đây?',
        options: [
          'A. Mất đoạn, lặp đoạn, đảo đoạn, chuyển đoạn',
          'B. Đa bội thể và dị bội thể',
          'C. Thêm một cặp nuclêôtit',
          'D. Đột biến gen lặn',
        ],
        correctAnswer: 'A',
        explanation: 'Đột biến cấu trúc NST gồm mất đoạn, lặp đoạn, đảo đoạn và chuyển đoạn.',
      },
      {
        prompt: 'Trong phân tử ADN mạch kép, các nuclêôtit giữa hai mạch liên kết với nhau theo nguyên tắc bổ sung nào?',
        options: ['A. A liên kết với G; T liên kết với X', 'B. A liên kết với T; G liên kết với X', 'C. A liên kết với X; T liên kết với G', 'D. Hai nuclêôtit giống nhau liên kết với nhau'],
        correctAnswer: 'B',
        explanation: 'Theo nguyên tắc bổ sung trong ADN: A - T (2 liên kết hiđrô) và G - X (3 liên kết hiđrô).',
      },
      {
        prompt: 'Bào quan nào trong tế bào thực vật thực hiện chức năng quang hợp tổng hợp chất hữu cơ?',
        options: ['A. Ti thể', 'B. Lục lạp', 'C. Bộ máy Gôngi', 'D. Ribôxôm'],
        correctAnswer: 'B',
        explanation: 'Lục lạp chứa chất diệp lục giúp hấp thụ năng lượng ánh sáng để quang hợp.',
      },
    ],
    fillTemplate:
      'Quá trình truyền thông tin di truyền từ ADN sang ARN được gọi là quá trình [1], tiếp theo quá trình tổng hợp chuỗi pôlipeptit (prôtêin) tại ribôxôm được gọi là quá trình [2], góp phần biểu hiện thành [3] của cơ thể.',
    fillBlanks: ['phiên mã', 'dịch mã', 'tính trạng'],
    shortPrompt:
      'Một đoạn phân tử ADN có tổng số 2400 nuclêôtit, trong đó số nuclêôtit loại Ađênin (A) bằng 600.',
    shortRequirement: 'Áp dụng nguyên tắc bổ sung (A = T, G = X), hãy tính số nuclêôtit mỗi loại T, G, X của đoạn ADN đó.',
    shortKeywords: ['600', '2400', 'bổ sung', 'nuclêôtit'],
    shortSample:
      'Theo nguyên tắc bổ sung: A = T = 600 nuclêôtit. Ta có 2A + 2G = 2400 ⇒ 1200 + 2G = 2400 ⇒ G = X = 600 nuclêôtit.',
  },
};

/**
 * Generates a standardized text template for uploading/editing exams accurately by Grade (6,7,8,9) and Subject (11 THCS subjects).
 */
export function generateStandardExamTemplate(
  grade: number = 9,
  subjectInput: SubjectKey | string = 'Toán'
): string {
  const subjKey = normalizeSubjectKey(subjectInput);
  const pack = SUBJECT_TEMPLATE_PACKS[subjKey] || SUBJECT_TEMPLATE_PACKS['Toán'];
  const meta = getSubjectMeta(subjKey);

  // Build 10 questions by cycling/expanding the pack's questions
  const tenQuestions: string[] = [];
  for (let i = 0; i < 10; i++) {
    const baseQ = pack.mcqList[i % pack.mcqList.length];
    const qNumber = i + 1;
    const suffix =
      i >= pack.mcqList.length
        ? ` (Vận dụng Khối ${grade} - Mức ${i - pack.mcqList.length + 1})`
        : '';
    tenQuestions.push(
      [
        `Câu ${qNumber} [${meta.key} ${grade}]: ${baseQ.prompt}${suffix}`,
        ...baseQ.options,
        `Đáp án: ${baseQ.correctAnswer}`,
        `Giải thích: ${baseQ.explanation}`,
      ].join('\n')
    );
  }

  return `=== FORM ĐỀ MẪU NGÂN HÀNG CHUẨN EDUEXAM PRO ===
MÃ ĐỀ: ${pack.codePrefix}-${grade}-01
TIÊU ĐỀ: Đề Kiểm Tra Định Kỳ Môn ${meta.label} (${meta.key}) - Khối ${grade}
MÔN HỌC: ${meta.key}
KHỐI LỚP: ${grade}
THỜI GIAN: 45

[PHẦN I - TRẮC NGHIỆM KHÁCH QUAN]
${tenQuestions.join('\n\n')}

[PHẦN II - ĐIỀN KHUYẾT]
ĐIỂM: 2.0
NỘI DUNG: ${pack.fillTemplate}
Ô TRỐNG 1: ${pack.fillBlanks[0]}
Ô TRỐNG 2: ${pack.fillBlanks[1]}
Ô TRỐNG 3: ${pack.fillBlanks[2]}

[PHẦN III - TỰ LUẬN NGẮN]
ĐIỂM: 3.0
ĐỀ BÀI: ${pack.shortPrompt}
YÊU CẦU: ${pack.shortRequirement}
TỪ KHÓA: ${pack.shortKeywords.join(', ')}
ĐÁP ÁN MẪU: ${pack.shortSample}
`;
}

/**
 * Generates initial exam bank items for all 11 subjects across all 4 grades (Khối 6, 7, 8, 9),
 * ensuring that a student in any grade (e.g., 6A1 -> Grade 6, 7A1 -> Grade 7, 8A1 -> Grade 8, 9A1 -> Grade 9)
 * strictly sees only exams matching their exact grade.
 */
export function getInitialSubjectExams(): ExamBankData[] {
  return [];
}

/**
 * Generates a standardized JSON string for the ExamImportForm.
 */
export function generateStandardExamJson(
  grade: number = 9,
  subjectInput: SubjectKey | string = 'Toán'
): string {
  const subjKey = normalizeSubjectKey(subjectInput);
  const meta = getSubjectMeta(subjKey);
  const sampleObj = {
    code: `${meta.codePrefix}-${grade}-JSON01`,
    title: `Đề Khảo Sát Chất Lượng Học Kỳ I - Môn ${meta.label} Khối ${grade}`,
    subject: meta.key,
    grade,
    durationMinutes: 45,
    questions: INITIAL_EXAM_QUESTIONS.map((q, idx) => ({
      id: idx + 1,
      subject: `${meta.key} ${grade}`,
      points: 0.5,
      prompt: q.prompt,
      options: q.options?.map((o) => ({
        key: o.key,
        text: o.text,
      })),
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
    })),
    fillQuestion: {
      points: 2.0,
      promptTemplate: DEFAULT_EXAM_BANK_ITEM.fillQuestion.promptTemplate,
      blanks: DEFAULT_EXAM_BANK_ITEM.fillQuestion.blanks,
    },
    shortQuestion: {
      points: 3.0,
      prompt: DEFAULT_EXAM_BANK_ITEM.shortQuestion.prompt,
      requirement: DEFAULT_EXAM_BANK_ITEM.shortQuestion.requirement,
      keywords: DEFAULT_EXAM_BANK_ITEM.shortQuestion.keywords,
      sampleAnswer: DEFAULT_EXAM_BANK_ITEM.shortQuestion.sampleAnswer,
    },
  };

  return JSON.stringify(sampleObj, null, 2);
}

/**
 * Parses and validates a JSON string representing an exam for ExamImportForm.
 */
export function parseAndValidateExamJson(
  jsonText: string,
  fallbackGrade: number = 9
):
  | {
      ok: true;
      exam: ExamBankData;
      totalPoints: number;
      mcqPointsTotal: number;
      warnings: string[];
    }
  | {
      ok: false;
      error: string;
    } {
  if (!jsonText || !jsonText.trim()) {
    return { ok: false, error: 'Nội dung JSON đang để trống.' };
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    return {
      ok: false,
      error: `Lỗi cú pháp JSON không hợp lệ: ${
        e instanceof Error ? e.message : String(e)
      }`,
    };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      ok: false,
      error: 'Cấu trúc JSON gốc phải là một đối tượng (Object) chứa thông tin đề thi.',
    };
  }

  const warnings: string[] = [];
  const rawGrade = Number(parsed.grade);
  const grade = [6, 7, 8, 9].includes(rawGrade) ? rawGrade : fallbackGrade;
  if (![6, 7, 8, 9].includes(rawGrade)) {
    warnings.push(
      `Trường "grade" không thuộc Khối 6-9, hệ thống tự động gán Khối ${grade}.`
    );
  }

  const subject =
    typeof parsed.subject === 'string' && parsed.subject.trim()
      ? parsed.subject.trim()
      : 'Toán';
  const subjectCode = normalizeSubjectKey(subject);
  const meta = getSubjectMeta(subjectCode);

  const code =
    typeof parsed.code === 'string' && parsed.code.trim()
      ? parsed.code.trim()
      : `${meta.codePrefix}-${grade}-01`;
  const title =
    typeof parsed.title === 'string' && parsed.title.trim()
      ? parsed.title.trim()
      : `Đề Khảo Sát Môn ${meta.label} - Khối ${grade}`;
  const durationMinutes =
    typeof parsed.durationMinutes === 'number' &&
    parsed.durationMinutes >= 5 &&
    parsed.durationMinutes <= 180
      ? Math.round(parsed.durationMinutes)
      : 45;

  if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    return {
      ok: false,
      error:
        'JSON thiếu mảng "questions" hoặc danh sách câu hỏi trắc nghiệm đang rỗng.',
    };
  }

  const normalizedQuestions: ExamQuestion[] = [];
  let mcqPointsSum = 0;

  for (let i = 0; i < parsed.questions.length; i++) {
    const item = parsed.questions[i] as Record<string, unknown>;
    if (!item || typeof item !== 'object') {
      return {
        ok: false,
        error: `Câu hỏi thứ ${i + 1} trong "questions" không đúng định dạng Object.`,
      };
    }

    const prompt = String(item.prompt || '').trim();
    if (!prompt) {
      return {
        ok: false,
        error: `Câu hỏi thứ ${i + 1} bị thiếu nội dung "prompt".`,
      };
    }

    let options: MultipleChoiceOption[] = [];
    if (Array.isArray(item.options) && item.options.length >= 2) {
      options = (['A', 'B', 'C', 'D'] as const).map((key, idx) => {
        const found = (item.options as Record<string, unknown>[]).find(
          (o) => String(o?.key || '').toUpperCase() === key
        ) || (item.options as Record<string, unknown>[])[idx];
        const rawText = String(found?.text ?? found ?? `Phương án ${key}`).trim();
        return {
          key,
          text: rawText.startsWith(`${key}.`) ? rawText : `${key}. ${rawText}`,
        };
      });
    } else if (item.optionA || item.optionB) {
      options = (['A', 'B', 'C', 'D'] as const).map((key) => {
        const rawText = String(item[`option${key}`] || `Phương án ${key}`).trim();
        return {
          key,
          text: rawText.startsWith(`${key}.`) ? rawText : `${key}. ${rawText}`,
        };
      });
    } else {
      return {
        ok: false,
        error: `Câu hỏi số ${i + 1} thiếu danh sách phương án "options" (A, B, C, D).`,
      };
    }

    const rawAns = String(item.correctAnswer || 'A')
      .trim()
      .toUpperCase();
    const correctAnswer: 'A' | 'B' | 'C' | 'D' = (
      ['A', 'B', 'C', 'D'].includes(rawAns) ? rawAns : 'A'
    ) as 'A' | 'B' | 'C' | 'D';

    if (!['A', 'B', 'C', 'D'].includes(rawAns)) {
      warnings.push(
        `Câu ${i + 1}: Đáp án "${rawAns}" không hợp lệ, đã mặc định về "A".`
      );
    }

    const pts =
      typeof item.points === 'number' && item.points > 0
        ? Number(item.points)
        : Number((5.0 / parsed.questions.length).toFixed(2));
    mcqPointsSum += pts;

    normalizedQuestions.push({
      id: i + 1,
      subject: String(item.subject || subjectCode).trim(),
      type: 'mcq',
      points: pts,
      prompt,
      codeFormula: item.codeFormula ? String(item.codeFormula) : undefined,
      options,
      correctAnswer,
      explanation: item.explanation
        ? String(item.explanation).trim()
        : 'Đối chiếu đáp án chuẩn của Hội đồng Khảo thí.',
    });
  }

  const rawFill = (parsed.fillQuestion || {}) as Record<string, unknown>;
  const fillPoints =
    typeof rawFill.points === 'number' && rawFill.points >= 0
      ? Number(rawFill.points)
      : 2.0;
  const fillPrompt =
    typeof rawFill.promptTemplate === 'string' && rawFill.promptTemplate.trim()
      ? rawFill.promptTemplate.trim()
      : DEFAULT_EXAM_BANK_ITEM.fillQuestion.promptTemplate;
  const rawBlanks = Array.isArray(rawFill.blanks) ? rawFill.blanks : [];
  const fillBlanks: string[] =
    rawBlanks.length > 0
      ? rawBlanks.map((b) => String(b || '').trim())
      : [...DEFAULT_EXAM_BANK_ITEM.fillQuestion.blanks];

  if (!parsed.fillQuestion) {
    warnings.push(
      'JSON không khai báo "fillQuestion", hệ thống đã bổ sung câu điền khuyết mặc định (2.0đ).'
    );
  }

  const rawShort = (parsed.shortQuestion || {}) as Record<string, unknown>;
  const shortPoints =
    typeof rawShort.points === 'number' && rawShort.points >= 0
      ? Number(rawShort.points)
      : 3.0;
  const shortPrompt =
    typeof rawShort.prompt === 'string' && rawShort.prompt.trim()
      ? rawShort.prompt.trim()
      : DEFAULT_EXAM_BANK_ITEM.shortQuestion.prompt;
  const shortRequirement =
    typeof rawShort.requirement === 'string' && rawShort.requirement.trim()
      ? rawShort.requirement.trim()
      : DEFAULT_EXAM_BANK_ITEM.shortQuestion.requirement;
  const shortKeywords = Array.isArray(rawShort.keywords)
    ? rawShort.keywords.map((k) => String(k).trim()).filter(Boolean)
    : DEFAULT_EXAM_BANK_ITEM.shortQuestion.keywords;
  const shortSampleAnswer =
    typeof rawShort.sampleAnswer === 'string' && rawShort.sampleAnswer.trim()
      ? rawShort.sampleAnswer.trim()
      : DEFAULT_EXAM_BANK_ITEM.shortQuestion.sampleAnswer;

  if (!parsed.shortQuestion) {
    warnings.push(
      'JSON không khai báo "shortQuestion", hệ thống đã bổ sung câu tự luận ngắn mặc định (3.0đ).'
    );
  }

  const mcqPointsTotal = Number(mcqPointsSum.toFixed(2));
  const totalPoints = Number(
    (mcqPointsTotal + fillPoints + shortPoints).toFixed(2)
  );

  if (Math.abs(totalPoints - 10.0) > 0.05) {
    warnings.push(
      `Tổng điểm toàn đề hiện tại là ${totalPoints} điểm (Trắc nghiệm: ${mcqPointsTotal}đ + Điền khuyết: ${fillPoints}đ + Tự luận: ${shortPoints}đ). Khuyến nghị điều chỉnh về chuẩn 10.0 điểm.`
    );
  }

  const exam: ExamBankData = {
    id: `exam-${grade}-${Date.now()}`,
    code,
    title,
    subject: subjectCode,
    subjectCode,
    grade,
    durationMinutes,
    questions: normalizedQuestions,
    fillQuestion: {
      promptTemplate: fillPrompt,
      blanks: fillBlanks,
      points: fillPoints,
    },
    shortQuestion: {
      prompt: shortPrompt,
      requirement: shortRequirement,
      keywords: shortKeywords,
      sampleAnswer: shortSampleAnswer,
      points: shortPoints,
    },
    createdAt: new Date().toISOString(),
    isActive: true,
    isAssigned: true,
  };

  return {
    ok: true,
    exam,
    totalPoints,
    mcqPointsTotal,
    warnings,
  };
}

/**
 * Deterministic parser for the Standard Exam Template format (and general Vietnamese MCQ text).
 */
export function parseStandardExamText(
  rawText: string,
  fallbackGrade: number = 9,
  fallbackSubject: SubjectKey = 'Toán'
): ExamBankData {
  const trimmed = rawText.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    const jsonRes = parseAndValidateExamJson(trimmed, fallbackGrade);
    if (jsonRes.ok) {
      return jsonRes.exam;
    }
  }

  const lines = rawText
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim());

  const subjMeta = getSubjectMeta(fallbackSubject);
  let code = `${subjMeta.codePrefix}-${fallbackGrade}-${Math.floor(
    10 + Math.random() * 89
  )}`;
  let title = `Đề Kiểm Tra Môn ${subjMeta.label} - Khối ${fallbackGrade}`;
  let subject: string = subjMeta.key;
  let grade = fallbackGrade;
  let durationMinutes = 45;

  for (const line of lines) {
    const codeMatch = line.match(/^MÃ ĐỀ\s*:\s*(.+)$/i);
    if (codeMatch) code = codeMatch[1].trim();

    const titleMatch = line.match(/^TIÊU ĐỀ\s*:\s*(.+)$/i);
    if (titleMatch) title = titleMatch[1].trim();

    const subjectMatch = line.match(/^MÔN HỌC\s*:\s*(.+)$/i);
    if (subjectMatch) subject = subjectMatch[1].trim();

    const gradeMatch = line.match(/^KHỐI(?:\s*LỚP)?\s*:\s*(\d+)/i);
    if (gradeMatch) {
      const g = Number(gradeMatch[1]);
      if ([6, 7, 8, 9].includes(g)) grade = g;
    }

    const durMatch = line.match(/^THỜI GIAN\s*:\s*(\d+)/i);
    if (durMatch) {
      const d = Number(durMatch[1]);
      if (d >= 5 && d <= 180) durationMinutes = d;
    }
  }

  const normalizedSubjKey = normalizeSubjectKey(subject);
  const questions: ExamQuestion[] = [];
  let currentQ: Partial<ExamQuestion> | null = null;
  let currentOpts: MultipleChoiceOption[] = [];
  let section: 'MCQ' | 'FILL' | 'SHORT' = 'MCQ';

  let fillPoints = 2.0;
  let fillTemplate = DEFAULT_EXAM_BANK_ITEM.fillQuestion.promptTemplate;
  const fillBlanks: string[] = [
    ...DEFAULT_EXAM_BANK_ITEM.fillQuestion.blanks,
  ];

  let shortPoints = 3.0;
  let shortPrompt = DEFAULT_EXAM_BANK_ITEM.shortQuestion.prompt;
  let shortReq = DEFAULT_EXAM_BANK_ITEM.shortQuestion.requirement;
  let shortKeywords = [...DEFAULT_EXAM_BANK_ITEM.shortQuestion.keywords];
  let shortSample = DEFAULT_EXAM_BANK_ITEM.shortQuestion.sampleAnswer;

  const pushCurrentQuestion = () => {
    if (currentQ && currentQ.prompt && currentOpts.length >= 2) {
      const ensuredOpts: MultipleChoiceOption[] = (
        ['A', 'B', 'C', 'D'] as const
      ).map((k) => {
        const found = currentOpts.find((o) => o.key === k);
        return found || { key: k, text: `${k}. Phương án ${k}` };
      });
      questions.push({
        id: questions.length + 1,
        subject: currentQ.subject || normalizedSubjKey,
        type: 'mcq',
        points: 0.5,
        prompt: currentQ.prompt,
        options: ensuredOpts,
        correctAnswer: currentQ.correctAnswer || 'A',
        explanation:
          currentQ.explanation ||
          'Đối chiếu đáp án chuẩn của Hội đồng Khảo thí.',
      });
    }
    currentQ = null;
    currentOpts = [];
  };

  for (const line of lines) {
    if (!line || line.startsWith('===')) continue;

    if (/^\[PHẦN\s*III\b/i.test(line)) {
      pushCurrentQuestion();
      section = 'SHORT';
      continue;
    }
    if (/^\[PHẦN\s*II\b/i.test(line)) {
      pushCurrentQuestion();
      section = 'FILL';
      continue;
    }
    if (/^\[PHẦN\s*I\b/i.test(line)) {
      section = 'MCQ';
      continue;
    }

    if (section === 'MCQ') {
      const qHeader = line.match(
        /^Câu\s*(\d+)\s*(?:\[([^\]]+)\])?\s*[:.]\s*(.+)$/i
      );
      if (qHeader) {
        pushCurrentQuestion();
        currentQ = {
          subject: qHeader[2]?.trim() || normalizedSubjKey,
          prompt: qHeader[3].trim(),
          correctAnswer: 'A',
        };
        continue;
      }

      const optMatch = line.match(/^([ABCD])\s*[.)]\s*(.+)$/);
      if (optMatch && currentQ) {
        const key = optMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D';
        const val = optMatch[2].trim();
        currentOpts.push({
          key,
          text: val.startsWith(`${key}.`) ? val : `${key}. ${val}`,
        });
        continue;
      }

      const ansMatch = line.match(/^(?:Đáp án|ĐA)\s*[:=]\s*([ABCD])/i);
      if (ansMatch && currentQ) {
        currentQ.correctAnswer = ansMatch[1].toUpperCase() as
          | 'A'
          | 'B'
          | 'C'
          | 'D';
        continue;
      }

      const expMatch = line.match(/^(?:Giải thích|Hướng dẫn)\s*[:=]\s*(.+)$/i);
      if (expMatch && currentQ) {
        currentQ.explanation = expMatch[1].trim();
        continue;
      }
    } else if (section === 'FILL') {
      const pMatch = line.match(/^ĐIỂM\s*:\s*([\d.]+)/i);
      if (pMatch) fillPoints = Number(pMatch[1]) || 2.0;

      const contentMatch = line.match(/^NỘI DUNG\s*:\s*(.+)$/i);
      if (contentMatch) fillTemplate = contentMatch[1].trim();

      const bMatch = line.match(/^Ô TRỐNG\s*(\d+)\s*:\s*(.+)$/i);
      if (bMatch) {
        const bIdx = Math.max(0, Number(bMatch[1]) - 1);
        fillBlanks[bIdx] = bMatch[2].trim();
      }
    } else if (section === 'SHORT') {
      const pMatch = line.match(/^ĐIỂM\s*:\s*([\d.]+)/i);
      if (pMatch) shortPoints = Number(pMatch[1]) || 3.0;

      const prMatch = line.match(/^ĐỀ BÀI\s*:\s*(.+)$/i);
      if (prMatch) shortPrompt = prMatch[1].trim();

      const reqMatch = line.match(/^YÊU CẦU\s*:\s*(.+)$/i);
      if (reqMatch) shortReq = reqMatch[1].trim();

      const kwMatch = line.match(/^TỪ KHÓA\s*:\s*(.+)$/i);
      if (kwMatch) {
        shortKeywords = kwMatch[1]
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }

      const saMatch = line.match(/^ĐÁP ÁN MẪU\s*:\s*(.+)$/i);
      if (saMatch) shortSample = saMatch[1].trim();
    }
  }

  pushCurrentQuestion();

  const finalQuestions =
    questions.length > 0
      ? questions.map((q, idx) => ({
          ...q,
          id: idx + 1,
          points: Number((5.0 / questions.length).toFixed(2)),
        }))
      : INITIAL_EXAM_QUESTIONS;

  return {
    id: `exam-${grade}-${Date.now()}`,
    code,
    title,
    subject: normalizedSubjKey,
    subjectCode: normalizedSubjKey,
    grade,
    durationMinutes,
    questions: finalQuestions,
    fillQuestion: {
      promptTemplate: fillTemplate,
      blanks: fillBlanks,
      points: fillPoints,
    },
    shortQuestion: {
      prompt: shortPrompt,
      requirement: shortReq,
      keywords: shortKeywords,
      sampleAnswer: shortSample,
      points: shortPoints,
    },
    createdAt: new Date().toISOString(),
    isActive: true,
    isAssigned: true,
  };
}

/**
 * Converts an ExamBankData object back into the standardized DOCX/PDF text template format.
 */
export function examToStandardTemplateText(exam: ExamBankData): string {
  const headerLines = [
    `=== BIỂU MẪU ĐỀ THI CHUẨN DOCX / PDF EDUEXAM PRO ===`,
    `MÃ ĐỀ: ${exam.code}`,
    `TIÊU ĐỀ: ${exam.title}`,
    `MÔN HỌC: ${exam.subjectCode || exam.subject}`,
    `KHỐI LỚP: ${exam.grade}`,
    `THỜI GIAN: ${exam.durationMinutes}`,
    ``,
    `[PHẦN I - TRẮC NGHIỆM KHÁCH QUAN]`,
  ];

  const questionBlocks = exam.questions.map((q, idx) => {
    const opts = (q.options || []).map((o) => {
      const clean = o.text.replace(/^[ABCD]\s*[.)]\s*/i, '').trim();
      return `${o.key}. ${clean}`;
    });
    return [
      `Câu ${idx + 1} [${q.subject || exam.subject}]: ${q.prompt}`,
      ...opts,
      `Đáp án: ${q.correctAnswer || 'A'}`,
      `Giải thích: ${q.explanation || 'Đối chiếu đáp án chuẩn của Hội đồng Khảo thí.'}`,
    ].join('\n');
  });

  const fillBlock =
    exam.fillQuestion && exam.fillQuestion.points > 0 && exam.fillQuestion.promptTemplate.trim()
      ? [
          ``,
          `[PHẦN II - ĐIỀN KHUYẾT]`,
          `ĐIỂM: ${exam.fillQuestion.points}`,
          `NỘI DUNG: ${exam.fillQuestion.promptTemplate}`,
          ...(exam.fillQuestion.blanks || []).map(
            (val, idx) => `Ô TRỐNG ${idx + 1}: ${val || ''}`
          ),
        ].join('\n')
      : '';

  const shortBlock =
    exam.shortQuestion && exam.shortQuestion.points > 0 && exam.shortQuestion.prompt.trim()
      ? [
          ``,
          `[PHẦN III - TỰ LUẬN NGẮN]`,
          `ĐIỂM: ${exam.shortQuestion.points}`,
          `ĐỀ BÀI: ${exam.shortQuestion.prompt}`,
          `YÊU CẦU: ${exam.shortQuestion.requirement}`,
          `TỪ KHÓA: ${(exam.shortQuestion.keywords || []).join(', ')}`,
          `ĐÁP ÁN MẪU: ${exam.shortQuestion.sampleAnswer}`,
        ].join('\n')
      : '';

  return [...headerLines, questionBlocks.join('\n\n'), fillBlock, shortBlock]
    .filter(Boolean)
    .join('\n');
}

/**
 * Helper to convert single-paragraph Word XML table rows (<w:tbl> -> <w:tr> -> <w:tc>)
 * into pipe-delimited paragraphs so answer tables (`Câu | 1 | 2 ...`, `Đáp án | B | B ...`) stay on single lines.
 */
function normalizeWordXmlTablesToParagraphs(xmlStr: string): string {
  return xmlStr.replace(/<w:tbl\b[\s\S]*?<\/w:tbl>/gi, (tblXml) => {
    const rows = Array.from(tblXml.matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/gi));
    const convertedRows: string[] = [];
    for (const r of rows) {
      const cells = Array.from(r[0].matchAll(/<w:tc\b[\s\S]*?<\/w:tc>/gi));
      const hasMultiParaCell = cells.some((c) => {
        const pMatches = c[0].match(/<\/w:p>/gi);
        return pMatches && pMatches.length > 1;
      });
      if (hasMultiParaCell) {
        convertedRows.push(r[0]);
        continue;
      }
      const cellTexts = cells
        .map((c) => {
          const tMatches = Array.from(
            c[0].matchAll(/<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/gi)
          );
          return tMatches.map((m) => m[1]).join('').trim();
        })
        .filter(Boolean);
      if (cellTexts.length > 0) {
        convertedRows.push(
          `<w:p><w:r><w:t>${cellTexts.join(' | ')}</w:t></w:r></w:p>`
        );
      }
    }
    return convertedRows.join('');
  });
}

/**
 * Extracts readable exam text from a DOCX XML/HTML content or PDF text stream.
 */
export function extractTextFromDocxOrPdfRaw(rawContent: string): string {
  if (!rawContent || !rawContent.trim()) return '';
  const trimmed = rawContent.trim();

  if (trimmed.includes('<w:t') || trimmed.includes('<w:p')) {
    const normalizedXml = normalizeWordXmlTablesToParagraphs(trimmed);
    const paragraphs = normalizedXml.split(/<\/w:p>/i);
    const extractedLines: string[] = [];
    for (const p of paragraphs) {
      const matches = Array.from(p.matchAll(/<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/gi));
      if (matches.length > 0) {
        const line = matches
          .map((m) =>
            m[1]
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'")
          )
          .join('')
          .trim();
        if (line) extractedLines.push(line);
      }
    }
    if (extractedLines.length > 0) {
      return extractedLines.join('\n');
    }
  }

  if (trimmed.includes('<html') || trimmed.includes('<body') || trimmed.includes('<p')) {
    const withoutStyleScript = trimmed
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '');
    const withLineBreaks = withoutStyleScript
      .replace(/<\/(p|div|h1|h2|h3|h4|tr|li)>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
    const cleanLines = withLineBreaks
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (cleanLines.length > 0) {
      return cleanLines.join('\n');
    }
  }

  if (trimmed.startsWith('%PDF')) {
    const textChunks: string[] = [];
    const tjMatches = Array.from(trimmed.matchAll(/\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*Tj/g));
    for (const m of tjMatches) {
      const cleaned = m[1]
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .trim();
      if (cleaned) textChunks.push(cleaned);
    }
    if (textChunks.length > 0) {
      return textChunks.join('\n');
    }
  }

  return trimmed;
}

/**
 * Generates a rich Microsoft Word (.doc / .docx compatible HTML-XML) document for an exam.
 */
export function generateStandardDocxContent(exam: ExamBankData): string {
  const templateText = examToStandardTemplateText(exam);
  const questionsHtml = exam.questions
    .map((q, idx) => {
      const optsHtml = (q.options || [])
        .map((o) => `<p style="margin:2pt 0 2pt 14pt;">${o.text}</p>`)
        .join('');
      return `
        <div style="margin-bottom:10pt;">
          <p style="margin:4pt 0;font-weight:bold;">Câu ${idx + 1} [${q.subject}] (${q.points} điểm): <span style="font-weight:normal;">${q.prompt}</span></p>
          ${optsHtml}
          <p style="margin:2pt 0;font-size:10pt;color:#0f5132;">Đáp án: ${q.correctAnswer}</p>
          <p style="margin:2pt 0;font-size:10pt;color:#475569;">Giải thích: ${q.explanation || ''}</p>
        </div>
      `;
    })
    .join('');

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8" />
<title>${exam.title}</title>
</head>
<body style="font-family:'Times New Roman',serif;font-size:12pt;line-height:1.4;">
  <p style="display:none;">=== BIỂU MẪU ĐỀ THI CHUẨN DOCX / PDF EDUEXAM PRO ===</p>
  <p><strong>MÃ ĐỀ:</strong> ${exam.code}</p>
  <p><strong>TIÊU ĐỀ:</strong> ${exam.title}</p>
  <p><strong>MÔN HỌC:</strong> ${exam.subjectCode || exam.subject}</p>
  <p><strong>KHỐI LỚP:</strong> ${exam.grade}</p>
  <p><strong>THỜI GIAN:</strong> ${exam.durationMinutes}</p>
  <hr />
  <p><strong>[PHẦN I - TRẮC NGHIỆM KHÁCH QUAN]</strong></p>
  ${questionsHtml}
  <p><strong>[PHẦN II - ĐIỀN KHUYẾT]</strong></p>
  <p>ĐIỂM: ${exam.fillQuestion.points}</p>
  <p>NỘI DUNG: ${exam.fillQuestion.promptTemplate}</p>
  <p>Ô TRỐNG 1: ${exam.fillQuestion.blanks[0]}</p>
  <p>Ô TRỐNG 2: ${exam.fillQuestion.blanks[1]}</p>
  <p>Ô TRỐNG 3: ${exam.fillQuestion.blanks[2]}</p>
  <p><strong>[PHẦN III - TỰ LUẬN NGẮN]</strong></p>
  <p>ĐIỂM: ${exam.shortQuestion.points}</p>
  <p>ĐỀ BÀI: ${exam.shortQuestion.prompt}</p>
  <p>YÊU CẦU: ${exam.shortQuestion.requirement}</p>
  <p>TỪ KHÓA: ${exam.shortQuestion.keywords.join(', ')}</p>
  <p>ĐÁP ÁN MẪU: ${exam.shortQuestion.sampleAnswer}</p>
  <pre style="display:none;">${templateText}</pre>
</body>
</html>`;
}

/**
 * Pure helper to update a single MCQ question directly inside an ExamBankData object.
 */
export function updateExamQuestionDirectly(
  exam: ExamBankData,
  questionId: number,
  updates: Partial<ExamQuestion>
): ExamBankData {
  const nextQuestions = exam.questions.map((q) => {
    if (q.id !== questionId) return q;
    return {
      ...q,
      ...updates,
    };
  });
  return {
    ...exam,
    questions: nextQuestions,
  };
}

/**
 * Pure helper to add a new MCQ question directly to an ExamBankData object.
 */
export function addExamQuestionDirectly(
  exam: ExamBankData,
  newQuestion?: Partial<ExamQuestion>
): ExamBankData {
  const nextId = exam.questions.length + 1;
  const created: ExamQuestion = {
    id: nextId,
    subject: newQuestion?.subject || exam.subjectCode || exam.subject || `Toán ${exam.grade}`,
    type: 'mcq',
    points: newQuestion?.points ?? 0.5,
    prompt:
      newQuestion?.prompt ||
      `Nội dung câu hỏi trắc nghiệm số ${nextId} (Môn ${exam.subjectCode || exam.subject} - Khối ${exam.grade})?`,
    options: newQuestion?.options || [
      { key: 'A', text: 'A. Phương án trả lời A' },
      { key: 'B', text: 'B. Phương án trả lời B' },
      { key: 'C', text: 'C. Phương án trả lời C' },
      { key: 'D', text: 'D. Phương án trả lời D' },
    ],
    correctAnswer: newQuestion?.correctAnswer || 'A',
    explanation:
      newQuestion?.explanation ||
      'Hướng dẫn giải chi tiết của Giáo viên bộ môn.',
  };

  const combined = [...exam.questions, created].map((q, idx) => ({
    ...q,
    id: idx + 1,
  }));

  return {
    ...exam,
    questions: combined,
  };
}

/**
 * Pure helper to remove an MCQ question from an ExamBankData object (maintaining at least 1 question).
 */
export function removeExamQuestionDirectly(
  exam: ExamBankData,
  questionId: number
): ExamBankData {
  if (exam.questions.length <= 1) return exam;
  const filtered = exam.questions
    .filter((q) => q.id !== questionId)
    .map((q, idx) => ({
      ...q,
      id: idx + 1,
    }));
  return {
    ...exam,
    questions: filtered,
  };
}

function createSeededRandom(seed?: number): () => number {
  if (seed === undefined) {
    return () => Math.random();
  }
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function fisherYatesShuffle<T>(items: T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/**
 * Shuffles the question order and/or option order (A, B, C, D) of an exam,
 * accurately remapping `correctAnswer` to the new option key.
 */
export function shuffleExamQuestionsAndOptions(
  sourceExam: ExamBankData,
  options?: {
    newCode?: string;
    newTitle?: string;
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
    seed?: number;
  }
): ExamBankData {
  const rng = createSeededRandom(options?.seed);
  const doShuffleQuestions = options?.shuffleQuestions !== false;
  const doShuffleOptions = options?.shuffleOptions !== false;

  const baseQuestions = doShuffleQuestions
    ? fisherYatesShuffle(sourceExam.questions, rng)
    : [...sourceExam.questions];

  const keys: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];

  const remappedQuestions: ExamQuestion[] = baseQuestions.map((q, idx) => {
    const origOptions =
      q.options && q.options.length === 4
        ? q.options
        : keys.map((k) => ({ key: k, text: `${k}. Phương án ${k}` }));

    const origCorrectKey = q.correctAnswer || 'A';

    const taggedOptions = origOptions.map((opt) => ({
      cleanText: opt.text.replace(/^[ABCD]\s*[.)]\s*/i, '').trim(),
      isCorrect: opt.key === origCorrectKey,
    }));

    const finalTagged = doShuffleOptions
      ? fisherYatesShuffle(taggedOptions, rng)
      : taggedOptions;

    let newCorrectAnswer: 'A' | 'B' | 'C' | 'D' = 'A';
    const newOptions: MultipleChoiceOption[] = finalTagged.map((item, optIdx) => {
      const assignedKey = keys[optIdx] || 'A';
      if (item.isCorrect) {
        newCorrectAnswer = assignedKey;
      }
      return {
        key: assignedKey,
        text: `${assignedKey}. ${item.cleanText}`,
      };
    });

    return {
      ...q,
      id: idx + 1,
      options: newOptions,
      correctAnswer: newCorrectAnswer,
    };
  });

  const nextCode =
    options?.newCode?.trim() ||
    `${sourceExam.code}-M${Math.floor(101 + rng() * 898)}`;

  return {
    ...sourceExam,
    id: `exam-mix-${sourceExam.grade}-${Date.now()}-${Math.floor(rng() * 1000)}`,
    code: nextCode,
    title: options?.newTitle?.trim() || `${sourceExam.title} (Mã trộn ${nextCode})`,
    questions: remappedQuestions,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Mixes a new exam by drawing questions across multiple exams in the Question Bank (`cloudExams`).
 */
export function mixExamFromQuestionBank(
  examsPool: ExamBankData[],
  config: {
    grade: number;
    subject?: SubjectKey;
    questionCount?: number;
    newCode?: string;
    newTitle?: string;
    shuffleOptions?: boolean;
    seed?: number;
  }
): ExamBankData {
  const rng = createSeededRandom(config.seed);
  const targetSubject = config.subject ? normalizeSubjectKey(config.subject) : undefined;
  const gradeAndSubjectExams = examsPool.filter(
    (e) =>
      e.grade === config.grade &&
      (!targetSubject ||
        normalizeSubjectKey(e.subjectCode || e.subject) === targetSubject)
  );
  const gradeExams = examsPool.filter((e) => e.grade === config.grade);
  const activePool =
    gradeAndSubjectExams.length > 0
      ? gradeAndSubjectExams
      : gradeExams.length > 0
      ? gradeExams
      : examsPool.length > 0
      ? examsPool
      : [DEFAULT_EXAM_BANK_ITEM];

  const seenPrompts = new Set<string>();
  const allCandidateQuestions: ExamQuestion[] = [];

  for (const ex of activePool) {
    for (const q of ex.questions) {
      const normPrompt = q.prompt.trim().toLowerCase();
      if (!seenPrompts.has(normPrompt)) {
        seenPrompts.add(normPrompt);
        allCandidateQuestions.push(q);
      }
    }
  }

  const targetCount = Math.max(
    1,
    Math.min(config.questionCount || 10, allCandidateQuestions.length || 10)
  );
  const shuffledCandidates = fisherYatesShuffle(allCandidateQuestions, rng).slice(
    0,
    targetCount
  );

  const pointsPerQuestion = Number((5.0 / targetCount).toFixed(2));
  const pickedBaseExam =
    activePool[Math.floor(rng() * activePool.length)] || DEFAULT_EXAM_BANK_ITEM;

  const subjKey =
    targetSubject ||
    normalizeSubjectKey(pickedBaseExam.subjectCode || pickedBaseExam.subject);
  const meta = getSubjectMeta(subjKey);

  const syntheticExam: ExamBankData = {
    ...pickedBaseExam,
    grade: config.grade,
    subject: subjKey,
    subjectCode: subjKey,
    questions: shuffledCandidates.map((q, idx) => ({
      ...q,
      id: idx + 1,
      points: pointsPerQuestion,
    })),
  };

  const variantNumber = Math.floor(101 + rng() * 898);
  const nextCode =
    config.newCode?.trim() || `${meta.codePrefix}-K${config.grade}-${variantNumber}`;
  const nextTitle =
    config.newTitle?.trim() ||
    `Đề Thi Trộn Môn ${meta.label} Khối ${config.grade} (Mã đề ${nextCode})`;

  return shuffleExamQuestionsAndOptions(syntheticExam, {
    newCode: nextCode,
    newTitle: nextTitle,
    shuffleQuestions: true,
    shuffleOptions: config.shuffleOptions !== false,
    seed: config.seed !== undefined ? config.seed + 7 : undefined,
  });
}

/**
 * Formats Firebase StudentRecord submissions into an offline-ready UTF-8 CSV string with summary statistics.
 */
export function exportSubmissionsToCsvString(
  records: StudentRecord[],
  meta?: {
    gradeLabel?: string;
    classLabel?: string;
    subjectLabel?: string;
    examLabel?: string;
    exportedBy?: string;
  }
): string {
  const escapeCsvCell = (val: unknown): string => {
    const str = String(val ?? '').replace(/\r?\n/g, ' ').trim();
    if (str.includes(',') || str.includes('"') || str.includes(';')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  const headers = [
    'STT',
    'Mã Bài Thi',
    'Môn Học Dự Thi',
    'Họ và Tên Học Sinh',
    'Khối',
    'Lớp',
    'Mã / Tên Đề Kiểm Tra',
    'Giáo Viên Phụ Trách',
    'Thời Gian Làm Bài',
    'Số Giây',
    'Số Lần Rời Tab / Thi Lại',
    'Cảnh Báo Giám Sát',
    'Điểm Gốc',
    'Điểm Khấu Trừ',
    'Điểm Tổng Kết',
    'Xếp Loại Học Lực',
    'Trạng Thái',
    'Thời Điểm Nộp Bài',
  ];

  const rows = records.map((r, idx) => {
    const rank =
      r.rank ||
      (r.finalScore >= 8
        ? 'GIỎI'
        : r.finalScore >= 6.5
        ? 'KHÁ'
        : r.finalScore >= 5
        ? 'TRUNG BÌNH'
        : 'YẾU');
    const subjectStr = r.subject || normalizeSubjectKey(r.examTitle || 'Toán');
    return [
      idx + 1,
      escapeCsvCell(r.id),
      escapeCsvCell(subjectStr),
      escapeCsvCell(r.name),
      r.grade,
      escapeCsvCell(r.className),
      escapeCsvCell(r.examTitle || r.examId || `Đề Khối ${r.grade}`),
      escapeCsvCell(r.teacherName || meta?.exportedBy || 'Giáo viên bộ môn'),
      escapeCsvCell(r.duration),
      r.durationSeconds,
      r.tabLeaves,
      escapeCsvCell(r.warningText),
      r.rawScore.toFixed(1),
      escapeCsvCell(r.penaltyText),
      r.finalScore.toFixed(1),
      escapeCsvCell(rank),
      escapeCsvCell(r.status),
      escapeCsvCell(r.submittedAt || new Date().toISOString()),
    ].join(',');
  });

  const total = records.length;
  const avgScore =
    total > 0
      ? (records.reduce((s, r) => s + r.finalScore, 0) / total).toFixed(2)
      : '0.00';
  const gioiCount = records.filter((r) => r.finalScore >= 8.0).length;
  const khaCount = records.filter(
    (r) => r.finalScore >= 6.5 && r.finalScore < 8.0
  ).length;
  const tbCount = records.filter(
    (r) => r.finalScore >= 5.0 && r.finalScore < 6.5
  ).length;
  const yeuCount = records.filter((r) => r.finalScore < 5.0).length;
  const violatorsCount = records.filter((r) => r.tabLeaves > 0).length;

  const summaryLines = [
    '',
    `"=== TỔNG HỢP BÁO CÁO ĐIỂM THI CLOUD FIRESTORE ==="`,
    `"Phạm vi kết xuất:",${escapeCsvCell(
      `${meta?.gradeLabel || 'Tất cả Khối'} - ${meta?.classLabel || 'Tất cả Lớp'} - Môn: ${meta?.subjectLabel || 'Tất cả môn'} - Đề: ${meta?.examLabel || 'Tất cả đề'}`
    )}`,
    `"Giáo viên / Người kết xuất:",${escapeCsvCell(
      meta?.exportedBy || 'Hội Đồng Khảo Thí THCS'
    )}`,
    `"Tổng số bài thi:",${total}`,
    `"Điểm trung bình:",${avgScore}`,
    `"Thống kê học lực:","Giỏi: ${gioiCount} | Khá: ${khaCount} | Trung bình: ${tbCount} | Yếu: ${yeuCount}"`,
    `"Số lượt vi phạm chuyển tab (-0.5đ/lần):",${violatorsCount}`,
  ];

  return '\uFEFF' + [headers.join(','), ...rows, ...summaryLines].join('\n');
}

/**
 * Pure authentication helper for Student Accounts (Tài khoản + Mật khẩu).
 */
export function authenticateStudentAccount(
  accounts: StudentAccount[],
  username: string,
  password: string
): StudentAccount | null {
  const cleanUser = (username || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();
  if (!cleanUser || !cleanPass) return null;

  const found = accounts.find(
    (acc) => acc.username.trim().toLowerCase() === cleanUser
  );
  if (!found) return null;
  if (found.password !== cleanPass) return null;
  return found;
}

/**
 * Pure authentication helper for Teacher / Admin Accounts (strict credential check, no demo switcher).
 */
export function authenticateTeacherAccount(
  accounts: TeacherAccount[],
  username: string,
  passcode: string,
  masterAdminPasscode?: string
): TeacherAccount | null {
  const cleanUser = (username || '').trim().toLowerCase();
  const cleanPass = (passcode || '').trim();
  if (!cleanUser || !cleanPass) return null;

  const matched = accounts.find(
    (t) => t.username.trim().toLowerCase() === cleanUser
  );
  if (!matched) return null;

  if (
    cleanPass === matched.passcode ||
    (masterAdminPasscode && cleanPass === masterAdminPasscode)
  ) {
    return matched;
  }
  return null;
}

/**
 * Checks whether the current account has full Admin privileges (Lớp học, Tài khoản HS, Tài khoản GV, Tất cả môn).
 */
export function canTeacherManageSystem(teacher?: TeacherAccount | null): boolean {
  if (!teacher) return false;
  return teacher.role === 'admin' || teacher.subject === 'ALL';
}

/**
 * Checks whether the current account is authorized to manage exams/scores for a given subject.
 */
export function canTeacherAccessSubject(
  teacher: TeacherAccount | null | undefined,
  subject: SubjectKey | string
): boolean {
  if (!teacher) return false;
  if (canTeacherManageSystem(teacher)) return true;
  return normalizeSubjectKey(teacher.subject) === normalizeSubjectKey(subject);
}

/**
 * Filters exams for the Student Main Screen strictly by selected subject, student's exact grade,
 * and optional assigned classroom scope.
 * Never falls back to showing exams of another grade!
 */
export function filterExamsForStudentSubject(
  exams: ExamBankData[],
  subject: SubjectKey | 'ALL',
  gradeFilter: number | 'ALL' = 'ALL',
  studentClass?: string
): ExamBankData[] {
  const bySubject =
    subject === 'ALL'
      ? exams
      : exams.filter(
          (ex) =>
            normalizeSubjectKey(ex.subjectCode || ex.subject) ===
            normalizeSubjectKey(subject)
        );

  const byGrade =
    gradeFilter === 'ALL'
      ? bySubject
      : bySubject.filter((ex) => ex.grade === gradeFilter);

  if (!studentClass || !studentClass.trim()) {
    return byGrade;
  }

  const normStudentClass = studentClass.trim().toUpperCase();
  return byGrade.filter((ex) => {
    if (!ex.assignedClasses || ex.assignedClasses.length === 0) {
      return true;
    }
    return ex.assignedClasses.some(
      (cls) =>
        cls.trim().toUpperCase() === normStudentClass ||
        cls.trim().toUpperCase() === 'ALL'
    );
  });
}

/**
 * Computes the list of classroom names (e.g. ['7A1']) that a teacher has assigned exams to.
 */
export function getTeacherAssignedClasses(
  teacher: TeacherAccount | null | undefined,
  exams: ExamBankData[]
): string[] {
  if (!teacher) return [];
  if (canTeacherManageSystem(teacher)) return ['ALL'];

  const classSet = new Set<string>();
  if (Array.isArray(teacher.assignedClasses)) {
    teacher.assignedClasses.forEach((c) => {
      if (c && c.trim()) classSet.add(c.trim().toUpperCase());
    });
  }

  const normId = (teacher.id || '').trim().toLowerCase();
  const normUser = (teacher.username || '').trim().toLowerCase();
  const normName = (teacher.fullName || '').trim().toLowerCase();

  for (const ex of exams) {
    const isOwnedByTeacher =
      (ex.teacherId && ex.teacherId.trim().toLowerCase() === normId) ||
      (ex.teacherUsername &&
        ex.teacherUsername.trim().toLowerCase() === normUser) ||
      (ex.teacherName && ex.teacherName.trim().toLowerCase() === normName) ||
      (ex.createdBy && ex.createdBy.trim().toLowerCase() === normName);

    if (isOwnedByTeacher && Array.isArray(ex.assignedClasses)) {
      for (const cls of ex.assignedClasses) {
        if (cls && cls.trim()) {
          classSet.add(cls.trim().toUpperCase());
        }
      }
    }
  }

  return Array.from(classSet).sort();
}

/**
 * Strictly scopes scoreboard submissions by logged-in account role:
 * - Student (e.g., class 7A1): ONLY sees submissions within class 7A1 (and grade 7).
 * - Teacher (e.g., GV A who assigned exam to class 7A1): ONLY sees submissions for their subject AND within the classes/exams they assigned.
 * - Admin: sees all submissions across the school.
 */
export function filterSubmissionsByAccountScope(
  submissions: StudentRecord[],
  scope: {
    role: 'student' | 'teacher' | 'admin';
    student?: StudentAccount | null;
    teacher?: TeacherAccount | null;
    exams?: ExamBankData[];
  }
): StudentRecord[] {
  if (scope.role === 'admin') {
    return submissions;
  }

  if (scope.role === 'student') {
    if (!scope.student) return [];
    const targetClass = scope.student.studentClass.trim().toUpperCase();
    const targetGrade = scope.student.grade;
    return submissions.filter(
      (sub) =>
        sub.className.trim().toUpperCase() === targetClass &&
        sub.grade === targetGrade
    );
  }

  if (scope.role === 'teacher') {
    const teacher = scope.teacher;
    if (!teacher) return [];
    if (canTeacherManageSystem(teacher)) return submissions;

    const teacherSubj = normalizeSubjectKey(teacher.subject);
    const exams = scope.exams || [];
    const assignedClasses = getTeacherAssignedClasses(teacher, exams);
    const normTeacherId = (teacher.id || '').trim().toLowerCase();
    const normTeacherUser = (teacher.username || '').trim().toLowerCase();
    const normTeacherName = (teacher.fullName || '').trim().toLowerCase();

    // Map examId -> exam for quick lookup
    const teacherOwnedExamIds = new Set<string>();
    const examAssignedClassesMap = new Map<string, string[]>();

    for (const ex of exams) {
      const isOwned =
        (ex.teacherId && ex.teacherId.trim().toLowerCase() === normTeacherId) ||
        (ex.teacherUsername &&
          ex.teacherUsername.trim().toLowerCase() === normTeacherUser) ||
        (ex.teacherName &&
          ex.teacherName.trim().toLowerCase() === normTeacherName) ||
        (ex.createdBy && ex.createdBy.trim().toLowerCase() === normTeacherName);

      if (isOwned) {
        teacherOwnedExamIds.add(ex.id);
        if (ex.code) teacherOwnedExamIds.add(ex.code);
        if (Array.isArray(ex.assignedClasses) && ex.assignedClasses.length > 0) {
          examAssignedClassesMap.set(
            ex.id,
            ex.assignedClasses.map((c) => c.trim().toUpperCase())
          );
        }
      }
    }

    return submissions.filter((sub) => {
      const subSubj = normalizeSubjectKey(
        sub.subject || sub.examTitle || 'Toán'
      );
      if (subSubj !== teacherSubj) return false;

      const subClass = (sub.className || '').trim().toUpperCase();

      // If teacher has explicitly assigned classes (e.g., ['7A1']), strictly restrict to those assigned classes
      if (assignedClasses.length > 0 && !assignedClasses.includes('ALL')) {
        if (!assignedClasses.includes(subClass)) {
          return false;
        }
      }

      // If submission is tied to a specific exam that has assignedClasses, enforce that too
      if (sub.examId && examAssignedClassesMap.has(sub.examId)) {
        const allowedForExam = examAssignedClassesMap.get(sub.examId) || [];
        if (
          allowedForExam.length > 0 &&
          !allowedForExam.includes('ALL') &&
          !allowedForExam.includes(subClass)
        ) {
          return false;
        }
      }

      // If teacher hasn't assigned any exam to any class yet, only show submissions explicitly tagged with this teacher
      if (assignedClasses.length === 0) {
        const matchesTeacherTag =
          (sub.teacherId &&
            sub.teacherId.trim().toLowerCase() === normTeacherId) ||
          (sub.teacherUsername &&
            sub.teacherUsername.trim().toLowerCase() === normTeacherUser) ||
          (sub.teacherName &&
            sub.teacherName.trim().toLowerCase() === normTeacherName) ||
          (sub.examId && teacherOwnedExamIds.has(sub.examId));
        return Boolean(matchesTeacherTag);
      }

      return true;
    });
  }

  return [];
}

/**
 * Filters submissions belonging to a specific logged-in student.
 */
export function filterSubmissionsForStudent(
  submissions: StudentRecord[],
  student: StudentAccount | null
): StudentRecord[] {
  if (!student) return [];
  const normUser = student.username.trim().toLowerCase();
  const normName = student.fullName.trim().toLowerCase();
  const normClass = student.studentClass.trim().toUpperCase();

  return submissions.filter((sub) => {
    const subSbd = (sub.sbd || '').trim().toLowerCase();
    const subUser = (sub.studentUsername || '').trim().toLowerCase();
    const subName = (sub.name || '').trim().toLowerCase();
    const subClass = (sub.className || '').trim().toUpperCase();

    if (subUser && subUser === normUser) {
      return true;
    }
    if (subSbd === normUser || subSbd.startsWith(`${normUser}-`)) {
      return true;
    }
    if (subName === normName && subClass === normClass) {
      return true;
    }
    return false;
  });
}

/**
 * Generates a clean Vietnamese-ascii student username from fullName and studentClass (e.g., "Nguyễn Văn An", "9A1" -> "hs.an9a1").
 */
export function suggestStudentUsername(
  fullName: string,
  studentClass: string
): string {
  const cleanName = (fullName || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
  const parts = cleanName.split(/\s+/).filter(Boolean);
  const givenName = parts.length > 0 ? parts[parts.length - 1] : 'hocsinh';
  const cleanClass = (studentClass || '9A1')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
  return `hs.${givenName}${cleanClass}`;
}

/**
 * Generates an automatic 6-digit password for imported student accounts.
 */
export function generateAutoStudentPassword(
  index: number = 0,
  seed: number = 2025
): string {
  const rng = createSeededRandom(seed + index * 97 + 13);
  const sixDigits = Math.floor(100000 + rng() * 899999);
  return String(sixDigits);
}

/**
 * Parses an Excel / Spreadsheet student list containing ONLY 3 fields:
 * - Họ tên (fullName)
 * - Lớp (studentClass, e.g., 6A1, 7A1, 8A2, 9A1)
 * - Ngày sinh (dateOfBirth, e.g., 15/05/2013)
 * And automatically generates unique `username` and 6-digit `password` for each student.
 * Supports TSV (direct copy-paste from Excel), CSV, pipe `|`, semicolon `;`, and HTML/XML `.xls` tables.
 */
export function parseExcelStudentAccountsAutoCredentials(
  rawInput: string,
  options?: {
    existingUsernames?: string[];
    fallbackClass?: string;
    seed?: number;
  }
): StudentAccount[] {
  if (!rawInput || !rawInput.trim()) return [];
  const fallbackClass = (options?.fallbackClass || '6A1').trim().toUpperCase();
  const baseSeed = options?.seed ?? Date.now() % 100000;

  const usedUsernames = new Set<string>(
    (options?.existingUsernames || []).map((u) => u.trim().toLowerCase())
  );

  let normalizedText = rawInput.trim();

  // If input is an HTML table (.xls export from Excel) or XML SpreadsheetML, extract rows
  if (
    normalizedText.includes('<tr') ||
    normalizedText.includes('<Row') ||
    normalizedText.includes('<td') ||
    normalizedText.includes('<Data')
  ) {
    const rowMatches = Array.from(
      normalizedText.matchAll(/<(?:tr|Row)[^>]*>([\s\S]*?)<\/(?:tr|Row)>/gi)
    );
    if (rowMatches.length > 0) {
      const extractedRows: string[] = [];
      for (const rm of rowMatches) {
        const cellMatches = Array.from(
          rm[1].matchAll(
            /<(?:td|th|Data)[^>]*>([\s\S]*?)<\/(?:td|th|Data)>/gi
          )
        );
        const cells = cellMatches
          .map((cm) => cm[1].replace(/<[^>]+>/g, '').trim())
          .filter((c) => c.length > 0);
        if (cells.length >= 2) {
          extractedRows.push(cells.join('\t'));
        }
      }
      if (extractedRows.length > 0) {
        normalizedText = extractedRows.join('\n');
      }
    }
  }

  const lines = normalizedText
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#') && !l.startsWith('//'));

  const classRegex = /^([6789])[A-Z]\d*$/i;
  const dobRegex = /^(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})$/;

  const result: StudentAccount[] = [];

  lines.forEach((line, idx) => {
    const delimiter = line.includes('\t')
      ? '\t'
      : line.includes('|')
      ? '|'
      : line.includes(';')
      ? ';'
      : ',';

    const rawCols = line
      .split(delimiter)
      .map((c) => c.replace(/^["']|["']$/g, '').trim())
      .filter((c) => c.length > 0);

    if (rawCols.length === 0) return;

    // Skip header row (e.g., "Họ và tên | Lớp | Ngày sinh" or "STT | Họ tên | Lớp | Ngày sinh")
    const joinedLower = rawCols.join(' ').toLowerCase();
    if (
      (joinedLower.includes('họ tên') ||
        joinedLower.includes('họ và tên') ||
        joinedLower.includes('fullname')) &&
      (joinedLower.includes('lớp') ||
        joinedLower.includes('ngày sinh') ||
        joinedLower.includes('class'))
    ) {
      return;
    }

    // If first column is a numeric STT (e.g., "1", "01", "2"), shift columns
    const cols =
      rawCols.length >= 4 && /^\d{1,3}$/.test(rawCols[0])
        ? rawCols.slice(1)
        : rawCols;

    let fullName = '';
    let studentClass = '';
    let dateOfBirth = '';

    // Auto-detect which column is Class (e.g. 6A1, 7A1, 8A2, 9A1) and which is Date of Birth
    for (const col of cols) {
      const cleanedClass = col.replace(/^lớp\s+/i, '').trim().toUpperCase();
      if (!studentClass && classRegex.test(cleanedClass)) {
        studentClass = cleanedClass;
        continue;
      }
      if (!dateOfBirth && dobRegex.test(col)) {
        dateOfBirth = col.replace(/-/g, '/');
        continue;
      }
      if (!fullName) {
        fullName = col;
      }
    }

    // Fallback positional mapping: [Họ tên, Lớp, Ngày sinh]
    if (!fullName && cols[0]) fullName = cols[0];
    if (!studentClass && cols[1]) {
      const candidate = cols[1].replace(/^lớp\s+/i, '').trim().toUpperCase();
      if (classRegex.test(candidate)) {
        studentClass = candidate;
      } else if (cols[2]) {
        const candidate2 = cols[2].replace(/^lớp\s+/i, '').trim().toUpperCase();
        if (classRegex.test(candidate2)) {
          studentClass = candidate2;
        }
      }
    }
    if (!dateOfBirth) {
      if (cols[2] && !classRegex.test(cols[2].trim())) {
        dateOfBirth = cols[2].trim();
      } else if (cols[1] && !classRegex.test(cols[1].trim())) {
        dateOfBirth = cols[1].trim();
      } else {
        dateOfBirth = '01/01/2012';
      }
    }

    if (!fullName.trim()) return;
    const resolvedClass = (studentClass || fallbackClass).toUpperCase();
    const gradeMatch = resolvedClass.match(/^([6789])/);
    const grade = gradeMatch ? Number(gradeMatch[1]) : 6;

    // Auto-generate unique username
    const baseUsername = suggestStudentUsername(fullName, resolvedClass);
    let finalUsername = baseUsername;
    let suffix = 2;
    while (usedUsernames.has(finalUsername.toLowerCase())) {
      finalUsername = `${baseUsername}${suffix < 10 ? `0${suffix}` : suffix}`;
      suffix++;
    }
    usedUsernames.add(finalUsername.toLowerCase());

    // Auto-generate 6-digit password
    const autoPassword = generateAutoStudentPassword(idx, baseSeed);

    result.push({
      id: `student-excel-${resolvedClass.toLowerCase()}-${Date.now()}-${idx}`,
      fullName: fullName.trim(),
      dateOfBirth: dateOfBirth.trim(),
      studentClass: resolvedClass,
      grade,
      username: finalUsername,
      password: autoPassword,
      createdAt: new Date().toISOString(),
    });
  });

  return result;
}

/**
 * Parses bulk student account lines in format:
 * "Họ tên | Ngày sinh | Lớp học | Tài khoản | Mật khẩu" or 3-column Excel format "Họ tên | Lớp | Ngày sinh".
 */
export function parseBulkStudentAccountsText(
  rawText: string,
  fallbackClass: string = '9A1',
  fallbackGrade: number = 9
): StudentAccount[] {
  return parseExcelStudentAccountsAutoCredentials(rawText, {
    fallbackClass: fallbackClass || `${fallbackGrade}A1`,
  });
}

/**
 * Exports StudentAccount roster to UTF-8 BOM CSV for Admin archiving.
 */
export function exportStudentAccountsToCsvString(
  accounts: StudentAccount[],
  classFilterLabel: string = 'Toàn trường'
): string {
  const escapeCell = (val: unknown): string => {
    const str = String(val ?? '').replace(/\r?\n/g, ' ').trim();
    return `"${str.replace(/"/g, '""')}"`;
  };
  const headers = [
    'STT',
    'Họ và Tên Học Sinh',
    'Lớp Học',
    'Khối',
    'Ngày Sinh',
    'Tài Khoản (Sinh Tự Động)',
    'Mật Khẩu (Sinh Tự Động)',
    'Ngày Cấp Tài Khoản',
  ];
  const rows = accounts.map((acc, idx) =>
    [
      idx + 1,
      escapeCell(acc.fullName),
      escapeCell(acc.studentClass),
      acc.grade,
      escapeCell(acc.dateOfBirth),
      escapeCell(acc.username),
      escapeCell(acc.password),
      escapeCell(acc.createdAt),
    ].join(',')
  );

  const summary = [
    '',
    `"=== DANH SÁCH TÀI KHOẢN HỌC SINH EDUEXAM PRO (${classFilterLabel}) ==="`,
    `"Tổng số tài khoản học sinh:",${accounts.length}`,
  ];
  return '\uFEFF' + [headers.join(','), ...rows, ...summary].join('\n');
}

/**
 * Checks whether an exam is a system-generated demo exam (`default-*` or `exam-init-*`).
 */
export function isSystemGeneratedDemoExam(
  exam?: { id?: string; code?: string } | null
): boolean {
  if (!exam || !exam.id) return false;
  const idLower = exam.id.trim().toLowerCase();
  return idLower.startsWith('default-') || idLower.startsWith('exam-init-');
}

/**
 * Generates a compact shorthand username from a Vietnamese teacher's full name.
 * Strips honorifics like "Thầy", "Cô", "GV", "ThS", "TS".
 * Example:
 * - "Nguyễn Minh Khoa" -> "khoanm"
 * - "Thầy Đỗ Mạnh Trường" -> "truongdm"
 * - "Cô Trần Thị Thu Hằng" -> "hangttt"
 */
export function suggestTeacherUsernameFromFullName(
  fullName: string,
  existingUsernames: string[] = []
): string {
  const cleaned = (fullName || '')
    .trim()
    .replace(/\([^)]*\)/g, ' ')
    .replace(
      /^(thầy\s+giáo|cô\s+giáo|giáo\s+viên|thầy|cô|gv\.?|ths\.?|ts\.?|pgs\.?|gs\.?)\s+/i,
      ''
    )
    .trim();

  const ascii = cleaned
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();

  const parts = ascii.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return 'gv';
  }

  let base = '';
  if (parts.length === 1) {
    base = parts[0];
  } else {
    const givenName = parts[parts.length - 1];
    const initials = parts
      .slice(0, parts.length - 1)
      .map((p) => p[0] || '')
      .join('');
    base = `${givenName}${initials}`;
  }

  const used = new Set(
    existingUsernames.map((u) => (u || '').trim().toLowerCase()).filter(Boolean)
  );
  if (!used.has(base)) {
    return base;
  }
  let suffix = 2;
  while (used.has(`${base}${suffix}`)) {
    suffix++;
  }
  return `${base}${suffix}`;
}

export interface StudentExamReminderItem {
  exam: ExamBankData;
  status: 'upcoming' | 'closing-soon' | 'open';
  badgeLabel: string;
  countdownText: string;
  startFormatted: string;
  endFormatted: string;
  sortTimeMs: number;
}

function formatDurationDiffVi(diffMs: number): string {
  const totalMinutes = Math.max(1, Math.floor(diffMs / 60000));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const mins = totalMinutes % 60;
  if (days > 0) {
    return `${days} ngày ${hours} giờ`;
  }
  if (hours > 0) {
    return `${hours} giờ ${mins} phút`;
  }
  return `${mins} phút`;
}

function formatReminderDateTimeVi(isoStr?: string): string {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return isoStr;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())} - ${pad(d.getDate())}/${pad(
    d.getMonth() + 1
  )}/${d.getFullYear()}`;
}

/**
 * Returns upcoming and currently open scheduled exam reminders for a student's specific grade & class
 * based on `startAt` and `endAt` timestamps.
 */
export function getStudentScheduleReminders(
  exams: ExamBankData[],
  student: { grade: number; studentClass: string },
  nowMs: number = Date.now()
): StudentExamReminderItem[] {
  if (!student || !Array.isArray(exams)) return [];
  const normClass = (student.studentClass || '').trim().toUpperCase();
  const reminders: StudentExamReminderItem[] = [];

  for (const ex of exams) {
    if (ex.isActive === false || ex.isAssigned === false) continue;
    if (ex.grade !== student.grade) continue;

    // Verify class scope
    if (Array.isArray(ex.assignedClasses) && ex.assignedClasses.length > 0) {
      const matchesClass = ex.assignedClasses.some((c) => {
        const up = c.trim().toUpperCase();
        return up === 'ALL' || up === normClass;
      });
      if (!matchesClass) continue;
    }

    const startMs = ex.startAt ? Date.parse(ex.startAt) : NaN;
    const endMs = ex.endAt ? Date.parse(ex.endAt) : NaN;

    if (Number.isNaN(startMs) && Number.isNaN(endMs)) {
      continue;
    }

    // Ignore already expired exams
    if (!Number.isNaN(endMs) && nowMs > endMs) {
      continue;
    }

    const startFormatted = ex.startAt
      ? formatReminderDateTimeVi(ex.startAt)
      : 'Đã mở';
    const endFormatted = ex.endAt
      ? formatReminderDateTimeVi(ex.endAt)
      : 'Không giới hạn';

    if (!Number.isNaN(startMs) && nowMs < startMs) {
      const diff = startMs - nowMs;
      reminders.push({
        exam: ex,
        status: 'upcoming',
        badgeLabel: 'SẮP DIỄN RA',
        countdownText: `Mở ca thi sau ${formatDurationDiffVi(diff)}`,
        startFormatted,
        endFormatted,
        sortTimeMs: startMs,
      });
    } else if (!Number.isNaN(endMs) && endMs - nowMs <= 72 * 3600 * 1000) {
      const diff = endMs - nowMs;
      reminders.push({
        exam: ex,
        status: 'closing-soon',
        badgeLabel: 'SẮP ĐÓNG CA THI',
        countdownText: `Còn ${formatDurationDiffVi(diff)} trước khi đóng đề`,
        startFormatted,
        endFormatted,
        sortTimeMs: endMs,
      });
    } else {
      reminders.push({
        exam: ex,
        status: 'open',
        badgeLabel: 'ĐANG MỞ CA THI',
        countdownText: `Đang trong khung giờ làm bài`,
        startFormatted,
        endFormatted,
        sortTimeMs: !Number.isNaN(endMs) ? endMs : nowMs + 999999999,
      });
    }
  }

  const priorityRank: Record<StudentExamReminderItem['status'], number> = {
    upcoming: 1,
    'closing-soon': 2,
    open: 3,
  };

  reminders.sort((a, b) => {
    if (priorityRank[a.status] !== priorityRank[b.status]) {
      return priorityRank[a.status] - priorityRank[b.status];
    }
    return a.sortTimeMs - b.sortTimeMs;
  });

  return reminders;
}

/**
 * Parses any freeform exam content (unstructured text, numbered questions, inline A/B/C/D options,
 * or raw paragraphs) into a valid `ExamBankData` without requiring strict template headers.
 */
export function parseFreeformExamContent(
  rawText: string,
  options: {
    grade?: number;
    subject?: SubjectKey | string;
    customCode?: string;
    customTitle?: string;
    durationMinutes?: number;
    createdBy?: string;
    teacherId?: string;
    teacherUsername?: string;
    teacherName?: string;
  } = {}
): {
  ok: true;
  exam: ExamBankData;
  totalPoints: number;
  mcqPointsTotal: number;
  warnings: string[];
  parsedMode: 'freeform' | 'standard';
} {
  const grade =
    options.grade && [6, 7, 8, 9].includes(options.grade) ? options.grade : 9;
  const subjKey = normalizeSubjectKey(options.subject || 'Toán');
  const subjMeta = getSubjectMeta(subjKey);

  // First check if the input explicitly contains the standard template marker
  if (/\[PHẦN\s*I\b/i.test(rawText) || /^MÃ ĐỀ\s*:/im.test(rawText)) {
    const stdExam = parseStandardExamText(rawText, grade, subjKey);
    if (stdExam && stdExam.questions.length > 0) {
      const mcqPointsTotal = Number(
        stdExam.questions.reduce((acc, q) => acc + q.points, 0).toFixed(2)
      );
      const totalPoints = Number(
        (
          mcqPointsTotal +
          stdExam.fillQuestion.points +
          stdExam.shortQuestion.points
        ).toFixed(2)
      );
      const enriched: ExamBankData = {
        ...stdExam,
        id: `exam-freeform-${subjMeta.codePrefix.toLowerCase()}-k${grade}-${Date.now()}`,
        code:
          options.customCode?.trim() ||
          stdExam.code ||
          `${subjMeta.codePrefix}-${grade}-${String(Date.now()).slice(-3)}`,
        title:
          options.customTitle?.trim() ||
          stdExam.title ||
          `Đề Kiểm Tra Môn ${subjMeta.label} Khối ${grade}`,
        subject: subjKey,
        subjectCode: subjKey,
        grade,
        durationMinutes:
          options.durationMinutes || stdExam.durationMinutes || 45,
        createdBy: options.createdBy || stdExam.createdBy,
        teacherId: options.teacherId || stdExam.teacherId,
        teacherUsername: options.teacherUsername,
        teacherName:
          options.teacherName || options.createdBy || stdExam.teacherName,
      };
      return {
        ok: true,
        exam: enriched,
        totalPoints,
        mcqPointsTotal,
        warnings: [],
        parsedMode: 'standard',
      };
    }
  }

  // Freeform intelligent extraction: split into question blocks or lines
  const warnings: string[] = [];
  const cleanedText = (rawText || '').replace(/\r\n/g, '\n').trim();
  const lines = cleanedText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  interface RawBlock {
    promptLines: string[];
    options: Partial<Record<'A' | 'B' | 'C' | 'D', string>>;
    correctAnswer?: 'A' | 'B' | 'C' | 'D';
    explanation?: string;
  }

  const blocks: RawBlock[] = [];
  let currentBlock: RawBlock | null = null;

  const questionStartRegex =
    /^(?:câu\s*\d+|bài\s*\d+|question\s*\d+|q\d+|\d+\s*[.)/:-])\s*(.+)$/i;
  const optionLineRegex = /^(\*)?\s*([A-D])\s*[.):-]\s*(.+)$/i;
  const inlineOptionsRegex =
    /\bA\s*[.):-]\s*(.+?)\s+B\s*[.):-]\s*(.+?)(?:\s+C\s*[.):-]\s*(.+?))?(?:\s+D\s*[.):-]\s*(.+))?$/i;
  const answerLineRegex =
    /^(?:đáp\s*án|dap\s*an|key|answer|đ\/a)\s*[:=-]?\s*([A-D])\b/i;
  const explanationLineRegex =
    /^(?:giải\s*thích|hướng\s*dẫn|lời\s*giải)\s*[:=-]?\s*(.+)$/i;

  for (const line of lines) {
    // Skip metadata header lines if present
    if (/^(mã\s*đề|tiêu\s*đề|môn\s*học|khối\s*lớp|thời\s*gian)\s*:/i.test(line)) {
      continue;
    }

    const ansMatch = line.match(answerLineRegex);
    if (ansMatch && currentBlock) {
      currentBlock.correctAnswer = ansMatch[1].toUpperCase() as
        | 'A'
        | 'B'
        | 'C'
        | 'D';
      continue;
    }

    const expMatch = line.match(explanationLineRegex);
    if (expMatch && currentBlock) {
      currentBlock.explanation = expMatch[1].trim();
      continue;
    }

    const optMatch = line.match(optionLineRegex);
    if (optMatch) {
      if (!currentBlock) {
        currentBlock = {
          promptLines: [`Câu hỏi trắc nghiệm số ${blocks.length + 1}`],
          options: {},
        };
        blocks.push(currentBlock);
      }
      const isStarred = Boolean(optMatch[1]);
      const key = optMatch[2].toUpperCase() as 'A' | 'B' | 'C' | 'D';
      const val = optMatch[3].trim();
      currentBlock.options[key] = `${key}. ${val.replace(/^[A-D]\s*[.):-]\s*/i, '')}`;
      if (isStarred) {
        currentBlock.correctAnswer = key;
      }
      continue;
    }

    const qMatch = line.match(questionStartRegex);
    if (qMatch) {
      let promptBody = qMatch[1].trim();
      const inlineMatch = promptBody.match(inlineOptionsRegex);
      const newBlock: RawBlock = {
        promptLines: [],
        options: {},
      };
      if (inlineMatch && inlineMatch.index !== undefined) {
        const beforeOpts = promptBody.slice(0, inlineMatch.index).trim();
        newBlock.promptLines.push(beforeOpts || promptBody);
        if (inlineMatch[1]) newBlock.options.A = `A. ${inlineMatch[1].trim()}`;
        if (inlineMatch[2]) newBlock.options.B = `B. ${inlineMatch[2].trim()}`;
        if (inlineMatch[3]) newBlock.options.C = `C. ${inlineMatch[3].trim()}`;
        if (inlineMatch[4]) newBlock.options.D = `D. ${inlineMatch[4].trim()}`;
      } else {
        // Check if [Đáp án: X] is embedded at end of question line
        const embeddedAns = promptBody.match(/\[(?:đáp\s*án|key)?\s*:?\s*([A-D])\]/i);
        if (embeddedAns) {
          newBlock.correctAnswer = embeddedAns[1].toUpperCase() as
            | 'A'
            | 'B'
            | 'C'
            | 'D';
          promptBody = promptBody.replace(embeddedAns[0], '').trim();
        }
        newBlock.promptLines.push(promptBody);
      }
      currentBlock = newBlock;
      blocks.push(newBlock);
      continue;
    }

    // Check if line contains inline options A. ... B. ... C. ... D. ...
    const inlineOnlyMatch = line.match(inlineOptionsRegex);
    if (inlineOnlyMatch && currentBlock) {
      if (inlineOnlyMatch[1])
        currentBlock.options.A = `A. ${inlineOnlyMatch[1].trim()}`;
      if (inlineOnlyMatch[2])
        currentBlock.options.B = `B. ${inlineOnlyMatch[2].trim()}`;
      if (inlineOnlyMatch[3])
        currentBlock.options.C = `C. ${inlineOnlyMatch[3].trim()}`;
      if (inlineOnlyMatch[4])
        currentBlock.options.D = `D. ${inlineOnlyMatch[4].trim()}`;
      continue;
    }

    // Otherwise treat non-empty line as a standalone freeform question if previous block already has options, or append to current prompt
    if (!currentBlock || Object.keys(currentBlock.options).length > 0) {
      currentBlock = {
        promptLines: [line],
        options: {},
      };
      blocks.push(currentBlock);
    } else {
      currentBlock.promptLines.push(line);
    }
  }

  // Fallback if input text was completely empty
  if (blocks.length === 0) {
    blocks.push({
      promptLines: [
        `Câu hỏi tự do môn ${subjMeta.label} Khối ${grade} (Giáo viên có thể sửa trực tiếp nội dung tại ngân hàng đề)`,
      ],
      options: {},
      correctAnswer: 'A',
    });
  }

  const questions: ExamQuestion[] = blocks.map((b, idx) => {
    const prompt =
      b.promptLines.join(' ').trim() ||
      `Câu hỏi số ${idx + 1} (Môn ${subjKey} Khối ${grade})`;
    const keys: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
    const builtOptions = keys.map((k) => ({
      key: k,
      text:
        b.options[k] ||
        `${k}. Phương án ${k} cho câu ${idx + 1} (có thể sửa trực tiếp)`,
    }));
    if (Object.keys(b.options).length < 4) {
      warnings.push(
        `Câu ${idx + 1}: Hệ thống tự động bổ sung phương án A/B/C/D mặc định cho định dạng đề tự do.`
      );
    }
    return {
      id: idx + 1,
      subject: `${subjKey} ${grade}`,
      type: 'mcq',
      points: Number((5 / Math.max(1, blocks.length)).toFixed(2)),
      prompt,
      options: builtOptions,
      correctAnswer: b.correctAnswer || 'A',
      explanation:
        b.explanation ||
        `Đáp án đúng: ${b.correctAnswer || 'A'} (Nạp từ chế độ Đề tự do).`,
    };
  });

  const mcqPointsTotal = Number(
    questions.reduce((acc, q) => acc + q.points, 0).toFixed(2)
  );
  const fillQuestion = DEFAULT_EXAM_BANK_ITEM.fillQuestion;
  const shortQuestion = DEFAULT_EXAM_BANK_ITEM.shortQuestion;
  const totalPoints = Number(
    (mcqPointsTotal + fillQuestion.points + shortQuestion.points).toFixed(2)
  );

  const exam: ExamBankData = {
    id: `exam-freeform-${subjMeta.codePrefix.toLowerCase()}-k${grade}-${Date.now()}`,
    code:
      options.customCode?.trim() ||
      `${subjMeta.codePrefix}-${grade}-TUDO-${String(Date.now()).slice(-3)}`,
    title:
      options.customTitle?.trim() ||
      `Đề Kiểm Tra Tự Do Môn ${subjMeta.label} Khối ${grade} (${questions.length} câu)`,
    subject: subjKey,
    subjectCode: subjKey,
    grade,
    durationMinutes: options.durationMinutes || 45,
    questions,
    fillQuestion,
    shortQuestion,
    createdAt: new Date().toISOString(),
    createdBy: options.createdBy || `GV Môn ${subjKey}`,
    teacherId: options.teacherId || 'teacher-admin',
    teacherUsername: options.teacherUsername,
    teacherName: options.teacherName || options.createdBy || `GV Môn ${subjKey}`,
    isActive: true,
    isAssigned: true,
  };

  return {
    ok: true,
    exam,
    totalPoints,
    mcqPointsTotal,
    warnings,
    parsedMode: 'freeform',
  };
}

/**
 * Extracts clean plain text paragraphs from a binary Microsoft Word (.docx) ArrayBuffer
 * using JSZip client-side, preserving Word tables (<w:tbl>) as pipe-delimited rows.
 */
export async function extractTextFromDocxArrayBuffer(
  buffer: ArrayBuffer
): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const docXmlFile = zip.file('word/document.xml');
    if (!docXmlFile) {
      return '';
    }
    const rawXmlStr = await docXmlFile.async('string');
    const xmlStr = normalizeWordXmlTablesToParagraphs(rawXmlStr);
    const paragraphs = xmlStr.split(/<\/w:p>/i);
    const lines: string[] = [];
    for (const p of paragraphs) {
      const matches = Array.from(
        p.matchAll(/<w:t(?:\s+[^>]*)?>([\s\S]*?)<\/w:t>/gi)
      );
      if (matches.length > 0) {
        const line = matches
          .map((m) =>
            m[1]
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'")
          )
          .join('')
          .trim();
        if (line) lines.push(line);
      }
    }
    return lines.join('\n');
  } catch (err) {
    console.error('JSZip docx extraction error:', err);
    return '';
  }
}

export interface ScanThreeSectionsResult {
  ok: boolean;
  exam: ExamBankData;
  mcqCount: number;
  hasFill: boolean;
  hasShort: boolean;
  warnings: string[];
  error?: string;
}

/**
 * Optimal Structural OCR & Document Scanner for THCS Exams:
 * - Automatically detects and classifies question blocks into:
 *   1. Trắc nghiệm khách quan (MCQ with A, B, C, D)
 *   2. Điền khuyết (Fill-in-the-blank with variable blanks [1]..[N], e.g., (1) ...... to (6) ......)
 *   3. Trả lời ngắn / Tự luận (Short answer / Essay with sub-parts a, b and grading criteria)
 * - Scans embedded Answer Keys & Grading Guides at the end of the uploaded document
 *   (including Word answer tables `Câu | 1..10` / `Đáp án | B B A...`, parenthetical fill answers `(1) ... | (2) ...`, and essay rubrics).
 * - Uses ONLY the question types actually present in the scanned document ("quét được loại nào thì dùng loại đó làm đề").
 */
export function scanAndParseThreeExamSections(
  rawText: string,
  defaultGrade: number = 9,
  defaultSubject: SubjectKey | string = 'Tin',
  options: {
    customCode?: string;
    customTitle?: string;
    durationMinutes?: number;
    createdBy?: string;
    teacherId?: string;
    teacherUsername?: string;
    teacherName?: string;
  } = {}
): ScanThreeSectionsResult {
  if (!rawText || !rawText.trim()) {
    return {
      ok: false,
      exam: DEFAULT_EXAM_BANK_ITEM,
      mcqCount: 0,
      hasFill: false,
      hasShort: false,
      warnings: [],
      error: 'Tệp rỗng hoặc không trích xuất được nội dung văn bản.',
    };
  }

  const warnings: string[] = [];
  const text = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

  // 1. Detect Metadata Header (MÃ ĐỀ, TIÊU ĐỀ, MÔN HỌC, KHỐI LỚP, THỜI GIAN)
  const codeMatch = text.match(/(?:^|\n|\|)\s*(?:mã\s*đề|code)\s*[:=-]\s*([^\n|]+)/i);
  const titleMatch =
    text.match(/(?:^|\n|\|)\s*(?:tiêu\s*đề|title)\s*[:=-]\s*([^\n|]+)/i) ||
    text.match(/(?:^|\n|\|)\s*(ĐỀ\s+(?:KIỂM\s+TRA|KHẢO\s+SÁT|THI)[^\n|]+)/i);
  const subjMatch = text.match(/(?:^|\n|\|)\s*(?:môn\s*học|subject|môn)\s*[:=-]\s*([^\n|]+)/i);
  const gradeMatch = text.match(/(?:^|\n|\|)\s*(?:khối\s*lớp|khối|lớp|grade)\s*[:=-]?\s*([6-9])\b/i);
  const durationMatch = text.match(/(?:^|\n|\|)\s*(?:thời\s*gian(?:\s*làm\s*bài)?|duration)\s*[:=-]?\s*(\d+)\s*(?:phút)?/i);

  let detectedGrade = defaultGrade;
  if (gradeMatch && [6, 7, 8, 9].includes(Number(gradeMatch[1]))) {
    detectedGrade = Number(gradeMatch[1]);
  } else if (subjMatch) {
    const gInSubj = subjMatch[1].match(/\b([6-9])\b/);
    if (gInSubj) {
      detectedGrade = Number(gInSubj[1]);
    }
  } else {
    const inlineGrade = text.match(/\b(?:lớp|khối|tin\s*học|toán|ngữ\s*văn|tiếng\s*anh|vật\s*lý|hóa\s*học|sinh\s*học|lịch\s*sử|địa\s*lý|gdcd|công\s*nghệ)\s*([6-9])\b/i);
    if (inlineGrade) {
      detectedGrade = Number(inlineGrade[1]);
    }
  }

  const resolvedSubjectKey = subjMatch
    ? normalizeSubjectKey(subjMatch[1])
    : normalizeSubjectKey(defaultSubject);
  const subjMeta = getSubjectMeta(resolvedSubjectKey);

  const durationMinutes = durationMatch
    ? Number(durationMatch[1])
    : options.durationMinutes || 45;

  const examCode =
    options.customCode?.trim() ||
    (codeMatch ? codeMatch[1].trim() : `${subjMeta.codePrefix}-${detectedGrade}-01`);

  const examTitle =
    options.customTitle?.trim() ||
    (titleMatch
      ? titleMatch[1].trim()
      : `Đề Kiểm Tra Định Kỳ Môn ${subjMeta.label} Khối ${detectedGrade}`);

  // 2. Check if this is an explicit EduExam Standard Template ([PHẦN I...], [PHẦN II...], [PHẦN III...])
  const isEduExamTemplate =
    /\[PHẦN\s*I\b/i.test(text) &&
    (/NỘI\s*DUNG\s*:/i.test(text) || /ĐỀ\s*BÀI\s*:/i.test(text));

  if (isEduExamTemplate) {
    const hasPart1 = /\[PHẦN\s*I\b/i.test(text);
    const hasPart2 = /\[PHẦN\s*II\b/i.test(text);
    const hasPart3 = /\[PHẦN\s*III\b/i.test(text);
    const parsedStd = parseStandardExamText(text, detectedGrade, resolvedSubjectKey);

    const finalStdExam: ExamBankData = {
      ...parsedStd,
      id: `exam-${subjMeta.codePrefix.toLowerCase()}-k${detectedGrade}-${Date.now()}`,
      code: examCode,
      title: examTitle,
      subject: resolvedSubjectKey,
      subjectCode: resolvedSubjectKey,
      grade: detectedGrade,
      durationMinutes,
      questions: hasPart1 ? parsedStd.questions : [],
      fillQuestion: hasPart2
        ? parsedStd.fillQuestion
        : { promptTemplate: '', blanks: [], points: 0 },
      shortQuestion: hasPart3
        ? parsedStd.shortQuestion
        : { prompt: '', requirement: '', keywords: [], sampleAnswer: '', points: 0 },
      createdAt: new Date().toISOString(),
      createdBy: options.createdBy || `GV Môn ${subjMeta.label}`,
      teacherId: options.teacherId || 'admin-master',
      teacherUsername: options.teacherUsername,
      teacherName: options.teacherName || options.createdBy || `GV Môn ${subjMeta.label}`,
      isActive: true,
      isAssigned: true,
    };

    return {
      ok: true,
      exam: finalStdExam,
      mcqCount: finalStdExam.questions.length,
      hasFill: Boolean(finalStdExam.fillQuestion.promptTemplate && finalStdExam.fillQuestion.points > 0),
      hasShort: Boolean(finalStdExam.shortQuestion.prompt && finalStdExam.shortQuestion.points > 0),
      warnings,
    };
  }

  // 3. Separate Questions Body vs Embedded Answer Key / Grading Guide at the end of the document
  const rawLines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  let answerKeyStartLineIdx = -1;
  let seenAtLeastOneMcqOption = false;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (/^[A-D]\s*[.):-]\s+.+/i.test(line) || /\bA\s*[.):-]\s*.+\s+B\s*[.):-]\s*/i.test(line)) {
      seenAtLeastOneMcqOption = true;
    }

    // Explicit Answer Key / Grading Guide heading
    if (
      /^(?:I+|1|A|PHẦN)?\s*[.)-]?\s*(?:ĐÁP\s*ÁN\s*(?:VÀ|&|-)\s*(?:HƯỚNG\s*DẪN\s*CHẤM|BIỂU\s*ĐIỂM|THANG\s*ĐIỂM)|HƯỚNG\s*DẪN\s*CHẤM(?:\s*VÀ\s*BIỂU\s*ĐIỂM)?|BẢNG\s*ĐÁP\s*ÁN|ĐÁP\s*ÁN\s*ĐỀ\s*THI)\b/i.test(
        line
      ) ||
      (seenAtLeastOneMcqOption &&
        /^ĐÁP\s*ÁN(?:\s*$|(?:\s*[:=-]\s*(?:câu\s*)?\d+\s*[.:=-]?\s*[A-D]\b))/i.test(
          line
        ))
    ) {
      answerKeyStartLineIdx = i;
      break;
    }

    // Answer key section heading like "1. PHẦN TRẮC NGHIỆM (5,0 ĐIỂM - MỖI CÂU ĐÚNG ĐƯỢC 0,5 ĐIỂM)" appearing after questions
    if (
      seenAtLeastOneMcqOption &&
      /^(?:1|I)\s*[.)]\s*PHẦN\s*TRẮC\s*NGHIỆM\b/i.test(line) &&
      (/MỖI\s*CÂU\s*ĐÚNG/i.test(line) ||
        (rawLines[i + 1] && /^Câu\s*(?:\||:|\t|\s+1\b)/i.test(rawLines[i + 1])))
    ) {
      answerKeyStartLineIdx = i;
      break;
    }

    // Direct answer table row "Câu | 1 | 2 | 3 ..." appearing after questions
    if (
      seenAtLeastOneMcqOption &&
      /^Câu\s*\|\s*1\s*\|\s*2\b/i.test(line)
    ) {
      answerKeyStartLineIdx =
        i > 0 && /PHẦN\s*TRẮC\s*NGHIỆM/i.test(rawLines[i - 1]) ? i - 1 : i;
      break;
    }
  }

  const bodyLines =
    answerKeyStartLineIdx >= 0
      ? rawLines.slice(0, answerKeyStartLineIdx)
      : rawLines;
  const answerKeyLines =
    answerKeyStartLineIdx >= 0 ? rawLines.slice(answerKeyStartLineIdx) : [];
  const answerKeyText = answerKeyLines.join('\n');

  // 4. Parse Embedded Answer Key (MCQ Table / Pairs, Fill-in-the-blank Answers, Essay Rubric)
  const mcqAnswerMap: Record<number, 'A' | 'B' | 'C' | 'D'> = {};
  const fillAnswerMap: Record<number, string> = {};
  let parsedShortSampleAnswer = '';
  const parsedShortKeywords: string[] = [];

  if (answerKeyLines.length > 0) {
    // 4a. Parse pipe-delimited or whitespace-delimited MCQ Answer Table rows:
    // Row 1: Câu | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10
    // Row 2: Đáp án | B | B | A | A | B | A | B | B | A | B
    for (let i = 0; i < answerKeyLines.length - 1; i++) {
      const row1 = answerKeyLines[i];
      const row2 = answerKeyLines[i + 1];
      if (/^Câu\b/i.test(row1) && /^(?:Đáp\s*án|ĐA|Trả\s*lời)\b/i.test(row2)) {
        const nums = Array.from(row1.matchAll(/\b(\d{1,3})\b/g)).map((m) =>
          Number(m[1])
        );
        const strippedRow2 = row2.replace(/^(?:Đáp\s*án|ĐA|Trả\s*lời)\s*[|:-]?\s*/i, '');
        const ansLetters = Array.from(
          strippedRow2.matchAll(/\b([A-D])\b/gi)
        ).map((m) => m[1].toUpperCase() as 'A' | 'B' | 'C' | 'D');
        if (nums.length > 0 && ansLetters.length > 0) {
          const count = Math.min(nums.length, ansLetters.length);
          for (let k = 0; k < count; k++) {
            mcqAnswerMap[nums[k]] = ansLetters[k];
          }
        }
      }
    }

    // 4b. Parse vertical cell-by-cell table if cells were on separate lines (Câu, 1..N, Đáp án, B..B)
    const cauLineIdx = answerKeyLines.findIndex((l) => /^Câu$/i.test(l));
    const dapAnLineIdx = answerKeyLines.findIndex(
      (l, idx) => idx > cauLineIdx && /^(?:Đáp\s*án|ĐA)$/i.test(l)
    );
    if (cauLineIdx !== -1 && dapAnLineIdx > cauLineIdx + 1) {
      const qNums: number[] = [];
      for (let i = cauLineIdx + 1; i < dapAnLineIdx; i++) {
        if (/^\d{1,3}$/.test(answerKeyLines[i])) {
          qNums.push(Number(answerKeyLines[i]));
        }
      }
      const aLetters: ('A' | 'B' | 'C' | 'D')[] = [];
      for (
        let i = dapAnLineIdx + 1;
        i < answerKeyLines.length && aLetters.length < qNums.length;
        i++
      ) {
        if (/^[A-D]$/i.test(answerKeyLines[i])) {
          aLetters.push(
            answerKeyLines[i].toUpperCase() as 'A' | 'B' | 'C' | 'D'
          );
        } else {
          break;
        }
      }
      if (qNums.length > 0 && aLetters.length === qNums.length) {
        qNums.forEach((n, idx) => {
          mcqAnswerMap[n] = aLetters[idx];
        });
      }
    }

    // 4c. Parse inline pairs like "1. B", "1-B", "1: B", "Câu 1: B", "1B 2B 3A"
    const inlinePairs = Array.from(
      answerKeyText.matchAll(/(?:Câu\s*)?(\d{1,2})\s*[.:=-]\s*([A-D])\b/gi)
    );
    for (const m of inlinePairs) {
      const qNum = Number(m[1]);
      const letter = m[2].toUpperCase() as 'A' | 'B' | 'C' | 'D';
      if (!mcqAnswerMap[qNum]) {
        mcqAnswerMap[qNum] = letter;
      }
    }

    // 4d. Parse Fill-in-the-blank answers in Answer Key:
    // e.g. "(1) Tính mới | (2) Tính chính xác | (3) Tính đầy đủ"
    //      "(4) Tính sử dụng được | (5) Vi xử lý | (6) Deepfake"
    const parenMatches = Array.from(
      answerKeyText.matchAll(/\((\d{1,2})\)\s*([^|\n()]+?)(?=\s*(?:\||\(\d{1,2}\)|\n|$))/g)
    );
    for (const pm of parenMatches) {
      const slotNum = Number(pm[1]);
      const val = pm[2].trim().replace(/[.;,]+$/, '').trim();
      if (slotNum >= 1 && slotNum <= 20 && val && !/^\d+[,.]?\d*\s*điểm$/i.test(val)) {
        fillAnswerMap[slotNum] = val;
      }
    }

    // 4e. Parse Essay / Short-Answer grading guide from Answer Key
    // Find lines under "2. PHẦN TỰ LUẬN" or "Bài 2" / "Câu tự luận" that are not the (1)..(N) fill answers
    const essaySampleLines: string[] = [];
    let inTuLuanAnswerSection = false;
    let inEssayRubricBlock = false;

    for (const line of answerKeyLines) {
      if (/^(?:2|II|B)\s*[.)]\s*PHẦN\s*TỰ\s*LUẬN/i.test(line)) {
        inTuLuanAnswerSection = true;
        continue;
      }
      if (!inTuLuanAnswerSection && /^(?:Bài|Câu)\s*\d+/i.test(line)) {
        inTuLuanAnswerSection = true;
      }
      if (!inTuLuanAnswerSection) continue;

      // Skip lines that are purely fill-in-the-blank answer headers or (1)..(N) rows
      if (
        /(?:mỗi\s*(?:ý|vị\s*trí)\s*điền\s*đúng|điền\s*đúng\s*mỗi)/i.test(line) ||
        (/^\(\d+\)/.test(line) && !/điểm\)\s*:/i.test(line))
      ) {
        continue;
      }

      if (/^(?:Bài|Câu)\s*\d+/i.test(line) || /^[a-d]\)\s+/i.test(line) || inEssayRubricBlock) {
        const cleanedLine = line.replace(/^(?:Bài|Câu)\s*\d+\s*(?:\([^)]*điểm\))?\s*[:.-]?\s*/i, '').trim();
        if (cleanedLine && !/(?:mỗi\s*(?:ý|vị\s*trí)\s*điền\s*đúng|điền\s*đúng\s*mỗi)/i.test(cleanedLine)) {
          inEssayRubricBlock = true;
          essaySampleLines.push(cleanedLine);
        } else if (/^(?:Bài|Câu)\s*\d+/i.test(line)) {
          inEssayRubricBlock = true;
        }
      }
    }

    if (essaySampleLines.length > 0) {
      parsedShortSampleAnswer = essaySampleLines.join('\n');
      // Extract meaningful keywords from bold/parenthetical steps or key terms in the rubric
      const stepMatches = Array.from(
        parsedShortSampleAnswer.matchAll(/Bước\s*\d+\s*\(([^)]+)\)/gi)
      ).map((m) => m[1].trim());
      if (stepMatches.length > 0) {
        parsedShortKeywords.push(...stepMatches);
      }
      const candidateTerms = [
        'Deepfake',
        'xác minh',
        'bình tĩnh',
        'cảnh báo',
        'PhET',
        'GeoGebra',
        'mô phỏng',
        'trực quan',
        'lừa đảo',
      ];
      for (const term of candidateTerms) {
        if (
          new RegExp(term, 'i').test(parsedShortSampleAnswer) &&
          !parsedShortKeywords.includes(term)
        ) {
          parsedShortKeywords.push(term);
        }
      }
    }
  }

  // 5. Scan & Classify Question Blocks in `bodyLines`
  // Section headers help track point allocations and context, while each block is classified by its actual structure.
  let currentSectionContext: 'MCQ' | 'FILL' | 'SHORT' = 'MCQ';
  let mcqSectionHeaderPoints: number | null = null;
  let essaySectionHeaderPoints: number | null = null;

  interface RawQuestionBlock {
    headerLabel: string;
    explicitPoints?: number;
    sectionContext: 'MCQ' | 'FILL' | 'SHORT';
    promptLines: string[];
    options: Partial<Record<'A' | 'B' | 'C' | 'D', string>>;
    correctAnswer?: 'A' | 'B' | 'C' | 'D';
    explanation?: string;
  }

  const rawBlocks: RawQuestionBlock[] = [];
  let activeBlock: RawQuestionBlock | null = null;

  const parsePointsFromText = (str: string): number | undefined => {
    const m = str.match(/(\d+(?:[.,]\d+)?)\s*điểm/i);
    if (!m) return undefined;
    const val = Number(m[1].replace(',', '.'));
    return !Number.isNaN(val) && val > 0 ? val : undefined;
  };

  const questionStartRegex =
    /^(?:(câu\s*\d+|bài\s*\d+|question\s*\d+|q\d+|\d+\s*[.)/:-]))\s*(.*)$/i;
  const optionLineRegex = /^(\*)?\s*([A-D])\s*[.):-]\s*(.+)$/i;
  const inlineOptionsRegex =
    /(?:^|\s+)(\*)?A\s*[.):-]\s*(.+?)\s+(?:\|\s*)?(\*)?B\s*[.):-]\s*(.+?)(?:\s+(?:\|\s*)?(\*)?C\s*[.):-]\s*(.+?))?(?:\s+(?:\|\s*)?(\*)?D\s*[.):-]\s*(.+))?$/i;
  const inlineCDRegex =
    /^(\*)?\s*C\s*[.):-]\s*(.+?)\s+(?:\|\s*)?(\*)?D\s*[.):-]\s*(.+)$/i;
  const answerLineRegex =
    /^(?:đáp\s*án|dap\s*an|key|answer|đ\/a)\s*[:=-]?\s*([A-D])\b/i;
  const explanationLineRegex =
    /^(?:giải\s*thích|hướng\s*dẫn|lời\s*giải)\s*[:=-]?\s*(.+)$/i;

  for (const line of bodyLines) {
    // Skip administrative / school header lines at the top of the exam
    if (
      /^(===|trường\s+|tổ\s+|phòng\s+gd|ủy\s+ban|ubnd\s+|đề\s+kiểm\s+tra|đề\s+khảo\s+sát|đề\s+thi|đề\s+chính\s+thức|năm\s+học|môn\s*[:=-]|môn\s+học|khối\s*lớp|thời\s*gian|mã\s*đề|tiêu\s*đề|họ\s+và\s+tên)/i.test(
        line
      )
    ) {
      continue;
    }

    // Detect Section Headers:
    // - A. PHẦN TRẮC NGHIỆM (5,0 ĐIỂM) / PHẦN I: TRẮC NGHIỆM
    if (
      /^(?:[A-Z0-9]+\s*[.)]\s*)?(?:\[?\s*PHẦN\s*(?:I|1|A)?\s*[:.-]?\s*)?TRẮC\s*NGHIỆM\b/i.test(
        line
      )
    ) {
      currentSectionContext = 'MCQ';
      const pts = parsePointsFromText(line);
      if (pts) mcqSectionHeaderPoints = pts;
      activeBlock = null;
      continue;
    }

    // - PHẦN ĐIỀN KHUYẾT
    if (
      /^(?:[A-Z0-9]+\s*[.)]\s*)?(?:\[?\s*PHẦN\s*(?:II|2|B)?\s*[:.-]?\s*)?(?:ĐIỀN\s*KHUYẾT|ĐIỀN\s*VÀO\s*CHỖ\s*TRỐNG)\b/i.test(
        line
      )
    ) {
      currentSectionContext = 'FILL';
      activeBlock = null;
      continue;
    }

    // - B. PHẦN TỰ LUẬN (5,0 ĐIỂM) / PHẦN III: TỰ LUẬN / TRẢ LỜI NGẮN
    if (
      /^(?:[A-Z0-9]+\s*[.)]\s*)?(?:\[?\s*PHẦN\s*(?:II|III|2|3|B|C)?\s*[:.-]?\s*)?(?:TỰ\s*LUẬN|TRẢ\s*LỜI\s*NGẮN)\b/i.test(
        line
      )
    ) {
      currentSectionContext = 'SHORT';
      const pts = parsePointsFromText(line);
      if (pts) essaySectionHeaderPoints = pts;
      activeBlock = null;
      continue;
    }

    // Check inline Đáp án / Giải thích for the active block
    const ansMatch = line.match(answerLineRegex);
    if (ansMatch && activeBlock) {
      activeBlock.correctAnswer = ansMatch[1].toUpperCase() as
        | 'A'
        | 'B'
        | 'C'
        | 'D';
      continue;
    }

    const expMatch = line.match(explanationLineRegex);
    if (expMatch && activeBlock) {
      activeBlock.explanation = expMatch[1].trim();
      continue;
    }

    // Check inline multi-option line first (e.g. "A. ... B. ... C. ... D. ..." or "A. ... B. ...")
    const inlineOnlyMatch = line.match(inlineOptionsRegex);
    if (
      inlineOnlyMatch &&
      !/^(?:câu\s*\d+|bài\s*\d+|question\s*\d+|q\d+|\d+\s*[.)/:-])/i.test(line)
    ) {
      if (!activeBlock) {
        activeBlock = {
          headerLabel: `Câu ${rawBlocks.length + 1}`,
          sectionContext: 'MCQ',
          promptLines: [`Câu hỏi số ${rawBlocks.length + 1}`],
          options: {},
        };
        rawBlocks.push(activeBlock);
      }
      if (inlineOnlyMatch[2]) {
        activeBlock.options.A = `A. ${inlineOnlyMatch[2].trim()}`;
        if (inlineOnlyMatch[1]) activeBlock.correctAnswer = 'A';
      }
      if (inlineOnlyMatch[4]) {
        activeBlock.options.B = `B. ${inlineOnlyMatch[4].trim()}`;
        if (inlineOnlyMatch[3]) activeBlock.correctAnswer = 'B';
      }
      if (inlineOnlyMatch[6]) {
        activeBlock.options.C = `C. ${inlineOnlyMatch[6].trim()}`;
        if (inlineOnlyMatch[5]) activeBlock.correctAnswer = 'C';
      }
      if (inlineOnlyMatch[8]) {
        activeBlock.options.D = `D. ${inlineOnlyMatch[8].trim()}`;
        if (inlineOnlyMatch[7]) activeBlock.correctAnswer = 'D';
      }
      continue;
    }

    // Check 2-column C & D option line ("C. ... D. ...")
    const inlineCDMatch = line.match(inlineCDRegex);
    if (inlineCDMatch && activeBlock) {
      activeBlock.options.C = `C. ${inlineCDMatch[2].trim()}`;
      if (inlineCDMatch[1]) activeBlock.correctAnswer = 'C';
      activeBlock.options.D = `D. ${inlineCDMatch[4].trim()}`;
      if (inlineCDMatch[3]) activeBlock.correctAnswer = 'D';
      continue;
    }

    // Check if line is a single A/B/C/D option
    const optMatch = line.match(optionLineRegex);
    if (optMatch && (currentSectionContext === 'MCQ' || (activeBlock && Object.keys(activeBlock.options).length > 0) || /^[A-D]\.\s/.test(line))) {
      if (!activeBlock) {
        activeBlock = {
          headerLabel: `Câu ${rawBlocks.length + 1}`,
          sectionContext: 'MCQ',
          promptLines: [`Câu hỏi số ${rawBlocks.length + 1}`],
          options: {},
        };
        rawBlocks.push(activeBlock);
      }
      const isStarred = Boolean(optMatch[1]);
      const key = optMatch[2].toUpperCase() as 'A' | 'B' | 'C' | 'D';
      const val = optMatch[3].trim();
      activeBlock.options[key] = `${key}. ${val.replace(/^[A-D]\s*[.):-]\s*/i, '')}`;
      if (isStarred) {
        activeBlock.correctAnswer = key;
      }
      continue;
    }

    // Check if line starts a new Question / Bài block (e.g. "Câu 1:", "Bài 11 (3,0 điểm):", "Bài 12 (2,0 điểm):")
    const qMatch = line.match(questionStartRegex);
    if (qMatch) {
      const headerTag = qMatch[1].trim();
      let restOfLine = (qMatch[2] || '').trim();

      // Extract explicit points in header like "(3,0 điểm):"
      let explicitPts: number | undefined = undefined;
      const headerPtsMatch = restOfLine.match(/^\(\s*(\d+(?:[.,]\d+)?)\s*điểm\s*\)\s*[:.-]?\s*(.*)$/i);
      if (headerPtsMatch) {
        explicitPts = Number(headerPtsMatch[1].replace(',', '.'));
        restOfLine = (headerPtsMatch[2] || '').trim();
      } else {
        restOfLine = restOfLine.replace(/^[:.-]\s*/, '').trim();
      }

      const newBlock: RawQuestionBlock = {
        headerLabel: headerTag,
        explicitPoints: explicitPts,
        sectionContext: currentSectionContext,
        promptLines: [],
        options: {},
      };

      const inlineMatch = restOfLine.match(inlineOptionsRegex);
      if (inlineMatch && inlineMatch.index !== undefined) {
        const beforeOpts = restOfLine.slice(0, inlineMatch.index).trim();
        if (beforeOpts) newBlock.promptLines.push(beforeOpts);
        if (inlineMatch[2]) {
          newBlock.options.A = `A. ${inlineMatch[2].trim()}`;
          if (inlineMatch[1]) newBlock.correctAnswer = 'A';
        }
        if (inlineMatch[4]) {
          newBlock.options.B = `B. ${inlineMatch[4].trim()}`;
          if (inlineMatch[3]) newBlock.correctAnswer = 'B';
        }
        if (inlineMatch[6]) {
          newBlock.options.C = `C. ${inlineMatch[6].trim()}`;
          if (inlineMatch[5]) newBlock.correctAnswer = 'C';
        }
        if (inlineMatch[8]) {
          newBlock.options.D = `D. ${inlineMatch[8].trim()}`;
          if (inlineMatch[7]) newBlock.correctAnswer = 'D';
        }
      } else if (restOfLine) {
        const embeddedAns = restOfLine.match(/\[(?:đáp\s*án|key)?\s*:?\s*([A-D])\]/i);
        if (embeddedAns) {
          newBlock.correctAnswer = embeddedAns[1].toUpperCase() as
            | 'A'
            | 'B'
            | 'C'
            | 'D';
          restOfLine = restOfLine.replace(embeddedAns[0], '').trim();
        }
        if (restOfLine) newBlock.promptLines.push(restOfLine);
      }

      activeBlock = newBlock;
      rawBlocks.push(newBlock);
      continue;
    }

    if (activeBlock) {
      activeBlock.promptLines.push(line);
    } else if (currentSectionContext !== 'MCQ') {
      // If a Fill or Essay section starts directly with a paragraph without "Câu/Bài", create a block
      activeBlock = {
        headerLabel: `Bài ${rawBlocks.length + 1}`,
        sectionContext: currentSectionContext,
        promptLines: [line],
        options: {},
      };
      rawBlocks.push(activeBlock);
    }
  }

  // 6. Classify each scanned block into MCQ, Fill-in-the-blank, or Short Answer / Essay
  const mcqBlocks: RawQuestionBlock[] = [];
  const fillBlocks: RawQuestionBlock[] = [];
  const shortBlocks: RawQuestionBlock[] = [];

  for (const b of rawBlocks) {
    const optionCount = Object.keys(b.options).length;
    const joinedPrompt = b.promptLines.join('\n').trim();

    if (optionCount >= 2) {
      mcqBlocks.push(b);
      continue;
    }

    // Check if block is a Fill-in-the-blank question (Điền khuyết):
    // - Contains numbered blanks like `(1) ...`, `(2) ...` or `[1]`, `[2]`
    // - Contains `......` or `____` blanks
    // - Prompt mentions `điền vào ... chỗ trống` / `ô trống` / `chọn các từ/cụm từ thích hợp`
    const hasNumberedParenBlanks =
      /\(\d+\)\s*(?:\.{2,}|_{2,}|…+)/.test(joinedPrompt) ||
      (/\(\s*1\s*\)/.test(joinedPrompt) && /\(\s*2\s*\)/.test(joinedPrompt));
    const hasBracketBlanks = /\[\d+\]/.test(joinedPrompt);
    const hasDotsBlanks = /\.{4,}|_{4,}|…{2,}/.test(joinedPrompt);
    const hasFillInstruction =
      /điền\s+vào|chỗ\s+trống|ô\s+trống|cụm\s+từ\s+thích\s+hợp/i.test(
        joinedPrompt
      );

    if (
      b.sectionContext === 'FILL' ||
      hasNumberedParenBlanks ||
      hasBracketBlanks ||
      (hasFillInstruction && (hasDotsBlanks || hasNumberedParenBlanks))
    ) {
      fillBlocks.push(b);
      continue;
    }

    // Otherwise, if it's in SHORT/TỰ LUẬN section or has substantive prompt text without options, classify as Short/Essay
    if (joinedPrompt.length > 0) {
      shortBlocks.push(b);
    }
  }

  // 7. Build Final Scanned Sections (Strictly using ONLY the question types found in the file!)
  // 7a. Build Fill-in-the-blank Section (if present)
  let fillQuestion: FillBlankQuestion = {
    promptTemplate: '',
    blanks: [],
    points: 0,
  };

  if (fillBlocks.length > 0) {
    const fb = fillBlocks[0];
    let rawFillPrompt = fb.promptLines.join('\n').trim();

    // Convert `(1) ......`, `(2) ......` or `(1)` .. `(N)` into `[1]`, `[2]`, ..., `[N]`
    rawFillPrompt = rawFillPrompt.replace(
      /\((\d{1,2})\)\s*(?:\.{2,}|_{2,}|…+)?/g,
      (_match, numStr) => `[${Number(numStr)}]`
    );

    // If there are still unnumbered `......` or `____` blanks and no `[1]`, number them sequentially
    if (!/\[\d+\]/.test(rawFillPrompt)) {
      let seq = 1;
      rawFillPrompt = rawFillPrompt.replace(/(\.{3,}|_{3,}|…{2,})/g, () => {
        const token = `[${seq}]`;
        seq++;
        return token;
      });
    }

    // Count how many `[k]` slots exist in `rawFillPrompt`
    const slotNums = Array.from(rawFillPrompt.matchAll(/\[(\d+)\]/g)).map((m) =>
      Number(m[1])
    );
    const maxSlot =
      slotNums.length > 0
        ? Math.max(...slotNums)
        : Object.keys(fillAnswerMap).length;
    const totalBlanksCount = Math.max(maxSlot, Object.keys(fillAnswerMap).length, 1);

    // Also check if candidate words are listed in parentheses in the prompt header, e.g.
    // "Chọn các từ/cụm từ thích hợp (Tính đầy đủ, Tính chính xác, ...) để điền vào 6 chỗ trống"
    const candidateWordsMatch = rawFillPrompt.match(
      /thích\s+hợp\s*\(([^)]+)\)\s*để\s*điền/i
    );
    const candidateWords = candidateWordsMatch
      ? candidateWordsMatch[1]
          .split(/[,;]+/)
          .map((w) => w.trim())
          .filter(Boolean)
      : [];

    const resolvedBlanks: string[] = [];
    for (let i = 1; i <= totalBlanksCount; i++) {
      resolvedBlanks.push(
        fillAnswerMap[i] || candidateWords[i - 1] || ''
      );
    }

    const fillPts =
      fb.explicitPoints ||
      parsePointsFromText(rawFillPrompt) ||
      (shortBlocks.length === 0 && essaySectionHeaderPoints
        ? essaySectionHeaderPoints
        : 3.0);

    fillQuestion = {
      promptTemplate: rawFillPrompt,
      blanks: resolvedBlanks,
      points: fillPts,
    };
  }

  // 7b. Build Short Answer / Essay Section (if present)
  let shortQuestion: ShortAnswerQuestion = {
    prompt: '',
    requirement: '',
    keywords: [],
    sampleAnswer: '',
    points: 0,
  };

  if (shortBlocks.length > 0) {
    const sb = shortBlocks[0];
    const allLines = sb.promptLines;
    const subPartLines = allLines.filter((l) => /^[a-d]\)\s+/i.test(l));
    const mainLines = allLines.filter((l) => !/^[a-d]\)\s+/i.test(l));

    const promptText =
      mainLines.length > 0 && subPartLines.length > 0
        ? mainLines.join('\n').trim()
        : allLines.join('\n').trim();
    const reqText =
      subPartLines.length > 0
        ? subPartLines.join('\n').trim()
        : 'Trình bày rõ ràng, đầy đủ các ý theo yêu cầu của câu hỏi.';

    // Sum sub-part points if header didn't specify total points
    let subPartPtsSum = 0;
    for (const sl of subPartLines) {
      const p = parsePointsFromText(sl);
      if (p) subPartPtsSum += p;
    }

    const shortPts =
      sb.explicitPoints ||
      (subPartPtsSum > 0 ? subPartPtsSum : undefined) ||
      (essaySectionHeaderPoints && fillQuestion.points > 0
        ? Math.max(1.0, essaySectionHeaderPoints - fillQuestion.points)
        : essaySectionHeaderPoints || 2.0);

    shortQuestion = {
      prompt: promptText,
      requirement: reqText,
      keywords: parsedShortKeywords,
      sampleAnswer:
        parsedShortSampleAnswer ||
        'Chấm theo hướng dẫn chấm và biểu điểm của giáo viên bộ môn.',
      points: shortPts,
    };
  }

  // 7c. Build Multiple Choice Questions Section (if present)
  const totalNonMcqPoints = Number(
    (fillQuestion.points + shortQuestion.points).toFixed(2)
  );
  const mcqPoolPoints =
    mcqSectionHeaderPoints ||
    (totalNonMcqPoints > 0 && totalNonMcqPoints < 10
      ? Number((10 - totalNonMcqPoints).toFixed(2))
      : 5.0);

  const mcqQuestions: ExamQuestion[] = mcqBlocks.map((b, idx) => {
    const qNumber = idx + 1;
    const prompt =
      b.promptLines.join(' ').trim() ||
      `Câu hỏi trắc nghiệm số ${qNumber}`;
    const keys: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
    const builtOptions = keys.map((k) => ({
      key: k,
      text: b.options[k] || `${k}. Phương án ${k}`,
    }));

    const resolvedCorrect: 'A' | 'B' | 'C' | 'D' =
      b.correctAnswer || mcqAnswerMap[qNumber] || 'A';

    return {
      id: qNumber,
      subject: `${resolvedSubjectKey} ${detectedGrade}`,
      type: 'mcq',
      points: Number((mcqPoolPoints / Math.max(1, mcqBlocks.length)).toFixed(2)),
      prompt,
      options: builtOptions,
      correctAnswer: resolvedCorrect,
      explanation:
        b.explanation ||
        (mcqAnswerMap[qNumber]
          ? `Đáp án đúng: ${resolvedCorrect} (Quét từ bảng đáp án trong đề).`
          : `Đáp án đúng: ${resolvedCorrect}.`),
    };
  });

  const hasMcq = mcqQuestions.length > 0;
  const hasFill = Boolean(
    fillQuestion.promptTemplate.trim() && fillQuestion.points > 0
  );
  const hasShort = Boolean(
    shortQuestion.prompt.trim() && shortQuestion.points > 0
  );

  if (!hasMcq && !hasFill && !hasShort) {
    return {
      ok: false,
      exam: DEFAULT_EXAM_BANK_ITEM,
      mcqCount: 0,
      hasFill: false,
      hasShort: false,
      warnings: [],
      error:
        'Không nhận diện được câu hỏi nào từ tài liệu tải lên. Vui lòng kiểm tra lại định dạng tệp.',
    };
  }

  const finalExam: ExamBankData = {
    id: `exam-${subjMeta.codePrefix.toLowerCase()}-k${detectedGrade}-${Date.now()}`,
    code: examCode,
    title: examTitle,
    subject: resolvedSubjectKey,
    subjectCode: resolvedSubjectKey,
    grade: detectedGrade,
    durationMinutes,
    questions: mcqQuestions,
    fillQuestion,
    shortQuestion,
    createdAt: new Date().toISOString(),
    createdBy: options.createdBy || `GV Môn ${subjMeta.label}`,
    teacherId: options.teacherId || 'admin-master',
    teacherUsername: options.teacherUsername,
    teacherName:
      options.teacherName || options.createdBy || `GV Môn ${subjMeta.label}`,
    isActive: true,
    isAssigned: true,
  };

  return {
    ok: true,
    exam: finalExam,
    mcqCount: finalExam.questions.length,
    hasFill,
    hasShort,
    warnings,
  };
}


