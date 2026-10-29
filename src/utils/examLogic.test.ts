import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  countWords,
  formatTimer,
  calculateExamScore,
  filterAdminRoster,
  generateStandardExamTemplate,
  parseStandardExamText,
  generateStandardExamJson,
  parseAndValidateExamJson,
  examToStandardTemplateText,
  extractTextFromDocxOrPdfRaw,
  generateStandardDocxContent,
  updateExamQuestionDirectly,
  addExamQuestionDirectly,
  removeExamQuestionDirectly,
  shuffleExamQuestionsAndOptions,
  mixExamFromQuestionBank,
  exportSubmissionsToCsvString,
  THCS_SUBJECTS,
  normalizeSubjectKey,
  buildIsoFromScheduleParts,
  parseIsoToScheduleParts,
  checkExamScheduleStatus,
  formatExamScheduleWindow,
  DEFAULT_TEACHER_ACCOUNTS,
  DEFAULT_CLASSROOMS,
  DEFAULT_STUDENT_ACCOUNTS,
  StudentAccount,
  getInitialSubjectExams,
  authenticateStudentAccount,
  authenticateTeacherAccount,
  canTeacherManageSystem,
  canTeacherAccessSubject,
  filterExamsForStudentSubject,
  filterSubmissionsForStudent,
  filterSubmissionsByAccountScope,
  getTeacherAssignedClasses,
  isLegacyDemoTeacherAccount,
  parseBulkStudentAccountsText,
  parseExcelStudentAccountsAutoCredentials,
  exportStudentAccountsToCsvString,
  isSystemGeneratedDemoExam,
  suggestTeacherUsernameFromFullName,
  getStudentScheduleReminders,
  parseFreeformExamContent,
  scanAndParseThreeExamSections,
  evaluateStudentSubmission,
  StudentRecord,
  TeacherAccount,
} from './examLogic.ts';

describe('examLogic pure functions', () => {
  it('counts words accurately for Vietnamese text', () => {
    assert.equal(countWords(''), 0);
    assert.equal(countWords('   '), 0);
    assert.equal(
      countWords('Năng lượng không tự nhiên sinh ra hay mất đi'),
      10
    );
  });

  it('formats countdown timer in MM:SS tabular format', () => {
    assert.equal(formatTimer(2474), '41:14');
    assert.equal(formatTimer(65), '01:05');
    assert.equal(formatTimer(0), '00:00');
    assert.equal(formatTimer(-10), '00:00');
  });

  it('calculates exam score with -0.5 penalty per tab violation/re-entry and fast-submit penalty', () => {
    const res1 = calculateExamScore({
      multipleChoiceCorrect: 9,
      totalMcqQuestions: 10,
      mcqPointsTotal: 5.0,
      fillBlankScore: 2.0,
      shortAnswerScore: 2.5,
      tabViolations: 1,
      durationSeconds: 1125,
    });
    assert.equal(res1.rawScore, 9.0);
    assert.equal(res1.tabPenalty, 0.5);
    assert.equal(res1.fastSubmitPenalty, 0);
    assert.equal(res1.finalScore, 8.5);
    assert.equal(res1.rank, 'GIỎI');

    const res2 = calculateExamScore({
      multipleChoiceCorrect: 10,
      totalMcqQuestions: 10,
      mcqPointsTotal: 5.0,
      fillBlankScore: 2.0,
      shortAnswerScore: 3.0,
      tabViolations: 0,
      durationSeconds: 45,
    });
    assert.equal(res2.rawScore, 10.0);
    assert.equal(res2.isFastSubmit, true);
    assert.equal(res2.fastSubmitPenalty, 5.0);
    assert.equal(res2.finalScore, 5.0);
  });

  it('supports all 11 THCS subjects and generates subject-specific templates by grade (6, 7, 8, 9)', () => {
    assert.equal(THCS_SUBJECTS.length, 11);
    const expectedKeys = [
      'Tin',
      'Toán',
      'Văn',
      'Anh',
      'Sử',
      'Địa',
      'Công Nghệ',
      'GDCD',
      'Lý',
      'Hoá',
      'Sinh',
    ];
    assert.deepEqual(
      THCS_SUBJECTS.map((s) => s.key),
      expectedKeys
    );

    const tinTemplate = generateStandardExamTemplate(8, 'Tin');
    const parsedTin = parseStandardExamText(tinTemplate, 8, 'Tin');
    assert.equal(parsedTin.grade, 8);
    assert.equal(parsedTin.subjectCode, 'Tin');
    assert.equal(parsedTin.code, 'TIN-8-01');
    assert.equal(parsedTin.questions.length, 10);
    assert.equal(parsedTin.fillQuestion.blanks[2], 'CPU');

    const lyTemplate = generateStandardExamTemplate(9, 'Lý');
    const parsedLy = parseStandardExamText(lyTemplate, 9, 'Lý');
    assert.equal(parsedLy.grade, 9);
    assert.equal(parsedLy.subjectCode, 'Lý');
    assert.equal(parsedLy.code, 'LY-9-01');
    assert.equal(parsedLy.fillQuestion.blanks[0], 'gãy khúc');
    assert.ok(parsedLy.shortQuestion.keywords.includes('672'));
  });

  it('validates exam schedule window and confirms zero demo teacher accounts in DEFAULT_TEACHER_ACCOUNTS', () => {
    // Only the system admin account exists by default; all demo teacher accounts were removed
    assert.equal(DEFAULT_TEACHER_ACCOUNTS.length, 1);
    assert.equal(DEFAULT_TEACHER_ACCOUNTS[0].username, 'admin');
    assert.equal(
      isLegacyDemoTeacherAccount({ id: 't-tin', username: 'gv.tin' }),
      true
    );
    assert.equal(
      isLegacyDemoTeacherAccount({ id: 't-custom', username: 'gv.minh' }),
      false
    );

    assert.equal(normalizeSubjectKey('Tin học'), 'Tin');
    assert.equal(normalizeSubjectKey('Công nghệ'), 'Công Nghệ');
    assert.equal(normalizeSubjectKey('GDCD'), 'GDCD');

    const startIso = buildIsoFromScheduleParts({
      hour: 7,
      minute: 30,
      date: '2026-10-25',
    });
    const endIso = buildIsoFromScheduleParts({
      hour: 9,
      minute: 15,
      date: '2026-10-25',
    });
    const parsedStart = parseIsoToScheduleParts(startIso);
    assert.equal(parsedStart.hour, 7);
    assert.equal(parsedStart.minute, 30);
    assert.equal(parsedStart.date, '2026-10-25');

    const displayWindow = formatExamScheduleWindow(startIso, endIso);
    assert.ok(displayWindow.includes('07:30 ngày 25/10/2026'));
    assert.ok(displayWindow.includes('09:15 ngày 25/10/2026'));

    const beforeStartMs = new Date(startIso).getTime() - 60000;
    const duringMs = new Date(startIso).getTime() + 60000;
    const afterEndMs = new Date(endIso).getTime() + 60000;

    const upcomingCheck = checkExamScheduleStatus(
      { startAt: startIso, endAt: endIso, isAssigned: true },
      beforeStartMs
    );
    assert.equal(upcomingCheck.canTake, false);
    assert.equal(upcomingCheck.status, 'upcoming');

    const openCheck = checkExamScheduleStatus(
      { startAt: startIso, endAt: endIso, isAssigned: true },
      duringMs
    );
    assert.equal(openCheck.canTake, true);
    assert.equal(openCheck.status, 'open');

    const expiredCheck = checkExamScheduleStatus(
      { startAt: startIso, endAt: endIso, isAssigned: true },
      afterEndMs
    );
    assert.equal(expiredCheck.canTake, false);
    assert.equal(expiredCheck.status, 'expired');
  });

  it('generates and validates standard JSON exam format accurately', () => {
    const jsonStr = generateStandardExamJson(7, 'Toán');
    const res = parseAndValidateExamJson(jsonStr, 7);
    assert.equal(res.ok, true);
    if (res.ok) {
      assert.equal(res.exam.grade, 7);
      assert.equal(res.exam.code, 'TOAN-7-JSON01');
      assert.equal(res.exam.questions.length, 10);
      assert.equal(res.totalPoints, 10.0);
      assert.equal(res.warnings.length, 0);
    }

    const badJson = parseAndValidateExamJson('{ invalid json }', 7);
    assert.equal(badJson.ok, false);

    const missingQuestions = parseAndValidateExamJson(
      JSON.stringify({ code: 'TEST', questions: [] }),
      7
    );
    assert.equal(missingQuestions.ok, false);
  });

  it('extracts text from DOCX XML/HTML and round-trips DOCX content accurately', () => {
    const baseExam = parseStandardExamText(
      generateStandardExamTemplate(9, 'Toán'),
      9,
      'Toán'
    );
    const docxHtml = generateStandardDocxContent(baseExam);
    const extracted = extractTextFromDocxOrPdfRaw(docxHtml);
    assert.ok(extracted.includes('TOAN-9-01'));

    const wordXml =
      '<w:p><w:r><w:t>MÃ ĐỀ: DOCX-9-99</w:t></w:r></w:p><w:p><w:r><w:t>Câu 1 [Toán]: 1 + 1 bằng mấy?</w:t></w:r></w:p>';
    const xmlExtracted = extractTextFromDocxOrPdfRaw(wordXml);
    assert.ok(xmlExtracted.includes('MÃ ĐỀ: DOCX-9-99'));
    assert.ok(xmlExtracted.includes('Câu 1 [Toán]: 1 + 1 bằng mấy?'));

    const templateText = examToStandardTemplateText(baseExam);
    const reparsed = parseStandardExamText(templateText, 9, 'Toán');
    assert.equal(reparsed.code, baseExam.code);
    assert.equal(reparsed.questions.length, baseExam.questions.length);
  });

  it('supports direct editing, adding, and removing questions in the exam bank', () => {
    const baseExam = parseStandardExamText(
      generateStandardExamTemplate(9, 'Toán'),
      9,
      'Toán'
    );
    const edited = updateExamQuestionDirectly(baseExam, 1, {
      prompt: 'Câu hỏi đã được giáo viên chỉnh sửa trực tiếp?',
      correctAnswer: 'D',
    });
    assert.equal(
      edited.questions[0].prompt,
      'Câu hỏi đã được giáo viên chỉnh sửa trực tiếp?'
    );
    assert.equal(edited.questions[0].correctAnswer, 'D');

    const withAdded = addExamQuestionDirectly(edited, {
      prompt: 'Câu hỏi số 11 mới thêm?',
      correctAnswer: 'C',
    });
    assert.equal(withAdded.questions.length, 11);
    assert.equal(withAdded.questions[10].id, 11);
    assert.equal(withAdded.questions[10].correctAnswer, 'C');

    const withRemoved = removeExamQuestionDirectly(withAdded, 11);
    assert.equal(withRemoved.questions.length, 10);
  });

  it('shuffles exam questions and options while preserving the exact correct answer text', () => {
    const baseExam = parseStandardExamText(
      generateStandardExamTemplate(9, 'Toán'),
      9,
      'Toán'
    );
    const origCorrectMap = new Map<string, string>();
    for (const q of baseExam.questions) {
      const opt = q.options?.find((o) => o.key === q.correctAnswer);
      const cleanText = (opt?.text || '').replace(/^[ABCD]\s*[.)]\s*/i, '').trim();
      origCorrectMap.set(q.prompt, cleanText);
    }

    const shuffled = shuffleExamQuestionsAndOptions(baseExam, {
      newCode: 'TOAN-9-102',
      shuffleQuestions: true,
      shuffleOptions: true,
      seed: 42,
    });

    assert.equal(shuffled.code, 'TOAN-9-102');
    assert.equal(shuffled.questions.length, baseExam.questions.length);

    for (const sq of shuffled.questions) {
      const expectedCleanCorrect = origCorrectMap.get(sq.prompt);
      const newOpt = sq.options?.find((o) => o.key === sq.correctAnswer);
      const actualCleanCorrect = (newOpt?.text || '')
        .replace(/^[ABCD]\s*[.)]\s*/i, '')
        .trim();
      assert.equal(actualCleanCorrect, expectedCleanCorrect);
    }

    const mixed = mixExamFromQuestionBank([baseExam], {
      grade: 9,
      subject: 'Toán',
      questionCount: 4,
      newCode: 'MIX-9-201',
      seed: 99,
    });
    assert.equal(mixed.code, 'MIX-9-201');
    assert.equal(mixed.questions.length, 4);
  });

  it('exports Firebase submissions to UTF-8 BOM CSV with subject & teacher columns', () => {
    const records: StudentRecord[] = [
      {
        stt: '01',
        id: 'HS9-01',
        sbd: '9A1-TIN',
        subject: 'Tin',
        name: 'Lê Minh Tuấn',
        grade: 9,
        className: '9A1',
        examId: 'exam-tin-9-01',
        examTitle: 'Đề Kiểm Tra Môn Tin Học Khối 9',
        teacherName: 'Thầy Trường (GV Tin học)',
        duration: '22:15',
        durationSeconds: 1335,
        tabLeaves: 1,
        warningText: '1 lần rời phòng (-0.5đ)',
        warningType: 'tab-warning',
        rawScore: 9.0,
        penaltyText: '-0.5 điểm',
        finalScore: 8.5,
        status: 'Đã trừ điểm',
      },
    ];
    const csv = exportSubmissionsToCsvString(records, {
      gradeLabel: 'Khối 9',
      classLabel: 'Lớp 9A1',
      subjectLabel: 'Tin',
      examLabel: 'TIN-9-01',
      exportedBy: 'Thầy Trường (GV Tin học)',
    });
    assert.ok(csv.startsWith('\uFEFF'));
    assert.ok(csv.includes('"Lê Minh Tuấn"'));
    assert.ok(csv.includes('"Tin"'));
    assert.ok(csv.includes('8.5'));
    assert.ok(csv.includes('TỔNG HỢP BÁO CÁO ĐIỂM THI CLOUD FIRESTORE'));
  });

  it('filters admin roster by grade, class, status, subject, examId, and search query', () => {
    const sampleRecords: StudentRecord[] = [
      {
        stt: '01',
        id: 'HS9-01',
        subject: 'Toán',
        examId: 'exam-toan-9-01',
        name: 'Nguyễn Văn A',
        grade: 9,
        className: '9A1',
        duration: '20:00s',
        durationSeconds: 1200,
        tabLeaves: 2,
        warningText: '2 lần rời phòng (-1.0đ)',
        warningType: 'tab-warning',
        rawScore: 9.0,
        penaltyText: '-1.0 điểm',
        finalScore: 8.0,
        status: 'Đã trừ điểm',
      },
      {
        stt: '02',
        id: 'HS9-02',
        subject: 'Tin',
        examId: 'exam-tin-9-01',
        name: 'Trần Thị B',
        grade: 9,
        className: '9A1',
        duration: '25:00s',
        durationSeconds: 1500,
        tabLeaves: 0,
        warningText: 'Tuyệt đối nghiêm túc',
        warningType: 'clean',
        rawScore: 9.5,
        penaltyText: '0.0',
        finalScore: 9.5,
        status: 'Đạt chuẩn',
      },
    ];
    const all9A1 = filterAdminRoster(sampleRecords, '', 9, '9A1', 'ALL');
    assert.equal(all9A1.length, 2);

    const onlyTin = filterAdminRoster(
      sampleRecords,
      '',
      9,
      '9A1',
      'ALL',
      'Tin',
      'ALL'
    );
    assert.equal(onlyTin.length, 1);
    assert.equal(onlyTin[0].name, 'Trần Thị B');

    const byExamId = filterAdminRoster(
      sampleRecords,
      '',
      9,
      '9A1',
      'ALL',
      'Toán',
      'exam-toan-9-01'
    );
    assert.equal(byExamId.length, 1);
    assert.equal(byExamId[0].name, 'Nguyễn Văn A');
  });

  it('enforces zero demo student accounts and classes by default, and verifies student auth & grade-restricted exam visibility', () => {
    // Verified: zero demo student accounts or hardcoded demo classrooms
    assert.equal(DEFAULT_CLASSROOMS.length, 0);
    assert.equal(DEFAULT_STUDENT_ACCOUNTS.length, 0);

    const sampleStudentAccounts: StudentAccount[] = [
      {
        id: 'hs-an',
        username: 'hs.an9a1',
        fullName: 'Nguyễn Văn An',
        grade: 9,
        studentClass: '9A1',
        dateOfBirth: '15/05/2010',
        password: 'password123',
        createdAt: '2026-01-01',
      },
      {
        id: 'hs-mai',
        username: 'hs.mai6a1',
        fullName: 'Trần Thị Mai',
        grade: 6,
        studentClass: '6A1',
        dateOfBirth: '08/09/2013',
        password: 'password123',
        createdAt: '2026-01-01',
      },
    ];

    const validStudent = authenticateStudentAccount(
      sampleStudentAccounts,
      'hs.an9a1',
      'password123'
    );
    assert.ok(validStudent);
    assert.equal(validStudent?.fullName, 'Nguyễn Văn An');
    assert.equal(validStudent?.studentClass, '9A1');
    assert.equal(validStudent?.dateOfBirth, '15/05/2010');

    const student6A1 = authenticateStudentAccount(
      sampleStudentAccounts,
      'hs.mai6a1',
      'password123'
    );
    assert.ok(student6A1);
    assert.equal(student6A1?.grade, 6);
    assert.equal(student6A1?.studentClass, '6A1');

    const initialExams = getInitialSubjectExams();

    // Grade 6 student (6A1) ONLY gets Grade 6 exams, never Grade 7/8/9 exams
    const tinExamsGrade6 = filterExamsForStudentSubject(
      initialExams,
      'Tin',
      6,
      '6A1'
    );
    assert.ok(tinExamsGrade6.length >= 1);
    assert.ok(tinExamsGrade6.every((ex) => ex.grade === 6));

    // Grade 9 student (9A1) ONLY gets Grade 9 exams
    const tinExamsGrade9 = filterExamsForStudentSubject(
      initialExams,
      'Tin',
      9,
      '9A1'
    );
    assert.ok(tinExamsGrade9.length >= 2);
    assert.ok(tinExamsGrade9.every((ex) => ex.grade === 9));

    const vanExamsGrade9 = filterExamsForStudentSubject(
      initialExams,
      'Văn',
      9,
      '9A1'
    );
    assert.ok(vanExamsGrade9.length >= 2);
    assert.ok(vanExamsGrade9.every((ex) => ex.grade === 9));

    // Admin authentication & newly created Teacher authentication
    const customTeacherList: TeacherAccount[] = [
      ...DEFAULT_TEACHER_ACCOUNTS,
      {
        id: 't-toan-a',
        username: 'gv.toana',
        passcode: '123456',
        fullName: 'Cô Lan (GV Toán)',
        subject: 'Toán',
        role: 'teacher',
        assignedClasses: ['7A1'],
      },
    ];

    const adminAcc = authenticateTeacherAccount(
      customTeacherList,
      'admin',
      'EduExam@2025'
    );
    assert.ok(adminAcc);
    assert.equal(canTeacherManageSystem(adminAcc), true);

    const teacherA = authenticateTeacherAccount(
      customTeacherList,
      'gv.toana',
      '123456'
    );
    assert.ok(teacherA);
    assert.equal(canTeacherManageSystem(teacherA), false);
    assert.equal(canTeacherAccessSubject(teacherA, 'Toán'), true);
    assert.equal(canTeacherAccessSubject(teacherA, 'Văn'), false);

    // Scoreboard scoping: Student in 7A1 only sees 7A1; Teacher A assigning exam to 7A1 only sees 7A1
    const multiClassSubs: StudentRecord[] = [
      {
        stt: '01',
        id: 'sub-7a1',
        sbd: 'hs.huy7a1-TOAN',
        name: 'Vũ Gia Huy',
        grade: 7,
        className: '7A1',
        subject: 'Toán',
        examTitle: 'Đề Kiểm Tra Toán 7',
        duration: '18:00',
        durationSeconds: 1080,
        tabLeaves: 0,
        warningText: 'Tuyệt đối nghiêm túc',
        warningType: 'clean',
        rawScore: 9.0,
        penaltyText: '0.0',
        finalScore: 9.0,
        status: 'Đạt chuẩn',
      },
      {
        stt: '02',
        id: 'sub-9a1',
        sbd: 'hs.an9a1-TOAN',
        name: 'Nguyễn Văn An',
        grade: 9,
        className: '9A1',
        subject: 'Toán',
        examTitle: 'Đề Kiểm Tra Toán 9',
        duration: '20:00',
        durationSeconds: 1200,
        tabLeaves: 0,
        warningText: 'Tuyệt đối nghiêm túc',
        warningType: 'clean',
        rawScore: 8.5,
        penaltyText: '0.0',
        finalScore: 8.5,
        status: 'Đạt chuẩn',
      },
    ];

    const sampleStudent7A1: StudentAccount = {
      id: 'hs-huy7a1',
      username: 'hs.huy7a1',
      fullName: 'Vũ Quốc Huy',
      grade: 7,
      studentClass: '7A1',
      dateOfBirth: '20/11/2012',
      password: 'password123',
      createdAt: '2026-01-01',
    };
    const student7A1 = authenticateStudentAccount(
      [sampleStudent7A1],
      'hs.huy7a1',
      'password123'
    );
    assert.ok(student7A1);

    const scopedForStudent7A1 = filterSubmissionsByAccountScope(multiClassSubs, {
      role: 'student',
      student: student7A1,
    });
    assert.equal(scopedForStudent7A1.length, 1);
    assert.equal(scopedForStudent7A1[0].className, '7A1');

    const teacherAssignedClasses = getTeacherAssignedClasses(teacherA, []);
    assert.deepEqual(teacherAssignedClasses, ['7A1']);

    const scopedForTeacherA = filterSubmissionsByAccountScope(multiClassSubs, {
      role: 'teacher',
      teacher: teacherA,
      exams: [],
    });
    assert.equal(scopedForTeacherA.length, 1);
    assert.equal(scopedForTeacherA[0].className, '7A1');

    // Excel student import with 3 fields (Họ tên, Lớp, Ngày sinh) and auto-generated credentials
    const excelRaw = [
      'Họ tên\tLớp\tNgày sinh',
      'Phạm Gia Huy\t6A1\t14/08/2013',
      'Đặng Thu Thảo\t7A1\t22/11/2012',
    ].join('\n');

    const excelParsed = parseExcelStudentAccountsAutoCredentials(excelRaw, {
      fallbackClass: '6A1',
      existingUsernames: ['hs.mai6a1'],
      seed: 2026,
    });
    assert.equal(excelParsed.length, 2);
    assert.equal(excelParsed[0].fullName, 'Phạm Gia Huy');
    assert.equal(excelParsed[0].studentClass, '6A1');
    assert.equal(excelParsed[0].grade, 6);
    assert.equal(excelParsed[0].dateOfBirth, '14/08/2013');
    assert.equal(excelParsed[0].username, 'hs.huy6a1');
    assert.equal(excelParsed[0].password.length, 6);

    assert.equal(excelParsed[1].fullName, 'Đặng Thu Thảo');
    assert.equal(excelParsed[1].studentClass, '7A1');
    assert.equal(excelParsed[1].grade, 7);
    assert.equal(excelParsed[1].username, 'hs.thao7a1');
    assert.equal(excelParsed[1].password.length, 6);

    // Filter student's personal exam results
    const anResults = filterSubmissionsForStudent(multiClassSubs, validStudent);
    assert.equal(anResults.length, 1);
    assert.equal(anResults[0].name, 'Nguyễn Văn An');
  });

  it('supports shorthand teacher username generation, student schedule reminders (startAt/endAt), freeform exam parsing, and demo exam detection', () => {
    // 1. Shorthand teacher username generation from full name
    assert.equal(
      suggestTeacherUsernameFromFullName('Nguyễn Minh Khoa'),
      'khoanm'
    );
    assert.equal(
      suggestTeacherUsernameFromFullName('Thầy Đỗ Mạnh Trường'),
      'truongdm'
    );
    assert.equal(
      suggestTeacherUsernameFromFullName('Cô Trần Thị Thu Hằng'),
      'hangttt'
    );
    assert.equal(
      suggestTeacherUsernameFromFullName('Nguyễn Minh Khoa', ['khoanm']),
      'khoanm2'
    );

    // 2. Student schedule reminders based on startAt & endAt for their class
    const initialExams = getInitialSubjectExams();
    const reminders7A1 = getStudentScheduleReminders(initialExams, {
      grade: 7,
      studentClass: '7A1',
    });
    assert.ok(reminders7A1.length >= 2);
    assert.equal(reminders7A1[0].status, 'upcoming');
    assert.ok(reminders7A1[0].exam.grade === 7);

    // 3. System demo exam detection
    assert.equal(isSystemGeneratedDemoExam(initialExams[0]), true);
    assert.equal(
      isSystemGeneratedDemoExam({ id: 'exam-custom-teacher-01' }),
      false
    );

    // 4. Freeform exam parsing (non-standard format)
    const freeformInput = [
      '1. Thiết bị nào dùng để xử lý dữ liệu trung tâm trong máy tính?',
      'A. Bàn phím',
      '*B. CPU',
      'C. Chuột máy tính',
      'D. Màn hình',
      '2. Hệ điều hành nào phổ biến trên máy tính cá nhân? [Đáp án: C]',
      'A. Word   B. Excel   C. Windows   D. PowerPoint',
      '3. Một câu hỏi tự do chưa điền phương án',
    ].join('\n');

    const freeformParsed = parseFreeformExamContent(freeformInput, {
      grade: 7,
      subject: 'Tin',
      customTitle: 'Đề Kiểm Tra 15 Phút Tin 7 Tự Do',
    });
    assert.equal(freeformParsed.ok, true);
    assert.equal(freeformParsed.exam.questions.length, 3);
    assert.equal(freeformParsed.exam.questions[0].correctAnswer, 'B');
    assert.equal(freeformParsed.exam.questions[1].correctAnswer, 'C');
    assert.equal(freeformParsed.exam.questions[2].options?.length, 4);
    assert.equal(
      isSystemGeneratedDemoExam(freeformParsed.exam),
      false
    );
  });

  it('scans uploaded exam structure (MCQ, N-blank Fill-in-blank, Short/Essay) and embedded Answer Key table accurately', () => {
    const tinHoc9ExamWithEmbeddedAnswerKey = [
      'UBND PHƯỜNG BÌNH ĐÔNG | ĐỀ KIỂM TRA GIỮA HỌC KỲ I',
      'TRƯỜNG THCS ĐỒNG DIỀU | NĂM HỌC 2025-2026',
      'ĐỀ CHÍNH THỨC | MÔN: TIN HỌC 9',
      'Thời gian: 45 phút (Không kể thời gian phát đề)',
      'I. PHẦN TRẮC NGHIỆM: (5,0 điểm) Chọn câu trả lời đúng nhất.',
      'Câu 1. Một số ngành nghề liên quan đến lĩnh vực tin học:',
      'A. Quản trị mạng, bác sĩ đa khoa.',
      'B. Thiết kế đồ họa, lập trình viên, quản trị hệ thống.',
      'C. Kiến trúc sư xây dựng, thợ cơ khí.',
      'D. Nông nghiệp truyền thống.',
      'Câu 2. Thiết bị nào là bộ não của máy tính?',
      'A. RAM   B. Bộ xử lý trung tâm (CPU)   C. Ổ cứng   D. Màn hình',
      'Câu 3. Phần mềm mô phỏng nào hỗ trợ học tập Hình học?',
      'A. GeoGebra   B. Word   C. Paint   D. Unikey',
      'Câu 4. Nguồn thông tin đáng tin cậy trên Internet thường có đuôi tên miền:',
      'A. .gov.vn, .edu.vn   B. .xyz   C. .fun   D. .top',
      'Câu 5. Hành vi nào vi phạm pháp luật khi sử dụng Internet?',
      'A. Học trực tuyến   B. Phát tán mã độc và tin giả   C. Tra cứu tài liệu   D. Gửi thư điện tử',
      'Câu 6. Phần mềm mô phỏng pha màu giúp em hiểu hệ màu nào?',
      'A. RGB và CMYK   B. Chỉ đen trắng   C. Âm thanh   D. Văn bản',
      'Câu 7. Để tìm kiếm thông tin chính xác theo cụm từ, ta đặt từ khóa trong:',
      'A. Dấu ngoặc đơn   B. Dấu ngoặc kép " "   C. Dấu chấm than   D. Dấu hỏi',
      'Câu 8. Công nghệ nào cho phép gắn bộ xử lý thông minh vào thiết bị gia dụng?',
      'A. Máy chữ cơ   B. Internet vạn vật (IoT) và vi xử lý   C. Bàn tính gảy   D. Đèn dầu',
      'Câu 9. Khi nhận được tin nhắn trúng thưởng bất thường trên mạng xã hội, em nên:',
      'A. Kiểm chứng nguồn tin và không bấm vào liên kết lạ   B. Chuyển tiền ngay   C. Cung cấp mật khẩu   D. Chia sẻ cho mọi người',
      'Câu 10. Lợi ích của phần mềm mô phỏng thí nghiệm Vật lý, Hóa học là:',
      'A. Tốn nhiều hóa chất   B. Trực quan, an toàn và thực hành nhiều lần   C. Gây cháy nổ   D. Không quan sát được',
      'II. PHẦN TỰ LUẬN: (5,0 điểm)',
      'Bài 1 (3,0 điểm): Điền từ/cụm từ thích hợp vào chỗ trống:',
      '"Deepfake; Tính sử dụng được; Tính chính xác; Vi xử lý; Tính đầy đủ; Tính mới"',
      'a) Bốn tiêu chí cơ bản để đánh giá chất lượng thông tin gồm: (1) .............., (2) .............., (3) .............. và (4) ...............',
      'b) Bộ phận quan trọng giúp các thiết bị số hoạt động thông minh là (5) ...............',
      'c) Công nghệ giả mạo khuôn mặt và giọng nói bằng trí tuệ nhân tạo gọi là (6) ...............',
      'Bài 2 (2,0 điểm):',
      'a) Kể tên hai phần mềm mô phỏng hỗ trợ học tập và nêu tác dụng của chúng.',
      'b) Nêu một số tác động tiêu cực của công nghệ kĩ thuật số đối với đời sống con người.',
      'ĐÁP ÁN VÀ HƯỚNG DẪN CHẤM',
      'MÔN: TIN HỌC - KHỐI 9',
      'I. PHẦN TRẮC NGHIỆM: (5,0 điểm) Mỗi câu đúng được 0,5 điểm.',
      'Câu | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10',
      'Đáp án | B | B | A | A | B | A | B | B | A | B',
      'II. PHẦN TỰ LUẬN: (5,0 điểm)',
      'Bài 1 (3,0 điểm): Điền đúng mỗi vị trí được 0,5 điểm.',
      '(1) Tính mới | (2) Tính chính xác',
      '(3) Tính đầy đủ | (4) Tính sử dụng được',
      '(5) Vi xử lý | (6) Deepfake',
      'Bài 2 (2,0 điểm):',
      'a) Kể tên đúng phần mềm mô phỏng như PhET, GeoGebra, Crocodile Physics giúp quan sát trực quan.',
      'b) Tác động tiêu cực: nghiện Internet, lừa đảo mạng, giảm tương tác trực tiếp.',
    ].join('\n');

    const scanned = scanAndParseThreeExamSections(
      tinHoc9ExamWithEmbeddedAnswerKey,
      8,
      'Toán'
    );
    assert.equal(scanned.ok, true);
    assert.equal(scanned.exam.grade, 9);
    assert.equal(scanned.exam.subjectCode, 'Tin');
    assert.equal(scanned.exam.durationMinutes, 45);
    assert.equal(scanned.exam.questions.length, 10);
    assert.deepEqual(
      scanned.exam.questions.map((q) => q.correctAnswer),
      ['B', 'B', 'A', 'A', 'B', 'A', 'B', 'B', 'A', 'B']
    );
    assert.equal(scanned.exam.fillQuestion.points, 3.0);
    assert.deepEqual(scanned.exam.fillQuestion.blanks, [
      'Tính mới',
      'Tính chính xác',
      'Tính đầy đủ',
      'Tính sử dụng được',
      'Vi xử lý',
      'Deepfake',
    ]);
    assert.ok(scanned.exam.fillQuestion.promptTemplate.includes('[1]'));
    assert.ok(scanned.exam.fillQuestion.promptTemplate.includes('[6]'));
    assert.equal(scanned.exam.shortQuestion.points, 2.0);
    assert.ok(scanned.exam.shortQuestion.sampleAnswer.includes('GeoGebra'));

    // Evaluate a perfect student submission on this 6-blank exam
    const evalPerfect = evaluateStudentSubmission({
      exam: scanned.exam,
      selectedAnswers: {
        1: 'B',
        2: 'B',
        3: 'A',
        4: 'A',
        5: 'B',
        6: 'A',
        7: 'B',
        8: 'B',
        9: 'A',
        10: 'B',
      },
      fillBlanks: [
        'Tính mới',
        'Tính chính xác',
        'Tính đầy đủ',
        'Tính sử dụng được',
        'Vi xử lý',
        'Deepfake',
      ],
      shortAnswer:
        'Phần mềm PhET và GeoGebra giúp mô phỏng trực quan. Tác động tiêu cực là nghiện Internet và lừa đảo mạng.',
      tabViolations: 0,
      durationSeconds: 1200,
    });
    assert.equal(evalPerfect.correctMcqCount, 10);
    assert.equal(evalPerfect.fillBlankScore, 3.0);
    assert.ok(evalPerfect.finalScore >= 9.0);

    // Verify "quét được loại nào thì dùng loại đó làm đề": MCQ-only exam should NOT fabricate fill-in-blank or essay sections
    const mcqOnlyText = [
      'ĐỀ KIỂM TRA 15 PHÚT MÔN TOÁN 7',
      'Câu 1. Kết quả của phép tính 2 + 3 là:',
      'A. 4   B. 5   C. 6   D. 7',
      'Câu 2. Số đối của -5 là:',
      'A. 5   B. -5   C. 0   D. 1',
      'ĐÁP ÁN: 1.B 2.A',
    ].join('\n');
    const scannedMcqOnly = scanAndParseThreeExamSections(mcqOnlyText, 7, 'Toán');
    assert.equal(scannedMcqOnly.ok, true);
    assert.equal(scannedMcqOnly.exam.questions.length, 2);
    assert.equal(scannedMcqOnly.exam.questions[0].correctAnswer, 'B');
    assert.equal(scannedMcqOnly.exam.questions[1].correctAnswer, 'A');
    assert.equal(scannedMcqOnly.exam.fillQuestion.points, 0);
    assert.equal(scannedMcqOnly.exam.fillQuestion.promptTemplate, '');
    assert.equal(scannedMcqOnly.exam.shortQuestion.points, 0);
    assert.equal(scannedMcqOnly.exam.shortQuestion.prompt, '');
  });
});



