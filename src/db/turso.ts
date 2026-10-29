import { createClient, Client } from '@libsql/client';
import {
  DEFAULT_CLASSROOMS,
  DEFAULT_STUDENT_ACCOUNTS,
  DEFAULT_TEACHER_ACCOUNTS,
} from '../utils/examLogic.js';

let tursoClient: Client | null = null;
let currentDbConfig = {
  url: process.env.TURSO_DATABASE_URL || 'file:turso_data.db',
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
};

export function getTursoClient(): Client {
  if (!tursoClient) {
    tursoClient = createClient(currentDbConfig);
  }
  return tursoClient;
}

export function updateTursoDbConfig(url: string, authToken?: string): Client {
  currentDbConfig = {
    url: url || 'file:turso_data.db',
    authToken: authToken || undefined,
  };
  tursoClient = createClient(currentDbConfig);
  return tursoClient;
}

export function getTursoConfigInfo() {
  const isCloud =
    currentDbConfig.url.startsWith('libsql://') ||
    currentDbConfig.url.startsWith('https://');
  return {
    url: currentDbConfig.url,
    isCloud,
    type: isCloud
      ? 'Turso Cloud Database (Remote)'
      : 'Turso Embedded SQLite (Tự động kết nối)',
  };
}

export async function initTursoTables() {
  const db = getTursoClient();

  // Create admin_config table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS admin_config (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Create exams table
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

  // Create submissions table
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

  // Create exam_sessions table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS exam_sessions (
      sessionKey TEXT PRIMARY KEY,
      sbd TEXT,
      fullName TEXT,
      grade INTEGER,
      studentClass TEXT,
      examId TEXT,
      remainingSeconds INTEGER,
      tabViolations INTEGER,
      kickedOutAt TEXT,
      isKickedOut INTEGER,
      answersJson TEXT,
      updatedAt TEXT
    );
  `);

  // Perform automatic clean baseline setup (v3) if not yet applied
  const checkInit = await db.execute({
    sql: 'SELECT value_json FROM admin_config WHERE key = ?',
    args: ['clean_init_v3'],
  });

  if (checkInit.rows.length === 0) {
    const nowIso = new Date().toISOString();

    // Clear all old/default exams, submissions, and sessions
    await db.execute('DELETE FROM exams');
    await db.execute('DELETE FROM submissions');
    await db.execute('DELETE FROM exam_sessions');

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
          ON CONFLICT(key) DO UPDATE SET
            value_json = excluded.value_json,
            updated_at = excluded.updated_at
        `,
        args: [k, JSON.stringify(val), nowIso],
      });
    }
  }

  console.log('✅ Turso Embedded SQLite initialized and connected automatically.');
}

