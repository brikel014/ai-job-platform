import type { Metadata } from "next";
import { Suspense } from "react";
import Script from "next/script";
import { Outfit, DM_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { LanguageProvider } from "@/lib/useLanguage";
import { ScrollToTop } from "@/components/ScrollToTop";
import { NavigationProgress } from "@/components/NavigationProgress";
import { PostHogProvider } from "@/components/PostHogProvider";
import { ConsentBanner } from "@/components/ConsentBanner";
import { MetaPixelRouteTracker } from "@/components/MetaPixelRouteTracker";
import { Analytics } from "@vercel/analytics/next";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://findwork.app'),
  title: "Stellio – Find Work Fast | Connect Workers & Employers Across Europe",
  description: "Find work fast and connect directly with verified employers across Europe. No CV needed, no agencies. Workers and employers matched instantly — construction, hospitality, logistics & more.",
  keywords: [
    "find work fast",
    "jobs in Germany",
    "jobs in Europe",
    "connect workers and employers",
    "construction jobs Europe",
    "hospitality jobs Germany",
    "no CV jobs",
    "instant job matching",
    "verified employers",
    "bartender jobs Germany",
    "cleaning jobs Germany",
    "warehouse jobs Germany"
  ],
  authors: [{ name: "Stellio" }],
  creator: "Stellio",
  publisher: "Stellio",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: ["de_DE", "hr_HR", "sr_RS", "bs_BA", "sl_SI", "mk_MK"],
    url: "https://findwork.app",
    siteName: "Stellio",
    title: "Stellio – Find Work Fast | Connect Workers & Employers",
    description: "Connect directly with verified employers across Europe. No CV, no agencies — apply instantly for construction, hospitality, logistics & more.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Stellio – Find Work Fast, Connect Workers & Employers",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Stellio – Find Work Fast | Connect Workers & Employers",
    description: "Find work fast and connect directly with verified employers across Europe. No CV needed, apply instantly.",
    images: ["/opengraph-image"],
  },
  icons: {
    icon: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  alternates: {
    canonical: "https://findwork.app",
    languages: {
      "en": "https://findwork.app",
      "de": "https://findwork.app/de",
      "hr": "https://findwork.app/hr",
      "sr": "https://findwork.app/sr",
    },
  },
};

// JSON-LD structured data for SEO
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Stellio",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: "Job matching platform connecting workers with employers across Europe",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "EUR",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "2500",
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {process.env.NEXT_PUBLIC_META_PIXEL_ID && (
          <>
            <Script id="meta-pixel" strategy="afterInteractive">
              {`
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${process.env.NEXT_PUBLIC_META_PIXEL_ID}');
                fbq('track', 'PageView');
              `}
            </Script>
            <noscript>
              <img
                height="1"
                width="1"
                style={{ display: "none" }}
                src={`https://www.facebook.com/tr?id=${process.env.NEXT_PUBLIC_META_PIXEL_ID}&ev=PageView&noscript=1`}
                alt=""
              />
            </noscript>
          </>
        )}
      </head>
      <body
        className={`${outfit.variable} ${dmSans.variable} antialiased`}
      >
        {process.env.NEXT_PUBLIC_META_PIXEL_ID && (
          <Suspense fallback={null}>
            <MetaPixelRouteTracker />
          </Suspense>
        )}
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <ScrollToTop />
        <LanguageProvider>
          <AuthProvider>
            <Suspense fallback={null}>
              <PostHogProvider>
                {children}
                <ConsentBanner />
              </PostHogProvider>
            </Suspense>
          </AuthProvider>
        </LanguageProvider>
        <Analytics />
      </body>
    </html>
  );
}
