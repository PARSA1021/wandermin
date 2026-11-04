import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ClientRoot } from "@/components/ClientRoot";

export const metadata: Metadata = {
  title: "WANDERMIN",
  description: "Every Minute Takes You Somewhere. A focus timer that turns focused minutes into a journey around the world.",
  applicationName: "WANDERMIN",
  appleWebApp: { capable: true, title: "WANDERMIN", statusBarStyle: "default" },
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
