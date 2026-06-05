import type { AppProps } from "next/app";
import { Inter } from "next/font/google";
import Head from "next/head";
import { useRouter } from "next/router";
import Script from "next/script";
import { useEffect, useState } from "react";
import { LazyMotion, domAnimation } from "framer-motion";

import "../styles/globals.css";
import GuidedTourProvider from "../components/GuidedTour/GuidedTourProvider";
import { PodcastPlayerProvider } from "../contexts/PodcastPlayerContext";
import GlobalMiniPlayer from "../components/GlobalMiniPlayer";

const GA_MEASUREMENT_ID = "G-F9YN432TTH";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [transitioning, setTransitioning] = useState(false);

  useEffect(() => {
    // Respect reduced-motion preference
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const handleStart = (url: string) => {
      if (url !== router.asPath) setTransitioning(true);
    };
    const handleComplete = () => setTransitioning(false);

    router.events.on("routeChangeStart", handleStart);
    router.events.on("routeChangeComplete", handleComplete);
    router.events.on("routeChangeError", handleComplete);

    return () => {
      router.events.off("routeChangeStart", handleStart);
      router.events.off("routeChangeComplete", handleComplete);
      router.events.off("routeChangeError", handleComplete);
    };
  }, [router]);

  return (
    <LazyMotion features={domAnimation} strict>
      <div className={`${inter.variable} font-sans`}>
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
        <PodcastPlayerProvider>
          <div
            style={{
              opacity: transitioning ? 0 : 1,
              transition: "opacity 200ms cubic-bezier(0.16, 1, 0.3, 1)",
              willChange: transitioning ? "opacity" : "auto",
            }}
          >
            <GuidedTourProvider>
              <Component {...pageProps} />
            </GuidedTourProvider>
          </div>
          <GlobalMiniPlayer />
        </PodcastPlayerProvider>
      </div>
    </LazyMotion>
  );
}
