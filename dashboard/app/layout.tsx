import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider, ThemeProvider, LocationProvider, WebSocketProvider } from "@/providers";
import { SkipLink, ErrorBoundary } from "@/components/common";
import OfflineIndicator from "@/components/OfflineIndicator";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AQI Dashboard - Real-time Air Quality Monitoring",
  description: "Modern glassmorphic dashboard for real-time air quality monitoring, predictions, and health recommendations",
  keywords: ["AQI", "air quality", "pollution", "forecast", "health", "environment"],
  authors: [{ name: "AQI Dashboard Team" }],
  viewport: "width=device-width, initial-scale=1, maximum-scale=5",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AQI Predictor",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "AQI Predictor",
    title: "AQI Dashboard - Real-time Air Quality Monitoring",
    description: "Modern glassmorphic dashboard for real-time air quality monitoring, predictions, and health recommendations",
  },
  icons: {
    icon: [
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192x192.svg', sizes: '192x192', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/icons/icon-180x180.svg', sizes: '180x180', type: 'image/svg+xml' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased`}
      >
        <SkipLink targetId="main-content" />
        <OfflineIndicator />
        <ErrorBoundary>
          <QueryProvider>
            <ThemeProvider>
              <LocationProvider>
                <WebSocketProvider>
                  {children}
                </WebSocketProvider>
              </LocationProvider>
            </ThemeProvider>
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
