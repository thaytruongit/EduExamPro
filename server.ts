import express from 'express';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Unpacks `word/document.xml` from a binary .docx (PKZIP) Buffer using Node's built-in zlib
 * and extracts plain text paragraphs.
 */
function extractTextFromDocxBuffer(buf: Buffer): string | null {
  try {
    // Check PKZIP signature PK\x03\x04
    if (buf.length < 30 || buf.readUInt32LE(0) !== 0x04034b50) {
      return null;
    }
    // Locate Central Directory to get accurate compressed sizes even when data descriptors are used
    let eocdOffset = -1;
    for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
      if (buf.readUInt32LE(i) === 0x06054b50) {
        eocdOffset = i;
        break;
      }
    }
    if (eocdOffset === -1) return null;

    const cdEntries = buf.readUInt16LE(eocdOffset + 10);
    const cdOffset = buf.readUInt32LE(eocdOffset + 16);
    let ptr = cdOffset;

    for (let i = 0; i < cdEntries && ptr + 46 <= buf.length; i++) {
      if (buf.readUInt32LE(ptr) !== 0x02014b50) break;
      const compressionMethod = buf.readUInt16LE(ptr + 10);
      const compressedSize = buf.readUInt32LE(ptr + 20);
      const fileNameLen = buf.readUInt16LE(ptr + 28);
      const extraLen = buf.readUInt16LE(ptr + 30);
      const commentLen = buf.readUInt16LE(ptr + 32);
      const localHeaderOffset = buf.readUInt32LE(ptr + 42);
      const entryName = buf.toString('utf8', ptr + 46, ptr + 46 + fileNameLen);

      if (entryName === 'word/document.xml') {
        const localFileNameLen = buf.readUInt16LE(localHeaderOffset + 26);
        const localExtraLen = buf.readUInt16LE(localHeaderOffset + 28);
        const dataStart = localHeaderOffset + 30 + localFileNameLen + localExtraLen;
        const compressedSlice = buf.subarray(dataStart, dataStart + compressedSize);
        const xmlBuf =
          compressionMethod === 8
            ? zlib.inflateRawSync(compressedSlice)
            : compressedSlice;
        const xmlStr = xmlBuf.toString('utf8');
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
      }

      ptr += 46 + fileNameLen + extraLen + commentLen;
    }
    return null;
  } catch {
    return null;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '15mb' }));

  app.post('/api/parse-exam', async (req, res) => {
    try {
      const {
        rawText = '',
        fileBase64,
        mimeType = '',
        defaultGrade = 9,
      } = req.body || {};

      let extractedText = typeof rawText === 'string' ? rawText.trim() : '';

      // If a binary .docx or .pdf was uploaded in base64, unpack text first
      if (fileBase64 && typeof fileBase64 === 'string') {
        const buf = Buffer.from(fileBase64, 'base64');
        const docxText = extractTextFromDocxBuffer(buf);
        if (docxText && docxText.trim()) {
          extractedText = docxText.trim();
        } else if (!extractedText) {
          extractedText = buf.toString('utf8').trim();
        }
      }

      if (!extractedText && !fileBase64) {
        res.status(400).json({ error: 'Vui lòng cung cấp tệp DOCX, PDF hoặc nội dung đề thi để phân tích.' });
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
        res.status(200).json({
          usedFallback: true,
          extractedText,
          message: 'Đã giải nén nội dung DOCX/PDF và sử dụng bộ phân tích chuẩn Bộ GD&ĐT.',
        });
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      const parts: Array<Record<string, unknown>> = [];
      if (
        fileBase64 &&
        typeof fileBase64 === 'string' &&
        mimeType.includes('pdf')
      ) {
        parts.push({
          inlineData: {
            mimeType: 'application/pdf',
            data: fileBase64,
          },
        });
      }
      parts.push({
        text: `Bạn là chuyên gia khảo thí THCS Bộ GD&ĐT. Hãy phân tích và bóc tách nội dung đề thi từ tài liệu DOCX/PDF dưới đây thành cấu trúc đề thi chuẩn gồm thông tin đề, danh sách câu hỏi trắc nghiệm khách quan (4 phương án A, B, C, D), 1 câu điền khuyết (3 vị trí trống) và 1 câu tự luận trả lời ngắn.\n\nNội dung đề:\n${extractedText}`,
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: parts,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              code: { type: Type.STRING, description: 'Mã đề thi, VD: KHTN-9-01' },
              title: { type: Type.STRING, description: 'Tiêu đề đề thi' },
              subject: { type: Type.STRING, description: 'Môn học, VD: Toán & KHTN' },
              grade: { type: Type.NUMBER, description: 'Khối lớp từ 6 đến 9' },
              durationMinutes: { type: Type.NUMBER, description: 'Thời gian làm bài (phút)' },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.NUMBER },
                    subject: { type: Type.STRING },
                    points: { type: Type.NUMBER },
                    prompt: { type: Type.STRING },
                    codeFormula: { type: Type.STRING },
                    optionA: { type: Type.STRING },
                    optionB: { type: Type.STRING },
                    optionC: { type: Type.STRING },
                    optionD: { type: Type.STRING },
                    correctAnswer: { type: Type.STRING, description: 'A, B, C, hoặc D' },
                    explanation: { type: Type.STRING },
                  },
                  required: ['id', 'subject', 'prompt', 'optionA', 'optionB', 'optionC', 'optionD', 'correctAnswer'],
                },
              },
              fillQuestion: {
                type: Type.OBJECT,
                properties: {
                  promptTemplate: {
                    type: Type.STRING,
                    description: 'Đoạn văn có chứa [1], [2], [3] đại diện cho 3 ô trống',
                  },
                  blanks: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Đáp án chuẩn cho 3 ô trống',
                  },
                  points: { type: Type.NUMBER },
                },
                required: ['promptTemplate', 'blanks', 'points'],
              },
              shortQuestion: {
                type: Type.OBJECT,
                properties: {
                  prompt: { type: Type.STRING },
                  requirement: { type: Type.STRING },
                  keywords: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  sampleAnswer: { type: Type.STRING },
                  points: { type: Type.NUMBER },
                },
                required: ['prompt', 'requirement', 'keywords', 'sampleAnswer', 'points'],
              },
            },
            required: ['code', 'title', 'subject', 'grade', 'durationMinutes', 'questions'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      res.json({
        usedFallback: false,
        exam: {
          ...parsed,
          grade: [6, 7, 8, 9].includes(Number(parsed.grade)) ? Number(parsed.grade) : defaultGrade,
        },
      });
    } catch (err) {
      console.error('AI parse-exam fallback:', err);
      res.status(200).json({
        usedFallback: true,
        message: 'Đã chuyển sang bộ phân tích mẫu chuẩn định dạng THCS.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
