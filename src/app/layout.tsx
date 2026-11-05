import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ClientRoot } from "@/components/ClientRoot";
import { splashStartupImages } from "@/config/splash";

export const metadata: Metadata = {
  metadataBase: new URL("https://wandermin.vercel.app"),
  title: { default: "WANDERMIN — 집중하면 세계를 여행하는 타이머", template: "%s · WANDERMIN" },
  applicationName: "WANDERMIN",
  keywords: ["집중 타이머", "뽀모도로", "공부 타이머", "focus timer", "pomodoro", "study timer", "travel", "postcards"],
  description: "집중한 1분마다 50km를 날아가는 집중 타이머. 실제 도시 50곳을 여행하며 픽셀 아트 엽서를 모아요. 가입 없이 무료. — A focus timer where every focused minute flies you 50 km and each city you reach sends a pixel-art postcard.",
  openGraph: {
    type: "website",
    url: "/",
    siteName: "WANDERMIN",
    title: "WANDERMIN — 집중하면 세계를 여행하는 타이머",
    description: "집중 1분 = 50km 비행 · 50개 도시 · 도착할 때마다 픽셀 엽서. 가입 없이 바로 시작해요.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "WANDERMIN: 집중하는 동안 세계를 여행하는 타이머 — 리우와 도쿄 엽서, 서울→도쿄 탑승권" }],
    locale: "ko_KR",
    alternateLocale: ["en_US", "ja_JP"],
  },
  twitter: {
    card: "summary_large_image",
    title: "WANDERMIN — Every Minute Takes You Somewhere",
    description: "A focus timer where every focused minute flies you 50 km, with a pixel-art postcard from every city you reach.",
    images: ["/og.png"],
  },
  appleWebApp: { capable: true, title: "WANDERMIN", statusBarStyle: "default", startupImage: splashStartupImages() },
  formatDetection: { telephone: false },
};

const THEME_BOOT = `try{var s=JSON.parse(localStorage.getItem("wandermin.v1")||"{}").settings||{};var t=s.theme||"system";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";}catch(e){}`;

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f4ecd8" }, { media: "(prefers-color-scheme: dark)", color: "#171b2b" }] };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* apply the saved theme before first paint, so dark mode never flashes light */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>
        <ClientRoot>{children}</ClientRoot>
      </body>
    </html>
  );
}
