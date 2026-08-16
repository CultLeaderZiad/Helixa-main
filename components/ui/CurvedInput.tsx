"use client";

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";

interface CurvedInputProps {
  placeholder?: string;
  buttonText?: string;
  theme?: "light" | "dark";
  bend?: number;
  height?: number;
  className?: string;
}

export default function CurvedInput({
  placeholder = "yourname@xyz.com",
  buttonText = "Get Started",
  theme = "dark",
  bend = 28,
  height = 64,
  className = "",
}: CurvedInputProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) throw new Error("Failed to subscribe");

      toast.success("Subscribed successfully!");
      setEmail("");
    } catch (error) {
      toast.error("Failed to subscribe. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const isDark = theme === "dark";
  const bg = isDark ? "#111111" : "#ffffff";
  const border = isDark ? "#333333" : "#e5e5e5";
  const text = isDark ? "#ffffff" : "#000000";
  const buttonBg = isDark ? "#ffffff" : "#000000";
  const buttonTextCol = isDark ? "#000000" : "#ffffff";

  return (
    <div className={`relative max-w-md w-full mx-auto ${className}`}>
      <form onSubmit={handleSubmit} className="relative w-full flex" style={{ height: `${height}px` }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={placeholder}
          required
          className="w-full h-full pl-6 pr-[120px] rounded-full outline-none transition-all duration-300"
          style={{
            backgroundColor: bg,
            color: text,
            border: `1px solid ${border}`,
            borderRadius: `${bend}px`,
          }}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="absolute right-2 top-2 bottom-2 px-4 rounded-full font-medium transition-transform hover:scale-105 active:scale-95 disabled:opacity-70 disabled:hover:scale-100 flex items-center justify-center"
          style={{
            backgroundColor: buttonBg,
            color: buttonTextCol,
            borderRadius: `${bend - 8}px`,
            minWidth: "100px"
          }}
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : buttonText}
        </button>
      </form>
    </div>
  );
}
