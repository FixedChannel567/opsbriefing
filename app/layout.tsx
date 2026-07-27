import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://opsbriefing-daily.coryfan2004.chatgpt.site"),
  title: "OpsBriefing",
  description:
    "Five current geopolitical developments and a comprehensive, cited 10-minute daily briefing.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "OpsBriefing",
    description: "Five current geopolitical events. Every source cited.",
    type: "website",
    images: [{ url: "/og.png", width: 1731, height: 909, alt: "OpsBriefing - Five events. Every source cited." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "OpsBriefing",
    description: "Five current geopolitical events. Every source cited.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
