import React, { useEffect, useRef, useState } from 'react';
import {
  countWords,
  ExamBankData,
  formatTimer,
  StudentRegistration,
} from '../utils/examLogic';

interface ExamRoomProps {
  exam: ExamBankData;
  registration: StudentRegistration;
  remainingSeconds: number;
  onUpdateRemainingSeconds: (nextSeconds: number) => void;
  selectedAnswers: Record<number, 'A' | 'B' | 'C' | 'D'>;
  onSelectAnswer: (qId: number, choice: 'A' | 'B' | 'C' | 'D') => void;
  fillBlanks: string[];
  onChangeFillBlank: (index: number, value: string) => void;
  shortAnswer: string;
  onChangeShortAnswer: (value: string) => void;
  tabViolations: number;
  onTabSwitchKickOut: (currentRemainingSeconds: number) => void;
  onSubmitExam: (remainingSeconds: number) => void;
}

export const ExamRoom: React.FC<ExamRoomProps> = ({
  exam,
  registration,
  remainingSeconds,
  onUpdateRemainingSeconds,
  selectedAnswers,
  onSelectAnswer,
  fillBlanks,
  onChangeFillBlank,
  shortAnswer,
  onChangeShortAnswer,
  tabViolations,
  onTabSwitchKickOut,
  onSubmitExam,
}) => {
  const [activeQuestion, setActiveQuestion] = useState<number>(1);
  const [flaggedQuestions, setFlaggedQuestions] = useState<number[]>([]);
  const [filterFlagsOnly, setFilterFlagsOnly] = useState<boolean>(false);
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [draftSavedNotice, setDraftSavedNotice] = useState<boolean>(false);
  const [reEntryBannerDismissed, setReEntryBannerDismissed] =
    useState<boolean>(false);

  const remainingRef = useRef<number>(remainingSeconds);
  remainingRef.current = remainingSeconds;

  const kickoutTriggeredRef = useRef<boolean>(false);

  // Live countdown timer preserving exact exam timestamp
  useEffect(() => {
    const timer = window.setInterval(() => {
      const next = Math.max(0, remainingRef.current - 1);
      remainingRef.current = next;
      onUpdateRemainingSeconds(next);
      if (next === 0) {
        window.clearInterval(timer);
        onSubmitExam(0);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Strict Tab-Switch / Blur Enforcement:
  // Switching tabs or leaving the browser window immediately closes the Online Exam Room,
  // saves the exact timestamp & answers, and deducts 0.5 points upon re-entry.
  useEffect(() => {
    const triggerKickout = () => {
      if (kickoutTriggeredRef.current) return;
      kickoutTriggeredRef.current = true;
      onTabSwitchKickOut(remainingRef.current);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerKickout();
      }
    };

    const handleWindowBlur = () => {
      // Trigger kickout when window loses focus to another tab/application
      if (document.hidden) {
        triggerKickout();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [onTabSwitchKickOut]);

  const toggleFlag = (qId: number) => {
    setFlaggedQuestions((prev) =>
      prev.includes(qId) ? prev.filter((id) => id !== qId) : [...prev, qId]
    );
  };

  const mcqList = exam.questions || [];
  const hasMcq = mcqList.length > 0;
  const hasFill =
    Boolean(exam.fillQuestion?.promptTemplate?.trim()) &&
    Number(exam.fillQuestion?.points) > 0;
  const hasShort =
    Boolean(exam.shortQuestion?.prompt?.trim()) &&
    Number(exam.shortQuestion?.points) > 0;

  const fillQuestionNumber = mcqList.length + 1;
  const shortQuestionNumber = mcqList.length + (hasFill ? 2 : 1);
  const totalQuestionsCount =
    mcqList.length + (hasFill ? 1 : 0) + (hasShort ? 1 : 0);

  const expectedBlankCount = Math.max(
    1,
    exam.fillQuestion?.blanks?.length || 1
  );
  const isFillCompleted =
    hasFill &&
    Array.from({ length: expectedBlankCount }).every(
      (_, idx) => (fillBlanks[idx] || '').trim().length > 0
    );
  const isShortCompleted = hasShort && shortAnswer.trim().length > 0;
  const mcqCompletedCount = mcqList.filter((q) =>
    Boolean(selectedAnswers[q.id])
  ).length;
  const totalCompletedCount =
    mcqCompletedCount + (isFillCompleted ? 1 : 0) + (isShortCompleted ? 1 : 0);

  const wordCount = countWords(shortAnswer);

  const initials = (registration.fullName || 'HS')
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(-2)
    .join('')
    .toUpperCase();

  const totalExamSeconds = (exam.durationMinutes || 45) * 60;
  const elapsedSeconds = Math.max(0, totalExamSeconds - remainingSeconds);

  const scrollToQuestion = (qId: number) => {
    setActiveQuestion(qId);
    const el = document.getElementById(`q${qId}-box`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleSaveDraft = () => {
    setDraftSavedNotice(true);
    window.setTimeout(() => setDraftSavedNotice(false), 2500);
  };

  const displayedMcqs = filterFlagsOnly
    ? mcqList.filter((q) => flaggedQuestions.includes(q.id))
    : mcqList;

  const showFillQ =
    hasFill &&
    (!filterFlagsOnly || flaggedQuestions.includes(fillQuestionNumber));
  const showShortQ =
    hasShort &&
    (!filterFlagsOnly || flaggedQuestions.includes(shortQuestionNumber));

  // Split fill template by [1], [2], ..., [N] to render interactive inline inputs
  const renderInteractiveFillQuestion = () => {
    const tpl = exam.fillQuestion.promptTemplate || '';
    const parts = tpl.split(/(\[\d+\])/g);
    return (
      <div className="font-body-lg text-body-lg text-on-surface leading-loose whitespace-pre-line">
        {parts.map((part, idx) => {
          const match = part.match(/^\[(\d+)\]$/);
          if (match) {
            const slotNum = Number(match[1]);
            const slotIdx = Math.max(0, slotNum - 1);
            return (
              <span key={idx} className="inline-block px-1 my-0.5">
                <input
                  aria-label={`Điền khuyết cụm từ ${slotNum}`}
                  className="w-44 px-space-sm py-1 rounded-lg bg-surface-container text-primary font-bold focus:outline-none focus:ring-2 focus:ring-secondary text-center"
                  placeholder={`(điền vị trí ${slotNum})`}
                  type="text"
                  value={fillBlanks[slotIdx] || ''}
                  onChange={(e) => onChangeFillBlank(slotIdx, e.target.value)}
                />
              </span>
            );
          }
          return <span key={idx}>{part}</span>;
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full">
      {/* MODAL XÁC NHẬN NỘP BÀI */}
      {showSubmitModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="submit-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/60 backdrop-blur-sm p-space-md"
          id="submit-confirm-modal"
        >
          <div className="bg-surface-container-lowest max-w-lg w-full p-space-xl rounded-xl shadow-2xl flex flex-col gap-space-md">
            <div className="w-12 h-12 rounded-full bg-primary-container text-on-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[28px]">
                assignment_turned_in
              </span>
            </div>
            <div>
              <h3
                id="submit-modal-title"
                className="font-headline-sm text-headline-sm text-on-surface"
              >
                Xác nhận nộp bài thi &amp; Lưu điểm Cloud?
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-xs">
                Bạn đã hoàn thành{' '}
                <strong className="text-primary font-bold">
                  {totalCompletedCount}/{totalQuestionsCount}
                </strong>{' '}
                câu hỏi. Sau khi nộp, hệ thống sẽ chấm tự động và lưu vào Bảng điểm Lớp{' '}
                <strong>{registration.studentClass}</strong>.
              </p>
            </div>
            <div className="bg-surface-container-low p-space-md rounded-lg flex flex-col gap-space-xs font-code-meta text-code-meta">
              <div className="flex justify-between text-on-surface-variant">
                <span>Số câu đã trả lời:</span>
                <span className="text-on-surface font-bold">
                  {totalCompletedCount} / {totalQuestionsCount}
                </span>
              </div>
              <div className="flex justify-between text-on-surface-variant">
                <span>Thời gian còn lại:</span>
                <span className="text-primary font-bold">
                  {Math.floor(remainingSeconds / 60)} phút{' '}
                  {remainingSeconds % 60} giây
                </span>
              </div>
              <div className="flex justify-between text-error font-bold">
                <span>Điểm phạt chuyển tab / vào thi lại ({tabViolations} lần):</span>
                <span>-{(tabViolations * 0.5).toFixed(1)} điểm</span>
              </div>
            </div>
            <div className="flex items-center justify-end gap-space-sm pt-space-xs">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="px-space-md py-space-sm bg-surface-container-high text-on-surface font-label-lg text-label-lg rounded-lg hover:bg-surface-variant transition-colors cursor-pointer"
                id="btn-cancel-submit"
              >
                Tiếp tục làm bài
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSubmitModal(false);
                  onSubmitExam(remainingSeconds);
                }}
                className="px-space-lg py-space-sm bg-primary text-on-primary font-label-lg text-label-lg rounded-lg shadow-md hover:bg-primary-container transition-all flex items-center gap-space-xs cursor-pointer"
                id="btn-confirm-submit"
              >
                <span className="material-symbols-outlined text-[18px]">
                  send
                </span>
                <span>Đồng ý nộp bài</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER PHÒNG THI PHỤ (SUB-HEADER EXAM CONTROLLER) */}
      <div className="w-full bg-surface-container-lowest shadow-sm px-gutter py-space-md sticky top-20 z-40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-space-md">
          {/* Thông tin thí sinh */}
          <div className="flex items-center gap-space-md w-full md:w-auto">
            <div className="w-12 h-12 rounded-xl bg-primary-fixed flex items-center justify-center text-on-primary-fixed font-headline-sm text-headline-sm shrink-0">
              {initials || 'HS'}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-space-xs flex-wrap">
                <span className="font-headline-sm text-headline-sm text-on-surface truncate">
                  {registration.fullName}
                </span>
                <span className="px-space-xs py-0.5 rounded-full bg-secondary-fixed font-code-meta text-code-meta text-on-secondary-fixed font-bold">
                  Môn thi: {registration.selectedSubject}
                </span>
              </div>
              <div className="flex items-center gap-space-sm text-on-surface-variant font-label-md text-label-md flex-wrap">
                <span>
                  Lớp:{' '}
                  <strong className="text-on-surface">
                    {registration.studentClass}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Khối:{' '}
                  <strong className="text-on-surface">
                    {registration.grade} (THCS)
                  </strong>
                </span>
                <span>•</span>
                <span className="text-secondary font-semibold truncate max-w-xs">
                  {exam.title} ({exam.code})
                </span>
              </div>
            </div>
          </div>

          {/* Đồng hồ đếm ngược (Tabular Timer) & Trạng thái an toàn */}
          <div className="flex items-center gap-space-md flex-wrap md:flex-nowrap justify-center">
            <div className="flex items-center gap-space-md bg-surface-container-low px-space-lg py-space-xs rounded-xl shadow-inner">
              <div className="flex flex-col items-end">
                <span className="font-code-meta text-code-meta text-on-surface-variant uppercase tracking-wider">
                  Thời gian còn lại
                </span>
                <span
                  className="font-code-timer text-code-timer text-primary leading-none"
                  id="exam-timer"
                >
                  {formatTimer(remainingSeconds)}
                </span>
              </div>
              <div className="h-8 w-px bg-outline-variant/40"></div>
              <div className="flex flex-col">
                <span className="font-code-meta text-code-meta text-on-surface-variant">
                  Tổng thời gian: {exam.durationMinutes} phút
                </span>
                <span className="font-label-md text-label-md text-on-tertiary-container flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-[14px]">
                    timer_3
                  </span>
                  Đã làm: {formatTimer(elapsedSeconds)}
                </span>
              </div>
            </div>

            {/* Bộ theo dõi chuyển tab / Đóng phòng thi */}
            <button
              type="button"
              id="btn-simulate-tab-switch"
              onClick={() => onTabSwitchKickOut(remainingRef.current)}
              title="Kiểm tra cơ chế tự động đóng phòng thi khi chuyển tab (-0.5đ/lần)"
              className="flex items-center gap-space-sm bg-error-container/50 hover:bg-error-container/80 transition-colors px-space-md py-space-sm rounded-xl text-on-error-container text-left cursor-pointer"
            >
              <span className="material-symbols-outlined text-error text-[24px] animate-pulse">
                tab_close
              </span>
              <div className="flex flex-col">
                <span className="font-label-md text-label-md font-bold text-error leading-tight">
                  Thi lại do rời tab: {tabViolations} lần (-
                  {(tabViolations * 0.5).toFixed(1)}đ)
                </span>
                <span className="font-code-meta text-code-meta text-on-surface-variant">
                  Chuyển tab = Đóng phòng ngay (-0.5đ)
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* THÔNG BÁO NẾU VỪA VÀO LẠI PHÒNG THI SAU KHI CHUYỂN TAB */}
      {tabViolations > 0 && !reEntryBannerDismissed && (
        <div className="max-w-7xl mx-auto w-full px-gutter pt-space-md">
          <div className="bg-error-container/70 text-on-error-container px-space-lg py-space-sm rounded-xl flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-body-sm text-body-sm">
              <span className="material-symbols-outlined text-error text-[20px]">
                gavel
              </span>
              <span>
                <strong>Đã mở lại phòng thi tại thời điểm bảo lưu!</strong> Bạn đã rời tab / vào lại phòng thi{' '}
                <strong>{tabViolations} lần</strong> (Khấu trừ kỷ luật:{' '}
                <strong>-{(tabViolations * 0.5).toFixed(1)} điểm</strong>). Nếu tiếp tục chuyển tab, phòng thi sẽ đóng ngay lập tức.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setReEntryBannerDismissed(true)}
              className="px-2.5 py-1 rounded bg-surface-container-lowest text-on-surface font-label-md text-label-md cursor-pointer shrink-0"
            >
              Đã rõ
            </button>
          </div>
        </div>
      )}

      {/* THÂN TRANG PHÒNG THI (2 CỘT CHUYÊN NGHIỆP: 70% / 30%) */}
      <div className="max-w-7xl mx-auto w-full px-gutter py-space-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
          {/* CỘT TRÁI (lg:col-span-8): NỘI DUNG ĐỀ THI */}
          <div className="lg:col-span-8 flex flex-col gap-space-xl">
            {/* THÔNG TIN PHẦN 1: TRẮC NGHIỆM KHÁCH QUAN */}
            {hasMcq && (
              <div className="bg-surface-container-low p-space-lg rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-space-md">
                  <div className="w-10 h-10 rounded-lg bg-primary-container text-on-primary flex items-center justify-center font-headline-sm text-headline-sm">
                    I
                  </div>
                  <div>
                    <h2 className="font-headline-sm text-headline-sm text-on-surface">
                      PHẦN 1: CÂU HỎI TRẮC NGHIỆM ({mcqList.length} CÂU)
                    </h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Chọn 01 phương án đúng nhất trong các đáp án A, B, C, D
                    </p>
                  </div>
                </div>
                <span className="font-code-meta text-code-meta bg-surface-container-high px-space-sm py-1 rounded text-primary font-bold">
                  {Math.max(
                    0,
                    10 -
                      (hasFill ? Number(exam.fillQuestion?.points) || 0 : 0) -
                      (hasShort ? Number(exam.shortQuestion?.points) || 0 : 0)
                  ).toFixed(1)}{' '}
                  ĐIỂM
                </span>
              </div>
            )}

            {/* DANH SÁCH CÂU TRẮC NGHIỆM */}
            {displayedMcqs.map((q) => {
              const selected = selectedAnswers[q.id];
              const isFlagged = flaggedQuestions.includes(q.id);
              const isFocused = activeQuestion === q.id;
              const qNumStr = q.id < 10 ? `0${q.id}` : `${q.id}`;

              return (
                <div
                  key={q.id}
                  id={`q${q.id}-box`}
                  onClick={() => setActiveQuestion(q.id)}
                  className={`bg-surface-container-lowest p-space-xl rounded-xl flex flex-col gap-space-lg scroll-mt-28 transition-all ${
                    isFocused
                      ? 'shadow-md ring-2 ring-primary'
                      : 'shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-space-md">
                    <div className="flex items-center gap-space-sm flex-wrap">
                      <span
                        className={`px-space-md py-space-xs rounded-lg font-label-lg text-label-lg ${
                          isFocused
                            ? 'bg-secondary text-on-secondary'
                            : 'bg-primary text-on-primary'
                        }`}
                      >
                        Câu {qNumStr}
                      </span>
                      <span className="font-code-meta text-code-meta text-on-surface-variant bg-surface-container-low px-space-sm py-0.5 rounded">
                        Môn: {q.subject}
                      </span>
                      {isFocused ? (
                        <span className="font-label-md text-label-md text-secondary bg-secondary-fixed px-space-sm py-0.5 rounded font-bold">
                          Đang làm
                        </span>
                      ) : selected ? (
                        <span className="font-label-md text-label-md text-on-tertiary-container bg-tertiary-container/10 px-space-sm py-0.5 rounded flex items-center gap-space-xs">
                          <span className="material-symbols-outlined text-[14px]">
                            check_circle
                          </span>{' '}
                          Đã lưu ({selected})
                        </span>
                      ) : (
                        <span className="font-label-md text-label-md text-outline bg-surface-container px-space-sm py-0.5 rounded">
                          Chưa chọn
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFlag(q.id);
                      }}
                      className={`flag-btn p-space-xs rounded transition-colors flex items-center gap-space-xs font-label-md text-label-md cursor-pointer ${
                        isFlagged
                          ? 'text-secondary font-bold'
                          : 'text-outline hover:text-secondary'
                      }`}
                    >
                      <span
                        className={`material-symbols-outlined text-[20px] ${
                          isFlagged ? 'material-symbols-filled' : ''
                        }`}
                      >
                        bookmark
                      </span>
                      <span>{isFlagged ? 'Đã gắn cờ' : 'Đánh dấu'}</span>
                    </button>
                  </div>

                  {/* Nội dung câu hỏi */}
                  <div className="font-body-lg text-body-lg text-on-surface leading-relaxed">
                    {q.prompt}
                  </div>

                  {/* Danh sách lựa chọn */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                    {q.options?.map((opt) => {
                      const isChecked = selected === opt.key;
                      return (
                        <label
                          key={opt.key}
                          className={`flex items-center gap-space-md p-space-md rounded-lg cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-secondary-fixed/40 ring-2 ring-secondary'
                              : 'bg-surface-container-low/50 hover:bg-surface-container-high/60'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q${q.id}`}
                            value={opt.key}
                            checked={isChecked}
                            onChange={() => {
                              setActiveQuestion(q.id);
                              onSelectAnswer(q.id, opt.key);
                            }}
                            className="w-5 h-5 text-secondary focus:ring-secondary accent-secondary cursor-pointer"
                          />
                          <span
                            className={`font-body-md text-body-md text-on-surface ${
                              isChecked ? 'font-bold' : 'font-medium'
                            }`}
                          >
                            {opt.text}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* THÔNG TIN PHẦN 2: ĐIỀN KHUYẾT & TỰ LUẬN TRẢ LỜI NGẮN */}
            {(hasFill || hasShort) && (
              <div className="bg-surface-container-low p-space-lg rounded-xl flex items-center justify-between mt-space-md">
                <div className="flex items-center gap-space-md">
                  <div className="w-10 h-10 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center font-headline-sm text-headline-sm">
                    {hasMcq ? 'II' : 'I'}
                  </div>
                  <div>
                    <h2 className="font-headline-sm text-headline-sm text-on-surface">
                      {hasFill && hasShort
                        ? 'PHẦN TỰ LUẬN: ĐIỀN KHUYẾT & TỰ LUẬN / TRẢ LỜI NGẮN'
                        : hasFill
                        ? 'PHẦN ĐIỀN KHUYẾT'
                        : 'PHẦN TỰ LUẬN / TRẢ LỜI NGẮN'}
                    </h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Thí sinh nhập trực tiếp nội dung vào trường tương ứng
                    </p>
                  </div>
                </div>
                <span className="font-code-meta text-code-meta bg-surface-container-high px-space-sm py-1 rounded text-secondary font-bold">
                  {(
                    (hasFill ? Number(exam.fillQuestion?.points) || 0 : 0) +
                    (hasShort ? Number(exam.shortQuestion?.points) || 0 : 0)
                  ).toFixed(1)}{' '}
                  ĐIỂM
                </span>
              </div>
            )}

            {/* CÂU ĐIỀN KHUYẾT */}
            {showFillQ && (
              <div
                id={`q${fillQuestionNumber}-box`}
                onClick={() => setActiveQuestion(fillQuestionNumber)}
                className={`bg-surface-container-lowest p-space-xl rounded-xl flex flex-col gap-space-lg scroll-mt-28 transition-all ${
                  activeQuestion === fillQuestionNumber
                    ? 'shadow-md ring-2 ring-primary'
                    : 'shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-space-md">
                  <div className="flex items-center gap-space-sm flex-wrap">
                    <span className="px-space-md py-space-xs rounded-lg bg-secondary text-on-secondary font-label-lg text-label-lg">
                      Câu {fillQuestionNumber}
                    </span>
                    <span className="font-code-meta text-code-meta text-on-surface-variant bg-surface-container-low px-space-sm py-0.5 rounded">
                      Điền Khuyết ({exam.fillQuestion.points.toFixed(1)} Điểm)
                    </span>
                    {isFillCompleted ? (
                      <span className="font-label-md text-label-md text-on-tertiary-container bg-tertiary-container/10 px-space-sm py-0.5 rounded flex items-center gap-space-xs">
                        <span className="material-symbols-outlined text-[14px]">
                          check_circle
                        </span>{' '}
                        Đã điền
                      </span>
                    ) : (
                      <span className="font-label-md text-label-md text-outline bg-surface-container px-space-sm py-0.5 rounded">
                        Chưa điền đủ
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFlag(fillQuestionNumber);
                    }}
                    className={`flag-btn p-space-xs rounded transition-colors flex items-center gap-space-xs font-label-md text-label-md cursor-pointer ${
                      flaggedQuestions.includes(fillQuestionNumber)
                        ? 'text-secondary font-bold'
                        : 'text-outline hover:text-secondary'
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-[20px] ${
                        flaggedQuestions.includes(fillQuestionNumber)
                          ? 'material-symbols-filled'
                          : ''
                      }`}
                    >
                      bookmark
                    </span>
                    <span>
                      {flaggedQuestions.includes(fillQuestionNumber)
                        ? 'Đã gắn cờ'
                        : 'Đánh dấu'}
                    </span>
                  </button>
                </div>

                <div className="font-body-sm text-body-sm text-on-surface-variant bg-surface-container-low p-space-md rounded-lg flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary text-[18px]">
                    info
                  </span>
                  <span>
                    Hướng dẫn: Gõ từ ngữ chính xác thích hợp nhất vào {expectedBlankCount} ô trống bên dưới.
                  </span>
                </div>

                {renderInteractiveFillQuestion()}
              </div>
            )}

            {/* CÂU TỰ LUẬN NGẮN */}
            {showShortQ && (
              <div
                id={`q${shortQuestionNumber}-box`}
                onClick={() => setActiveQuestion(shortQuestionNumber)}
                className={`bg-surface-container-lowest p-space-xl rounded-xl flex flex-col gap-space-lg scroll-mt-28 transition-all ${
                  activeQuestion === shortQuestionNumber
                    ? 'shadow-md ring-2 ring-primary'
                    : 'shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-space-md">
                  <div className="flex items-center gap-space-sm flex-wrap">
                    <span className="px-space-md py-space-xs rounded-lg bg-outline text-surface-container-lowest font-label-lg text-label-lg">
                      Câu {shortQuestionNumber}
                    </span>
                    <span className="font-code-meta text-code-meta text-on-surface-variant bg-surface-container-low px-space-sm py-0.5 rounded">
                      Trả Lời Ngắn ({exam.shortQuestion.points.toFixed(1)} Điểm)
                    </span>
                    {isShortCompleted ? (
                      <span className="font-label-md text-label-md text-on-tertiary-container bg-tertiary-container/10 px-space-sm py-0.5 rounded flex items-center gap-space-xs">
                        <span className="material-symbols-outlined text-[14px]">
                          check_circle
                        </span>{' '}
                        Đã nhập
                      </span>
                    ) : (
                      <span className="font-label-md text-label-md text-outline bg-surface-container px-space-sm py-0.5 rounded">
                        Chưa nhập
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFlag(shortQuestionNumber);
                    }}
                    className={`flag-btn p-space-xs rounded transition-colors flex items-center gap-space-xs font-label-md text-label-md cursor-pointer ${
                      flaggedQuestions.includes(shortQuestionNumber)
                        ? 'text-secondary font-bold'
                        : 'text-outline hover:text-secondary'
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-[20px] ${
                        flaggedQuestions.includes(shortQuestionNumber)
                          ? 'material-symbols-filled'
                          : ''
                      }`}
                    >
                      bookmark
                    </span>
                    <span>
                      {flaggedQuestions.includes(shortQuestionNumber)
                        ? 'Đã gắn cờ'
                        : 'Đánh dấu'}
                    </span>
                  </button>
                </div>

                <div className="font-body-lg text-body-lg text-on-surface leading-relaxed">
                  <strong>Bài toán suy luận:</strong> {exam.shortQuestion.prompt}
                  <br />
                  <span className="text-primary font-semibold">
                    Yêu cầu: {exam.shortQuestion.requirement}
                  </span>
                </div>

                <div className="flex flex-col gap-space-xs">
                  <div className="flex items-center justify-between text-on-surface-variant font-label-md text-label-md">
                    <label
                      className="font-bold text-on-surface"
                      htmlFor="short-answer"
                    >
                      Khung nhập câu trả lời của thí sinh:
                    </label>
                    <span
                      className={`font-code-meta text-code-meta ${
                        wordCount > 100
                          ? 'text-error font-bold'
                          : 'text-outline'
                      }`}
                      id="word-count"
                    >
                      {wordCount} / 100 từ
                    </span>
                  </div>
                  <textarea
                    className="w-full p-space-md rounded-xl bg-surface-container-low text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary font-body-md text-body-md"
                    id="short-answer"
                    maxLength={600}
                    placeholder="Gõ các bước tính toán và đáp số ngắn gọn vào đây (Tối đa 100 từ)..."
                    rows={4}
                    value={shortAnswer}
                    onChange={(e) => onChangeShortAnswer(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between pt-space-xs text-on-surface-variant font-code-meta text-code-meta flex-wrap gap-2">
                  <span>
                    {draftSavedNotice
                      ? 'Đã đồng bộ bản nháp lên phiên thi thành công!'
                      : 'Hệ thống tự động bảo lưu đáp án và thời điểm thi thời gian thực'}
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    className="px-space-md py-space-xs rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface font-label-md text-label-md transition-colors cursor-pointer"
                  >
                    Lưu bản nháp
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* CỘT PHẢI (lg:col-span-4): BẢNG ĐIỀU HƯỚNG CÂU HỎI (QUESTION MATRIX NAVIGATOR) */}
          <div className="lg:col-span-4 flex flex-col gap-space-lg sticky top-44">
            {/* THẺ MA TRẬN ĐIỀU HƯỚNG */}
            <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-md flex flex-col gap-space-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary text-[22px]">
                    grid_view
                  </span>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface">
                    Ma Trận Câu Hỏi
                  </h3>
                </div>
                <span className="font-code-meta text-code-meta px-space-sm py-0.5 rounded-full bg-surface-container font-semibold text-primary">
                  {totalCompletedCount}/{totalQuestionsCount} Hoàn thành
                </span>
              </div>

              {/* Chú giải trạng thái (Legend) */}
              <div className="grid grid-cols-3 gap-space-xs text-center py-space-xs font-label-md text-label-md bg-surface-container-low p-space-xs rounded-lg">
                <div className="flex items-center gap-1 justify-center">
                  <span className="w-3 h-3 rounded-full bg-primary shrink-0"></span>
                  <span className="text-on-surface-variant text-[11px]">
                    Đã làm ({totalCompletedCount})
                  </span>
                </div>
                <div className="flex items-center gap-1 justify-center">
                  <span className="w-3 h-3 rounded-full bg-secondary shrink-0"></span>
                  <span className="text-on-surface-variant text-[11px]">
                    Đang xem
                  </span>
                </div>
                <div className="flex items-center gap-1 justify-center">
                  <span className="w-3 h-3 rounded-full bg-outline-variant shrink-0"></span>
                  <span className="text-on-surface-variant text-[11px]">
                    Chưa làm ({totalQuestionsCount - totalCompletedCount})
                  </span>
                </div>
              </div>

              {/* Lưới nút câu hỏi trắc nghiệm */}
              {hasMcq && (
                <div className="flex flex-col gap-space-sm">
                  <span className="font-code-meta text-code-meta text-outline uppercase tracking-wider font-semibold">
                    Phần I: Trắc nghiệm (1 - {mcqList.length})
                  </span>
                  <div className="grid grid-cols-5 gap-space-sm">
                    {mcqList.map((q) => {
                      const isFocused = activeQuestion === q.id;
                      const isDone = Boolean(selectedAnswers[q.id]);
                      const isFlagged = flaggedQuestions.includes(q.id);
                      const label = q.id < 10 ? `0${q.id}` : `${q.id}`;

                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => scrollToQuestion(q.id)}
                          className={`h-11 rounded-lg font-headline-sm text-headline-sm flex items-center justify-center relative hover:scale-105 transition-transform shadow-sm cursor-pointer ${
                            isFocused
                              ? 'bg-secondary text-on-secondary ring-2 ring-primary'
                              : isDone
                              ? 'bg-primary text-on-primary'
                              : 'bg-surface-container-high text-on-surface-variant'
                          }`}
                        >
                          {label}
                          {isFlagged && (
                            <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-error rounded-full flex items-center justify-center">
                              <span className="material-symbols-outlined material-symbols-filled text-on-error text-[10px]">
                                flag
                              </span>
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Phần II: Điền Khuyết & Tự Luận */}
              {(hasFill || hasShort) && (
                <div className="flex flex-col gap-space-sm pt-space-xs">
                  <span className="font-code-meta text-code-meta text-outline uppercase tracking-wider font-semibold">
                    {hasFill && hasShort
                      ? 'Phần II: Điền Khuyết & Tự Luận'
                      : hasFill
                      ? 'Câu Điền Khuyết'
                      : 'Câu Tự Luận / Trả Lời Ngắn'}
                  </span>
                  <div className="grid grid-cols-2 gap-space-sm">
                    {hasFill && (
                      <button
                        type="button"
                        onClick={() => scrollToQuestion(fillQuestionNumber)}
                        className={`h-11 rounded-lg font-headline-sm text-headline-sm flex items-center justify-center gap-space-xs hover:scale-105 transition-transform shadow-sm cursor-pointer relative ${
                          activeQuestion === fillQuestionNumber
                            ? 'bg-secondary text-on-secondary ring-2 ring-primary'
                            : isFillCompleted
                            ? 'bg-primary text-on-primary'
                            : 'bg-surface-container-high text-on-surface-variant'
                        }`}
                      >
                        <span>{fillQuestionNumber}</span>
                        <span className="font-label-md text-label-md opacity-80 font-normal">
                          (Điền)
                        </span>
                      </button>
                    )}

                    {hasShort && (
                      <button
                        type="button"
                        onClick={() => scrollToQuestion(shortQuestionNumber)}
                        className={`h-11 rounded-lg font-headline-sm text-headline-sm flex items-center justify-center gap-space-xs hover:scale-105 transition-transform cursor-pointer relative ${
                          activeQuestion === shortQuestionNumber
                            ? 'bg-secondary text-on-secondary ring-2 ring-primary'
                            : isShortCompleted
                            ? 'bg-primary text-on-primary shadow-sm'
                            : 'bg-surface-container-high text-on-surface-variant'
                        }`}
                      >
                        <span>{shortQuestionNumber}</span>
                        <span className="font-label-md text-label-md opacity-80 font-normal">
                          (Tự luận)
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* NÚT LỌC CÂU GẮN CỜ */}
              <div className="pt-space-xs">
                <button
                  type="button"
                  onClick={() => setFilterFlagsOnly((prev) => !prev)}
                  className="w-full py-space-sm px-space-md rounded-lg bg-surface-container-low hover:bg-surface-container-high text-on-surface font-label-md text-label-md flex items-center justify-between transition-colors cursor-pointer"
                  id="btn-filter-flags"
                >
                  <span className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-error text-[18px]">
                      bookmark_flag
                    </span>
                    <span>
                      {filterFlagsOnly
                        ? 'Hiện lại tất cả câu hỏi'
                        : 'Chỉ lọc câu đang gắn cờ'}
                    </span>
                  </span>
                  <span className="font-code-meta text-code-meta bg-error/10 text-error px-2 py-0.5 rounded font-bold">
                    {flaggedQuestions.length} câu
                  </span>
                </button>
              </div>

              {/* KHU VỰC NỘP BÀI CHÍNH */}
              <div className="pt-space-md flex flex-col gap-space-sm">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(true)}
                  className="w-full py-space-md px-space-lg rounded-xl bg-gradient-to-r from-primary to-primary-container text-on-primary font-headline-sm text-headline-sm shadow-lg hover:shadow-xl hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-space-sm cursor-pointer"
                  id="btn-submit-exam"
                >
                  <span className="material-symbols-outlined text-[22px]">
                    task_alt
                  </span>
                  <span>NỘP BÀI THI NGAY</span>
                </button>
                <p className="text-center font-code-meta text-code-meta text-outline">
                  Chuyển tab sẽ tự động đóng phòng thi &amp; trừ 0.5 điểm/lần
                </p>
              </div>
            </div>

            {/* THẺ GIÁM SÁT TRỰC TUYẾN */}
            <div className="bg-surface-container-low p-space-md rounded-xl flex flex-col gap-space-sm">
              <div className="flex items-center justify-between">
                <span className="font-code-meta text-code-meta text-on-surface-variant font-bold uppercase flex items-center gap-space-xs">
                  <span className="w-2 h-2 rounded-full bg-error animate-ping"></span>
                  Giám Sát Chuyển Tab Trực Tiếp
                </span>
                <span className="font-code-meta text-code-meta text-primary font-semibold">
                  Mức phạt: -0.5đ / lần
                </span>
              </div>
              <div className="grid grid-cols-2 gap-space-xs font-code-meta text-code-meta">
                <div className="bg-surface-container-lowest p-space-xs rounded flex items-center gap-space-xs text-on-surface-variant">
                  <span className="material-symbols-outlined text-on-tertiary-container text-[16px]">
                    timer
                  </span>
                  <span>Bảo lưu giờ: Bật</span>
                </div>
                <div className="bg-surface-container-lowest p-space-xs rounded flex items-center gap-space-xs text-on-surface-variant">
                  <span className="material-symbols-outlined text-error text-[16px]">
                    tab_close
                  </span>
                  <span>Rời tab: Đóng phòng</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
