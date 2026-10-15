export const kg = (n: number) => `${n.toLocaleString("en-ZA", { minimumFractionDigits: n % 1 ? 1 : 0, maximumFractionDigits: 1 })} kg`;
export const rands = (n: number) => `R${n.toLocaleString("en-ZA")}`;
export const initials = (name: string) => name.split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase();
export const timeAgo = (iso: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};
export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-ZA")} ${n === 1 ? one : many}`;
