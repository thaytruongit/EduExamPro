import React from 'react';
import {
  ScreenId,
  StudentAccount,
  TeacherAccount,
} from '../utils/examLogic';

export const LOGO_URL =
  'https://lh3.googleusercontent.com/aida/AEtjO1U2-TxOIOg84pDjVscTVC8QUSp5DJR3gJwXtbOLoxA7AztUU_lOaalByhZjOchMbxklIKo0JhkzV_h7HqiBtRRPE4FhTkMIL0Ts59HXTTM7KKvSGXqdus4icK-prY6rT4SO0c68hbsWkwBYr4ncAGHXv27a2MR31dLfAwzUShi0PBr9ivD9eaLah1yXGZHVC2IN7hdq0rFjGBjshU-KsOjZhp3rCuDinViK0I0udYzK69PJzSbgxRvZyh8';

export const PROFILE_AVATAR_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBOWopttBgDTwwdbyfXXDVXaT2z2fVFsLzzEZKoGzeetqHY1KtSdmdLW58wsdtrIzg01m3LHslFVie655_YActpQOCuYJdGBspVKJoZLQ2zr2GX4cGE-V2khY25liVu9EkxdXMsx_QHkh4qjXdK_5T4kL0PJv_CR7Hn_JPXh3b-k9snk28qDvS4crrTruZW2v-r9-NDMKmW0Tqrn8DY8u6ynwjtGVxRP5dXyuAsR6zvNkwrQcoaalYD';

interface StudentHeaderProps {
  activeScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  studentName?: string;
  studentClass?: string;
  loggedInStudent?: StudentAccount | null;
  isAdminAuthenticated?: boolean;
  currentTeacher?: TeacherAccount | null;
  onStudentLogout?: () => void;
  onAdminLogout?: () => void;
}

export const StudentHeader: React.FC<StudentHeaderProps> = ({
  activeScreen,
  onNavigate,
  studentName,
  studentClass,
  loggedInStudent,
  isAdminAuthenticated = false,
  currentTeacher,
  onStudentLogout,
  onAdminLogout,
}) => {
  // Strictly separate menus by role:
  // - If Teacher or Admin is logged in: NEVER show 'cong-vao-thi' (Student Portal)
  // - If Student is logged in: NEVER show 'khu-vuc-quan-tri' (Teacher/Admin Portal); only show Student's Exam Portal & Class Scoreboard
  // - If unauthenticated: allow choosing between Student Login Portal and Teacher/Admin Login Portal
  const navItems: { id: ScreenId; label: string; icon?: string }[] = [];

  if (isAdminAuthenticated) {
    navItems.push(
      {
        id: 'khu-vuc-quan-tri',
        label:
          currentTeacher?.role === 'admin'
            ? 'Quản Trị Hệ Thống'
            : `Quản Lý Đề & Điểm (Môn ${currentTeacher?.subject || ''})`,
        icon: 'admin_panel_settings',
      },
      {
        id: 'ket-qua-bang-diem',
        label:
          currentTeacher?.role === 'admin'
            ? 'Bảng Điểm Toàn Trường'
            : `Bảng Điểm Lớp Giao Bài`,
        icon: 'leaderboard',
      }
    );
  } else if (loggedInStudent) {
    navItems.push(
      {
        id: 'cong-vao-thi',
        label: `Cổng Thi Học Sinh (Khối ${loggedInStudent.grade})`,
        icon: 'school',
      },
      {
        id: 'ket-qua-bang-diem',
        label: `Bảng Điểm Lớp ${loggedInStudent.studentClass}`,
        icon: 'leaderboard',
      }
    );
  } else {
    navItems.push(
      {
        id: 'cong-vao-thi',
        label: 'Cổng Đăng Nhập Học Sinh',
        icon: 'login',
      },
      {
        id: 'khu-vuc-quan-tri',
        label: 'Đăng Nhập Giáo Viên / Quản Trị',
        icon: 'lock',
      }
    );
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] print:hidden">
      <div className="h-20 w-full px-gutter flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() =>
            onNavigate(
              isAdminAuthenticated ? 'khu-vuc-quan-tri' : 'cong-vao-thi'
            )
          }
          className="flex items-center gap-3 text-left cursor-pointer focus:outline-none shrink-0"
        >
          <img
            alt="EduExam Pro Logo"
            className="h-8 w-auto object-contain shrink-0"
            referrerPolicy="no-referrer"
            src={LOGO_URL}
          />
          <div className="flex flex-col">
            <span className="font-headline-sm text-headline-sm text-primary leading-tight tracking-tight">
              EduExam Pro
            </span>
            <span className="font-label-md text-label-md text-on-surface-variant font-normal">
              {isAdminAuthenticated
                ? currentTeacher?.role === 'admin'
                  ? 'Phân Hệ Quản Trị Hệ Thống THCS'
                  : `Phân Hệ Giáo Viên Bộ Môn ${currentTeacher?.subject || ''}`
                : loggedInStudent
                ? `Không Gian Học Sinh • Lớp ${loggedInStudent.studentClass} (Khối ${loggedInStudent.grade})`
                : 'Hệ Thống Thi Trực Tuyến & Khảo Thí THCS (Khối 6-9)'}
            </span>
          </div>
        </button>

        <nav
          aria-label="Điều hướng chính"
          className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl shrink-0"
        >
          {navItems.map((item) => {
            const isActive = activeScreen === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 font-label-lg text-label-lg transition-colors rounded-lg cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-primary-container text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                }`}
              >
                {item.icon && (
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined text-[18px]"
                  >
                    {item.icon}
                  </span>
                )}
                <span>{item.label}</span>
              </button>
            );
          })}

          {activeScreen === 'phong-thi-truc-tuyen' && (
            <span className="flex items-center gap-1.5 px-3.5 py-2 font-label-lg text-label-lg rounded-lg bg-secondary text-on-secondary shadow-sm whitespace-nowrap shrink-0">
              <span className="material-symbols-outlined text-[18px] animate-pulse">
                sensors
              </span>
              <span>Phòng Thi Đang Mở</span>
            </span>
          )}
        </nav>

        <div className="hidden lg:flex items-center gap-3 shrink-0">
          {loggedInStudent ? (
            <div className="flex items-center gap-2 bg-surface-container-low p-1 rounded-full pr-2 shrink-0">
              <img
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover shrink-0"
                referrerPolicy="no-referrer"
                src={PROFILE_AVATAR_URL}
              />
              <div className="flex flex-col text-left px-1">
                <span className="font-label-md text-label-md text-on-surface leading-tight font-semibold whitespace-nowrap">
                  {loggedInStudent.fullName}
                </span>
                <span className="font-code-meta text-[11px] text-primary font-bold whitespace-nowrap">
                  HS Lớp {loggedInStudent.studentClass} • Khối {loggedInStudent.grade}
                </span>
              </div>
              {onStudentLogout && activeScreen !== 'phong-thi-truc-tuyen' && (
                <button
                  type="button"
                  onClick={onStudentLogout}
                  className="px-2.5 py-1 rounded-full bg-error-container/60 text-error font-label-md text-xs font-bold hover:bg-error-container cursor-pointer flex items-center gap-1"
                  title="Đăng xuất tài khoản học sinh"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    logout
                  </span>
                  Đăng xuất
                </button>
              )}
            </div>
          ) : isAdminAuthenticated && currentTeacher ? (
            <div className="flex items-center gap-2 bg-surface-container-low p-1 rounded-full pr-2 shrink-0">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs">
                {currentTeacher.role === 'admin' ? 'QT' : 'GV'}
              </div>
              <div className="flex flex-col text-left px-1">
                <span className="font-label-md text-label-md text-on-surface leading-tight font-semibold whitespace-nowrap">
                  {currentTeacher.fullName}
                </span>
                <span className="font-code-meta text-[11px] text-primary font-bold whitespace-nowrap">
                  {currentTeacher.role === 'admin'
                    ? 'Quản Trị Hệ Thống'
                    : `Giáo Viên Môn ${currentTeacher.subject}`}
                </span>
              </div>
              {onAdminLogout && (
                <button
                  type="button"
                  onClick={onAdminLogout}
                  className="px-2.5 py-1 rounded-full bg-error-container/60 text-error font-label-md text-xs font-bold hover:bg-error-container cursor-pointer flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    logout
                  </span>
                  Đăng xuất
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-full shrink-0">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary-fixed-dim opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-on-tertiary-container"></span>
              </span>
              <span className="font-code-meta text-code-meta text-on-surface font-semibold whitespace-nowrap">
                {studentName && studentName.trim()
                  ? `${studentName} (${studentClass || ''})`
                  : 'Chưa đăng nhập • Phân quyền độc lập'}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export const StudentFooter: React.FC = () => {
  return (
    <footer className="w-full bg-surface-container-low py-space-lg print:hidden">
      <div className="w-full px-gutter flex flex-col md:flex-row items-center justify-between gap-space-md text-on-surface-variant font-body-sm text-body-sm">
        <div className="flex items-center gap-space-sm">
          <span className="material-symbols-outlined text-primary text-[20px]">
            verified_user
          </span>
          <span>
            Bản quyền © 2025 EduExam Pro. Hệ thống chuẩn hóa khảo thí THCS Bộ GD&amp;ĐT (Cloud Firestore).
          </span>
        </div>
        <div className="flex items-center gap-space-lg font-label-md text-label-md flex-wrap justify-center">
          <span className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-on-tertiary-container text-[16px]">
              cloud_done
            </span>
            Lưu Trữ Đám Mây Băng Thông Rộng
          </span>
          <span className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-[16px]">timer</span>
            Bảo Lưu Thời Điểm Thi
          </span>
          <span className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-[16px]">school</span>
            Khối Lớp 6 • 7 • 8 • 9
          </span>
        </div>
      </div>
    </footer>
  );
};
