import type { Metadata, Viewport } from "next";
import { Cinzel, Cinzel_Decorative, Crimson_Pro, MedievalSharp, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["500", "700", "900"],
  display: "swap",
});

const cinzelDecorative = Cinzel_Decorative({
  variable: "--font-cinzel-decorative",
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
});

const crimsonPro = Crimson_Pro({
  variable: "--font-crimson-pro",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const medievalSharp = MedievalSharp({
  variable: "--font-medieval-sharp",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aetheria: Terraforge 3D Roguelike TD",
  description:
    "融合3D地形重塑、多维资源管理与动态天气系统的Roguelike塔防游戏。复古文艺手稿UI、自制关卡编辑器与深度策略构筑。",
  keywords: [
    "Aetheria",
    "Terraforge",
    "塔防",
    "Roguelike",
    "Three.js",
    "3D",
    "地形重塑",
    "Next.js",
  ],
  authors: [{ name: "Aetheria Studio" }],
  openGraph: {
    title: "Aetheria: Terraforge 3D Roguelike TD",
    description:
      "融合3D地形重塑、多维资源管理与动态天气系统的Roguelike塔防游戏。",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Aetheria: Terraforge 3D Roguelike TD",
    description:
      "融合3D地形重塑、多维资源管理与动态天气系统的Roguelike塔防游戏。",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
  themeColor: "#0c0a08",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${cinzel.variable} ${cinzelDecorative.variable} ${crimsonPro.variable} ${medievalSharp.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
