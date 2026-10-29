import { createClient, type Client } from '@libsql/client/web';
import {
  DEFAULT_CLASSROOMS,
  DEFAULT_STUDENT_ACCOUNTS,
  DEFAULT_TEACHER_ACCOUNTS,
  ExamBankData,
  StudentRecord,
} from './examLogic';

const TURSO_CLOUD_URL =
  'libsql://eduexam-db-thaytruongit.aws-ap-southeast-1.turso.io';
const TURSO_CLOUD_TOKEN =
  'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTMyNTg0NzQsImlkIjoiMDFhMTg2ODYtOWUwMS03NjU0LThjMDMtMDNmZTRiMzc3M2Q1Iiwia2lkIjoiRk96Rm5ZamtjNDRRZDhpUDhCZXhmZUlxVFB0TXNjYm1KOWtsT1dnc0YyRSIsInJpZCI6ImE4Yjk4MWRlLTBmNWUtNGI1MS1hNDE1LWViZjkyODYzODk4YSJ9.rlaN8HLRdDUsU1ww94JK5yJ9MPP4KKf6qd0e3Uii9Q6Gt49uHhXOJfUvxfaJpVdYmjoccm-P_DzHjQJjAL4pDA';

let webTursoClient: Client | null = null;
let webTursoInitPromise: Promise<void> | null = null;

function getWebTursoClient(): Client {
  if (!webTursoClient) {
    let url = TURSO_CLOUD_URL;
    if (url.startsWith('libsql://')) {
      url = url.replace('libsql://', 'https://');
    }
    webTursoClient = createClient({
      url,
      authToken: TURSO_CLOUD_TOKEN,
    });
  }
  return webTursoClient;
}

async function ensureWebTursoInitialized(): Promise<Client> {
  const db = getWebTursoClient();
  if (!webTursoInitPromise) {
    webTursoInitPromise = (async () => {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS admin_config (
          key TEXT PRIMARY KEY,
          value_json TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
      await db.execute(`
        CREATE TABLE IF NOT EXISTS exams (
          id TEXT PRIMARY KEY,
          code TEXT,
          title TEXT,
          subject TEXT,
          subjectCode TEXT,
          grade INTEGER,
          durationMinutes INTEGER,
          questionsJson TEXT,
          fillQuestionJson TEXT,
          shortQuestionJson TEXT,
          assignedClassesJson TEXT,
          createdAt TEXT,
          createdBy TEXT,
          teacherId TEXT,
          teacherUsername TEXT,
          teacherName TEXT,
          isActive INTEGER,
          isAssigned INTEGER,
          startAt TEXT,
          endAt TEXT
        );
      `);
      await db.execute(`
        CREATE TABLE IF NOT EXISTS submissions (
          id TEXT PRIMARY KEY,
          sbd TEXT,
          studentUsername TEXT,
          dateOfBirth TEXT,
          name TEXT,
          grade INTEGER,
          className TEXT,
          subject TEXT,
          examId TEXT,
          examTitle TEXT,
          teacherId TEXT,
          teacherName TEXT,
          duration TEXT,
          durationSeconds INTEGER,
          tabLeaves INTEGER,
          warningText TEXT,
          warningType TEXT,
          rawScore REAL,
          penaltyText TEXT,
          finalScore REAL,
          rank TEXT,
          status TEXT,
          submittedAt TEXT,
          answersJson TEXT,
          shortAnswerScore REAL,
          shortAnswerFeedback TEXT
        );
      `);

      const checkInit = await db.execute({
        sql: 'SELECT value_json FROM admin_config WHERE key = ?',
        args: ['clean_init_v3'],
      });

      if (checkInit.rows.length === 0) {
        const nowIso = new Date().toISOString();
        const seedEntries: Array<[string, unknown]> = [
          ['security', { passcode: '123' }],
          ['teachers', DEFAULT_TEACHER_ACCOUNTS],
          ['classrooms', DEFAULT_CLASSROOMS],
          ['studentAccounts', DEFAULT_STUDENT_ACCOUNTS],
          ['examBankSettings', { purgedDemoExams: true, deletedDemoExamIds: [] }],
          ['clean_init_v3', { initialized: true, updatedAt: nowIso }],
        ];
        for (const [k, val] of seedEntries) {
          await db.execute({
            sql: `
              INSERT INTO admin_config (key, value_json, updated_at)
              VALUES (?, ?, ?)
              ON CONFLICT(key) DO NOTHING
            `,
            args: [k, JSON.stringify(val), nowIso],
          });
        }
      }
    })().catch((err) => {
      webTursoInitPromise = null;
      throw err;
    });
  }
  await webTursoInitPromise;
  return db;
}

function isJsonResponse(res: Response): boolean {
  const ct = res.headers.get('content-type') || '';
  return res.ok && ct.includes('application/json');
}

export interface TursoDbStatus {
  status: string;
  dbType: string;
  url: string;
  isCloud: boolean;
  stats?: {
    examCount: number;
  };
}

export async function fetchTursoStatus(): Promise<TursoDbStatus | null> {
  try {
    const res = await fetch('/api/turso/status');
    if (isJsonResponse(res)) {
      return await res.json();
    }
  } catch {}

  try {
    const db = await ensureWebTursoInitialized();
    const result = await db.execute('SELECT COUNT(*) as exam_count FROM exams');
    return {
      status: 'connected',
      dbType: 'Turso Cloud Database (eduexam-db-thaytruongit • Trực tiếp từ Web/GitHub)',
      url: TURSO_CLOUD_URL,
      isCloud: true,
      stats: {
        examCount: Number(result.rows[0]?.exam_count || 0),
      },
    };
  } catch (e) {
    console.warn('Failed to fetch Turso status:', e);
  }
  return null;
}

export async function connectTursoCloud(
  url: string,
  authToken: string
): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/turso/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, authToken }),
    });
    if (isJsonResponse(res)) {
      return await res.json();
    }
  } catch {}

  try {
    let targetUrl = url || TURSO_CLOUD_URL;
    if (targetUrl.startsWith('libsql://')) {
      targetUrl = targetUrl.replace('libsql://', 'https://');
    }
    webTursoClient = createClient({
      url: targetUrl,
      authToken: authToken || TURSO_CLOUD_TOKEN,
    });
    webTursoInitPromise = null;
    await ensureWebTursoInitialized();
    return {
      success: true,
      message: 'Đã kết nối trực tiếp tới Turso Cloud Database.',
    };
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : 'Lỗi kết nối tới Turso Cloud',
    };
  }
}

export async function getTursoConfig<T>(key: string): Promise<T | null> {
  try {
    const res = await fetch(`/api/turso/config/${key}`);
    if (isJsonResponse(res)) {
      const data = await res.json();
      return data.data as T;
    }
  } catch {}

  try {
    const db = await ensureWebTursoInitialized();
    const result = await db.execute({
      sql: 'SELECT value_json FROM admin_config WHERE key = ?',
      args: [key],
    });
    if (result.rows.length > 0 && result.rows[0].value_json) {
      return JSON.parse(String(result.rows[0].value_json)) as T;
    }
  } catch (e) {
    console.warn(`Failed to fetch Turso config [${key}]:`, e);
  }
  return null;
}

export async function setTursoConfig<T>(key: string, data: T): Promise<boolean> {
  try {
    const res = await fetch(`/api/turso/config/${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });
    if (isJsonResponse(res)) {
      return true;
    }
  } catch {}

  try {
    const db = await ensureWebTursoInitialized();
    const updatedAt = new Date().toISOString();
    await db.execute({
      sql: `
        INSERT INTO admin_config (key, value_json, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value_json = excluded.value_json,
          updated_at = excluded.updated_at
      `,
      args: [key, JSON.stringify(data), updatedAt],
    });
    return true;
  } catch (e) {
    console.warn(`Failed to set Turso config [${key}]:`, e);
    return false;
  }
}

export async function getTursoExams(): Promise<ExamBankData[]> {
  try {
    const res = await fetch('/api/turso/exams');
    if (isJsonResponse(res)) {
      const data = await res.json();
      return data.exams || [];
    }
  } catch {}

  try {
    const db = await ensureWebTursoInitialized();
    const result = await db.execute('SELECT * FROM exams ORDER BY createdAt DESC');
    return result.rows.map((row) => {
      let questions = [];
      let fillQuestion = undefined;
      let shortQuestion = undefined;
      let assignedClasses: string[] = [];

      try {
        if (row.questionsJson) questions = JSON.parse(String(row.questionsJson));
      } catch {}
      try {
        if (row.fillQuestionJson) {
          fillQuestion = JSON.parse(String(row.fillQuestionJson)) || undefined;
        }
      } catch {}
      try {
        if (row.shortQuestionJson) {
          shortQuestion = JSON.parse(String(row.shortQuestionJson)) || undefined;
        }
      } catch {}
      try {
        if (row.assignedClassesJson) {
          assignedClasses = JSON.parse(String(row.assignedClassesJson));
        }
      } catch {}

      return {
        id: String(row.id),
        code: String(row.code || ''),
        title: String(row.title || ''),
        subject: String(row.subject || ''),
        subjectCode: String(row.subjectCode || row.subject || '') as ExamBankData['subjectCode'],
        grade: Number(row.grade) || 9,
        durationMinutes: Number(row.durationMinutes) || 45,
        questions,
        fillQuestion,
        shortQuestion,
        assignedClasses,
        createdAt: String(row.createdAt || ''),
        createdBy: String(row.createdBy || ''),
        teacherId: String(row.teacherId || ''),
        teacherUsername: String(row.teacherUsername || ''),
        teacherName: String(row.teacherName || ''),
        isActive: Boolean(row.isActive),
        isAssigned: Boolean(row.isAssigned),
        startAt: String(row.startAt || ''),
        endAt: String(row.endAt || ''),
      };
    });
  } catch (e) {
    console.warn('Failed to fetch Turso exams:', e);
  }
  return [];
}

export async function saveTursoExam(exam: ExamBankData): Promise<boolean> {
  try {
    const res = await fetch('/api/turso/exams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exam),
    });
    if (isJsonResponse(res)) {
      return true;
    }
  } catch {}

  try {
    const db = await ensureWebTursoInitialized();
    await db.execute({
      sql: `
        INSERT INTO exams (
          id, code, title, subject, subjectCode, grade, durationMinutes,
          questionsJson, fillQuestionJson, shortQuestionJson, assignedClassesJson,
          createdAt, createdBy, teacherId, teacherUsername, teacherName,
          isActive, isAssigned, startAt, endAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          code = excluded.code,
          title = excluded.title,
          subject = excluded.subject,
          subjectCode = excluded.subjectCode,
          grade = excluded.grade,
          durationMinutes = excluded.durationMinutes,
          questionsJson = excluded.questionsJson,
          fillQuestionJson = excluded.fillQuestionJson,
          shortQuestionJson = excluded.shortQuestionJson,
          assignedClassesJson = excluded.assignedClassesJson,
          createdAt = excluded.createdAt,
          createdBy = excluded.createdBy,
          teacherId = excluded.teacherId,
          teacherUsername = excluded.teacherUsername,
          teacherName = excluded.teacherName,
          isActive = excluded.isActive,
          isAssigned = excluded.isAssigned,
          startAt = excluded.startAt,
          endAt = excluded.endAt
      `,
      args: [
        exam.id,
        exam.code || '',
        exam.title || '',
        exam.subject || '',
        exam.subjectCode || exam.subject || '',
        Number(exam.grade) || 9,
        Number(exam.durationMinutes) || 45,
        JSON.stringify(exam.questions || []),
        JSON.stringify(exam.fillQuestion || null),
        JSON.stringify(exam.shortQuestion || null),
        JSON.stringify(exam.assignedClasses || []),
        exam.createdAt || new Date().toISOString(),
        exam.createdBy || '',
        exam.teacherId || '',
        exam.teacherUsername || '',
        exam.teacherName || '',
        exam.isActive !== undefined ? (exam.isActive ? 1 : 0) : 1,
        exam.isAssigned !== undefined ? (exam.isAssigned ? 1 : 0) : 1,
        exam.startAt || '',
        exam.endAt || '',
      ],
    });
    return true;
  } catch (e) {
    console.warn('Failed to save Turso exam:', e);
    return false;
  }
}

export async function deleteTursoExam(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/turso/exams/${id}`, {
      method: 'DELETE',
    });
    if (isJsonResponse(res)) {
      return true;
    }
  } catch {}

  try {
    const db = await ensureWebTursoInitialized();
    await db.execute({
      sql: 'DELETE FROM exams WHERE id = ?',
      args: [id],
    });
    return true;
  } catch (e) {
    console.warn('Failed to delete Turso exam:', e);
    return false;
  }
}

export async function getTursoSubmissions(): Promise<StudentRecord[]> {
  try {
    const res = await fetch('/api/turso/submissions');
    if (isJsonResponse(res)) {
      const data = await res.json();
      return data.submissions || [];
    }
  } catch {}

  try {
    const db = await ensureWebTursoInitialized();
    const result = await db.execute(
      'SELECT * FROM submissions ORDER BY submittedAt DESC'
    );
    return result.rows.map((row, idx) => ({
      stt: idx + 1 < 10 ? `0${idx + 1}` : `${idx + 1}`,
      id: String(row.id),
      sbd: String(row.sbd || ''),
      studentUsername: String(row.studentUsername || ''),
      dateOfBirth: String(row.dateOfBirth || ''),
      name: String(row.name || ''),
      grade: Number(row.grade) || 9,
      className: String(row.className || ''),
      subject: String(row.subject || ''),
      examId: String(row.examId || ''),
      examTitle: String(row.examTitle || ''),
      teacherId: String(row.teacherId || ''),
      teacherName: String(row.teacherName || ''),
      duration: String(row.duration || ''),
      durationSeconds: Number(row.durationSeconds) || 0,
      tabLeaves: Number(row.tabLeaves) || 0,
      warningText: String(row.warningText || ''),
      warningType: (String(row.warningType || 'clean') as StudentRecord['warningType']),
      rawScore: Number(row.rawScore) || 0,
      penaltyText: String(row.penaltyText || '0.0'),
      finalScore: Number(row.finalScore) || 0,
      rank: String(row.rank || ''),
      status: (String(row.status || 'Đạt chuẩn') as StudentRecord['status']),
      submittedAt: String(row.submittedAt || ''),
      shortAnswerScore: Number(row.shortAnswerScore) || 0,
      shortAnswerFeedback: String(row.shortAnswerFeedback || ''),
    }));
  } catch (e) {
    console.warn('Failed to fetch Turso submissions:', e);
  }
  return [];
}

export async function saveTursoSubmission(
  submission: StudentRecord
): Promise<boolean> {
  try {
    const res = await fetch('/api/turso/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submission),
    });
    if (isJsonResponse(res)) {
      return true;
    }
  } catch {}

  try {
    const db = await ensureWebTursoInitialized();
    await db.execute({
      sql: `
        INSERT INTO submissions (
          id, sbd, studentUsername, dateOfBirth, name, grade, className,
          subject, examId, examTitle, teacherId, teacherName, duration,
          durationSeconds, tabLeaves, warningText, warningType, rawScore,
          penaltyText, finalScore, rank, status, submittedAt, answersJson,
          shortAnswerScore, shortAnswerFeedback
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          sbd = excluded.sbd,
          studentUsername = excluded.studentUsername,
          dateOfBirth = excluded.dateOfBirth,
          name = excluded.name,
          grade = excluded.grade,
          className = excluded.className,
          subject = excluded.subject,
          examId = excluded.examId,
          examTitle = excluded.examTitle,
          teacherId = excluded.teacherId,
          teacherName = excluded.teacherName,
          duration = excluded.duration,
          durationSeconds = excluded.durationSeconds,
          tabLeaves = excluded.tabLeaves,
          warningText = excluded.warningText,
          warningType = excluded.warningType,
          rawScore = excluded.rawScore,
          penaltyText = excluded.penaltyText,
          finalScore = excluded.finalScore,
          rank = excluded.rank,
          status = excluded.status,
          submittedAt = excluded.submittedAt,
          answersJson = excluded.answersJson,
          shortAnswerScore = excluded.shortAnswerScore,
          shortAnswerFeedback = excluded.shortAnswerFeedback
      `,
      args: [
        submission.id,
        submission.sbd || '',
        submission.studentUsername || '',
        submission.dateOfBirth || '',
        submission.name || '',
        Number(submission.grade) || 9,
        submission.className || '',
        submission.subject || '',
        submission.examId || '',
        submission.examTitle || '',
        submission.teacherId || '',
        submission.teacherName || '',
        submission.duration || '',
        Number(submission.durationSeconds) || 0,
        Number(submission.tabLeaves) || 0,
        submission.warningText || '',
        submission.warningType || 'clean',
        Number(submission.rawScore) || 0,
        submission.penaltyText || '0.0',
        Number(submission.finalScore) || 0,
        submission.rank || '',
        submission.status || '',
        submission.submittedAt || new Date().toISOString(),
        JSON.stringify({}),
        Number(submission.shortAnswerScore) || 0,
        submission.shortAnswerFeedback || '',
      ],
    });
    return true;
  } catch (e) {
    console.warn('Failed to save Turso submission:', e);
    return false;
  }
}

export async function deleteTursoSubmission(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/turso/submissions/${id}`, {
      method: 'DELETE',
    });
    if (isJsonResponse(res)) {
      return true;
    }
  } catch {}

  try {
    const db = await ensureWebTursoInitialized();
    await db.execute({
      sql: 'DELETE FROM submissions WHERE id = ?',
      args: [id],
    });
    return true;
  } catch (e) {
    console.warn('Failed to delete Turso submission:', e);
    return false;
  }
}
