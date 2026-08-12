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
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-mono-ui uppercase tracking-wider text-neutral-500 hover:text-white hover:bg-white/[0.06] transition-colors"
      title={language === "en" ? "Switch to Arabic" : "Switch to English"}
    >
      <span className="text-[13px]">{language === "en" ? "ع" : "A"}</span>
      <span className="text-neutral-600">/</span>
      <span className={language === "en" ? "text-neutral-600" : "font-bold text-white"}>{language === "en" ? "EN" : "AR"}</span>
    </button>
  );
}
