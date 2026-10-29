import { Router, Request, Response } from 'express';
import { getTursoClient, getTursoConfigInfo, initTursoTables, updateTursoDbConfig } from './turso.js';

export const tursoRouter = Router();

// Test Turso Connection
tursoRouter.get('/status', async (_req: Request, res: Response) => {
  try {
    const db = getTursoClient();
    const result = await db.execute('SELECT COUNT(*) as exam_count FROM exams');
    const configInfo = getTursoConfigInfo();
    res.json({
      status: 'connected',
      dbType: configInfo.type,
      url: configInfo.url,
      isCloud: configInfo.isCloud,
      stats: {
        examCount: Number(result.rows[0]?.exam_count || 0),
      },
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: err instanceof Error ? err.message : String(err),
    });
  }
});

// Connect / Switch Turso Database configuration
tursoRouter.post('/connect', async (req: Request, res: Response) => {
  try {
    const { url = '', authToken = '' } = req.body || {};
    updateTursoDbConfig(url, authToken);
    await initTursoTables();
    const configInfo = getTursoConfigInfo();
    res.json({
      success: true,
      message: `Đã kết nối thành công với Turso Database (${configInfo.type}).`,
      configInfo,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: `Không thể kết nối Turso: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
});

// Admin Config (teachers, classrooms, studentAccounts, security, examBankSettings)
tursoRouter.get('/config/:key', async (req: Request, res: Response) => {
  try {
    const db = getTursoClient();
    const key = req.params.key;
    const result = await db.execute({
      sql: 'SELECT value_json, updated_at FROM admin_config WHERE key = ?',
      args: [key],
    });
    if (result.rows.length > 0) {
      const row = result.rows[0];
      res.json({
        key,
        data: JSON.parse(String(row.value_json)),
        updatedAt: row.updated_at,
      });
    } else {
      res.json({ key, data: null });
    }
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

tursoRouter.post('/config/:key', async (req: Request, res: Response) => {
  try {
    const db = getTursoClient();
    const key = req.params.key;
    const valueJson = JSON.stringify(req.body.data);
    const updatedAt = new Date().toISOString();

    await db.execute({
      sql: `
        INSERT INTO admin_config (key, value_json, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value_json = excluded.value_json,
          updated_at = excluded.updated_at
      `,
      args: [key, valueJson, updatedAt],
    });

    res.json({ success: true, key, updatedAt });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Exams CRUD
tursoRouter.get('/exams', async (_req: Request, res: Response) => {
  try {
    const db = getTursoClient();
    const result = await db.execute('SELECT * FROM exams ORDER BY createdAt DESC');
    const exams = result.rows.map((row) => {
      let questions = [];
      let fillQuestion = null;
      let shortQuestion = null;
      let assignedClasses: string[] = [];

      try { if (row.questionsJson) questions = JSON.parse(String(row.questionsJson)); } catch {}
      try { if (row.fillQuestionJson) fillQuestion = JSON.parse(String(row.fillQuestionJson)); } catch {}
      try { if (row.shortQuestionJson) shortQuestion = JSON.parse(String(row.shortQuestionJson)); } catch {}
      try { if (row.assignedClassesJson) assignedClasses = JSON.parse(String(row.assignedClassesJson)); } catch {}

      return {
        id: String(row.id),
        code: String(row.code || ''),
        title: String(row.title || ''),
        subject: String(row.subject || ''),
        subjectCode: String(row.subjectCode || row.subject || ''),
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

    res.json({ exams });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

tursoRouter.post('/exams', async (req: Request, res: Response) => {
  try {
    const db = getTursoClient();
    const ex = req.body;
    if (!ex.id) {
      res.status(400).json({ error: 'Exam ID is required' });
      return;
    }

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
        ex.id,
        ex.code || '',
        ex.title || '',
        ex.subject || '',
        ex.subjectCode || ex.subject || '',
        Number(ex.grade) || 9,
        Number(ex.durationMinutes) || 45,
        JSON.stringify(ex.questions || []),
        JSON.stringify(ex.fillQuestion || null),
        JSON.stringify(ex.shortQuestion || null),
        JSON.stringify(ex.assignedClasses || []),
        ex.createdAt || new Date().toISOString(),
        ex.createdBy || '',
        ex.teacherId || '',
        ex.teacherUsername || '',
        ex.teacherName || '',
        ex.isActive !== undefined ? (ex.isActive ? 1 : 0) : 1,
        ex.isAssigned !== undefined ? (ex.isAssigned ? 1 : 0) : 1,
        ex.startAt || '',
        ex.endAt || '',
      ],
    });

    res.json({ success: true, id: ex.id });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

tursoRouter.delete('/exams/:id', async (req: Request, res: Response) => {
  try {
    const db = getTursoClient();
    const id = req.params.id;
    await db.execute({
      sql: 'DELETE FROM exams WHERE id = ?',
      args: [id],
    });
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Submissions CRUD
tursoRouter.get('/submissions', async (_req: Request, res: Response) => {
  try {
    const db = getTursoClient();
    const result = await db.execute('SELECT * FROM submissions ORDER BY submittedAt DESC');
    const submissions = result.rows.map((row, idx) => ({
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
      warningType: String(row.warningType || 'clean'),
      rawScore: Number(row.rawScore) || 0,
      penaltyText: String(row.penaltyText || '0.0'),
      finalScore: Number(row.finalScore) || 0,
      rank: String(row.rank || ''),
      status: String(row.status || ''),
      submittedAt: String(row.submittedAt || ''),
      shortAnswerScore: Number(row.shortAnswerScore) || 0,
      shortAnswerFeedback: String(row.shortAnswerFeedback || ''),
    }));

    res.json({ submissions });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

tursoRouter.post('/submissions', async (req: Request, res: Response) => {
  try {
    const db = getTursoClient();
    const sub = req.body;
    if (!sub.id) {
      res.status(400).json({ error: 'Submission ID is required' });
      return;
    }

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
        sub.id,
        sub.sbd || '',
        sub.studentUsername || '',
        sub.dateOfBirth || '',
        sub.name || '',
        Number(sub.grade) || 9,
        sub.className || '',
        sub.subject || '',
        sub.examId || '',
        sub.examTitle || '',
        sub.teacherId || '',
        sub.teacherName || '',
        sub.duration || '',
        Number(sub.durationSeconds) || 0,
        Number(sub.tabLeaves) || 0,
        sub.warningText || '',
        sub.warningType || 'clean',
        Number(sub.rawScore) || 0,
        sub.penaltyText || '0.0',
        Number(sub.finalScore) || 0,
        sub.rank || '',
        sub.status || '',
        sub.submittedAt || new Date().toISOString(),
        JSON.stringify(sub.answers || {}),
        Number(sub.shortAnswerScore) || 0,
        sub.shortAnswerFeedback || '',
      ],
    });

    res.json({ success: true, id: sub.id });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

tursoRouter.delete('/submissions/:id', async (req: Request, res: Response) => {
  try {
    const db = getTursoClient();
    const id = req.params.id;
    await db.execute({
      sql: 'DELETE FROM submissions WHERE id = ?',
      args: [id],
    });
    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});
