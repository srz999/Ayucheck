import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AyuCheck - Ayurveda Health Assistant",
  description: "Your intelligent Ayurvedic health companion powered by AI. Get personalized Ayurveda guidance, herbal recommendations, and wellness insights.",
  keywords: ["Ayurveda", "Health", "Wellness", "Herbal Medicine", "AI Assistant"],
  authors: [{ name: "AyuCheck Team" }],
  openGraph: {
    title: "AyuCheck - Ayurveda Health Assistant",
    description: "Your intelligent Ayurvedic health companion powered by AI",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "AyuCheck - Ayurveda Health Assistant",
    description: "Your intelligent Ayurvedic health companion powered by AI",
  },
  icons: {
    icon: "/ayucheck-icon.svg",
    apple: "/apple-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#22c55e" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
