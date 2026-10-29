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
  collection,
  db,
  deleteDoc,
  doc,
  googleProvider,
  handleFirestoreError,
  onAuthStateChanged,
  onSnapshot,
  OperationType,
  setDoc,
  signInWithPopup,
  signOut,
  testFirestoreConnection,
} from './firebase';
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
  normalizeSubjectKey,
  ScreenId,
  StudentAccount,
  StudentRecord,
  StudentRegistration,
  TeacherAccount,
} from './utils/examLogic';

export default function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenId>('cong-vao-thi');

  // Classrooms & Student Account Roster state
  const [classrooms, setClassrooms] =
    useState<ClassroomRecord[]>(DEFAULT_CLASSROOMS);
  const [studentAccounts, setStudentAccounts] = useState<StudentAccount[]>(
    DEFAULT_STUDENT_ACCOUNTS
  );
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

  // Initial subject exams for all 11 subjects across all 4 grades (6, 7, 8, 9)
  const initialSubjectExams = useMemo(() => getInitialSubjectExams(), []);

  // Cloud Firestore state: Exam Bank & Student Submissions
  const [firestoreExams, setFirestoreExams] = useState<ExamBankData[]>([]);
  const [purgedDemoExams, setPurgedDemoExams] = useState<boolean>(false);
  const [deletedDemoExamIds, setDeletedDemoExamIds] = useState<string[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>(
    initialSubjectExams.find((e) => e.subjectCode === 'Tin')?.id ||
      DEFAULT_EXAM_BANK_ITEM.id
  );
  const [cloudSubmissions, setCloudSubmissions] = useState<StudentRecord[]>([]);

  // Teacher Accounts & Authentication state (Zero demo teacher accounts)
  const [teacherAccounts, setTeacherAccounts] = useState<TeacherAccount[]>(
    DEFAULT_TEACHER_ACCOUNTS
  );
  const [currentTeacher, setCurrentTeacher] = useState<TeacherAccount>(
    DEFAULT_TEACHER_ACCOUNTS[0]
  );
  const [isAdminAuthenticated, setIsAdminAuthenticated] =
    useState<boolean>(false);
  const [adminUserLabel, setAdminUserLabel] = useState<string>(
    'Hội Đồng Khảo Thí THCS'
  );
  const [adminPasscode, setAdminPasscode] = useState<string>('EduExam@2025');

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

  // Connect to Firestore on mount
  useEffect(() => {
    testFirestoreConnection();

    // Listen to Firebase Auth state
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAdminAuthenticated(true);
        setLoggedInStudent(null);
        const label =
          user.displayName || user.email || 'Quản Trị Viên Cloud';
        setAdminUserLabel(label);
        setCurrentTeacher((prev) => prev || DEFAULT_TEACHER_ACCOUNTS[0]);
      }
    });

    // Listen to Admin security config
    const unsubConfig = onSnapshot(
      doc(db, 'adminConfig', 'security'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data?.passcode && typeof data.passcode === 'string') {
            setAdminPasscode(data.passcode);
          }
        }
      },
      (err) =>
        handleFirestoreError(err, OperationType.GET, 'adminConfig/security')
    );

    // Listen to Teacher accounts in Firestore (automatically strip any legacy demo teacher accounts)
    const unsubTeachers = onSnapshot(
      doc(db, 'adminConfig', 'teachers'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data?.accountsJson && typeof data.accountsJson === 'string') {
            try {
              const parsed = JSON.parse(data.accountsJson) as TeacherAccount[];
              if (Array.isArray(parsed)) {
                const byUsername = new Map<string, TeacherAccount>();
                DEFAULT_TEACHER_ACCOUNTS.forEach((t) =>
                  byUsername.set(t.username.toLowerCase(), t)
                );
                parsed.forEach((t) => {
                  if (!isLegacyDemoTeacherAccount(t)) {
                    byUsername.set(t.username.toLowerCase(), t);
                  }
                });
                setTeacherAccounts(Array.from(byUsername.values()));
              }
            } catch (e) {
              console.error('Error parsing teacher accounts:', e);
            }
          }
        }
      },
      (err) =>
        handleFirestoreError(err, OperationType.GET, 'adminConfig/teachers')
    );

    // Listen to Classrooms in Firestore
    const unsubClassrooms = onSnapshot(
      doc(db, 'adminConfig', 'classrooms'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data?.classroomsJson && typeof data.classroomsJson === 'string') {
            try {
              const parsed = JSON.parse(
                data.classroomsJson
              ) as ClassroomRecord[];
              if (Array.isArray(parsed)) {
                setClassrooms(parsed);
              }
            } catch (e) {
              console.error('Error parsing classrooms:', e);
            }
          }
        }
      },
      (err) =>
        handleFirestoreError(err, OperationType.GET, 'adminConfig/classrooms')
    );

    // Listen to Student Accounts in Firestore
    const unsubStudents = onSnapshot(
      doc(db, 'adminConfig', 'studentAccounts'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data?.accountsJson && typeof data.accountsJson === 'string') {
            try {
              const parsed = JSON.parse(data.accountsJson) as StudentAccount[];
              if (Array.isArray(parsed)) {
                setStudentAccounts(parsed);
              }
            } catch (e) {
              console.error('Error parsing student accounts:', e);
            }
          }
        }
      },
      (err) =>
        handleFirestoreError(
          err,
          OperationType.GET,
          'adminConfig/studentAccounts'
        )
    );

    // Listen to Exam Bank Settings (purgedDemoExams & deletedDemoExamIds)
    const unsubExamBankSettings = onSnapshot(
      doc(db, 'adminConfig', 'examBankSettings'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (typeof data?.purgedDemoExams === 'boolean') {
            setPurgedDemoExams(data.purgedDemoExams);
          }
          if (
            typeof data?.deletedDemoExamIdsJson === 'string' &&
            data.deletedDemoExamIdsJson
          ) {
            try {
              const parsedIds = JSON.parse(data.deletedDemoExamIdsJson);
              if (Array.isArray(parsedIds)) {
                setDeletedDemoExamIds(parsedIds);
              }
            } catch {
              // Ignore parse error
            }
          }
        }
      },
      (err) =>
        handleFirestoreError(
          err,
          OperationType.GET,
          'adminConfig/examBankSettings'
        )
    );

    // Listen to Cloud Exam Bank
    const unsubExams = onSnapshot(
      collection(db, 'exams'),
      (snap) => {
        const list: ExamBankData[] = [];
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          try {
            const questions = d.questionsJson
              ? JSON.parse(d.questionsJson)
              : DEFAULT_EXAM_BANK_ITEM.questions;
            const fillQuestion = d.fillQuestionJson
              ? JSON.parse(d.fillQuestionJson)
              : DEFAULT_EXAM_BANK_ITEM.fillQuestion;
            const shortQuestion = d.shortQuestionJson
              ? JSON.parse(d.shortQuestionJson)
              : DEFAULT_EXAM_BANK_ITEM.shortQuestion;
            let assignedClasses: string[] | undefined = undefined;
            if (Array.isArray(d.assignedClasses)) {
              assignedClasses = d.assignedClasses;
            } else if (
              typeof d.assignedClassesJson === 'string' &&
              d.assignedClassesJson
            ) {
              assignedClasses = JSON.parse(d.assignedClassesJson);
            }

            const matchedSubject = normalizeSubjectKey(
              d.subjectCode || d.subject || 'Toán'
            );

            list.push({
              id: d.id || docSnap.id,
              code: d.code || 'TOAN-01',
              title: d.title || 'Đề Khảo Sát THCS',
              subject: d.subject || matchedSubject || 'Toán',
              subjectCode: matchedSubject,
              grade: Number(d.grade) || 9,
              durationMinutes: Number(d.durationMinutes) || 45,
              questions,
              fillQuestion,
              shortQuestion,
              createdAt: d.createdAt || new Date().toISOString(),
              createdBy: d.createdBy,
              teacherId: d.teacherId,
              teacherUsername: d.teacherUsername,
              teacherName: d.teacherName || d.createdBy,
              assignedClasses,
              isActive: d.isActive !== undefined ? Boolean(d.isActive) : true,
              isAssigned:
                d.isAssigned !== undefined ? Boolean(d.isAssigned) : true,
              startAt: d.startAt,
              endAt: d.endAt,
            });
          } catch (e) {
            console.error('Error parsing exam from Firestore:', e);
          }
        });

        list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setFirestoreExams(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'exams')
    );

    // Listen to Cloud Student Submissions
    const unsubSubmissions = onSnapshot(
      collection(db, 'submissions'),
      (snap) => {
        const subs: StudentRecord[] = [];
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          subs.push({
            stt: '01',
            id: d.id || docSnap.id,
            sbd: d.sbd || d.id,
            studentUsername: d.studentUsername,
            dateOfBirth: d.dateOfBirth,
            name: d.name || 'Học sinh',
            grade: Number(d.grade) || 9,
            className: d.className || '9A1',
            subject: d.subject,
            examId: d.examId,
            examTitle: d.examTitle,
            teacherId: d.teacherId,
            teacherName: d.teacherName,
            duration: d.duration || formatTimer(Number(d.durationSeconds) || 0),
            durationSeconds: Number(d.durationSeconds) || 0,
            tabLeaves: Number(d.tabLeaves) || 0,
            warningText: d.warningText || 'Tuyệt đối nghiêm túc',
            warningType: d.warningType || 'clean',
            rawScore: Number(d.rawScore) || 0,
            penaltyText: d.penaltyText || '0.0',
            finalScore: Number(d.finalScore) || 0,
            rank: d.rank,
            status: d.status || 'Đạt chuẩn',
            submittedAt: d.submittedAt || '',
          });
        });

        subs.sort((a, b) =>
          (b.submittedAt || '').localeCompare(a.submittedAt || '')
        );
        setCloudSubmissions(
          subs.map((item, idx) => ({
            ...item,
            stt: idx + 1 < 10 ? `0${idx + 1}` : `${idx + 1}`,
          }))
        );
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'submissions')
    );

    return () => {
      unsubAuth();
      unsubConfig();
      unsubTeachers();
      unsubClassrooms();
      unsubStudents();
      unsubExamBankSettings();
      unsubExams();
      unsubSubmissions();
    };
  }, []);

  // Merge Firestore exams with initial subject exams (respecting 1-click purge of demo exams and individual demo exam deletions)
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
    return matched.length > 0 ? matched : [DEFAULT_EXAM_BANK_ITEM];
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
    // Enforce strict role separation: logging in as a student logs out any teacher/admin session
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

  // Classroom & Student Account persistence handlers
  const persistClassrooms = async (nextList: ClassroomRecord[]) => {
    setClassrooms(nextList);
    try {
      await setDoc(doc(db, 'adminConfig', 'classrooms'), {
        classroomsJson: JSON.stringify(nextList),
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'adminConfig/classrooms');
    }
  };

  const handleSaveClassroom = async (classroom: ClassroomRecord) => {
    const nextList = [
      ...classrooms.filter(
        (c) =>
          c.id !== classroom.id &&
          c.name.toUpperCase() !== classroom.name.toUpperCase()
      ),
      classroom,
    ].sort((a, b) => a.grade - b.grade || a.name.localeCompare(b.name));
    await persistClassrooms(nextList);
  };

  const handleDeleteClassroom = async (classroomId: string) => {
    const nextList = classrooms.filter((c) => c.id !== classroomId);
    await persistClassrooms(nextList);
  };

  const persistStudentAccounts = async (nextList: StudentAccount[]) => {
    setStudentAccounts(nextList);
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
    try {
      await setDoc(doc(db, 'adminConfig', 'studentAccounts'), {
        accountsJson: JSON.stringify(nextList),
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.WRITE,
        'adminConfig/studentAccounts'
      );
    }
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

  // Start a fresh exam from Student Portal (supports clicking any exam card directly)
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

  // When student switches tabs or leaves window in ExamRoom:
  // 1. Immediately close Exam Room (return to 'cong-vao-thi')
  // 2. Save exact remainingSeconds timestamp and answers
  // 3. Increment tabViolations (+1 => -0.5 points upon re-entry)
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

    // Close the Online Exam Room immediately and return to Entry Portal
    setActiveScreen('cong-vao-thi');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Persist interrupted session to Cloud Firestore
    const studentIdentifier =
      loggedInStudent?.username ||
      registration.sbd.trim() ||
      `${registration.studentClass}-${registration.selectedSubject}`;
    const sessionKey = `${registration.grade}_${registration.studentClass}_${studentIdentifier}`
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 100);
    if (sessionKey && registration.fullName.trim()) {
      try {
        await setDoc(doc(db, 'examSessions', sessionKey), {
          sessionKey,
          sbd: studentIdentifier,
          fullName: registration.fullName.trim(),
          grade: registration.grade,
          studentClass: registration.studentClass.trim(),
          examId: activeExam.id,
          remainingSeconds: currentRemainingSeconds,
          tabViolations: nextViolations,
          kickedOutAt: nowTimeStr,
          isKickedOut: true,
          answersJson: JSON.stringify({
            selectedAnswers,
            fillBlanks,
            shortAnswer,
          }),
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        handleFirestoreError(
          err,
          OperationType.WRITE,
          `examSessions/${sessionKey}`
        );
      }
    }
  };

  // Resume interrupted exam at the exact saved timestamp (with -0.5 penalty per re-entry applied)
  const handleResumeInterruptedExam = () => {
    if (interruptedSession) {
      setRemainingSeconds(interruptedSession.remainingSeconds);
    }
    setInterruptedSession(null);
    setActiveScreen('phong-thi-truc-tuyen');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Submit completed exam & save to Cloud Firestore
  const handleSubmitExam = async (finalRemainingSeconds: number) => {
    const totalPossibleSecs = (activeExam.durationMinutes || 45) * 60;
    const durationSeconds = Math.max(
      1,
      totalPossibleSecs - finalRemainingSeconds
    );

    // Call AI short-answer grading service if question exists and student submitted text
    let aiShortScore: number | undefined = undefined;
    let aiFeedback = '';
    let aiGradedBy: string | undefined = undefined;

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
          if (graded.gradedBy) {
            aiGradedBy = graded.gradedBy;
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

    // Save real student submission to Cloud Firestore
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

    try {
      await setDoc(doc(db, 'submissions', subId), {
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
          `${registration.grade}A1`,
        subject: examSubject,
        examId: activeExam.id,
        examTitle: activeExam.title,
        teacherId: activeExam.teacherId || '',
        teacherName: activeExam.teacherName || activeExam.createdBy || '',
        duration: `${formatTimer(durationSeconds)}s`,
        durationSeconds,
        tabLeaves: tabViolations,
        reEntryCount: tabViolations,
        warningText,
        warningType,
        rawScore: evaluated.rawScore,
        penaltyScore: totalPenalty,
        penaltyText,
        finalScore: evaluated.finalScore,
        rank: evaluated.rank,
        status,
        shortAnswerScore: evaluated.shortAnswerScore,
        shortAnswerFeedback: aiFeedback,
        shortAnswerGradedBy: aiGradedBy || 'local-rule',
        answersJson: JSON.stringify({
          selectedAnswers,
          fillBlanks,
          shortAnswer,
        }),
        submittedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `submissions/${subId}`);
    }

    setActiveScreen('ket-qua-bang-diem');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Real Teacher & Admin authentication handler (enforces username, password, and role permissions)
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
      // Enforce strict role separation: logging in as Teacher/Admin logs out any student session
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
    } catch {
      // Ignore if not signed in via Firebase Auth
    }
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
      await setDoc(doc(db, 'adminConfig', 'teachers'), {
        accountsJson: JSON.stringify(nextList),
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'adminConfig/teachers');
    }
  };

  const handleDeleteTeacherAccount = async (teacherId: string) => {
    const nextList = teacherAccounts.filter(
      (t) =>
        t.role === 'admin' ||
        (t.id !== teacherId && !isLegacyDemoTeacherAccount(t))
    );
    setTeacherAccounts(nextList);
    try {
      await setDoc(doc(db, 'adminConfig', 'teachers'), {
        accountsJson: JSON.stringify(nextList),
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'adminConfig/teachers');
    }
  };

  const handleChangeAdminPasscode = async (newPasscode: string) => {
    setAdminPasscode(newPasscode);
    try {
      await setDoc(doc(db, 'adminConfig', 'security'), {
        passcode: newPasscode,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'adminConfig/security');
    }
  };

  const handleSaveExamToCloud = async (exam: ExamBankData) => {
    try {
      await setDoc(doc(db, 'exams', exam.id), {
        id: exam.id,
        code: exam.code,
        title: exam.title,
        subject: exam.subject,
        subjectCode: exam.subjectCode || exam.subject,
        grade: exam.grade,
        durationMinutes: exam.durationMinutes,
        questionsJson: JSON.stringify(exam.questions),
        fillQuestionJson: JSON.stringify(exam.fillQuestion),
        shortQuestionJson: JSON.stringify(exam.shortQuestion),
        assignedClassesJson: JSON.stringify(exam.assignedClasses || []),
        createdAt: exam.createdAt,
        createdBy:
          exam.createdBy || currentTeacher?.fullName || adminUserLabel,
        teacherId: exam.teacherId || currentTeacher?.id || 'teacher-admin',
        teacherUsername:
          exam.teacherUsername || currentTeacher?.username || 'admin',
        teacherName:
          exam.teacherName || currentTeacher?.fullName || adminUserLabel,
        isActive: true,
        isAssigned: exam.isAssigned !== undefined ? exam.isAssigned : true,
        startAt: exam.startAt || '',
        endAt: exam.endAt || '',
      });
      setSelectedExamId(exam.id);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `exams/${exam.id}`);
    }
  };

  const persistExamBankSettings = async (
    nextPurged: boolean,
    nextDeletedIds: string[]
  ) => {
    setPurgedDemoExams(nextPurged);
    setDeletedDemoExamIds(nextDeletedIds);
    try {
      await setDoc(doc(db, 'adminConfig', 'examBankSettings'), {
        purgedDemoExams: nextPurged,
        deletedDemoExamIdsJson: JSON.stringify(nextDeletedIds),
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.WRITE,
        'adminConfig/examBankSettings'
      );
    }
  };

  const handlePurgeAllSystemDemoExams = async (): Promise<number> => {
    const demoExamsInCurrentPool = cloudExams.filter((ex) =>
      isSystemGeneratedDemoExam(ex)
    );
    const removedCount = demoExamsInCurrentPool.length;
    await persistExamBankSettings(true, []);

    // Also delete any demo exam that had been saved into Firestore `exams` collection
    for (const ex of firestoreExams) {
      if (isSystemGeneratedDemoExam(ex)) {
        try {
          await deleteDoc(doc(db, 'exams', ex.id));
        } catch {
          // Ignore individual delete failure
        }
      }
    }
    return removedCount;
  };

  const handleRestoreSystemDemoExams = async (): Promise<void> => {
    await persistExamBankSettings(false, []);
  };

  const handleDeleteExamFromCloud = async (examId: string) => {
    if (isSystemGeneratedDemoExam({ id: examId })) {
      const nextDeleted = Array.from(new Set([...deletedDemoExamIds, examId]));
      await persistExamBankSettings(purgedDemoExams, nextDeleted);
    }
    if (firestoreExams.some((e) => e.id === examId)) {
      try {
        await deleteDoc(doc(db, 'exams', examId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `exams/${examId}`);
      }
    }
  };

  const handleDeleteSubmissionFromCloud = async (submissionId: string) => {
    try {
      await deleteDoc(doc(db, 'submissions', submissionId));
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.DELETE,
        `submissions/${submissionId}`
      );
    }
  };

  const handleNavigate = (screen: ScreenId) => {
    // Enforce strict role separation:
    // If Teacher/Admin is logged in, do not allow navigating to Student Portal ('cong-vao-thi')
    if (isAdminAuthenticated && screen === 'cong-vao-thi') {
      setActiveScreen('khu-vuc-quan-tri');
      return;
    }
    // If Student is logged in, do not allow navigating to Admin/Teacher Portal ('khu-vuc-quan-tri')
    if (loggedInStudent && screen === 'khu-vuc-quan-tri') {
      setActiveScreen('cong-vao-thi');
      return;
    }

    // If student is inside the active exam room and clicks to leave via header,
    // treat it as leaving the exam room (kickout & preserve timestamp)
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

  if (activeScreen === 'khu-vuc-quan-tri') {
    return (
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
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background font-body-md text-on-surface antialiased">
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
            onNavigate={handleNavigate}
          />
        )}
      </main>
      <StudentFooter />
    </div>
  );
}
