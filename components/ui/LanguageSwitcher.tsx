"use client";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "ar" : "en");
  };

  return (
    <Button 
      variant="ghost" 
      size="sm" 
      onClick={toggleLanguage}
      className="flex items-center gap-2 text-zinc-400 hover:text-white"
    >
      <Globe className="w-4 h-4" />
      <span className="font-medium text-xs uppercase">{language === "en" ? "AR" : "EN"}</span>
    </Button>
  );
}
