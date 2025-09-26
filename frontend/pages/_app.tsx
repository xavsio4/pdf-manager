import type { AppProps } from "next/app";
import { appWithTranslation } from "next-i18next";
import { AuthProvider } from "../context/AuthContext";
import { PropertyProvider } from "../context/PropertyContext";
import { ThemeProvider } from "../context/ThemeContext";
import LanguageDetector from "../components/LanguageDetector";
import LanguageBanner from "../components/LanguageBanner";
import "../styles/globals.css";

function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <LanguageDetector>
        <AuthProvider>
          <PropertyProvider>
            <LanguageBanner />
            <Component {...pageProps} />
          </PropertyProvider>
        </AuthProvider>
      </LanguageDetector>
    </ThemeProvider>
  );
}

export default appWithTranslation(App);
