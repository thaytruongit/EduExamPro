import React, { useEffect, useRef, useState } from 'react';
import {
  addExamQuestionDirectly,
  buildIsoFromScheduleParts,
  checkExamScheduleStatus,
  ExamBankData,
  ExamScheduleParts,
  examToStandardTemplateText,
  extractTextFromDocxArrayBuffer,
  extractTextFromDocxOrPdfRaw,
  formatExamScheduleWindow,
  formatSchedulePartsDisplay,
  generateStandardDocxContent,
  generateStandardExamTemplate,
  getSubjectMeta,
  isSystemGeneratedDemoExam,
  mixExamFromQuestionBank,
  MultipleChoiceOption,
  normalizeSubjectKey,
  parseIsoToScheduleParts,
  parseStandardExamText,
  removeExamQuestionDirectly,
  scanAndParseThreeExamSections,
  shuffleExamQuestionsAndOptions,
  SubjectKey,
  TeacherAccount,
  THCS_SUBJECTS,
  updateExamQuestionDirectly,
  ClassroomRecord,
} from '../utils/examLogic';

interface ExamImportFormProps {
  cloudExams: ExamBankData[];
  classrooms?: ClassroomRecord[];
  adminUserLabel: string;
  currentTeacher: TeacherAccount;
  onSaveExamToCloud: (exam: ExamBankData) => Promise<void>;
  onDeleteExamFromCloud: (examId: string) => Promise<void>;
  onPurgeAllSystemDemoExams?: () => Promise<number>;
  onRestoreSystemDemoExams?: () => Promise<void>;
  purgedDemoExams?: boolean;
}

type WorkspaceTab = 'docx_pdf' | 'direct_edit' | 'shuffle_bank';

export const ExamImportForm: React.FC<ExamImportFormProps> = ({
  cloudExams,
  classrooms = [],
  adminUserLabel,
  currentTeacher,
  onSaveExamToCloud,
  onDeleteExamFromCloud,
  onPurgeAllSystemDemoExams,
  onRestoreSystemDemoExams,
  purgedDemoExams = false,
}) => {
  const initialSubject: SubjectKey =
    currentTeacher.subject !== 'ALL' ? currentTeacher.subject : 'Toán';

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('docx_pdf');
  const [selectedGrade, setSelectedGrade] = useState<number>(9);
  const [selectedSubject, setSelectedSubject] =
    useState<SubjectKey>(initialSubject);

  const [textInput, setTextInput] = useState<string>(() =>
    generateStandardExamTemplate(9, initialSubject)
  );
  const [uploadedFileName, setUploadedFileName] = useState<string>(
    `De_Mau_${getSubjectMeta(initialSubject).codePrefix}_Khoi9.docx`
  );

  // Current working exam state
  const [previewExam, setPreviewExam] = useState<ExamBankData>(() =>
    parseStandardExamText(
      generateStandardExamTemplate(9, initialSubject),
      9,
      initialSubject
    )
  );

  // Schedule state: Start (Giờ, Phút, Ngày) & End (Giờ, Phút, Ngày)
  // Default start: 07:00 today, Default end: 23:59 in 7 days (so assigned exams are immediately open unless teacher sets a future window)
  const [startSchedule, setStartSchedule] = useState<ExamScheduleParts>(() => {
    const nowParts = parseIsoToScheduleParts(new Date().toISOString());
    return {
      hour: 7,
      minute: 0,
      date: nowParts.date,
    };
  });
  const [endSchedule, setEndSchedule] = useState<ExamScheduleParts>(() => {
    const futureParts = parseIsoToScheduleParts(
      new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
    );
    return {
      hour: 23,
      minute: 55,
      date: futureParts.date,
    };
  });

  // Target classes for exam assignment (strictly from managed classrooms or teacher assignment)
  const [assignedClasses, setAssignedClasses] = useState<string[]>(() => {
    if (
      Array.isArray(currentTeacher.assignedClasses) &&
      currentTeacher.assignedClasses.length > 0
    ) {
      return currentTeacher.assignedClasses;
    }
    const matching = classrooms.filter((c) => c.grade === 9).map((c) => c.name.toUpperCase());
    return matching.length > 0 ? matching : [];
  });

  const [ingestionError, setIngestionError] = useState<string | null>(null);

  // Track which question index (0-based) is focused in Direct Question Editor
  const [editingQuestionIdx, setEditingQuestionIdx] = useState<number>(0);

  // Shuffle & Mix configuration state
  const [shuffleQuestionsFlag, setShuffleQuestionsFlag] =
    useState<boolean>(true);
  const [shuffleOptionsFlag, setShuffleOptionsFlag] = useState<boolean>(true);
  const [customShuffleCode, setCustomShuffleCode] = useState<string>(
    `${getSubjectMeta(initialSubject).codePrefix}-9-101`
  );
  const [bankMixCount, setBankMixCount] = useState<number>(10);
  const [generatedVariants, setGeneratedVariants] = useState<ExamBankData[]>(
    []
  );

  const [validationError, setValidationError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isProcessingDoc, setIsProcessingDoc] = useState<boolean>(false);

  // Ingestion Progress Modal state
  const [ingestionModalOpen, setIngestionModalOpen] = useState<boolean>(false);
  const [ingestionPercent, setIngestionPercent] = useState<number>(0);
  const [ingestionStepIndex, setIngestionStepIndex] = useState<number>(0);
  const [ingestionStepText, setIngestionStepText] = useState<string>('');
  const [ingestionCompletedExam, setIngestionCompletedExam] =
    useState<ExamBankData | null>(null);
  const [ingestionWarnings, setIngestionWarnings] = useState<string[]>([]);
  const [isPurgingDemo, setIsPurgingDemo] = useState<boolean>(false);
  const [purgeDemoSuccessMsg, setPurgeDemoSuccessMsg] = useState<string | null>(
    null
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const systemDemoExamsCount = cloudExams.filter((ex) =>
    isSystemGeneratedDemoExam(ex)
  ).length;

  const runIngestionProgressSequence = async (
    rawContent: string,
    sourceLabel: string,
    autoSaveToCloud: boolean = false
  ) => {
    setValidationError(null);
    setIngestionError(null);
    setPurgeDemoSuccessMsg(null);
    setIngestionCompletedExam(null);
    setIngestionWarnings([]);
    setIngestionModalOpen(true);
    setIngestionPercent(15);
    setIngestionStepIndex(1);
    setIngestionStepText(
      `Bước 1/5: Đang đọc và giải nén cấu trúc OCR tài liệu "${sourceLabel}"...`
    );

    await new Promise((r) => setTimeout(r, 140));
    setIngestionPercent(35);
    setIngestionStepIndex(2);
    setIngestionStepText(
      `Bước 2/5: Thuật toán tối ưu nhận diện cấu trúc câu hỏi: Trắc nghiệm, Điền khuyết, Trả lời ngắn, Tự luận...`
    );

    await new Promise((r) => setTimeout(r, 160));
    setIngestionPercent(60);
    setIngestionStepIndex(3);
    setIngestionStepText(
      `Bước 3/5: Quét loại câu hỏi thực tế trong đề (quét được loại nào dùng loại đó làm đề)...`
    );

    await new Promise((r) => setTimeout(r, 160));
    setIngestionPercent(80);
    setIngestionStepIndex(4);
    setIngestionStepText(
      `Bước 4/5: Quét bảng Đáp án & Hướng dẫn chấm có sẵn trong đề nạp...`
    );

    const scanResult = scanAndParseThreeExamSections(
      rawContent,
      selectedGrade,
      selectedSubject,
      {
        durationMinutes: previewExam.durationMinutes || 45,
        createdBy: currentTeacher.fullName || adminUserLabel,
        teacherId: currentTeacher.id,
        teacherUsername: currentTeacher.username,
        teacherName: currentTeacher.fullName || adminUserLabel,
      }
    );

    if (!scanResult.ok) {
      setIngestionError(
        scanResult.error || 'Quá trình quét đề thi không thành công.'
      );
      setIngestionPercent(100);
      return;
    }

    const detectedGrade = scanResult.exam.grade || selectedGrade;
    const detectedSubject = normalizeSubjectKey(
      scanResult.exam.subjectCode || scanResult.exam.subject || selectedSubject
    );
    setSelectedGrade(detectedGrade);
    setSelectedSubject(detectedSubject);

    const startIso = buildIsoFromScheduleParts(startSchedule);
    const endIso = buildIsoFromScheduleParts(endSchedule);
    const availableForGrade = classrooms
      .filter((c) => c.grade === detectedGrade)
      .map((c) => c.name.toUpperCase());
    const effectiveClasses =
      assignedClasses.length > 0 ? assignedClasses : availableForGrade;

    const finalExamToSave: ExamBankData = {
      ...scanResult.exam,
      grade: detectedGrade,
      subject: detectedSubject,
      subjectCode: detectedSubject,
      assignedClasses: effectiveClasses,
      startAt: startIso,
      endAt: endIso,
      isAssigned: effectiveClasses.length > 0,
    };

    setPreviewExam(finalExamToSave);
    setEditingQuestionIdx(0);

    if (autoSaveToCloud) {
      await onSaveExamToCloud(finalExamToSave);
    }

    const activeSectionLabels: string[] = [];
    if (finalExamToSave.questions.length > 0) {
      activeSectionLabels.push(
        `${finalExamToSave.questions.length} câu trắc nghiệm`
      );
    }
    if (
      finalExamToSave.fillQuestion.points > 0 &&
      finalExamToSave.fillQuestion.promptTemplate.trim()
    ) {
      activeSectionLabels.push(
        `1 bài điền khuyết (${finalExamToSave.fillQuestion.blanks.length} vị trí)`
      );
    }
    if (
      finalExamToSave.shortQuestion.points > 0 &&
      finalExamToSave.shortQuestion.prompt.trim()
    ) {
      activeSectionLabels.push('1 bài tự luận / trả lời ngắn');
    }

    await new Promise((r) => setTimeout(r, 120));
    setIngestionPercent(100);
    setIngestionStepIndex(5);
    setIngestionStepText(
      `Bước 5/5: Hoàn tất quét cấu trúc & đáp án đề "${finalExamToSave.title}" (${finalExamToSave.code})!`
    );
    setIngestionCompletedExam(finalExamToSave);
    setIngestionWarnings(scanResult.warnings);
    setStatusMessage(
      `Đã quét OCR thành công đề "${finalExamToSave.title}" (${activeSectionLabels.join(
        ' + '
      )}) kèm đáp án chuẩn!`
    );
  };

  const handleTriggerPurgeAllDemoExams = async () => {
    if (!onPurgeAllSystemDemoExams) return;
    setIsPurgingDemo(true);
    try {
      const removedCount = await onPurgeAllSystemDemoExams();
      const msg = `Đã xoá toàn bộ ${removedCount} đề hệ thống sinh demo! Hiện chỉ giữ lại các đề thi thực tế đã nạp.`;
      setPurgeDemoSuccessMsg(msg);
      setSavedNotice(msg);
      setStatusMessage(msg);
    } finally {
      setIsPurgingDemo(false);
    }
  };

  // When logged-in teacher changes, automatically switch to their assigned subject
  useEffect(() => {
    if (currentTeacher.subject !== 'ALL') {
      handleSelectGradeAndSubject(selectedGrade, currentTeacher.subject);
    }
  }, [currentTeacher.id, currentTeacher.subject]);

  // Calculate live score totals for current previewExam
  const mcqPointsTotal = Number(
    previewExam.questions
      .reduce((acc, q) => acc + (Number(q.points) || 0.5), 0)
      .toFixed(2)
  );
  const totalPoints = Number(
    (
      mcqPointsTotal +
      (Number(previewExam.fillQuestion.points) || 0) +
      (Number(previewExam.shortQuestion.points) || 0)
    ).toFixed(2)
  );

  // Sync helper: whenever previewExam changes from Direct Edit or Shuffle, also sync textInput
  const updateWorkingExam = (nextExam: ExamBankData, syncText = true) => {
    const subjKey = normalizeSubjectKey(
      nextExam.subjectCode || nextExam.subject || selectedSubject
    );
    const enriched: ExamBankData = {
      ...nextExam,
      subject: subjKey,
      subjectCode: subjKey,
    };
    setPreviewExam(enriched);
    setSelectedGrade(enriched.grade);
    setSelectedSubject(subjKey);
    if (enriched.startAt) {
      setStartSchedule(parseIsoToScheduleParts(enriched.startAt));
    }
    if (enriched.endAt) {
      setEndSchedule(parseIsoToScheduleParts(enriched.endAt));
    }
    if (
      Array.isArray(enriched.assignedClasses) &&
      enriched.assignedClasses.length > 0
    ) {
      setAssignedClasses(enriched.assignedClasses);
    }
    if (syncText) {
      setTextInput(examToStandardTemplateText(enriched));
    }
    if (editingQuestionIdx >= enriched.questions.length) {
      setEditingQuestionIdx(Math.max(0, enriched.questions.length - 1));
    }
  };

  // Load sample DOCX/PDF standard template for a specific grade (6, 7, 8, 9) and subject (11 THCS subjects)
  const handleSelectGradeAndSubject = (grade: number, subjectKey: SubjectKey) => {
    // If logged in as a specific subject teacher, keep their subject locked to their specialty
    const effectiveSubject =
      currentTeacher.subject !== 'ALL' ? currentTeacher.subject : subjectKey;
    const meta = getSubjectMeta(effectiveSubject);
    setSelectedGrade(grade);
    setSelectedSubject(effectiveSubject);
    const gradeClasses = classrooms
      .filter((c) => c.grade === grade)
      .map((c) => c.name);
    setAssignedClasses(
      gradeClasses.length > 0 ? [gradeClasses[0]] : [`${grade}A1`]
    );
    const sampleTxt = generateStandardExamTemplate(grade, effectiveSubject);
    setTextInput(sampleTxt);
    setUploadedFileName(`De_Mau_${meta.codePrefix}_Khoi${grade}.docx`);
    const parsed = parseStandardExamText(sampleTxt, grade, effectiveSubject);
    setPreviewExam({
      ...parsed,
      subject: effectiveSubject,
      subjectCode: effectiveSubject,
    });
    setEditingQuestionIdx(0);
    setCustomShuffleCode(`${meta.codePrefix}-${grade}-101`);
    setValidationError(null);
    setStatusMessage(
      `Bước 1: Đã nạp trực tiếp đề mẫu môn ${meta.label} (${effectiveSubject}) - Khối ${grade}. Tiếp tục chỉnh sửa hoặc chuyển xuống Bước 2 để Giao Bài Thi.`
    );
  };

  // Download standard Word (.doc/.docx compatible) file
  const handleDownloadStandardDocx = (targetExam: ExamBankData = previewExam) => {
    const docxHtml = generateStandardDocxContent(targetExam);
    const blob = new Blob(['\uFEFF', docxHtml], {
      type: 'application/msword;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `De_Chuan_${targetExam.code}_Khoi${targetExam.grade}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setStatusMessage(
      `Đã tải xuống tệp Word chuẩn "De_Chuan_${targetExam.code}_Khoi${targetExam.grade}.doc".`
    );
  };

  // Upload .docx, .pdf, .doc, .txt file with local deterministic extraction (zero API key)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);
    setValidationError(null);
    setIngestionError(null);
    setIsProcessingDoc(true);

    try {
      const lowerName = file.name.toLowerCase();
      let extractedText = '';

      if (
        lowerName.endsWith('.docx') ||
        file.type.includes('wordprocessingml') ||
        file.type.includes('docx')
      ) {
        const buffer = await file.arrayBuffer();
        extractedText = await extractTextFromDocxArrayBuffer(buffer);
      } else {
        const textContent = await file.text();
        extractedText = extractTextFromDocxOrPdfRaw(textContent);
      }

      if (!extractedText.trim()) {
        setIngestionModalOpen(true);
        setIngestionError(
          `Không thể trích xuất văn bản từ tệp "${file.name}". Vui lòng kiểm tra lại tệp DOCX/PDF hoặc chọn tệp khác.`
        );
        return;
      }

      setTextInput(extractedText);
      await runIngestionProgressSequence(extractedText, file.name, false);
    } catch (err) {
      setIngestionModalOpen(true);
      setIngestionError(
        `Lỗi khi đọc tệp "${file.name}": ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    } finally {
      setIsProcessingDoc(false);
      e.target.value = '';
    }
  };

  // Step 1 -> Step 2: Direct Ingest & Assign Exam to Students with Start/End Schedule
  const handleDirectIngestAndAssignToFirebase = async (asNewCopy = false) => {
    setValidationError(null);
    const startIso = buildIsoFromScheduleParts(startSchedule);
    const endIso = buildIsoFromScheduleParts(endSchedule);

    if (new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      setValidationError(
        'Thời gian kết thúc bài thi (Giờ, Phút, Ngày) phải lớn hơn thời gian bắt đầu bài thi!'
      );
      return;
    }

    setIsSaving(true);
    try {
      const existingInCloud = cloudExams.find((e) => e.id === previewExam.id);
      // Allow overwriting existing exams (including system-generated demo exams if teacher edited them directly!)
      const targetId =
        !asNewCopy && existingInCloud
          ? previewExam.id
          : `exam-g${previewExam.grade}-${selectedSubject
              .toLowerCase()
              .replace(/[^a-z0-9]/g, '')}-${previewExam.code
              .toLowerCase()
              .replace(/[^a-z0-9-_]/g, '-')}-${Date.now()}`;

      const availableForGrade = classrooms
        .filter((c) => c.grade === selectedGrade)
        .map((c) => c.name.toUpperCase());
      const effectiveClasses =
        assignedClasses.length > 0 ? assignedClasses : availableForGrade;

      const examToAssign: ExamBankData = {
        ...previewExam,
        id: targetId,
        grade: selectedGrade,
        subject: selectedSubject,
        subjectCode: selectedSubject,
        createdAt: new Date().toISOString(),
        createdBy: currentTeacher.fullName || adminUserLabel,
        teacherId: currentTeacher.id,
        teacherUsername: currentTeacher.username,
        teacherName: currentTeacher.fullName || adminUserLabel,
        assignedClasses: effectiveClasses,
        isActive: true,
        isAssigned: true,
        startAt: startIso,
        endAt: endIso,
      };

      await onSaveExamToCloud(examToAssign);
      setPreviewExam(examToAssign);
      setSavedNotice(
        `Hoàn tất Quy trình [Nạp Đề Trực Tiếp → Giao Bài Thi]: Đã giao đề "${
          examToAssign.title
        }" (Mã: ${examToAssign.code} • Môn ${selectedSubject} • Khối ${
          examToAssign.grade
        } • Lớp giao: ${effectiveClasses.join(', ')}) từ ${formatSchedulePartsDisplay(
          startSchedule
        )} đến ${formatSchedulePartsDisplay(endSchedule)}!`
      );
      window.setTimeout(() => setSavedNotice(null), 7000);
    } finally {
      setIsSaving(false);
    }
  };

  // Direct Question Editing handlers
  const activeQuestion =
    previewExam.questions[editingQuestionIdx] || previewExam.questions[0];

  const handleDirectQuestionFieldChange = (
    field: 'subject' | 'points' | 'prompt' | 'correctAnswer' | 'explanation',
    value: string | number
  ) => {
    if (!activeQuestion) return;
    const updated = updateExamQuestionDirectly(
      previewExam,
      activeQuestion.id,
      {
        [field]: value,
      }
    );
    updateWorkingExam(updated, true);
  };

  const handleDirectOptionTextChange = (
    optionKey: 'A' | 'B' | 'C' | 'D',
    newTextValue: string
  ) => {
    if (!activeQuestion) return;
    const currentOpts = activeQuestion.options || [
      { key: 'A', text: 'A. ' },
      { key: 'B', text: 'B. ' },
      { key: 'C', text: 'C. ' },
      { key: 'D', text: 'D. ' },
    ];
    const cleanBody = newTextValue.replace(/^[ABCD]\s*[.)]\s*/i, '');
    const nextOptions: MultipleChoiceOption[] = currentOpts.map((o) =>
      o.key === optionKey
        ? { key: optionKey, text: `${optionKey}. ${cleanBody}` }
        : o
    );
    const updated = updateExamQuestionDirectly(
      previewExam,
      activeQuestion.id,
      {
        options: nextOptions,
      }
    );
    updateWorkingExam(updated, true);
  };

  const handleAddNewQuestion = () => {
    const updated = addExamQuestionDirectly(previewExam);
    updateWorkingExam(updated, true);
    setEditingQuestionIdx(updated.questions.length - 1);
    setStatusMessage(
      `Đã thêm Câu hỏi số ${updated.questions.length} vào đề "${updated.code}".`
    );
  };

  const handleDeleteCurrentQuestion = () => {
    if (!activeQuestion || previewExam.questions.length <= 1) return;
    const removedId = activeQuestion.id;
    const updated = removeExamQuestionDirectly(previewExam, removedId);
    updateWorkingExam(updated, true);
    setEditingQuestionIdx(Math.max(0, editingQuestionIdx - 1));
    setStatusMessage(
      `Đã xóa Câu ${removedId} và đánh số lại danh sách câu hỏi (${updated.questions.length} câu).`
    );
  };

  // Shuffle & Mix handlers
  const handleShuffleSingleExam = () => {
    const shuffled = shuffleExamQuestionsAndOptions(previewExam, {
      newCode:
        customShuffleCode.trim() ||
        `${previewExam.code}-M${Math.floor(101 + Math.random() * 898)}`,
      shuffleQuestions: shuffleQuestionsFlag,
      shuffleOptions: shuffleOptionsFlag,
    });
    updateWorkingExam(shuffled, true);
    const numMatch = shuffled.code.match(/^(.*?)(\d+)$/);
    if (numMatch) {
      setCustomShuffleCode(`${numMatch[1]}${Number(numMatch[2]) + 1}`);
    }
    setStatusMessage(
      `Đã trộn thành công mã đề mới "${shuffled.code}" môn ${selectedSubject} Khối ${selectedGrade}.`
    );
  };

  const handleBatchGenerate4Variants = async () => {
    setIsSaving(true);
    try {
      const meta = getSubjectMeta(selectedSubject);
      const basePrefix =
        previewExam.code.replace(/-?\d+$/, '') ||
        `${meta.codePrefix}-${previewExam.grade}`;
      const codes = ['101', '102', '103', '104'];
      const variants: ExamBankData[] = [];
      const startIso = buildIsoFromScheduleParts(startSchedule);
      const endIso = buildIsoFromScheduleParts(endSchedule);

      for (let i = 0; i < codes.length; i++) {
        const vCode = `${basePrefix}-${codes[i]}`;
        const vExam = shuffleExamQuestionsAndOptions(previewExam, {
          newCode: vCode,
          newTitle: `${previewExam.title.replace(/\s*\(Mã.*\)$/i, '')} (Mã đề ${vCode})`,
          shuffleQuestions: shuffleQuestionsFlag,
          shuffleOptions: shuffleOptionsFlag,
        });
        const effectiveClasses =
          assignedClasses.length > 0 ? assignedClasses : [`${selectedGrade}A1`];
        const assignedVariant: ExamBankData = {
          ...vExam,
          grade: selectedGrade,
          subject: selectedSubject,
          subjectCode: selectedSubject,
          createdBy: currentTeacher.fullName || adminUserLabel,
          teacherId: currentTeacher.id,
          teacherUsername: currentTeacher.username,
          teacherName: currentTeacher.fullName || adminUserLabel,
          assignedClasses: effectiveClasses,
          isActive: true,
          isAssigned: true,
          startAt: startIso,
          endAt: endIso,
        };
        variants.push(assignedVariant);
        await onSaveExamToCloud(assignedVariant);
      }

      setGeneratedVariants(variants);
      updateWorkingExam(variants[0], true);
      setSavedNotice(
        `Đã trộn tự động và Giao Bài Thi 04 mã đề (${variants
          .map((v) => v.code)
          .join(', ')}) môn ${selectedSubject} Khối ${selectedGrade} lên Firebase!`
      );
      window.setTimeout(() => setSavedNotice(null), 6000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMixFromQuestionBank = () => {
    const mixed = mixExamFromQuestionBank(cloudExams, {
      grade: selectedGrade,
      subject: selectedSubject,
      questionCount: bankMixCount,
      newCode: customShuffleCode.trim() || undefined,
      shuffleOptions: shuffleOptionsFlag,
    });
    updateWorkingExam(mixed, true);
    setStatusMessage(
      `Đã tổng hợp & trộn đề mới "${mixed.code}" (${mixed.questions.length} câu trắc nghiệm + 2 câu tự luận) từ Ngân Hàng Đề môn ${selectedSubject} Khối ${selectedGrade}!`
    );
  };

  // Filter exams shown in the Teacher's Bank panel:
  // If teacher is a subject teacher, show exams for their subject; if admin, show all or filter by selectedSubject
  const teacherScopedExams = cloudExams.filter((ex) => {
    const exSubj = normalizeSubjectKey(ex.subjectCode || ex.subject);
    if (currentTeacher.subject !== 'ALL') {
      return exSubj === currentTeacher.subject;
    }
    return true;
  });

  const hoursList = Array.from({ length: 24 }, (_, i) => i);
  const minutesList = Array.from({ length: 60 }, (_, i) => i);

  return (
    <div id="exam-import-form" className="flex flex-col gap-space-lg w-full">
      {/* TOP BAR: HEADER & WORKFLOW OVERVIEW */}
      <div className="flex flex-wrap items-center justify-between gap-space-md print:hidden">
        <div className="flex items-center gap-space-sm">
          <div className="w-10 h-10 rounded-xl bg-secondary text-on-secondary flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-[22px]">
              assignment_add
            </span>
          </div>
          <div>
            <h2 className="font-headline-md text-headline-md text-primary">
              Quy Trình Nạp Đề Thi Trực Tiếp Theo Khối / Môn &amp; Giao Bài Thi
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              <strong>Bước 1:</strong> Nạp đề thi trực tiếp theo Khối (6–9) &amp; 11 Môn học (Tin, Toán, Văn, Anh, Sử, Địa, Công Nghệ, GDCD, Lý, Hoá, Sinh) →{' '}
              <strong>Bước 2:</strong> Chọn mốc Giờ, Phút, Ngày bắt đầu &amp; kết thúc để Giao Bài Thi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onPurgeAllSystemDemoExams && systemDemoExamsCount > 0 && (
            <button
              id="btnPurgeAllSystemDemoExams"
              type="button"
              disabled={isPurgingDemo}
              onClick={handleTriggerPurgeAllDemoExams}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-error text-on-error hover:bg-error/90 font-label-md text-label-md shadow-sm cursor-pointer whitespace-nowrap shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">
                delete_sweep
              </span>
              <span>
                {isPurgingDemo
                  ? 'Đang xoá đề demo...'
                  : `Xoá Toàn Bộ Đề Hệ Thống Sinh Demo (${systemDemoExamsCount} đề)`}
              </span>
            </button>
          )}

        </div>
      </div>

      {/* STEP 1 BAR: SELECT GRADE (6,7,8,9) & 11 SUBJECTS (TIN, TOÁN, VĂN, ANH, SỬ, ĐỊA, CÔNG NGHỆ, GDCD, LÝ, HOÁ, SINH) */}
      <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-md border border-outline-variant/30 flex flex-col gap-space-md print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-outline-variant/20">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-primary text-on-primary font-code-meta text-xs font-bold">
              BƯỚC 1 / NẠP ĐỀ THI TRỰC TIẾP
            </span>
            <span className="font-headline-sm text-sm text-on-surface font-bold">
              Chọn Khối Lớp (6, 7, 8, 9) &amp; Môn Học Để Nạp Đề Trực Tiếp
            </span>
          </div>
          <span className="font-code-meta text-xs text-secondary font-semibold">
            Giáo viên phụ trách: {currentTeacher.fullName} (
            {currentTeacher.subject === 'ALL'
              ? 'Quản lý toàn bộ 11 môn'
              : `Chuyên trách môn ${currentTeacher.subject}`}
            )
          </span>
        </div>

        {/* Grade Selector + 11 Subjects Selector */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md items-start">
          {/* Grade 6, 7, 8, 9 */}
          <div className="lg:col-span-3 flex flex-col gap-1.5">
            <span className="font-label-md text-xs text-on-surface-variant uppercase font-bold">
              1. Chọn Khối Lớp (THCS):
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {[6, 7, 8, 9].map((g) => {
                const isActive = selectedGrade === g;
                return (
                  <button
                    key={g}
                    id={`btnIngestGrade-${g}`}
                    type="button"
                    onClick={() =>
                      handleSelectGradeAndSubject(g, selectedSubject)
                    }
                    className={`py-2 px-2 rounded-lg font-label-md text-xs cursor-pointer transition-all ${
                      isActive
                        ? 'bg-primary text-on-primary font-bold shadow-sm'
                        : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    Khối {g}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 11 Subjects: Tin, Toán, Văn, Anh, Sử, Địa, Công Nghệ, GDCD, Lý, Hoá, Sinh */}
          <div className="lg:col-span-9 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="font-label-md text-xs text-on-surface-variant uppercase font-bold">
                2. Chọn Môn Học Nạp Đề (11 Môn THCS):
              </span>
              {currentTeacher.subject !== 'ALL' && (
                <span className="font-code-meta text-[11px] text-primary font-semibold">
                  Tài khoản giáo viên môn {currentTeacher.subject} (Tự động định tuyến theo môn)
                </span>
              )}
            </div>
            <div
              id="ingestSubjectGrid"
              className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-11 gap-1.5"
            >
              {THCS_SUBJECTS.map((subj) => {
                const isSelected = selectedSubject === subj.key;
                const isLockedByTeacher =
                  currentTeacher.subject !== 'ALL' &&
                  currentTeacher.subject !== subj.key;
                return (
                  <button
                    key={subj.key}
                    id={`btnIngestSubject-${subj.codePrefix}`}
                    type="button"
                    disabled={isLockedByTeacher}
                    onClick={() =>
                      handleSelectGradeAndSubject(selectedGrade, subj.key)
                    }
                    className={`py-2 px-2 rounded-lg font-label-md text-xs flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-secondary text-on-secondary font-bold shadow-sm ring-2 ring-primary'
                        : isLockedByTeacher
                        ? 'bg-surface-container-low text-outline opacity-45 cursor-not-allowed'
                        : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {subj.icon}
                    </span>
                    <span className="truncate max-w-full">{subj.key}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* MODE NAVIGATION TABS */}
      <div className="bg-surface-container p-1.5 rounded-xl flex flex-wrap items-center gap-1.5 print:hidden">
        <button
          id="tabModeDocxPdf"
          type="button"
          onClick={() => setActiveTab('docx_pdf')}
          className={`flex-1 min-w-[220px] px-4 py-2.5 rounded-lg font-label-lg text-label-lg cursor-pointer transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
            activeTab === 'docx_pdf'
              ? 'bg-primary text-on-primary font-bold shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            upload_file
          </span>
          <span>
            1. Nạp Đề Trực Tiếp ({selectedSubject} - Khối {selectedGrade})
          </span>
        </button>

        <button
          id="tabModeDirectEdit"
          type="button"
          onClick={() => setActiveTab('direct_edit')}
          className={`flex-1 min-w-[220px] px-4 py-2.5 rounded-lg font-label-lg text-label-lg cursor-pointer transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
            activeTab === 'direct_edit'
              ? 'bg-primary text-on-primary font-bold shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            edit_note
          </span>
          <span>
            2. Sửa Câu Hỏi Trực Tiếp ({previewExam.questions.length + 2} câu)
          </span>
        </button>

        <button
          id="tabModeShuffleBank"
          type="button"
          onClick={() => setActiveTab('shuffle_bank')}
          className={`flex-1 min-w-[220px] px-4 py-2.5 rounded-lg font-label-lg text-label-lg cursor-pointer transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
            activeTab === 'shuffle_bank'
              ? 'bg-primary text-on-primary font-bold shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            shuffle
          </span>
          <span>3. Trộn Đề Theo Ngân Hàng Đề</span>
        </button>
      </div>

      {/* MAIN 2-COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg print:hidden">
        {/* LEFT COLUMN (7 cols): Active Workspace Mode + STEP 2 SCHEDULE & ASSIGN */}
        <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl p-space-lg shadow-md flex flex-col gap-space-md">
          {/* TAB 1: STRUCTURAL OCR QUESTION-TYPE & ANSWER-KEY SCANNER */}
          {activeTab === 'docx_pdf' && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-outline-variant/30">
                <div>
                  <span className="font-code-meta text-code-meta text-secondary font-bold uppercase">
                    Thuật Toán Tối Ưu Quét OCR Đúng Cấu Trúc Loại Câu Hỏi &amp; Đáp Án Có Sẵn • Môn {selectedSubject} • Khối {selectedGrade}
                  </span>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">
                    Tự Động Nhận Diện: Trắc Nghiệm • Điền Khuyết • Trả Lời Ngắn • Tự Luận (Quét Được Loại Nào Dùng Loại Đó Làm Đề)
                  </h3>
                </div>
                <span className="px-2.5 py-1 rounded bg-secondary-fixed text-on-secondary-fixed font-code-meta text-xs font-bold">
                  Mã đề: {previewExam.code}
                </span>
              </div>

              {/* Upload DOCX / PDF Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-container-low p-space-md rounded-xl border border-dashed border-outline-variant">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-primary-fixed text-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[22px]">
                      document_scanner
                    </span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-label-lg text-label-lg text-on-surface font-semibold truncate">
                      Tải tệp đề thi (.DOCX, .PDF, .DOC, .TXT) — Tự động quét cấu trúc câu hỏi &amp; bảng đáp án trong đề
                    </span>
                    <span className="font-code-meta text-code-meta text-on-surface-variant truncate">
                      Tệp đang nạp: <strong>{uploadedFileName}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    ref={fileInputRef}
                    id="examDocxPdfFileInput"
                    type="file"
                    accept=".docx,.pdf,.doc,.txt,.json"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <button
                    id="btnSelectDocxPdfFile"
                    type="button"
                    disabled={isProcessingDoc}
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-label-md text-label-md font-bold shadow-sm cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      folder_open
                    </span>
                    <span>
                      {isProcessingDoc
                        ? 'Đang quét OCR cấu trúc đề...'
                        : 'Chọn tệp đề thi (.DOCX / .PDF / .TXT)'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Content Editor */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs text-on-surface-variant flex-wrap gap-2">
                  <label
                    htmlFor="examImportEditorTextarea"
                    className="font-semibold text-on-surface"
                  >
                    Nội dung đề thi &amp; bảng đáp án quét OCR (Tự động bóc tách Trắc nghiệm, Điền khuyết, Trả lời ngắn, Tự luận và Đáp án có sẵn):
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab('direct_edit')}
                      className="font-code-meta text-primary hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        edit_note
                      </span>
                      Mở Trình Sửa Từng Câu Hỏi
                    </button>
                  </div>
                </div>

                <textarea
                  id="examImportEditorTextarea"
                  rows={11}
                  value={textInput}
                  onChange={(e) => {
                    const nextVal = e.target.value;
                    setTextInput(nextVal);
                    const scanRes = scanAndParseThreeExamSections(
                      nextVal,
                      selectedGrade,
                      selectedSubject,
                      {
                        durationMinutes: previewExam.durationMinutes || 45,
                        createdBy: currentTeacher.fullName || adminUserLabel,
                        teacherId: currentTeacher.id,
                        teacherUsername: currentTeacher.username,
                        teacherName: currentTeacher.fullName || adminUserLabel,
                      }
                    );
                    if (scanRes.ok) {
                      setPreviewExam(scanRes.exam);
                    }
                  }}
                  className="w-full p-space-md rounded-xl bg-surface-container-low font-code-meta text-xs text-on-surface leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Dán nội dung đề thi kèm bảng đáp án hoặc chọn tệp .DOCX / .PDF để hệ thống tự động nhận diện loại câu hỏi và đáp án..."
                />
              </div>
            </>
          )}

          {/* TAB 2: DIRECT QUESTION EDITOR IN EXAM BANK */}
          {activeTab === 'direct_edit' && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-outline-variant/30">
                <div>
                  <span className="font-code-meta text-code-meta text-secondary font-bold uppercase">
                    Chế Độ 2 / Sửa Câu Hỏi Trực Tiếp Trong Ngân Hàng Đề
                  </span>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">
                    Chỉnh Sửa Trực Tiếp Đề: {previewExam.code} (Môn {selectedSubject} - Khối {selectedGrade})
                  </h3>
                </div>
                <button
                  id="btnAddMcqQuestionDirect"
                  type="button"
                  onClick={handleAddNewQuestion}
                  className="px-3 py-1.5 rounded-lg bg-secondary text-on-secondary hover:bg-secondary-container font-label-md text-label-md cursor-pointer flex items-center gap-1 whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    add_circle
                  </span>
                  <span>+ Thêm Câu Trắc Nghiệm</span>
                </button>
              </div>

              {/* Exam Metadata Row */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 bg-surface-container-low p-space-md rounded-xl">
                <div className="sm:col-span-3 flex flex-col gap-1">
                  <label
                    htmlFor="directExamCode"
                    className="font-code-meta text-[11px] text-on-surface-variant font-semibold"
                  >
                    Mã đề thi
                  </label>
                  <input
                    id="directExamCode"
                    type="text"
                    value={previewExam.code}
                    onChange={(e) =>
                      updateWorkingExam({
                        ...previewExam,
                        code: e.target.value,
                      })
                    }
                    className="px-2.5 py-1.5 rounded-lg bg-surface-container-lowest font-code-meta text-xs font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="sm:col-span-5 flex flex-col gap-1">
                  <label
                    htmlFor="directExamTitle"
                    className="font-code-meta text-[11px] text-on-surface-variant font-semibold"
                  >
                    Tiêu đề đề thi
                  </label>
                  <input
                    id="directExamTitle"
                    type="text"
                    value={previewExam.title}
                    onChange={(e) =>
                      updateWorkingExam({
                        ...previewExam,
                        title: e.target.value,
                      })
                    }
                    className="px-2.5 py-1.5 rounded-lg bg-surface-container-lowest text-xs text-on-surface font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="sm:col-span-2 flex flex-col gap-1">
                  <label
                    htmlFor="directExamGrade"
                    className="font-code-meta text-[11px] text-on-surface-variant font-semibold"
                  >
                    Khối lớp
                  </label>
                  <select
                    id="directExamGrade"
                    value={previewExam.grade}
                    onChange={(e) =>
                      updateWorkingExam({
                        ...previewExam,
                        grade: Number(e.target.value),
                      })
                    }
                    className="px-2 py-1.5 rounded-lg bg-surface-container-lowest text-xs font-bold text-on-surface focus:outline-none"
                  >
                    {[6, 7, 8, 9].map((g) => (
                      <option key={g} value={g}>
                        Khối {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2 flex flex-col gap-1">
                  <label
                    htmlFor="directExamDuration"
                    className="font-code-meta text-[11px] text-on-surface-variant font-semibold"
                  >
                    Thời gian (p)
                  </label>
                  <input
                    id="directExamDuration"
                    type="number"
                    min={5}
                    max={180}
                    value={previewExam.durationMinutes}
                    onChange={(e) =>
                      updateWorkingExam({
                        ...previewExam,
                        durationMinutes: Math.max(
                          5,
                          Number(e.target.value) || 45
                        ),
                      })
                    }
                    className="px-2.5 py-1.5 rounded-lg bg-surface-container-lowest font-code-meta text-xs font-bold text-on-surface focus:outline-none"
                  />
                </div>
              </div>

              {/* Question Selector Bar */}
              <div className="flex flex-col gap-1.5">
                <span className="font-label-md text-label-md text-on-surface-variant font-semibold">
                  Chọn câu hỏi trắc nghiệm cần sửa trực tiếp:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {previewExam.questions.map((q, idx) => {
                    const isCurrent = idx === editingQuestionIdx;
                    return (
                      <button
                        key={q.id}
                        id={`btnSelectQuestionEdit-${q.id}`}
                        type="button"
                        onClick={() => setEditingQuestionIdx(idx)}
                        className={`px-3 py-1.5 rounded-lg font-code-meta text-xs cursor-pointer transition-all ${
                          isCurrent
                            ? 'bg-primary text-on-primary font-bold shadow-sm'
                            : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                        }`}
                      >
                        Câu {q.id} ({q.correctAnswer})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active MCQ Question Editor Card */}
              {activeQuestion && (
                <div
                  id="direct-question-editor-card"
                  className="p-space-md rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-space-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-primary text-on-primary font-code-meta text-xs font-bold">
                        Đang sửa Câu {activeQuestion.id}
                      </span>
                      <input
                        id="directQuestionSubjectInput"
                        type="text"
                        aria-label="Phân môn câu hỏi"
                        value={activeQuestion.subject}
                        onChange={(e) =>
                          handleDirectQuestionFieldChange(
                            'subject',
                            e.target.value
                          )
                        }
                        placeholder="Chủ đề / Môn học"
                        className="px-2.5 py-1 rounded bg-surface-container-lowest font-code-meta text-xs text-secondary font-bold focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <div className="flex items-center gap-1">
                        <span className="font-code-meta text-xs text-on-surface-variant">
                          Điểm:
                        </span>
                        <input
                          id="directQuestionPointsInput"
                          type="number"
                          step="0.25"
                          min="0.1"
                          max="5"
                          value={activeQuestion.points}
                          onChange={(e) =>
                            handleDirectQuestionFieldChange(
                              'points',
                              Number(e.target.value) || 0.5
                            )
                          }
                          className="w-16 px-2 py-1 rounded bg-surface-container-lowest font-code-meta text-xs font-bold text-primary focus:outline-none"
                        />
                      </div>
                    </div>

                    {previewExam.questions.length > 1 && (
                      <button
                        id="btnDeleteCurrentQuestion"
                        type="button"
                        onClick={handleDeleteCurrentQuestion}
                        className="px-2.5 py-1 rounded bg-error-container text-on-error-container font-label-md text-xs cursor-pointer flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[15px]">
                          delete
                        </span>
                        <span>Xóa Câu {activeQuestion.id}</span>
                      </button>
                    )}
                  </div>

                  {/* Question Prompt */}
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="directQuestionPromptTextarea"
                      className="font-label-md text-xs text-on-surface font-semibold"
                    >
                      Nội dung câu hỏi số {activeQuestion.id}:
                    </label>
                    <textarea
                      id="directQuestionPromptTextarea"
                      rows={2}
                      value={activeQuestion.prompt}
                      onChange={(e) =>
                        handleDirectQuestionFieldChange(
                          'prompt',
                          e.target.value
                        )
                      }
                      className="w-full p-2.5 rounded-lg bg-surface-container-lowest text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  {/* 4 Options A, B, C, D + Radio for Correct Answer */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {(['A', 'B', 'C', 'D'] as const).map((optKey) => {
                      const foundOpt = activeQuestion.options?.find(
                        (o) => o.key === optKey
                      );
                      const cleanOptVal = (foundOpt?.text || '')
                        .replace(/^[ABCD]\s*[.)]\s*/i, '')
                        .trim();
                      const isCorrect =
                        activeQuestion.correctAnswer === optKey;
                      return (
                        <div
                          key={optKey}
                          className={`p-2 rounded-lg border flex flex-col gap-1.5 ${
                            isCorrect
                              ? 'bg-tertiary-container/25 border-tertiary'
                              : 'bg-surface-container-lowest border-outline-variant/30'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-code-meta text-xs font-bold text-primary">
                              Phương án {optKey}
                            </span>
                            <button
                              id={`btnSetCorrectAnswer-${optKey}`}
                              type="button"
                              onClick={() =>
                                handleDirectQuestionFieldChange(
                                  'correctAnswer',
                                  optKey
                                )
                              }
                              className={`px-2 py-0.5 rounded font-code-meta text-[11px] cursor-pointer ${
                                isCorrect
                                  ? 'bg-tertiary text-on-tertiary font-bold'
                                  : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                              }`}
                            >
                              {isCorrect
                                ? `Đáp án đúng (${optKey})`
                                : `Chọn ${optKey} là ĐA đúng`}
                            </button>
                          </div>
                          <input
                            id={`directOptionInput-${optKey}`}
                            type="text"
                            aria-label={`Nội dung phương án ${optKey}`}
                            value={cleanOptVal}
                            onChange={(e) =>
                              handleDirectOptionTextChange(
                                optKey,
                                e.target.value
                              )
                            }
                            className="w-full px-2.5 py-1.5 rounded bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="directQuestionExplanationInput"
                      className="font-label-md text-xs text-on-surface font-semibold"
                    >
                      Giải thích đáp án / Hướng dẫn chấm Câu {activeQuestion.id}:
                    </label>
                    <input
                      id="directQuestionExplanationInput"
                      type="text"
                      value={activeQuestion.explanation || ''}
                      onChange={(e) =>
                        handleDirectQuestionFieldChange(
                          'explanation',
                          e.target.value
                        )
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-surface-container-lowest text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              )}

              {/* Direct Editor for Fill-in-Blank (Part II) & Short Answer (Part III) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-space-sm rounded-xl bg-surface-container-low flex flex-col gap-1.5">
                  <span className="font-code-meta text-xs font-bold text-primary">
                    Phần II — Câu Điền Khuyết ({previewExam.fillQuestion.points}đ)
                  </span>
                  <textarea
                    aria-label="Nội dung câu điền khuyết"
                    rows={3}
                    value={previewExam.fillQuestion.promptTemplate}
                    onChange={(e) =>
                      updateWorkingExam({
                        ...previewExam,
                        fillQuestion: {
                          ...previewExam.fillQuestion,
                          promptTemplate: e.target.value,
                        },
                      })
                    }
                    className="w-full p-2 rounded bg-surface-container-lowest text-xs text-on-surface focus:outline-none"
                  />
                  <div className="grid grid-cols-3 gap-1.5">
                    {(previewExam.fillQuestion.blanks.length > 0
                      ? previewExam.fillQuestion.blanks
                      : ['', '', '']
                    ).map((_, bIdx) => (
                      <input
                        key={bIdx}
                        type="text"
                        aria-label={`Đáp án ô trống ${bIdx + 1}`}
                        value={previewExam.fillQuestion.blanks[bIdx] || ''}
                        onChange={(e) => {
                          const nextBlanks = [
                            ...previewExam.fillQuestion.blanks,
                          ];
                          while (nextBlanks.length <= bIdx) {
                            nextBlanks.push('');
                          }
                          nextBlanks[bIdx] = e.target.value;
                          updateWorkingExam({
                            ...previewExam,
                            fillQuestion: {
                              ...previewExam.fillQuestion,
                              blanks: nextBlanks,
                            },
                          });
                        }}
                        placeholder={`Ô [${bIdx + 1}]`}
                        className="px-2 py-1 rounded bg-surface-container-lowest font-code-meta text-xs text-secondary font-bold focus:outline-none"
                      />
                    ))}
                  </div>
                </div>

                <div className="p-space-sm rounded-xl bg-surface-container-low flex flex-col gap-1.5">
                  <span className="font-code-meta text-xs font-bold text-primary">
                    Phần III — Câu Tự Luận Ngắn ({previewExam.shortQuestion.points}đ)
                  </span>
                  <textarea
                    aria-label="Đề bài câu tự luận ngắn"
                    rows={3}
                    value={previewExam.shortQuestion.prompt}
                    onChange={(e) =>
                      updateWorkingExam({
                        ...previewExam,
                        shortQuestion: {
                          ...previewExam.shortQuestion,
                          prompt: e.target.value,
                        },
                      })
                    }
                    className="w-full p-2 rounded bg-surface-container-lowest text-xs text-on-surface focus:outline-none"
                  />
                  <input
                    type="text"
                    aria-label="Từ khóa chấm tự luận"
                    value={previewExam.shortQuestion.keywords.join(', ')}
                    onChange={(e) =>
                      updateWorkingExam({
                        ...previewExam,
                        shortQuestion: {
                          ...previewExam.shortQuestion,
                          keywords: e.target.value
                            .split(',')
                            .map((k) => k.trim())
                            .filter(Boolean),
                        },
                      })
                    }
                    placeholder="Từ khóa chấm (cách nhau dấu phẩy)"
                    className="px-2 py-1 rounded bg-surface-container-lowest font-code-meta text-xs text-primary font-bold focus:outline-none"
                  />
                </div>
              </div>
            </>
          )}

          {/* TAB 3: EXAM BANK SHUFFLER & CROSS-BANK MIXER */}
          {activeTab === 'shuffle_bank' && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-outline-variant/30">
                <div>
                  <span className="font-code-meta text-code-meta text-secondary font-bold uppercase">
                    Chế Độ 3 / Trộn Đề Thi Tự Động Theo Ngân Hàng Đề
                  </span>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">
                    Trộn Mã Đề Hoán Vị (101–104) &amp; Bốc Câu Hỏi Môn {selectedSubject} Khối {selectedGrade}
                  </h3>
                </div>
              </div>

              <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-space-sm">
                <div className="flex items-center justify-between">
                  <span className="font-headline-sm text-sm text-primary font-bold">
                    A. Trộn Hoán Vị Câu Hỏi &amp; Phương Án A/B/C/D Từ Đề Đang Chọn ({previewExam.code})
                  </span>
                  <span className="font-code-meta text-xs text-tertiary font-semibold">
                    Tự động cập nhật lại bảng đáp án đúng
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label className="flex items-center gap-2 p-2.5 rounded-lg bg-surface-container-lowest cursor-pointer">
                    <input
                      id="chkShuffleQuestions"
                      type="checkbox"
                      checked={shuffleQuestionsFlag}
                      onChange={(e) =>
                        setShuffleQuestionsFlag(e.target.checked)
                      }
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="font-body-sm text-xs text-on-surface font-medium">
                      Đảo ngẫu nhiên vị trí các câu hỏi trắc nghiệm
                    </span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-lg bg-surface-container-lowest cursor-pointer">
                    <input
                      id="chkShuffleOptions"
                      type="checkbox"
                      checked={shuffleOptionsFlag}
                      onChange={(e) => setShuffleOptionsFlag(e.target.checked)}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="font-body-sm text-xs text-on-surface font-medium">
                      Đảo phương án A, B, C, D &amp; tự động khớp đáp án đúng
                    </span>
                  </label>
                </div>

                <div className="flex flex-wrap items-end gap-2 pt-1">
                  <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
                    <label
                      htmlFor="inputShuffleCode"
                      className="font-code-meta text-[11px] text-on-surface-variant font-semibold"
                    >
                      Mã đề trộn mới:
                    </label>
                    <input
                      id="inputShuffleCode"
                      type="text"
                      value={customShuffleCode}
                      onChange={(e) => setCustomShuffleCode(e.target.value)}
                      placeholder="VD: TOAN-9-101"
                      className="px-3 py-2 rounded-lg bg-surface-container-lowest font-code-meta text-xs font-bold text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <button
                    id="btnShuffleSingleExam"
                    type="button"
                    onClick={handleShuffleSingleExam}
                    className="px-4 py-2 rounded-lg bg-secondary text-on-secondary hover:bg-secondary-container font-label-md text-label-md cursor-pointer flex items-center gap-1.5 shadow-sm whitespace-nowrap"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      shuffle
                    </span>
                    <span>Trộn Ngẫu Nhiên 1 Mã Đề Mới</span>
                  </button>

                  <button
                    id="btnBatchGenerate4Variants"
                    type="button"
                    disabled={isSaving}
                    onClick={handleBatchGenerate4Variants}
                    className="px-4 py-2 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-label-md text-label-md cursor-pointer flex items-center gap-1.5 shadow-sm whitespace-nowrap disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      library_add
                    </span>
                    <span>
                      Trộn &amp; Giao Nhanh 4 Mã Đề (101–104)
                    </span>
                  </button>
                </div>

                {generatedVariants.length > 0 && (
                  <div className="pt-2 border-t border-outline-variant/30 flex flex-col gap-1.5">
                    <span className="font-code-meta text-xs text-on-surface-variant font-semibold">
                      Bộ mã đề vừa trộn (Nhấn để xem Print Preview hoặc tải file .DOCX):
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {generatedVariants.map((v) => (
                        <div
                          key={v.id}
                          className="flex items-center gap-1 bg-surface-container-lowest px-2.5 py-1 rounded-lg border border-outline-variant/30"
                        >
                          <button
                            type="button"
                            onClick={() => updateWorkingExam(v, true)}
                            className="font-code-meta text-xs font-bold text-primary hover:underline cursor-pointer"
                          >
                            {v.code}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadStandardDocx(v)}
                            title={`Tải file DOCX cho mã đề ${v.code}`}
                            className="text-secondary hover:text-primary cursor-pointer p-0.5"
                          >
                            <span className="material-symbols-outlined text-[15px]">
                              download
                            </span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-space-sm">
                <span className="font-headline-sm text-sm text-primary font-bold">
                  B. Trộn Đề Tổng Hợp Từ Ngân Hàng Đề Môn {selectedSubject} ({teacherScopedExams.length} đề hiện có)
                </span>
                <div className="flex flex-wrap items-end gap-2.5">
                  <div className="flex flex-col gap-1 w-44">
                    <label
                      htmlFor="inputMixQuestionCount"
                      className="font-code-meta text-[11px] text-on-surface-variant font-semibold"
                    >
                      Số câu trắc nghiệm:
                    </label>
                    <input
                      id="inputMixQuestionCount"
                      type="number"
                      min={4}
                      max={30}
                      value={bankMixCount}
                      onChange={(e) =>
                        setBankMixCount(Math.max(1, Number(e.target.value) || 10))
                      }
                      className="px-3 py-2 rounded-lg bg-surface-container-lowest font-code-meta text-xs font-bold text-on-surface"
                    />
                  </div>

                  <button
                    id="btnMixFromBank"
                    type="button"
                    onClick={handleMixFromQuestionBank}
                    className="px-4 py-2 rounded-lg bg-secondary text-on-secondary hover:bg-secondary-container font-label-md text-label-md cursor-pointer flex items-center justify-center gap-1.5 shadow-sm whitespace-nowrap"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      auto_awesome_motion
                    </span>
                    <span>
                      Bốc &amp; Trộn Từ Ngân Hàng Đề {selectedSubject} K{selectedGrade}
                    </span>
                  </button>
                </div>
              </div>
            </>
          )}

          {/* STEP 2 PANEL: EXAM ASSIGNMENT SCHEDULE (START HOUR, MINUTE, DATE -> END HOUR, MINUTE, DATE) & DIRECT ASSIGN CTA */}
          <div
            id="exam-assignment-schedule-box"
            className="p-space-md rounded-xl bg-primary-fixed/25 border-2 border-primary/30 flex flex-col gap-space-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-primary text-on-primary font-code-meta text-xs font-bold">
                  BƯỚC 2 / GIAO BÀI THI THEO LỚP &amp; CHỌN MỐC THỜI GIAN THI
                </span>
                <span className="font-headline-sm text-sm text-primary font-bold">
                  Chọn Lớp Nhận Bài (Khối {selectedGrade}) &amp; Thiết Lập Giờ, Phút, Ngày Thi
                </span>
              </div>
              <span className="font-code-meta text-xs text-on-surface-variant">
                Môn: <strong>{selectedSubject}</strong> • Khối{' '}
                <strong>{selectedGrade}</strong>
              </span>
            </div>

            {/* Target Class Selection for Exam Assignment */}
            <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-label-md text-xs text-primary font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">
                    groups
                  </span>
                  Chọn Lớp Học Nhận Đề Kiểm Tra (Khối {selectedGrade} — Giáo viên giao lớp nào sẽ được quyền xem bảng điểm lớp đó):
                </span>
                <span className="font-code-meta text-xs text-secondary font-bold">
                  Đang chọn: {assignedClasses.join(', ') || 'Chưa chọn lớp'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(() => {
                  const availableForGrade = Array.from(
                    new Set(
                      classrooms
                        .filter((c) => c.grade === selectedGrade)
                        .map((c) => c.name.toUpperCase())
                    )
                  );
                  if (availableForGrade.length === 0) {
                    return (
                      <div className="flex flex-col gap-1.5 w-full py-1">
                        <span className="font-body-sm text-xs text-on-surface-variant italic">
                          Chưa có lớp học nào được tạo cho Khối {selectedGrade}. Vui lòng tạo lớp tại phân hệ Quản lý Lớp học hoặc nhập lớp tuỳ chọn bên dưới:
                        </span>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Nhập mã lớp giao (VD: 9A1)..."
                            className="px-2.5 py-1 text-xs rounded border border-outline-variant/40 bg-surface-container-low max-w-xs font-code-meta"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const val = (e.currentTarget.value || '').trim().toUpperCase();
                                if (val && !assignedClasses.includes(val)) {
                                  setAssignedClasses((prev) => [...prev, val]);
                                  e.currentTarget.value = '';
                                }
                              }
                            }}
                          />
                          <span className="text-[11px] text-on-surface-variant">(Nhấn Enter để thêm)</span>
                        </div>
                      </div>
                    );
                  }
                  return availableForGrade.map((clsName) => {
                    const isChecked = assignedClasses.includes(clsName);
                    return (
                      <button
                        key={clsName}
                        id={`btnAssignClass-${clsName}`}
                        type="button"
                        onClick={() => {
                          setAssignedClasses((prev) => {
                            if (prev.includes(clsName)) {
                              return prev.filter((c) => c !== clsName);
                            }
                            return [...prev, clsName];
                          });
                        }}
                        className={`px-3 py-1.5 rounded-lg font-code-meta text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all border ${
                          isChecked
                            ? 'bg-primary text-on-primary border-primary shadow-sm'
                            : 'bg-surface-container-low text-on-surface-variant border-outline-variant/30 hover:bg-surface-container'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[15px]">
                          {isChecked ? 'check_box' : 'check_box_outline_blank'}
                        </span>
                        <span>Lớp {clsName}</span>
                      </button>
                    );
                  });
                })()}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Start Time: Giờ, Phút, Ngày bắt đầu */}
              <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-label-md text-xs text-primary font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">
                      play_circle
                    </span>
                    Thời Gian Bắt Đầu Thi (Giờ : Phút - Ngày)
                  </span>
                </div>
                <div className="grid grid-cols-12 gap-1.5 items-center">
                  <div className="col-span-3 flex flex-col">
                    <label
                      htmlFor="scheduleStartHour"
                      className="font-code-meta text-[10px] text-on-surface-variant"
                    >
                      Giờ (0-23)
                    </label>
                    <select
                      id="scheduleStartHour"
                      value={startSchedule.hour}
                      onChange={(e) =>
                        setStartSchedule({
                          ...startSchedule,
                          hour: Number(e.target.value),
                        })
                      }
                      className="px-2 py-1.5 rounded bg-surface-container-low font-code-meta text-xs font-bold text-on-surface"
                    >
                      {hoursList.map((h) => (
                        <option key={h} value={h}>
                          {String(h).padStart(2, '0')} giờ
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-3 flex flex-col">
                    <label
                      htmlFor="scheduleStartMinute"
                      className="font-code-meta text-[10px] text-on-surface-variant"
                    >
                      Phút (0-59)
                    </label>
                    <select
                      id="scheduleStartMinute"
                      value={startSchedule.minute}
                      onChange={(e) =>
                        setStartSchedule({
                          ...startSchedule,
                          minute: Number(e.target.value),
                        })
                      }
                      className="px-2 py-1.5 rounded bg-surface-container-low font-code-meta text-xs font-bold text-on-surface"
                    >
                      {minutesList.map((m) => (
                        <option key={m} value={m}>
                          {String(m).padStart(2, '0')} phút
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-6 flex flex-col">
                    <label
                      htmlFor="scheduleStartDate"
                      className="font-code-meta text-[10px] text-on-surface-variant"
                    >
                      Ngày bắt đầu
                    </label>
                    <input
                      id="scheduleStartDate"
                      type="date"
                      value={startSchedule.date}
                      onChange={(e) =>
                        setStartSchedule({
                          ...startSchedule,
                          date: e.target.value,
                        })
                      }
                      className="px-2 py-1.5 rounded bg-surface-container-low font-code-meta text-xs font-bold text-on-surface"
                    />
                  </div>
                </div>
              </div>

              {/* End Time: Giờ, Phút, Ngày kết thúc */}
              <div className="p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-label-md text-xs text-secondary font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">
                      stop_circle
                    </span>
                    Thời Gian Kết Thúc Thi (Giờ : Phút - Ngày)
                  </span>
                </div>
                <div className="grid grid-cols-12 gap-1.5 items-center">
                  <div className="col-span-3 flex flex-col">
                    <label
                      htmlFor="scheduleEndHour"
                      className="font-code-meta text-[10px] text-on-surface-variant"
                    >
                      Giờ (0-23)
                    </label>
                    <select
                      id="scheduleEndHour"
                      value={endSchedule.hour}
                      onChange={(e) =>
                        setEndSchedule({
                          ...endSchedule,
                          hour: Number(e.target.value),
                        })
                      }
                      className="px-2 py-1.5 rounded bg-surface-container-low font-code-meta text-xs font-bold text-on-surface"
                    >
                      {hoursList.map((h) => (
                        <option key={h} value={h}>
                          {String(h).padStart(2, '0')} giờ
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-3 flex flex-col">
                    <label
                      htmlFor="scheduleEndMinute"
                      className="font-code-meta text-[10px] text-on-surface-variant"
                    >
                      Phút (0-59)
                    </label>
                    <select
                      id="scheduleEndMinute"
                      value={endSchedule.minute}
                      onChange={(e) =>
                        setEndSchedule({
                          ...endSchedule,
                          minute: Number(e.target.value),
                        })
                      }
                      className="px-2 py-1.5 rounded bg-surface-container-low font-code-meta text-xs font-bold text-on-surface"
                    >
                      {minutesList.map((m) => (
                        <option key={m} value={m}>
                          {String(m).padStart(2, '0')} phút
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-6 flex flex-col">
                    <label
                      htmlFor="scheduleEndDate"
                      className="font-code-meta text-[10px] text-on-surface-variant"
                    >
                      Ngày kết thúc
                    </label>
                    <input
                      id="scheduleEndDate"
                      type="date"
                      value={endSchedule.date}
                      onChange={(e) =>
                        setEndSchedule({
                          ...endSchedule,
                          date: e.target.value,
                        })
                      }
                      className="px-2 py-1.5 rounded bg-surface-container-low font-code-meta text-xs font-bold text-on-surface"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="font-code-meta text-xs text-on-surface">
                Khung giờ giao bài:{' '}
                <strong className="text-primary">
                  Từ {formatSchedulePartsDisplay(startSchedule)} đến{' '}
                  {formatSchedulePartsDisplay(endSchedule)}
                </strong>
              </div>

                <button
                  id="btnSaveExamToCloud"
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleDirectIngestAndAssignToFirebase(false)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary hover:bg-primary-container font-label-lg text-label-lg shadow-md cursor-pointer disabled:opacity-50 whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    send
                  </span>
                  <span>
                    {isSaving
                      ? 'Đang giao bài thi lên Cloud...'
                      : `Nạp Đề Trực Tiếp & Giao Bài Thi (${previewExam.code})`}
                  </span>
                </button>
              </div>
            </div>

          {/* Validation Error Banner */}
          {validationError && (
            <div
              role="alert"
              className="p-space-md rounded-xl bg-error-container text-on-error-container font-body-sm text-body-sm flex items-start gap-2"
            >
              <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5">
                error
              </span>
              <div className="flex flex-col">
                <strong className="font-bold">Thông báo kiểm tra dữ liệu:</strong>
                <span>{validationError}</span>
              </div>
            </div>
          )}

          {statusMessage && (
            <div className="p-2.5 rounded-lg bg-surface-container text-primary font-body-sm text-body-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">
                info
              </span>
              <span>{statusMessage}</span>
            </div>
          )}

          {savedNotice && (
            <div
              role="status"
              id="firebase-save-success-banner"
              className="p-3 rounded-lg bg-tertiary-container text-on-tertiary font-label-md text-label-md flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">
                check_circle
              </span>
              <span>{savedNotice}</span>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN (5 cols): Live Structure, Answer Key Matrix & Teacher's Assigned Exams Bank */}
        <div className="lg:col-span-5 flex flex-col gap-space-md">
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-md flex flex-col gap-space-md">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="font-code-meta text-code-meta text-secondary font-bold uppercase">
                  Kiểm Định Cấu Trúc Đề Thi Đang Soạn / Chuẩn Bị Giao
                </span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface mt-0.5">
                  {previewExam.title}
                </h3>
                <p className="font-code-meta text-code-meta text-on-surface-variant">
                  Mã đề: <strong>{previewExam.code}</strong> · Khối{' '}
                  <strong>{selectedGrade}</strong> · Môn:{' '}
                  <strong className="text-primary">{selectedSubject}</strong> (
                  {previewExam.durationMinutes} phút)
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg font-code-meta text-code-meta font-bold shrink-0 bg-tertiary-container text-on-tertiary-container">
                {previewExam.questions.length + 2} CÂU HỢP LỆ
              </span>
            </div>

            {/* Score Breakdown Summary */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-lg bg-surface-container-low">
                <span className="font-code-meta text-[11px] text-on-surface-variant block">
                  Trắc Nghiệm ({previewExam.questions.length} câu)
                </span>
                <span className="font-headline-sm text-primary font-bold tabular-nums">
                  {mcqPointsTotal.toFixed(1)}đ
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-surface-container-low">
                <span className="font-code-meta text-[11px] text-on-surface-variant block">
                  Điền Khuyết + Tự Luận
                </span>
                <span className="font-headline-sm text-secondary font-bold tabular-nums">
                  {(
                    previewExam.fillQuestion.points +
                    previewExam.shortQuestion.points
                  ).toFixed(1)}
                  đ
                </span>
              </div>
              <div
                className={`p-2.5 rounded-lg ${
                  Math.abs(totalPoints - 10) <= 0.05
                    ? 'bg-tertiary-container text-on-tertiary-container'
                    : 'bg-error-container text-on-error-container'
                }`}
              >
                <span className="font-code-meta text-[11px] block font-semibold">
                  Tổng Điểm Đề
                </span>
                <span className="font-headline-sm font-bold tabular-nums">
                  {totalPoints.toFixed(1)} / 10
                </span>
              </div>
            </div>

            {/* Interactive Answer Matrix */}
            <div className="p-space-md rounded-xl bg-surface-container-low">
              <div className="flex items-center justify-between mb-2">
                <span className="font-label-md text-label-md text-on-surface font-bold">
                  Ma Trận Đáp Án (Nhấn vào câu bất kỳ để sửa nhanh):
                </span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {previewExam.questions.map((q, idx) => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => {
                      setEditingQuestionIdx(idx);
                      setActiveTab('direct_edit');
                    }}
                    className={`p-1.5 rounded text-center border transition-all cursor-pointer ${
                      activeTab === 'direct_edit' && editingQuestionIdx === idx
                        ? 'bg-primary text-on-primary border-primary shadow-sm'
                        : 'bg-surface-container-lowest text-on-surface border-outline-variant/20 hover:border-primary'
                    }`}
                  >
                    <span className="font-code-meta text-[10px] opacity-80 block">
                      C{q.id} ({q.points}đ)
                    </span>
                    <span className="font-headline-sm text-sm font-bold">
                      {q.correctAnswer}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Saved Cloud Exams List Scoped by Teacher & Subject */}
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-md flex flex-col gap-space-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-headline-sm text-headline-sm text-primary">
                  Đề Thi Đã Giao Trên Cloud ({teacherScopedExams.length} đề)
                </h3>
                <span className="font-code-meta text-[11px] text-on-surface-variant">
                  {currentTeacher.subject === 'ALL'
                    ? 'Tất cả 11 môn học THCS'
                    : `Quản lý theo bộ môn: ${currentTeacher.subject} (${currentTeacher.fullName})`}
                </span>
              </div>
              <span className="font-code-meta text-code-meta text-on-tertiary-container font-semibold">
                Sửa &amp; Giao Bài
              </span>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {teacherScopedExams.map((ex) => {
                const isSelected = ex.id === previewExam.id;
                const exSubj = normalizeSubjectKey(ex.subjectCode || ex.subject);
                const schedCheck = checkExamScheduleStatus(ex);
                return (
                  <div
                    key={ex.id}
                    className={`p-2.5 rounded-lg flex flex-col gap-1.5 border transition-colors ${
                      isSelected
                        ? 'bg-primary-fixed/30 border-primary'
                        : 'bg-surface-container-low border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded bg-primary text-on-primary font-code-meta text-[11px] font-bold">
                            Khối {ex.grade}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-secondary text-on-secondary font-code-meta text-[11px] font-bold">
                            Môn {exSubj}
                          </span>
                          <span className="font-code-meta text-xs font-bold text-primary">
                            {ex.code}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded font-code-meta text-[10px] font-bold ${
                              schedCheck.status === 'open'
                                ? 'bg-tertiary-container text-on-tertiary-container'
                                : schedCheck.status === 'upcoming'
                                ? 'bg-secondary-fixed text-on-secondary-fixed'
                                : 'bg-error-container text-on-error-container'
                            }`}
                          >
                            {schedCheck.status === 'open'
                              ? 'Đang mở thi'
                              : schedCheck.status === 'upcoming'
                              ? 'Chưa tới giờ'
                              : 'Hết hạn'}
                          </span>
                        </div>
                        <p className="font-label-md text-xs text-on-surface truncate font-semibold mt-0.5">
                          {ex.title}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            updateWorkingExam(ex, true);
                            setEditingQuestionIdx(0);
                            setActiveTab('direct_edit');
                            setStatusMessage(
                              `Đã mở đề "${ex.code}" (Môn ${exSubj}) để sửa câu hỏi hoặc cập nhật lịch giao bài.`
                            );
                          }}
                          title="Sửa câu hỏi & thời gian giao đề"
                          className="px-2 py-1 rounded bg-surface-container-lowest text-primary hover:bg-primary hover:text-on-primary font-code-meta text-[11px] font-bold cursor-pointer flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            edit_calendar
                          </span>
                          <span>Sửa / Giao lại</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            updateWorkingExam(ex, true);
                            setCustomShuffleCode(`${ex.code}-101`);
                            setActiveTab('shuffle_bank');
                            setStatusMessage(
                              `Đã chọn đề "${ex.code}" để trộn tạo mã đề mới.`
                            );
                          }}
                          title="Trộn đề từ đề này"
                          className="px-2 py-1 rounded bg-surface-container-lowest text-secondary hover:bg-secondary hover:text-on-secondary font-code-meta text-[11px] font-bold cursor-pointer flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            shuffle
                          </span>
                          <span>Trộn</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteExamFromCloud(ex.id)}
                          title="Xóa đề khỏi hệ thống"
                          className="p-1 rounded bg-surface-container-lowest text-error hover:bg-error-container/40 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[15px]">
                            delete
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-code-meta text-on-surface-variant border-t border-outline-variant/20 pt-1 flex-wrap gap-1">
                      <span>
                        Lịch thi: {formatExamScheduleWindow(ex.startAt, ex.endAt)}
                      </span>
                      <span>
                        GV: {ex.teacherName || ex.createdBy || 'HĐ Khảo thí'}
                        {isSystemGeneratedDemoExam(ex) ? ' (Đề Demo Hệ Thống)' : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* EXAM INGESTION PROGRESS MODAL (CỬA SỔ TIẾN TRÌNH NẠP ĐỀ - CHẶN TƯƠNG TÁC NỀN & KHÔNG CẦN API KEY) */}
      {ingestionModalOpen && (
        <div
          id="exam-ingestion-progress-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Cửa sổ tiến trình nạp đề thi"
          className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto select-none"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="bg-surface-container-lowest rounded-2xl max-w-2xl w-full p-space-xl shadow-2xl border border-outline-variant/40 flex flex-col gap-space-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-outline-variant/20 pb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-md ${
                    ingestionError
                      ? 'bg-error text-on-error'
                      : ingestionPercent >= 100
                      ? 'bg-tertiary-container text-on-tertiary-container'
                      : 'bg-primary text-on-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[24px]">
                    {ingestionError
                      ? 'error'
                      : ingestionPercent >= 100
                      ? 'task_alt'
                      : 'sync'}
                  </span>
                </div>
                <div>
                  <span className="font-code-meta text-xs text-secondary font-bold uppercase">
                    Thuật Toán Tối Ưu Nhận Diện Quét OCR Cấu Trúc Đề &amp; Đáp Án Có Sẵn
                  </span>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">
                    {ingestionError
                      ? 'Nạp Đề Thi Thất Bại'
                      : ingestionPercent >= 100
                      ? 'Đã Quét Cấu Trúc Câu Hỏi & Đáp Án Thành Công!'
                      : 'Đang Quét OCR Cấu Trúc Loại Câu Hỏi & Đáp Án...'}
                  </h3>
                </div>
              </div>
              <span
                id="ingestionProgressPercentBadge"
                className={`px-3 py-1 rounded-full font-code-meta text-sm font-bold ${
                  ingestionError
                    ? 'bg-error-container text-error'
                    : 'bg-primary-fixed text-on-primary-fixed'
                }`}
              >
                {ingestionError ? 'LỖI' : `${ingestionPercent}%`}
              </span>
            </div>

            {/* Ingestion Error Alert */}
            {ingestionError ? (
              <div
                id="ingestionErrorMessageBanner"
                className="p-3.5 rounded-xl bg-error-container/30 border border-error/40 flex items-start gap-2.5 text-xs text-error"
              >
                <span className="material-symbols-outlined text-[20px] shrink-0 text-error">
                  error
                </span>
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-sm">Không thể nạp đề thi:</span>
                  <p className="font-body-sm text-xs text-on-surface">
                    {ingestionError}
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Progress Bar */}
                <div className="flex flex-col gap-2">
                  <div className="w-full h-3.5 rounded-full bg-surface-container-high overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300 rounded-full"
                      style={{ width: `${ingestionPercent}%` }}
                    />
                  </div>
                  <p className="font-code-meta text-xs text-primary font-semibold">
                    {ingestionStepText}
                  </p>
                </div>

                {/* 5 Step Checklist */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-surface-container-low p-3 rounded-xl text-xs">
                  {[
                    '1. Giải nén tài liệu & bảng biểu (.docx/.pdf/.txt)',
                    '2. Nhận diện cấu trúc Trắc nghiệm, Điền khuyết, Trả lời ngắn, Tự luận',
                    '3. Áp dụng đúng các loại câu hỏi thực tế có trong đề',
                    '4. Quét bảng Đáp án & Hướng dẫn chấm có sẵn trong đề nạp',
                    '5. Kiểm định thang điểm & đồng bộ ngân hàng đề',
                  ].map((stepLabel, idx) => {
                    const done = ingestionStepIndex > idx;
                    return (
                      <div
                        key={stepLabel}
                        className={`flex items-center gap-2 p-2 rounded-lg ${
                          done
                            ? 'bg-tertiary-container/30 text-on-surface font-semibold'
                            : 'text-on-surface-variant'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px] text-primary">
                          {done ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                        <span>{stepLabel}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Completed Exam Summary + 1-Click Purge All Demo Exams Button */}
            {!ingestionError && ingestionCompletedExam && (
              <div className="bg-surface-container p-space-md rounded-xl border border-outline-variant/30 flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-code-meta text-xs text-primary font-bold">
                      MÃ ĐỀ: {ingestionCompletedExam.code} • MÔN{' '}
                      {ingestionCompletedExam.subject} • KHỐI{' '}
                      {ingestionCompletedExam.grade}
                    </span>
                    <h4 className="font-label-lg text-sm font-bold text-on-surface">
                      {ingestionCompletedExam.title}
                    </h4>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-tertiary-container text-on-tertiary-container font-code-meta text-xs font-bold">
                    {[
                      ingestionCompletedExam.questions.length > 0
                        ? `${ingestionCompletedExam.questions.length} câu TN`
                        : '',
                      ingestionCompletedExam.fillQuestion.points > 0 &&
                      ingestionCompletedExam.fillQuestion.promptTemplate.trim()
                        ? `1 câu điền khuyết (${ingestionCompletedExam.fillQuestion.blanks.length} ô)`
                        : '',
                      ingestionCompletedExam.shortQuestion.points > 0 &&
                      ingestionCompletedExam.shortQuestion.prompt.trim()
                        ? '1 câu tự luận'
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' + ')}
                  </span>
                </div>

                {ingestionWarnings.length > 0 && (
                  <div className="text-[11px] font-code-meta text-on-surface-variant bg-surface-container-lowest p-2 rounded-lg">
                    Chi tiết quét: {ingestionWarnings.join(' • ')}
                  </div>
                )}

                {/* ONE-CLICK PURGE ALL SYSTEM DEMO EXAMS AFTER IMPORTING NEW DATA */}
                {onPurgeAllSystemDemoExams && systemDemoExamsCount > 0 && (
                  <div className="p-3 rounded-xl bg-error-container/25 border border-error/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex flex-col">
                      <span className="font-label-md text-xs font-bold text-error">
                        Quản lý sau khi nạp dữ liệu mới:
                      </span>
                      <span className="font-body-sm text-xs text-on-surface-variant">
                        Hệ thống hiện có <strong>{systemDemoExamsCount} đề sinh demo mặc định</strong>. Bạn có thể sửa hoặc xoá toàn bộ đề demo chỉ bằng 1 nút lệnh dưới đây.
                      </span>
                    </div>
                    <button
                      id="btnModalPurgeAllDemoExams"
                      type="button"
                      disabled={isPurgingDemo}
                      onClick={handleTriggerPurgeAllDemoExams}
                      className="px-3.5 py-2 rounded-xl bg-error text-on-error hover:bg-error/90 font-label-md text-xs font-bold cursor-pointer flex items-center gap-1.5 shrink-0 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        delete_sweep
                      </span>
                      <span>
                        Xoá Toàn Bộ Đề Hệ Thống Sinh Demo ({systemDemoExamsCount} đề)
                      </span>
                    </button>
                  </div>
                )}

                {purgeDemoSuccessMsg && (
                  <div
                    id="modalPurgeDemoSuccessBanner"
                    className="p-2.5 rounded-lg bg-tertiary-container text-on-tertiary-container font-code-meta text-xs font-bold flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      verified
                    </span>
                    <span>{purgeDemoSuccessMsg}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-outline-variant/20">
              {ingestionError ? (
                <button
                  type="button"
                  onClick={() => setIngestionModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-error text-on-error font-label-md text-xs font-bold cursor-pointer shadow-sm"
                >
                  Đóng &amp; Thử Lại
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIngestionModalOpen(false);
                      setActiveTab('direct_edit');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-surface-container-high text-on-surface hover:bg-surface-container-highest font-label-md text-xs font-bold cursor-pointer"
                  >
                    Mở Trình Sửa Chi Tiết
                  </button>
                  <button
                    id="btnConfirmCloseIngestionModal"
                    type="button"
                    onClick={() => setIngestionModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-primary text-on-primary hover:bg-primary-container font-label-md text-xs font-bold cursor-pointer shadow-sm"
                  >
                    Hoàn Tất &amp; Đóng
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
