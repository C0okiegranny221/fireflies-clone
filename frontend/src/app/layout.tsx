import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { Providers } from "@/components/providers/Providers";
import { themeInitScript } from "@/components/providers/ThemeProvider";

import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Fireflies", template: "%s | Fireflies" },
  description: "AI meeting notes: transcripts, summaries and action items for every meeting.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The theme script may add `.dark` before hydration, so <html> attributes can differ.
    <html lang="en" className={`${inter.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
