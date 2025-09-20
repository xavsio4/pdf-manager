import type { AppProps } from "next/app";
import { appWithTranslation } from "next-i18next";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";
import LanguageDetector from "../components/LanguageDetector";
import LanguageBanner from "../components/LanguageBanner";
import "../styles/globals.css";

function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <LanguageDetector>
        <AuthProvider>
          <LanguageBanner />
          <Component {...pageProps} />
        </AuthProvider>
      </LanguageDetector>
    </ThemeProvider>
  );
}

export default appWithTranslation(App);
