// Ícones próprios, todos com pontas e junções arredondadas.
const base = { fill: "none", stroke: "currentColor", strokeWidth: 3.2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const CheckIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);

export const CrownIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth={2.4}>
    <path d="M4 8l4 4 4-6 4 6 4-4-1.5 10h-13z" fill="currentColor" />
  </svg>
);

export const DotsIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <circle cx="5" cy="12" r="2.2" /><circle cx="12" cy="12" r="2.2" /><circle cx="19" cy="12" r="2.2" />
  </svg>
);

export const WifiOffIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth={2.4}>
    <path d="M3 3l18 18M8.5 16.5a5 5 0 017 0M5 12.5a10 10 0 013-2M12 20h.01" />
  </svg>
);

export const DiceIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth={2.4}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
    <circle cx="9" cy="9" r="1.2" fill="currentColor" /><circle cx="15" cy="15" r="1.2" fill="currentColor" /><circle cx="12" cy="12" r="1.2" fill="currentColor" />
  </svg>
);

export const MinusIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}><path d="M6 12h12" /></svg>
);

export const PlusIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}><path d="M12 6v12M6 12h12" /></svg>
);

export const LockIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth={2.4}>
    <rect x="5" y="11" width="14" height="9" rx="3" /><path d="M8 11V8a4 4 0 018 0v3" />
  </svg>
);

export const CloseIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base}><path d="M6 6l12 12M18 6L6 18" /></svg>
);

export const HeartIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round">
    <path d="M12 20.5s-8-4.8-8-10.4A4.6 4.6 0 0112 7.3a4.6 4.6 0 018 2.8c0 5.6-8 10.4-8 10.4z" />
  </svg>
);

export const ChevronIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth={3}><path d="M9 6l6 6-6 6" /></svg>
);

export const GearIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={1.4} strokeLinejoin="round" aria-hidden="true">
    <path fillRule="evenodd" d="M10.04 5.38 L10.40 2.94 L13.60 2.94 L13.96 5.38 L15.29 5.94 L17.28 4.46 L19.54 6.72 L18.06 8.71 L18.62 10.04 L21.06 10.40 L21.06 13.60 L18.62 13.96 L18.06 15.29 L19.54 17.28 L17.28 19.54 L15.29 18.06 L13.96 18.62 L13.60 21.06 L10.40 21.06 L10.04 18.62 L8.71 18.06 L6.72 19.54 L4.46 17.28 L5.94 15.29 L5.38 13.96 L2.94 13.60 L2.94 10.40 L5.38 10.04 L5.94 8.71 L4.46 6.72 L6.72 4.46 L8.71 5.94 Z M15.70 12 A3.7 3.7 0 1 0 8.30 12 A3.7 3.7 0 1 0 15.70 12 Z" />
  </svg>
);

export const ArrowLeftIcon = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth={3}><path d="M15 6l-6 6 6 6" /></svg>
);
