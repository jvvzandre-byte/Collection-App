import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Onest } from "next/font/google";
import { DevSwitcher } from "@/components/DevSwitcher";
import { ServiceWorker } from "@/components/ServiceWorker";
import "./globals.css";

const onest = Onest({ subsets: ["latin"], variable: "--font-onest", display: "swap" });
const instrument = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-instrument", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Kilo · Every kilo counts", template: "%s · Kilo" },
  description: "Free kerbside recycling collection. Every kilogram is an entry into the monthly voucher draw.",
  applicationName: "Kilo",
  appleWebApp: { capable: true, title: "Kilo", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#f3f2f7",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA" className={`${onest.variable} ${instrument.variable}`}>
      <body>
        {children}
        <DevSwitcher />
        <ServiceWorker />
      </body>
    </html>
  );
}
