/* 목업의 아이콘 세트 (stroke = currentColor) */
type P = { size?: number };
const S = ({ size = 22, children }: { size?: number; children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);

export const IconCheck = ({ size = 16 }: P) => <S size={size}><path d="M5 12.5l4.5 4.5L19 7.5" strokeWidth="3" /></S>;
export const IconBell = ({ size = 18 }: P) => <S size={size}><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2.2 2.2 0 0 0 4 0" strokeWidth="2" /></S>;
export const IconShare = ({ size = 18 }: P) => <S size={size}><path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 13v5.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V13" strokeWidth="2" /></S>;
export const IconClock = ({ size = 15 }: P) => <S size={size}><circle cx="12" cy="12" r="8.5" strokeWidth="2.2" /><path d="M12 7.5V12l3 2" strokeWidth="2.2" /></S>;
export const IconRank = ({ size = 22 }: P) => <S size={size}><path d="M3.5 20.5h17M5 20.5v-8h4.4v8M9.8 20.5V4.5h4.4v16M14.6 20.5v-11.5H19v11.5" strokeWidth="2" /></S>;
export const IconHelp = ({ size = 22 }: P) => (
  <S size={size}><circle cx="12" cy="12" r="9" strokeWidth="2" /><path d="M9.6 9.4a2.5 2.5 0 0 1 4.9.7c0 1.7-2.5 2.2-2.5 3.9" strokeWidth="2" /><circle cx="12" cy="17.2" r="1.2" fill="currentColor" stroke="none" /></S>
);
export const IconClose = ({ size = 22 }: P) => <S size={size}><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" strokeWidth="2.3" /></S>;
export const IconX = ({ size = 18 }: P) => <S size={size}><path d="M6 6l12 12M18 6L6 18" strokeWidth="2.2" /></S>;
export const IconDownload = ({ size = 18 }: P) => <S size={size}><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14" strokeWidth="2" /></S>;
export const IconChev = ({ size = 16 }: P) => <S size={size}><path d="M9 5l7 7-7 7" strokeWidth="2.2" /></S>;
export const IconPencil = ({ size = 13 }: P) => <S size={size}><path d="M4 20h4L19 9l-4-4L4 16z" strokeWidth="2.2" /></S>;
export const IconPause = ({ size = 14 }: P) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1.4" fill="currentColor" /><rect x="14" y="5" width="4" height="14" rx="1.4" fill="currentColor" /></svg>
);
export const IconJester = ({ size = 18 }: P) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" fill="currentColor">
    <path d="M4.6 17.2 3.2 9.4l5 3.3L12 6.4l3.8 6.3 5-3.3-1.4 7.8z" /><circle cx="3.2" cy="8" r="1.8" /><circle cx="12" cy="4.6" r="1.8" /><circle cx="20.8" cy="8" r="1.8" />
    <rect x="4.4" y="18.2" width="15.2" height="2.6" rx="1.3" />
  </svg>
);
export const IconLock = ({ size = 26 }: P) => <S size={size}><rect x="5" y="10.5" width="14" height="10" rx="3" strokeWidth="2" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" strokeWidth="2" /></S>;
export const IconMail = ({ size = 26 }: P) => <S size={size}><rect x="3.5" y="5.5" width="17" height="13" rx="3" strokeWidth="2" /><path d="M4.5 7.5 12 13l7.5-5.5" strokeWidth="2" /></S>;
export const IconEye = ({ size = 20 }: P) => <S size={size}><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" strokeWidth="1.9" /><circle cx="12" cy="12" r="3" strokeWidth="1.9" /></S>;
export const IconEyeOff = ({ size = 20 }: P) => <S size={size}><path d="M4 4l16 16M9.9 6A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-3 3.6M6.4 7.6C3.9 9.4 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1.1M10 10a3 3 0 0 0 4.2 4.2" strokeWidth="1.9" /></S>;
