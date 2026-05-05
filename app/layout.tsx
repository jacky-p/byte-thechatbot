import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Byte the Robot",
  description: "Chat with Byte — a super fun robot who teaches kids about coding!",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-display antialiased">{children}</body>
    </html>
  );
}
