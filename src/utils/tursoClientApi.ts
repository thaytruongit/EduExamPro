import { ClassroomRecord, ExamBankData, StudentAccount, StudentRecord, TeacherAccount } from './examLogic';

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
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('Failed to fetch Turso status:', e);
  }
  return null;
}

export async function connectTursoCloud(url: string, authToken: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/turso/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, authToken }),
    });
    return await res.json();
  } catch (e) {
    return {
      success: false,
      message: e instanceof Error ? e.message : 'Lỗi kết nối tới Turso API',
    };
  }
}

export async function getTursoConfig<T>(key: string): Promise<T | null> {
  try {
    const res = await fetch(`/api/turso/config/${key}`);
    if (res.ok) {
      const data = await res.json();
      return data.data as T;
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
    return res.ok;
  } catch (e) {
    console.warn(`Failed to set Turso config [${key}]:`, e);
    return false;
  }
}

export async function getTursoExams(): Promise<ExamBankData[]> {
  try {
    const res = await fetch('/api/turso/exams');
    if (res.ok) {
      const data = await res.json();
      return data.exams || [];
    }
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
    return res.ok;
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
    return res.ok;
  } catch (e) {
    console.warn('Failed to delete Turso exam:', e);
    return false;
  }
}

export async function getTursoSubmissions(): Promise<StudentRecord[]> {
  try {
    const res = await fetch('/api/turso/submissions');
    if (res.ok) {
      const data = await res.json();
      return data.submissions || [];
    }
  } catch (e) {
    console.warn('Failed to fetch Turso submissions:', e);
  }
  return [];
}

export async function saveTursoSubmission(submission: StudentRecord): Promise<boolean> {
  try {
    const res = await fetch('/api/turso/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(submission),
    });
    return res.ok;
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
    return res.ok;
  } catch (e) {
    console.warn('Failed to delete Turso submission:', e);
    return false;
  }
}
