import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar";
import { ThemeProvider } from "@/components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Blog",
  description: "Blog do Obertobr",
};

const themeInitScript = `(function(){try{var stored=localStorage.getItem('theme');var isDark=stored?stored==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;var root=document.documentElement;if(isDark){root.classList.add('dark');root.style.colorScheme='dark';}else{root.classList.remove('dark');root.style.colorScheme='light';}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 dark:bg-gh-canvas text-gray-800 dark:text-gh-text min-h-screen pt-15 transition-colors duration-150`}
      >
        <ThemeProvider>
          <Toaster position="bottom-center" />
          <NavBar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
