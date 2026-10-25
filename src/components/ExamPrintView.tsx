import React, { useState } from 'react';
import { ExamBankData } from '../utils/examLogic';

interface ExamPrintViewProps {
  exam: ExamBankData;
  onClose?: () => void;
  inline?: boolean;
}

export const ExamPrintView: React.FC<ExamPrintViewProps> = ({
  exam,
  onClose,
  inline = false,
}) => {
  const [showAnswerKey, setShowAnswerKey] = useState<boolean>(true);

  const handlePrint = () => {
    window.print();
  };

  const renderFillPassageForPrint = (template: string) => {
    return template
      .replace(/\[1\]/g, ' (1) .............................. ')
      .replace(/\[2\]/g, ' (2) .............................. ')
      .replace(/\[3\]/g, ' (3) .............................. ');
  };

  const mcqTotalPoints = Number(
    (10 - (exam.fillQuestion?.points || 2) - (exam.shortQuestion?.points || 3)).toFixed(1)
  );
  const perMcqPoints = Number(
    (mcqTotalPoints / Math.max(1, exam.questions.length)).toFixed(2)
  );

  const paperContent = (
    <div className="bg-white text-slate-900 rounded-xl shadow-lg border border-slate-300 p-6 sm:p-10 font-body-md leading-relaxed print:shadow-none print:border-none print:p-0">
      {/* Top Toolbar (Hidden when printing) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-5 mb-6 border-b border-slate-200 print:hidden">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[24px]">
            print
          </span>
          <div>
            <h3 className="font-headline-sm text-headline-sm text-primary">
              Bản Xem Trước Đề Thi Tổng Thể (Print View Chuẩn A4)
            </h3>
            <p className="font-code-meta text-code-meta text-on-surface-variant">
              Mã đề: {exam.code} • Khối {exam.grade} • {exam.questions.length + 2} câu hỏi ({exam.durationMinutes} phút)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowAnswerKey((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-label-md text-label-md transition-colors cursor-pointer ${
              showAnswerKey
                ? 'bg-tertiary-container text-on-tertiary-container font-bold'
                : 'bg-surface-container text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {showAnswerKey ? 'visibility' : 'visibility_off'}
            </span>
            <span>
              {showAnswerKey ? 'Đang hiện Đáp án & Barem' : 'Ẩn Đáp án (Bản in Học sinh)'}
            </span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-label-md text-label-md shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">
              print
            </span>
            <span>In Đề Thi (A4)</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg bg-surface-container-high text-on-surface hover:bg-surface-variant font-label-md text-label-md cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">
                close
              </span>
              <span>Đóng</span>
            </button>
          )}
        </div>
      </div>

      {/* Official Academic Exam Paper Header */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pb-4 border-b-2 border-slate-800 text-slate-900">
        <div className="sm:col-span-5 text-center flex flex-col items-center justify-center">
          <p className="text-xs font-bold uppercase tracking-wide">
            PHÒNG GIÁO DỤC VÀ ĐÀO TẠO THCS
          </p>
          <p className="text-sm font-extrabold uppercase tracking-wide underline underline-offset-4">
            HỘI ĐỒNG KHẢO THÍ EDUEXAM PRO
          </p>
          <span className="mt-2 inline-block px-3 py-0.5 border border-slate-800 text-xs font-bold uppercase">
            ĐỀ CHÍNH THỨC
          </span>
        </div>

        <div className="sm:col-span-7 text-center flex flex-col items-center justify-center">
          <p className="text-sm font-extrabold uppercase tracking-wide">
            {exam.title.toUpperCase()}
          </p>
          <p className="text-xs font-bold uppercase mt-0.5">
            Môn thi: {exam.subject} — Khối lớp: {exam.grade} THCS
          </p>
          <p className="text-xs italic mt-0.5">
            Thời gian làm bài: {exam.durationMinutes} phút (không kể thời gian phát đề)
          </p>
          <div className="mt-1.5 px-3 py-0.5 bg-slate-100 border border-slate-800 font-code-meta text-xs font-bold">
            MÃ ĐỀ THI: {exam.code}
          </div>
        </div>
      </div>

      {/* Student Identification Box */}
      <div className="my-4 p-3 border border-slate-400 rounded grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs text-slate-800 bg-slate-50/50">
        <div className="sm:col-span-6">
          <strong>Họ và tên thí sinh:</strong> ........................................................................
        </div>
        <div className="sm:col-span-3">
          <strong>Lớp:</strong> .........................
        </div>
        <div className="sm:col-span-3">
          <strong>Số báo danh:</strong> ....................
        </div>
      </div>

      {/* PART I: MULTIPLE CHOICE QUESTIONS */}
      <div className="mt-6">
        <div className="flex items-baseline justify-between border-b border-slate-400 pb-1.5 mb-4">
          <h4 className="text-sm font-extrabold uppercase tracking-wide text-slate-900">
            PHẦN I. TRẮC NGHIỆM KHÁCH QUAN ({mcqTotalPoints} ĐIỂM — {exam.questions.length} CÂU)
          </h4>
          <span className="text-xs italic text-slate-700">
            Thí sinh chọn 01 phương án đúng nhất A, B, C hoặc D (Mỗi câu đúng được {perMcqPoints} điểm)
          </span>
        </div>

        <div className="space-y-4">
          {exam.questions.map((q, idx) => {
            const qNumber = idx + 1;
            return (
              <div
                key={q.id || qNumber}
                className="pb-3 border-b border-dashed border-slate-200 last:border-none"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-slate-900 leading-relaxed">
                    <strong className="font-bold">
                      Câu {qNumber < 10 ? `0${qNumber}` : qNumber}
                    </strong>{' '}
                    <span className="text-xs font-code-meta text-slate-600">
                      [{q.subject}]
                    </span>
                    : {q.prompt}
                  </p>
                  {showAnswerKey && (
                    <span className="shrink-0 px-2 py-0.5 rounded bg-emerald-100 border border-emerald-600 text-emerald-900 font-code-meta text-xs font-bold">
                      ĐA: {q.correctAnswer}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-2 pl-2">
                  {q.options?.map((opt) => {
                    const isCorrect = showAnswerKey && opt.key === q.correctAnswer;
                    return (
                      <div
                        key={opt.key}
                        className={`text-xs sm:text-sm px-2.5 py-1.5 rounded border ${
                          isCorrect
                            ? 'bg-emerald-50 border-emerald-600 font-bold text-emerald-950'
                            : 'border-transparent text-slate-800'
                        }`}
                      >
                        {opt.text.startsWith(`${opt.key}.`)
                          ? opt.text
                          : `${opt.key}. ${opt.text}`}
                      </div>
                    );
                  })}
                </div>

                {showAnswerKey && q.explanation && (
                  <p className="mt-1.5 pl-2 text-xs italic text-slate-600">
                    ↳ <strong>Giải thích:</strong> {q.explanation}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* PART II: FILL IN THE BLANK & SHORT ANSWER */}
      <div className="mt-8">
        <div className="flex items-baseline justify-between border-b border-slate-400 pb-1.5 mb-4">
          <h4 className="text-sm font-extrabold uppercase tracking-wide text-slate-900">
            PHẦN II. ĐIỀN KHUYẾT &amp; TỰ LUẬN TRẢ LỜI NGẮN (
            {Number(((exam.fillQuestion?.points || 2) + (exam.shortQuestion?.points || 3)).toFixed(1))} ĐIỂM)
          </h4>
          <span className="text-xs italic text-slate-700">
            Thí sinh điền từ khóa chính xác và trình bày các bước suy luận ngắn gọn
          </span>
        </div>

        {/* Question 11: Fill in the blank */}
        <div className="mb-6 pb-4 border-b border-dashed border-slate-200">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-sm font-bold text-slate-900">
              Câu {exam.questions.length + 1} (Điền khuyết —{' '}
              {(exam.fillQuestion?.points || 2.0).toFixed(1)} điểm):
            </p>
            <span className="text-xs font-code-meta text-slate-600">
              Hoàn thành các vị trí trống (1), (2), (3)
            </span>
          </div>
          <p className="text-sm text-slate-900 leading-loose bg-slate-50 p-3.5 rounded border border-slate-300">
            {renderFillPassageForPrint(exam.fillQuestion.promptTemplate)}
          </p>

          {showAnswerKey ? (
            <div className="mt-2 p-2.5 rounded bg-emerald-50 border border-emerald-500 text-xs text-emerald-950 flex flex-wrap gap-4">
              <strong>Đáp án chuẩn điền khuyết:</strong>
              <span>
                (1) <u>{exam.fillQuestion.blanks[0]}</u>
              </span>
              <span>
                (2) <u>{exam.fillQuestion.blanks[1]}</u>
              </span>
              <span>
                (3) <u>{exam.fillQuestion.blanks[2]}</u>
              </span>
            </div>
          ) : (
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-700">
              <div>Trả lời (1): ................................................</div>
              <div>Trả lời (2): ................................................</div>
              <div>Trả lời (3): ................................................</div>
            </div>
          )}
        </div>

        {/* Question 12: Short Answer */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-sm font-bold text-slate-900">
              Câu {exam.questions.length + 2} (Tự luận trả lời ngắn —{' '}
              {(exam.shortQuestion?.points || 3.0).toFixed(1)} điểm):
            </p>
            <span className="text-xs font-code-meta text-slate-600">
              Tối đa 100 từ
            </span>
          </div>
          <p className="text-sm text-slate-900 leading-relaxed">
            {exam.shortQuestion.prompt}
          </p>
          <p className="text-sm font-semibold text-slate-900 mt-1">
            Yêu cầu: {exam.shortQuestion.requirement}
          </p>

          {showAnswerKey ? (
            <div className="mt-2.5 p-3 rounded bg-emerald-50 border border-emerald-500 text-xs text-emerald-950 space-y-1">
              <div>
                <strong>Từ khóa chấm tự động (NLP):</strong>{' '}
                {exam.shortQuestion.keywords.map((kw, i) => (
                  <span
                    key={i}
                    className="inline-block px-2 py-0.5 mr-1.5 rounded bg-white border border-emerald-400 font-code-meta font-bold"
                  >
                    {kw}
                  </span>
                ))}
              </div>
              <div>
                <strong>Hướng dẫn giải &amp; Đáp án mẫu:</strong>{' '}
                {exam.shortQuestion.sampleAnswer}
              </div>
            </div>
          ) : (
            <div className="mt-3 space-y-3 text-xs text-slate-400">
              <div className="border-b border-dotted border-slate-400 h-5"></div>
              <div className="border-b border-dotted border-slate-400 h-5"></div>
              <div className="border-b border-dotted border-slate-400 h-5"></div>
            </div>
          )}
        </div>
      </div>

      {/* Summary Answer Key Matrix Table when showAnswerKey is enabled */}
      {showAnswerKey && (
        <div className="mt-6 pt-4 border-t-2 border-slate-800">
          <h5 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 mb-2">
            BẢNG ĐÁP ÁN TỔNG HỢP PHẦN TRẮC NGHIỆM (MÃ ĐỀ: {exam.code})
          </h5>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 text-center font-mono text-xs">
            {exam.questions.map((q, idx) => (
              <div
                key={q.id || idx}
                className="border border-slate-400 rounded overflow-hidden"
              >
                <div className="bg-slate-200 py-0.5 font-bold text-slate-800">
                  C{idx + 1}
                </div>
                <div className="py-1 font-extrabold text-emerald-800 bg-white">
                  {q.correctAnswer}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Official Exam Footer */}
      <div className="mt-6 pt-3 border-t border-slate-300 text-center text-xs text-slate-600">
        <p className="font-bold uppercase tracking-widest text-slate-800">
          --- HẾT ---
        </p>
        <p className="italic mt-0.5">
          (Thí sinh không được sử dụng tài liệu. Hệ thống giám sát trực tuyến tự động đóng phòng thi và trừ 0.5 điểm/lần nếu chuyển tab)
        </p>
      </div>
    </div>
  );

  if (inline) {
    return paperContent;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bản in đề thi tổng thể"
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/70 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto"
    >
      <div className="max-w-5xl w-full max-h-[92vh] overflow-y-auto rounded-xl">
        {paperContent}
      </div>
    </div>
  );
};
