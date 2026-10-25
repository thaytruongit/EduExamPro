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

  it('enforces grade-restricted exam visibility for students (e.g. 6A1 only sees Grade 6 exams) and class-scoped scoreboards', () => {
    assert.ok(DEFAULT_CLASSROOMS.length >= 6);
    assert.ok(DEFAULT_STUDENT_ACCOUNTS.length >= 6);

    const validStudent = authenticateStudentAccount(
      DEFAULT_STUDENT_ACCOUNTS,
      'hs.an9a1',
      '123456'
    );
    assert.ok(validStudent);
    assert.equal(validStudent?.fullName, 'Nguyễn Văn An');
    assert.equal(validStudent?.studentClass, '9A1');
    assert.equal(validStudent?.dateOfBirth, '15/05/2010');

    const student6A1 = authenticateStudentAccount(
      DEFAULT_STUDENT_ACCOUNTS,
      'hs.mai6a1',
      '123456'
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

    const student7A1 = authenticateStudentAccount(
      DEFAULT_STUDENT_ACCOUNTS,
      'hs.huy7a1',
      '123456'
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
});


