import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AyuCheck.in - AI-Powered Alternative Medicine Platform",
  description: "Experience personalized alternative medicine guidance through Ayurveda, TCM, and Homeopathy with our intelligent AI assistant.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
