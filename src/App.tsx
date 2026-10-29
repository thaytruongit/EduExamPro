/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import { AdminDashboard } from './components/AdminDashboard';
import { ExamRoom } from './components/ExamRoom';
import {
  InterruptedSessionInfo,
  RegistrationPortal,
} from './components/RegistrationPortal';
import { ResultsReport } from './components/ResultsReport';
import { StudentFooter, StudentHeader } from './components/StudentHeader';
import {
  auth,
  googleProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from './firebase';
import {
  deleteTursoExam,
  deleteTursoSubmission,
  getTursoConfig,
  getTursoExams,
  getTursoSubmissions,
  saveTursoExam,
  saveTursoSubmission,
  setTursoConfig,
} from './utils/tursoClientApi';
import {
  authenticateStudentAccount,
  authenticateTeacherAccount,
  ClassroomRecord,
  DEFAULT_CLASSROOMS,
  DEFAULT_EXAM_BANK_ITEM,
  DEFAULT_STUDENT_ACCOUNTS,
  DEFAULT_TEACHER_ACCOUNTS,
  evaluateStudentSubmission,
  ExamBankData,
  filterExamsForStudentSubject,
  formatTimer,
  getInitialSubjectExams,
  isLegacyDemoTeacherAccount,
  isSystemGeneratedDemoExam,
  ScreenId,
  StudentAccount,
  StudentRecord,
  StudentRegistration,
  TeacherAccount,
} from './utils/examLogic';

function ensureCleanLocalCacheV5() {
  try {
    if (localStorage.getItem('app_clean_init_v5') !== 'true') {
      localStorage.removeItem('app_classrooms_backup');
      localStorage.removeItem('app_student_accounts_backup');
      localStorage.removeItem('app_teacher_accounts_backup');
      localStorage.removeItem('app_exams_backup');
      localStorage.removeItem('app_submissions_backup');
      localStorage.setItem('app_clean_init_v5', 'true');
    }
  } catch {}
}

export default function App() {
  ensureCleanLocalCacheV5();

  const [activeScreen, setActiveScreen] = useState<ScreenId>('cong-vao-thi');

  // Classrooms & Student Account Roster state backed by Turso Embedded SQLite
  const [classrooms, setClassrooms] = useState<ClassroomRecord[]>(() => {
    try {
      const cached = localStorage.getItem('app_classrooms_backup');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return DEFAULT_CLASSROOMS;
  });

  const [studentAccounts, setStudentAccounts] = useState<StudentAccount[]>(() => {
    try {
      const cached = localStorage.getItem('app_student_accounts_backup');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return DEFAULT_STUDENT_ACCOUNTS;
  });

  const [loggedInStudent, setLoggedInStudent] =
    useState<StudentAccount | null>(null);

  // Student registration state with Subject selection
  const [registration, setRegistration] = useState<StudentRegistration>({
    grade: 9,
    studentClass: '',
    selectedSubject: 'Tin',
    sbd: '',
    fullName: '',
    dateOfBirth: '',
    studentUsername: '',
    honorCommitted: true,
  });

  const [shortAnswerFeedback, setShortAnswerFeedback] = useState<string>('');

  // Initial subject exams (empty by default per clean setup)
  const initialSubjectExams = useMemo(() => getInitialSubjectExams(), []);

  // Exam Bank & Student Submissions backed by Turso Embedded SQLite
  const [firestoreExams, setFirestoreExams] = useState<ExamBankData[]>(() => {
    try {
      const cached = localStorage.getItem('app_exams_backup');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  const [purgedDemoExams, setPurgedDemoExams] = useState<boolean>(true);
  const [deletedDemoExamIds, setDeletedDemoExamIds] = useState<string[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>(
    DEFAULT_EXAM_BANK_ITEM.id
  );

  const [cloudSubmissions, setCloudSubmissions] = useState<StudentRecord[]>(() => {
    try {
      const cached = localStorage.getItem('app_submissions_backup');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });

  // Teacher Accounts & Authentication state
  const [teacherAccounts, setTeacherAccounts] = useState<TeacherAccount[]>(() => {
    try {
      const cached = localStorage.getItem('app_teacher_accounts_backup');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return DEFAULT_TEACHER_ACCOUNTS;
  });

  const [currentTeacher, setCurrentTeacher] = useState<TeacherAccount>(
    teacherAccounts[0] || DEFAULT_TEACHER_ACCOUNTS[0]
  );
  const [isAdminAuthenticated, setIsAdminAuthenticated] =
    useState<boolean>(false);
  const [adminUserLabel, setAdminUserLabel] = useState<string>(
    'Hội Đồng Khảo Thí THCS'
  );
  const [adminPasscode, setAdminPasscode] = useState<string>('123');

  // Active Exam Room & Interrupted Session state
  const [remainingSeconds, setRemainingSeconds] = useState<number>(45 * 60);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<number, 'A' | 'B' | 'C' | 'D'>
  >({});
  const [fillBlanks, setFillBlanks] = useState<string[]>([
    '',
    '',
    '',
  ]);
  const [shortAnswer, setShortAnswer] = useState<string>('');
  const [tabViolations, setTabViolations] = useState<number>(0);
  const [interruptedSession, setInterruptedSession] =
    useState<InterruptedSessionInfo | null>(null);
  const [hasCompletedCurrentExam, setHasCompletedCurrentExam] =
    useState<boolean>(false);

  const [examScoreState, setExamScoreState] = useState({
    rawScore: 0,
    tabPenalty: 0,
    finalScore: 0,
    rank: 'CHƯA THI',
    durationSeconds: 0,
  });

  // Automatically connect and sync with Turso Embedded SQLite on mount
  useEffect(() => {
    const loadTursoData = async () => {
      try {
        const classroomsData = await getTursoConfig<ClassroomRecord[]>('classrooms');
        if (Array.isArray(classroomsData)) {
          const sortedClasses = [...classroomsData].sort(
            (a, b) => a.grade - b.grade || a.name.localeCompare(b.name, undefined, { numeric: true })
          );
          setClassrooms(sortedClasses);
          try {
            localStorage.setItem('app_classrooms_backup', JSON.stringify(sortedClasses));
          } catch {}
        } else {
          await setTursoConfig('classrooms', DEFAULT_CLASSROOMS);
        }

        const studentAccountsData = await getTursoConfig<StudentAccount[]>('studentAccounts');
        if (Array.isArray(studentAccountsData)) {
          setStudentAccounts(studentAccountsData);
          try {
            localStorage.setItem('app_student_accounts_backup', JSON.stringify(studentAccountsData));
          } catch {}
        } else {
          await setTursoConfig('studentAccounts', DEFAULT_STUDENT_ACCOUNTS);
        }

        const teachersData = await getTursoConfig<TeacherAccount[]>('teachers');
        if (Array.isArray(teachersData)) {
          const hasAdmin = teachersData.some((t) => t.role === 'admin' || t.username === 'admin');
          const finalTeachers = hasAdmin
            ? teachersData
            : [DEFAULT_TEACHER_ACCOUNTS[0], ...teachersData];
          setTeacherAccounts(finalTeachers);
          try {
            localStorage.setItem('app_teacher_accounts_backup', JSON.stringify(finalTeachers));
          } catch {}
        } else {
          await setTursoConfig('teachers', DEFAULT_TEACHER_ACCOUNTS);
        }

        const securityData = await getTursoConfig<{ passcode: string }>('security');
        if (securityData?.passcode) {
          setAdminPasscode(securityData.passcode);
        }

        const examBankSettingsData = await getTursoConfig<{
          purgedDemoExams?: boolean;
          deletedDemoExamIds?: string[];
        }>('examBankSettings');
        if (examBankSettingsData) {
          if (typeof examBankSettingsData.purgedDemoExams === 'boolean') {
            setPurgedDemoExams(examBankSettingsData.purgedDemoExams);
          }
          if (Array.isArray(examBankSettingsData.deletedDemoExamIds)) {
            setDeletedDemoExamIds(examBankSettingsData.deletedDemoExamIds);
          }
        }

        const tursoExams = await getTursoExams();
        if (Array.isArray(tursoExams)) {
          setFirestoreExams(tursoExams);
          try {
            localStorage.setItem('app_exams_backup', JSON.stringify(tursoExams));
          } catch {}
        }

        const tursoSubmissions = await getTursoSubmissions();
        if (Array.isArray(tursoSubmissions)) {
          setCloudSubmissions(tursoSubmissions);
          try {
            localStorage.setItem('app_submissions_backup', JSON.stringify(tursoSubmissions));
          } catch {}
        }
      } catch (e) {
        console.warn('Turso sync warning:', e);
      }
    };

    loadTursoData();
    const interval = setInterval(loadTursoData, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Listen to Firebase Auth state (for optional Google login)
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAdminAuthenticated(true);
        setLoggedInStudent(null);
        const label =
          user.displayName || user.email || 'Quản Trị Viên Hệ Thống';
        setAdminUserLabel(label);
        setCurrentTeacher((prev) => prev || DEFAULT_TEACHER_ACCOUNTS[0]);
      }
    });

    return () => {
      unsubAuth();
    };
  }, []);

  // Merge Turso exams with initial subject exams
  const cloudExams = useMemo(() => {
    const deletedSet = new Set(deletedDemoExamIds);
    const map = new Map<string, ExamBankData>();
    if (!purgedDemoExams) {
      initialSubjectExams.forEach((ex) => {
        if (!deletedSet.has(ex.id)) {
          map.set(ex.id, ex);
        }
      });
    }
    firestoreExams.forEach((ex) => {
      if (purgedDemoExams && isSystemGeneratedDemoExam(ex)) {
        return;
      }
      if (deletedSet.has(ex.id)) {
        return;
      }
      map.set(ex.id, ex);
    });
    const merged = Array.from(map.values());
    merged.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return merged;
  }, [
    deletedDemoExamIds,
    firestoreExams,
    initialSubjectExams,
    purgedDemoExams,
  ]);

  const effectiveStudentGrade = loggedInStudent?.grade || registration.grade;
  const effectiveStudentClass =
    loggedInStudent?.studentClass || registration.studentClass;

  // Strictly filter exams matching the student's chosen Subject, Grade, and Class
  const availableExamsForGradeAndSubject = useMemo(() => {
    const matched = filterExamsForStudentSubject(
      cloudExams,
      registration.selectedSubject,
      effectiveStudentGrade,
      effectiveStudentClass
    );
    return matched;
  }, [
    cloudExams,
    effectiveStudentClass,
    effectiveStudentGrade,
    registration.selectedSubject,
  ]);

  const activeExam: ExamBankData =
    availableExamsForGradeAndSubject.find((ex) => ex.id === selectedExamId) ||
    availableExamsForGradeAndSubject[0] ||
    DEFAULT_EXAM_BANK_ITEM;

  // Student Password Login & Logout handlers
  const handleStudentLogin = (
    username: string,
    password: string
  ): StudentAccount | null => {
    const matched = authenticateStudentAccount(
      studentAccounts,
      username,
      password
    );
    if (!matched) {
      return null;
    }
    setIsAdminAuthenticated(false);
    setLoggedInStudent(matched);
    setRegistration((prev) => ({
      ...prev,
      grade: matched.grade,
      studentClass: matched.studentClass,
      fullName: matched.fullName,
      dateOfBirth: matched.dateOfBirth,
      studentUsername: matched.username,
      sbd: `${matched.studentClass}-${matched.username.toUpperCase()}`,
      honorCommitted: true,
    }));
    return matched;
  };

  const handleStudentLogout = () => {
    setLoggedInStudent(null);
    setInterruptedSession(null);
    setActiveScreen('cong-vao-thi');
  };

  // Classroom & Student Account persistence handlers (Turso Embedded SQLite)
  const persistClassrooms = async (nextList: ClassroomRecord[]) => {
    setClassrooms(nextList);
    try {
      localStorage.setItem('app_classrooms_backup', JSON.stringify(nextList));
    } catch {}
    await setTursoConfig('classrooms', nextList);
  };

  const handleSaveClassroom = async (classroom: ClassroomRecord) => {
    const nextList = [
      ...classrooms.filter(
        (c) =>
          c.id !== classroom.id &&
          c.name.toUpperCase() !== classroom.name.toUpperCase()
      ),
      classroom,
    ].sort((a, b) => a.grade - b.grade || a.name.localeCompare(b.name, undefined, { numeric: true }));
    await persistClassrooms(nextList);
  };

  const handleDeleteClassroom = async (classroomId: string) => {
    const nextList = classrooms.filter((c) => c.id !== classroomId);
    await persistClassrooms(nextList);
  };

  const persistStudentAccounts = async (nextList: StudentAccount[]) => {
    setStudentAccounts(nextList);
    try {
      localStorage.setItem('app_student_accounts_backup', JSON.stringify(nextList));
    } catch {}
    if (loggedInStudent) {
      const updatedSelf = nextList.find(
        (s) =>
          s.id === loggedInStudent.id ||
          s.username.toLowerCase() === loggedInStudent.username.toLowerCase()
      );
      if (updatedSelf) {
        setLoggedInStudent(updatedSelf);
      }
    }
    await setTursoConfig('studentAccounts', nextList);
  };

  const handleSaveStudentAccount = async (student: StudentAccount) => {
    const existingIdx = studentAccounts.findIndex(
      (s) =>
        s.id === student.id ||
        s.username.toLowerCase() === student.username.toLowerCase()
    );
    let nextList: StudentAccount[];
    if (existingIdx >= 0) {
      nextList = [...studentAccounts];
      nextList[existingIdx] = student;
    } else {
      nextList = [...studentAccounts, student];
    }
    await persistStudentAccounts(nextList);
  };

  const handleBulkSaveStudentAccounts = async (
    newStudents: StudentAccount[]
  ) => {
    const byUsername = new Map<string, StudentAccount>();
    studentAccounts.forEach((s) =>
      byUsername.set(s.username.toLowerCase(), s)
    );
    newStudents.forEach((s) => byUsername.set(s.username.toLowerCase(), s));
    await persistStudentAccounts(Array.from(byUsername.values()));
  };

  const handleDeleteStudentAccount = async (studentId: string) => {
    const nextList = studentAccounts.filter((s) => s.id !== studentId);
    await persistStudentAccounts(nextList);
  };

  const handleSelectAnswer = (qId: number, choice: 'A' | 'B' | 'C' | 'D') => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [qId]: choice,
    }));
  };

  const handleChangeFillBlank = (index: number, value: string) => {
    setFillBlanks((prev) => {
      const next = [...prev];
      while (next.length <= index) {
        next.push('');
      }
      next[index] = value;
      return next;
    });
  };

  // Start a fresh exam from Student Portal
  const handleStartFreshExam = (examOverride?: ExamBankData) => {
    const targetExam = examOverride || activeExam;
    if (examOverride) {
      setSelectedExamId(examOverride.id);
    }
    const initialSecs = (targetExam.durationMinutes || 45) * 60;
    const blankCount = Math.max(
      1,
      targetExam.fillQuestion?.blanks?.length || 3
    );
    setRemainingSeconds(initialSecs);
    setSelectedAnswers({});
    setFillBlanks(Array(blankCount).fill(''));
    setShortAnswer('');
    setShortAnswerFeedback('');
    setTabViolations(0);
    setInterruptedSession(null);
    setHasCompletedCurrentExam(false);
    setActiveScreen('phong-thi-truc-tuyen');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTabSwitchKickOut = async (currentRemainingSeconds: number) => {
    const nextViolations = tabViolations + 1;
    const nowTimeStr = new Date().toLocaleTimeString('vi-VN');
    const hasFill =
      Boolean(activeExam.fillQuestion?.promptTemplate?.trim()) &&
      Number(activeExam.fillQuestion?.points) > 0;
    const hasShort =
      Boolean(activeExam.shortQuestion?.prompt?.trim()) &&
      Number(activeExam.shortQuestion?.points) > 0;
    const isFillDone =
      hasFill && fillBlanks.length > 0 && fillBlanks.every((b) => b.trim().length > 0)
        ? 1
        : 0;
    const isShortDone = hasShort && shortAnswer.trim().length > 0 ? 1 : 0;
    const answeredCount =
      Object.keys(selectedAnswers).length + isFillDone + isShortDone;

    setRemainingSeconds(currentRemainingSeconds);
    setTabViolations(nextViolations);
    setInterruptedSession({
      remainingSeconds: currentRemainingSeconds,
      tabViolations: nextViolations,
      kickedOutAt: nowTimeStr,
      answeredCount,
    });

    setActiveScreen('cong-vao-thi');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleResumeInterruptedExam = () => {
    if (interruptedSession) {
      setRemainingSeconds(interruptedSession.remainingSeconds);
    }
    setInterruptedSession(null);
    setActiveScreen('phong-thi-truc-tuyen');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Submit completed exam & save to Turso Embedded SQLite
  const handleSubmitExam = async (finalRemainingSeconds: number) => {
    const totalPossibleSecs = (activeExam.durationMinutes || 45) * 60;
    const durationSeconds = Math.max(
      1,
      totalPossibleSecs - finalRemainingSeconds
    );

    let aiShortScore: number | undefined = undefined;
    let aiFeedback = '';

    const shortQuest = activeExam.shortQuestion;
    const hasShortSection =
      Boolean(shortQuest?.prompt?.trim()) && Number(shortQuest?.points) > 0;
    if (hasShortSection && shortQuest && shortAnswer.trim()) {
      try {
        const resp = await fetch('/api/grade-short-answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: shortQuest.prompt,
            requirement: shortQuest.requirement,
            keywords: shortQuest.keywords,
            sampleAnswer: shortQuest.sampleAnswer,
            studentAnswer: shortAnswer.trim(),
            maxPoints: shortQuest.points || 3.0,
          }),
        });
        if (resp.ok) {
          const graded = await resp.json();
          if (typeof graded.score === 'number') {
            aiShortScore = graded.score;
          }
          if (graded.feedback) {
            aiFeedback = graded.feedback;
          }
        }
      } catch (err) {
        console.warn('AI evaluation service unreachable, fallback to local scoring:', err);
      }
    } else if (hasShortSection && shortQuest && !shortAnswer.trim()) {
      aiFeedback = 'Thí sinh không làm câu tự luận ngắn (bỏ trống).';
    }

    setShortAnswerFeedback(aiFeedback);

    const evaluated = evaluateStudentSubmission({
      exam: activeExam,
      selectedAnswers,
      fillBlanks,
      shortAnswer,
      tabViolations,
      durationSeconds,
      overrideShortAnswerScore: aiShortScore,
    });

    setExamScoreState({
      rawScore: evaluated.rawScore,
      tabPenalty: evaluated.tabPenalty,
      finalScore: evaluated.finalScore,
      rank: evaluated.rank,
      durationSeconds,
    });
    setHasCompletedCurrentExam(true);
    setInterruptedSession(null);

    const examSubject =
      activeExam.subjectCode ||
      activeExam.subject ||
      registration.selectedSubject;
    const studentUsername =
      loggedInStudent?.username || registration.studentUsername || '';
    const studentDob =
      loggedInStudent?.dateOfBirth || registration.dateOfBirth || '';
    const studentIdentifier =
      studentUsername ||
      registration.sbd.trim() ||
      `${registration.studentClass}-${examSubject}`;

    const subId = `sub_${registration.grade}_${
      registration.studentClass
    }_${studentIdentifier}_${Date.now()}`
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 100);

    const warningType: StudentRecord['warningType'] = evaluated.isFastSubmit
      ? 'ai-suspect'
      : tabViolations > 0
      ? 'tab-warning'
      : 'clean';

    const warningText = evaluated.isFastSubmit
      ? 'Nộp <1 phút: Phạt 50% điểm'
      : tabViolations > 0
      ? `${tabViolations} lần chuyển tab / thi lại (-${evaluated.tabPenalty.toFixed(
          1
        )}đ)`
      : 'Tuyệt đối nghiêm túc';

    const totalPenalty = Number(
      (evaluated.tabPenalty + evaluated.fastSubmitPenalty).toFixed(1)
    );
    const penaltyText =
      totalPenalty > 0 ? `-${totalPenalty.toFixed(1)} điểm` : '0.0';

    const status: StudentRecord['status'] = evaluated.isFastSubmit
      ? 'Tạm giữ chấm'
      : tabViolations > 0
      ? 'Đã trừ điểm'
      : 'Đạt chuẩn';

    const submittedAtIso = new Date().toISOString();
    const newSubRecord: StudentRecord = {
      stt: '01',
      id: subId,
      sbd: studentIdentifier,
      studentUsername,
      dateOfBirth: studentDob,
      name:
        loggedInStudent?.fullName ||
        registration.fullName.trim() ||
        'Học sinh',
      grade: loggedInStudent?.grade || registration.grade,
      className:
        loggedInStudent?.studentClass ||
        registration.studentClass.trim() ||
        `${registration.grade}A10`,
      subject: examSubject,
      examId: activeExam.id,
      examTitle: activeExam.title,
      teacherId: activeExam.teacherId || '',
      teacherName: activeExam.teacherName || activeExam.createdBy || '',
      duration: `${formatTimer(durationSeconds)}s`,
      durationSeconds,
      tabLeaves: tabViolations,
      warningText,
      warningType,
      rawScore: evaluated.rawScore,
      penaltyText,
      finalScore: evaluated.finalScore,
      rank: evaluated.rank,
      status,
      submittedAt: submittedAtIso,
      shortAnswerScore: evaluated.shortAnswerScore,
      shortAnswerFeedback: aiFeedback,
    };

    setCloudSubmissions((prev) => {
      const filtered = prev.filter((s) => s.id !== subId);
      const next = [newSubRecord, ...filtered].map((item, idx) => ({
        ...item,
        stt: idx + 1 < 10 ? `0${idx + 1}` : `${idx + 1}`,
      }));
      try {
        localStorage.setItem('app_submissions_backup', JSON.stringify(next));
      } catch {}
      return next;
    });

    await saveTursoSubmission(newSubRecord);

    setActiveScreen('ket-qua-bang-diem');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Real Teacher & Admin authentication handler
  const handleVerifyPasscodeLogin = (
    username: string,
    passcode: string
  ): boolean => {
    const matchedTeacher = authenticateTeacherAccount(
      teacherAccounts,
      username,
      passcode,
      adminPasscode
    );
    if (matchedTeacher) {
      setLoggedInStudent(null);
      setCurrentTeacher(matchedTeacher);
      setIsAdminAuthenticated(true);
      setAdminUserLabel(
        `${matchedTeacher.fullName} (${
          matchedTeacher.role === 'admin'
            ? 'Tổng Quản Trị'
            : `GV Môn ${matchedTeacher.subject}`
        })`
      );
      return true;
    }
    return false;
  };

  const handleGoogleAdminLogin = async () => {
    const res = await signInWithPopup(auth, googleProvider);
    if (res.user) {
      setLoggedInStudent(null);
      const adminTeacher = teacherAccounts[0] || DEFAULT_TEACHER_ACCOUNTS[0];
      setCurrentTeacher(adminTeacher);
      setIsAdminAuthenticated(true);
      setAdminUserLabel(
        res.user.displayName || res.user.email || 'Quản Trị Viên Google'
      );
    }
  };

  const handleAdminLogout = async () => {
    try {
      await signOut(auth);
    } catch {}
    setIsAdminAuthenticated(false);
    setCurrentTeacher(teacherAccounts[0] || DEFAULT_TEACHER_ACCOUNTS[0]);
    setActiveScreen('cong-vao-thi');
  };

  const handleCreateTeacherAccount = async (newTeacher: TeacherAccount) => {
    const nextList = [
      ...teacherAccounts.filter(
        (t) =>
          !isLegacyDemoTeacherAccount(t) &&
          t.username.toLowerCase() !== newTeacher.username.toLowerCase()
      ),
      newTeacher,
    ];
    setTeacherAccounts(nextList);
    try {
      localStorage.setItem('app_teacher_accounts_backup', JSON.stringify(nextList));
    } catch {}
    await setTursoConfig('teachers', nextList);
  };

  const handleDeleteTeacherAccount = async (teacherId: string) => {
    const nextList = teacherAccounts.filter(
      (t) =>
        t.role === 'admin' ||
        (t.id !== teacherId && !isLegacyDemoTeacherAccount(t))
    );
    setTeacherAccounts(nextList);
    try {
      localStorage.setItem('app_teacher_accounts_backup', JSON.stringify(nextList));
    } catch {}
    await setTursoConfig('teachers', nextList);
  };

  const handleChangeAdminPasscode = async (newPasscode: string) => {
    setAdminPasscode(newPasscode);
    await setTursoConfig('security', { passcode: newPasscode });
  };

  const handleSaveExamToCloud = async (exam: ExamBankData) => {
    const enriched: ExamBankData = {
      ...exam,
      createdBy: exam.createdBy || currentTeacher?.fullName || adminUserLabel,
      teacherId: exam.teacherId || currentTeacher?.id || 'admin-master',
      teacherUsername:
        exam.teacherUsername || currentTeacher?.username || 'admin',
      teacherName:
        exam.teacherName || currentTeacher?.fullName || adminUserLabel,
      isActive: true,
      isAssigned: exam.isAssigned !== undefined ? exam.isAssigned : true,
    };
    setFirestoreExams((prev) => {
      const next = [enriched, ...prev.filter((e) => e.id !== enriched.id)];
      try {
        localStorage.setItem('app_exams_backup', JSON.stringify(next));
      } catch {}
      return next;
    });
    setSelectedExamId(enriched.id);
    await saveTursoExam(enriched);
  };

  const persistExamBankSettings = async (
    nextPurged: boolean,
    nextDeletedIds: string[]
  ) => {
    setPurgedDemoExams(nextPurged);
    setDeletedDemoExamIds(nextDeletedIds);
    await setTursoConfig('examBankSettings', {
      purgedDemoExams: nextPurged,
      deletedDemoExamIds: nextDeletedIds,
    });
  };

  const handlePurgeAllSystemDemoExams = async (): Promise<number> => {
    const demoExamsInCurrentPool = cloudExams.filter((ex) =>
      isSystemGeneratedDemoExam(ex)
    );
    const removedCount = demoExamsInCurrentPool.length;
    await persistExamBankSettings(true, []);

    for (const ex of firestoreExams) {
      if (isSystemGeneratedDemoExam(ex)) {
        await deleteTursoExam(ex.id);
      }
    }
    return removedCount;
  };

  const handleRestoreSystemDemoExams = async (): Promise<void> => {
    await persistExamBankSettings(false, []);
  };

  const handleDeleteExamFromCloud = async (examId: string) => {
    await deleteTursoExam(examId);
    if (isSystemGeneratedDemoExam({ id: examId })) {
      const nextDeleted = Array.from(new Set([...deletedDemoExamIds, examId]));
      await persistExamBankSettings(purgedDemoExams, nextDeleted);
    }
    setFirestoreExams((prev) => {
      const next = prev.filter((e) => e.id !== examId);
      try {
        localStorage.setItem('app_exams_backup', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleDeleteSubmissionFromCloud = async (submissionId: string) => {
    setCloudSubmissions((prev) => {
      const next = prev.filter((s) => s.id !== submissionId);
      try {
        localStorage.setItem('app_submissions_backup', JSON.stringify(next));
      } catch {}
      return next;
    });
    await deleteTursoSubmission(submissionId);
  };

  const handleNavigate = (screen: ScreenId) => {
    if (isAdminAuthenticated && screen === 'cong-vao-thi') {
      setActiveScreen('khu-vuc-quan-tri');
      return;
    }
    if (loggedInStudent && screen === 'khu-vuc-quan-tri') {
      setActiveScreen('cong-vao-thi');
      return;
    }

    if (
      activeScreen === 'phong-thi-truc-tuyen' &&
      screen !== 'phong-thi-truc-tuyen'
    ) {
      handleTabSwitchKickOut(remainingSeconds);
      if (screen !== 'cong-vao-thi') {
        setActiveScreen(screen);
      }
      return;
    }
    setActiveScreen(screen);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderQuotaBanner = () => null;

  const handleRestoreDefaultSystemData = async () => {
    setClassrooms(DEFAULT_CLASSROOMS);
    setStudentAccounts(DEFAULT_STUDENT_ACCOUNTS);
    setTeacherAccounts(DEFAULT_TEACHER_ACCOUNTS);
    setAdminPasscode('123');

    try {
      localStorage.setItem('app_classrooms_backup', JSON.stringify(DEFAULT_CLASSROOMS));
      localStorage.setItem('app_student_accounts_backup', JSON.stringify(DEFAULT_STUDENT_ACCOUNTS));
      localStorage.setItem('app_teacher_accounts_backup', JSON.stringify(DEFAULT_TEACHER_ACCOUNTS));
    } catch {}

    await setTursoConfig('classrooms', DEFAULT_CLASSROOMS);
    await setTursoConfig('studentAccounts', DEFAULT_STUDENT_ACCOUNTS);
    await setTursoConfig('teachers', DEFAULT_TEACHER_ACCOUNTS);
    await setTursoConfig('security', { passcode: '123' });
  };

  if (activeScreen === 'khu-vuc-quan-tri') {
    return (
      <div className="min-h-screen flex flex-col bg-background font-body-md text-on-surface antialiased">
        {renderQuotaBanner()}
        <AdminDashboard
          onNavigate={handleNavigate}
          isAdminAuthenticated={isAdminAuthenticated}
          adminUserLabel={adminUserLabel}
          adminPasscode={adminPasscode}
          currentTeacher={currentTeacher}
          teacherAccounts={teacherAccounts}
          onCreateTeacherAccount={handleCreateTeacherAccount}
          onDeleteTeacherAccount={handleDeleteTeacherAccount}
          onVerifyPasscodeLogin={handleVerifyPasscodeLogin}
          onGoogleAdminLogin={handleGoogleAdminLogin}
          onAdminLogout={handleAdminLogout}
          onChangeAdminPasscode={handleChangeAdminPasscode}
          cloudExams={cloudExams}
          onSaveExamToCloud={handleSaveExamToCloud}
          onDeleteExamFromCloud={handleDeleteExamFromCloud}
          onPurgeAllSystemDemoExams={handlePurgeAllSystemDemoExams}
          onRestoreSystemDemoExams={handleRestoreSystemDemoExams}
          purgedDemoExams={purgedDemoExams}
          cloudSubmissions={cloudSubmissions}
          onDeleteSubmissionFromCloud={handleDeleteSubmissionFromCloud}
          classrooms={classrooms}
          studentAccounts={studentAccounts}
          onSaveClassroom={handleSaveClassroom}
          onDeleteClassroom={handleDeleteClassroom}
          onSaveStudentAccount={handleSaveStudentAccount}
          onBulkSaveStudentAccounts={handleBulkSaveStudentAccounts}
          onDeleteStudentAccount={handleDeleteStudentAccount}
          onRestoreDefaultSystemData={handleRestoreDefaultSystemData}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background font-body-md text-on-surface antialiased">
      {renderQuotaBanner()}
      <StudentHeader
        activeScreen={activeScreen}
        onNavigate={handleNavigate}
        studentName={loggedInStudent?.fullName || registration.fullName}
        studentClass={loggedInStudent?.studentClass || registration.studentClass}
        loggedInStudent={loggedInStudent}
        isAdminAuthenticated={isAdminAuthenticated}
        currentTeacher={currentTeacher}
        onStudentLogout={handleStudentLogout}
        onAdminLogout={handleAdminLogout}
      />
      <main className="w-full pt-20 bg-background flex-1">
        {activeScreen === 'cong-vao-thi' && (
          <RegistrationPortal
            loggedInStudent={loggedInStudent}
            studentAccounts={studentAccounts}
            onStudentLogin={handleStudentLogin}
            onStudentLogout={handleStudentLogout}
            registration={registration}
            onUpdateRegistration={setRegistration}
            cloudExams={cloudExams}
            activeExam={activeExam}
            availableExamsForGradeAndSubject={availableExamsForGradeAndSubject}
            onSelectExamId={setSelectedExamId}
            interruptedSession={interruptedSession}
            onStartExam={handleStartFreshExam}
            onResumeInterruptedExam={handleResumeInterruptedExam}
            cloudSubmissions={cloudSubmissions}
            onNavigate={handleNavigate}
          />
        )}
        {activeScreen === 'phong-thi-truc-tuyen' && (
          <ExamRoom
            exam={activeExam}
            registration={registration}
            remainingSeconds={remainingSeconds}
            onUpdateRemainingSeconds={setRemainingSeconds}
            selectedAnswers={selectedAnswers}
            onSelectAnswer={handleSelectAnswer}
            fillBlanks={fillBlanks}
            onChangeFillBlank={handleChangeFillBlank}
            shortAnswer={shortAnswer}
            onChangeShortAnswer={setShortAnswer}
            tabViolations={tabViolations}
            onTabSwitchKickOut={handleTabSwitchKickOut}
            onSubmitExam={handleSubmitExam}
          />
        )}
        {activeScreen === 'ket-qua-bang-diem' && (
          <ResultsReport
            exam={activeExam}
            registration={registration}
            selectedAnswers={selectedAnswers}
            fillBlanks={fillBlanks}
            shortAnswer={shortAnswer}
            shortAnswerFeedback={shortAnswerFeedback}
            rawScore={examScoreState.rawScore}
            tabPenalty={examScoreState.tabPenalty}
            finalScore={examScoreState.finalScore}
            rank={examScoreState.rank}
            tabViolations={tabViolations}
            durationSeconds={examScoreState.durationSeconds}
            hasCompletedCurrentExam={hasCompletedCurrentExam}
            cloudSubmissions={cloudSubmissions}
            cloudExams={cloudExams}
            loggedInStudent={loggedInStudent}
            isAdminAuthenticated={isAdminAuthenticated}
            currentTeacher={currentTeacher}
            classrooms={classrooms}
            onNavigate={handleNavigate}
          />
        )}
      </main>
      <StudentFooter />
    </div>
  );
}
