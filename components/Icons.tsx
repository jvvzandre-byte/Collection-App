import type { SVGProps } from "react";

// Hand-tuned 24px line icons, 1.75 stroke. Kept local so the look stays consistent.

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = ({ size = 20, ...p }: P) => ({
  width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
  strokeWidth: 1.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, ...p,
});

export const IconHome = (p: P) => <svg {...base(p)}><path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" /></svg>;
export const IconCalendar = (p: P) => <svg {...base(p)}><rect x="4" y="5.5" width="16" height="14.5" rx="3" /><path d="M8 3.5v4M16 3.5v4M4 10h16" /></svg>;
export const IconTicket = (p: P) => <svg {...base(p)}><path d="M4 8a2 2 0 0 0 0 4v0a2 2 0 0 1 0 4v1.5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V16a2 2 0 0 1 0-4 2 2 0 0 1 0-4V6.5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1z" transform="translate(0 0)" /><path d="M14.5 6v2M14.5 11v2M14.5 16v2" /></svg>;
export const IconUser = (p: P) => <svg {...base(p)}><circle cx="12" cy="8.5" r="3.75" /><path d="M5 20c.9-3.6 3.6-5.5 7-5.5s6.1 1.9 7 5.5" /></svg>;
export const IconArrowRight = (p: P) => <svg {...base(p)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
export const IconArrowLeft = (p: P) => <svg {...base(p)}><path d="M19 12H5M11 6l-6 6 6 6" /></svg>;
export const IconArrowUpRight = (p: P) => <svg {...base(p)}><path d="M7 17 17 7M8 7h9v9" /></svg>;
export const IconBell = (p: P) => <svg {...base(p)}><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z" /><path d="M10 20.5a2.2 2.2 0 0 0 4 0" /></svg>;
export const IconSearch = (p: P) => <svg {...base(p)}><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>;
export const IconCheck = (p: P) => <svg {...base(p)}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;
export const IconX = (p: P) => <svg {...base(p)}><path d="M6 6l12 12M18 6 6 18" /></svg>;
export const IconPlus = (p: P) => <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>;
export const IconMinus = (p: P) => <svg {...base(p)}><path d="M5 12h14" /></svg>;
export const IconTruck = (p: P) => <svg {...base(p)}><path d="M3 6.5h11v10H3zM14 10h3.8l3.2 3.4v3.1h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></svg>;
export const IconScale = (p: P) => <svg {...base(p)}><path d="M12 3v2.5" /><circle cx="12" cy="7" r="1.5" /><path d="M7.5 9.5h9l1.5 10.5h-12z" /><path d="M12 13.5v2.5" /></svg>;
export const IconMapPin = (p: P) => <svg {...base(p)}><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z" /><circle cx="12" cy="10" r="2.3" /></svg>;
export const IconPhone = (p: P) => <svg {...base(p)}><path d="M6.5 3.5h3l1.5 4-2 1.3a10 10 0 0 0 6.2 6.2l1.3-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 4.5 5.5a2 2 0 0 1 2-2z" /></svg>;
export const IconGift = (p: P) => <svg {...base(p)}><rect x="4" y="9" width="16" height="11" rx="1.5" /><path d="M3 9h18M12 9v11M12 9S10.5 4 7.8 4.6C6 5 6.4 8 8.7 9M12 9s1.5-5 4.2-4.4C18 5 17.6 8 15.3 9" /></svg>;
export const IconRecycle = (p: P) => <svg {...base(p)}><path d="m7.5 9.5 2.8-4.8a2 2 0 0 1 3.4 0l1.4 2.4" /><path d="m13.5 7.3 1.6-.3.4 1.7" /><path d="M18.5 12.5 21 17a2 2 0 0 1-1.7 3h-3.5" /><path d="m17 18.5-1.2 1.5 1.2 1.4" /><path d="M9 20H4.7A2 2 0 0 1 3 17l1.8-3.2" /><path d="m3.6 13.2 1.6.5-.5 1.7" /></svg>;
export const IconSkip = (p: P) => <svg {...base(p)}><path d="M6 6.5v11l8-5.5zM17.5 6.5v11" /></svg>;
export const IconUndo = (p: P) => <svg {...base(p)}><path d="M9 7 4.5 11.5 9 16" /><path d="M4.5 11.5H15a4.5 4.5 0 0 1 0 9h-2" /></svg>;
export const IconFlag = (p: P) => <svg {...base(p)}><path d="M5.5 21V4M5.5 4.5h11l-2 4 2 4h-11" /></svg>;
export const IconSettings = (p: P) => <svg {...base(p)}><circle cx="12" cy="12" r="3" /><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M6 18l1.4-1.4M16.6 7.4 18 6" /></svg>;
export const IconMessage = (p: P) => <svg {...base(p)}><path d="M4.5 18.5V7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2H8z" /></svg>;
export const IconChevronDown = (p: P) => <svg {...base(p)}><path d="m6.5 9.5 5.5 5.5 5.5-5.5" /></svg>;
export const IconChevronRight = (p: P) => <svg {...base(p)}><path d="m9.5 6.5 5.5 5.5-5.5 5.5" /></svg>;
export const IconSparkle = (p: P) => <svg {...base(p)}><path d="M12 4c.5 4 2 5.5 6 6-4 .5-5.5 2-6 6-.5-4-2-5.5-6-6 4-.5 5.5-2 6-6zM18.5 15.5c.2 1.6.8 2.2 2.5 2.5-1.7.3-2.3.9-2.5 2.5-.3-1.6-.9-2.2-2.5-2.5 1.6-.3 2.2-.9 2.5-2.5z" /></svg>;
export const IconLogout = (p: P) => <svg {...base(p)}><path d="M14 5h3.5a1.5 1.5 0 0 1 1.5 1.5v11a1.5 1.5 0 0 1-1.5 1.5H14M10 8l-4 4 4 4M6 12h9" /></svg>;
export const IconShield = (p: P) => <svg {...base(p)}><path d="M12 3.5 5 6v5.5c0 4.5 3 7.8 7 9 4-1.2 7-4.5 7-9V6z" /><path d="m9 12 2.2 2.2L15.5 10" /></svg>;
