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
      className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider bg-white/10 border border-white/20 shadow-md text-neutral-200 hover:text-white hover:bg-white/20 transition-all backdrop-blur-md"
      title={language === "en" ? "Switch to Arabic" : "Switch to English"}
    >
      <span className={language === "en" ? "text-neutral-400 font-medium" : "text-[#ffe14d] font-black text-lg drop-shadow-sm"}>ع</span>
      <span className="text-white/30 font-light">|</span>
      <span className={language === "en" ? "text-[#ffe14d] font-black text-lg drop-shadow-sm" : "text-neutral-400 font-medium"}>EN</span>
    </button>
  );
}
