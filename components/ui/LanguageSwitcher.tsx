"use client";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "ar" : "en");
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-semibold uppercase tracking-wider bg-white/5 border border-white/10 text-neutral-300 hover:text-white hover:bg-white/10 transition-all backdrop-blur-sm"
      title={language === "en" ? "Switch to Arabic" : "Switch to English"}
    >
      <span className={language === "en" ? "text-neutral-400" : "font-bold text-white text-base"}>ع</span>
      <span className="text-neutral-600 font-light">|</span>
      <span className={language === "en" ? "font-bold text-white text-base" : "text-neutral-400"}>EN</span>
    </button>
  );
}
