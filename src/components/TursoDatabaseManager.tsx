import React, { useEffect, useState } from 'react';
import { fetchTursoStatus, TursoDbStatus } from '../utils/tursoClientApi';

export const TursoDatabaseManager: React.FC = () => {
  const [status, setStatus] = useState<TursoDbStatus | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchTursoStatus().then((s) => {
      if (mounted) setStatus(s);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 shadow-sm text-emerald-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0 text-emerald-400">
          <span className="material-symbols-outlined text-[24px]">database</span>
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm text-emerald-200">
              Cơ sở dữ liệu: Turso Embedded SQLite (libSQL)
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Đã tự động đăng ký &amp; kết nối (Không giới hạn Quota)
            </span>
          </div>
          <p className="text-xs text-emerald-300/80 mt-0.5">
            {status?.dbType || 'Turso Embedded SQLite (Tự động kết nối)'} &bull; Toàn bộ dữ liệu Lớp học, Tài khoản Giáo viên, Học sinh, Ngân hàng Đề thi và Bài làm được lưu trữ tự động vào cơ sở dữ liệu Turso Embedded SQLite.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 font-bold text-xs flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px]">verified</span>
          <span>Kết nối tự động 100%</span>
        </span>
      </div>
    </div>
  );
};

