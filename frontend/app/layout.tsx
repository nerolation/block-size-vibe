import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

// Using standard CSS import for fonts instead of next/font
// Add this to globals.css: @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

export const metadata: Metadata = {
  title: "Ethereum Block Size Dashboard",
  description: "Visualize Ethereum Beacon blocks size and content metrics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-900 text-slate-100 font-sans">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
