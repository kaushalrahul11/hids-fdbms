import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HIDS Faculty Portal",
  description: "Himachal Institute of Dental Sciences — Faculty Database Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
