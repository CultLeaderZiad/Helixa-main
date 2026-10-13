"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { en } from "./dictionaries/en";
import { ar } from "./dictionaries/ar";

type Language = "en" | "ar";
type Dictionary = typeof en;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Dictionary;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let saved = localStorage.getItem("cyreax-language") as Language;
    if (!saved) {
      const old = localStorage.getItem("helixa-language") as Language;
      if (old === "ar" || old === "en") {
        saved = old;
        try {
          localStorage.setItem("cyreax-language", old);
          localStorage.removeItem("helixa-language");
        } catch {}
      }
    }
    if (saved === "ar" || saved === "en") {
      setLanguageState(saved);
      document.documentElement.dir = saved === "ar" ? "rtl" : "ltr";
      document.documentElement.lang = saved;
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("cyreax-language", lang);
      localStorage.removeItem("helixa-language");
    } catch {}
    if (typeof document !== "undefined") {
      document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
      document.documentElement.lang = lang;
    }
    fetch("/api/settings/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: lang }),
    }).catch(() => {})
  };

  const t = language === "ar" ? ar : en;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    // Return English by default if context is missing during SSR
    return { language: "en", setLanguage: () => {}, t: en };
  }
  return context;
};
