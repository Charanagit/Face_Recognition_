import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FaceRec • Face Recognition & Attendance Management System",
  description: "Enterprise biometric facial recognition and employee attendance tracking platform powered by Next.js & Supabase.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-[#f9fafb] text-[#111827] antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
