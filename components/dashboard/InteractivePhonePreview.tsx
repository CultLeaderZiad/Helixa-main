import React from 'react'
import { ArrowLeft, Phone, Video, Info, Camera, Image as ImageIcon, Mic, Sticker, PlusCircle } from 'lucide-react'

interface InteractivePhonePreviewProps {
  triggerText?: string
  responseText?: string
  ruleType: 'comment' | 'dm' | 'story'
}

export function InteractivePhonePreview({ triggerText, responseText, ruleType }: InteractivePhonePreviewProps) {
  return (
    <div className="sticky top-8 w-[320px] mx-auto hidden lg:block animate-in fade-in slide-in-from-right-4 duration-500">
      {/* Title */}
      <div className="flex items-center gap-2 mb-4 px-2">
        <div className="w-2 h-2 rounded-full bg-[#ffe14d] animate-pulse" />
        <span className="font-mono-ui text-[10px] uppercase tracking-widest text-[#ffe14d] font-bold">
          Interactive Preview
        </span>
      </div>

      {/* iPhone Mockup Frame */}
      <div className="relative w-full h-[650px] bg-black rounded-[40px] border-[8px] border-[#1a1a1a] shadow-2xl overflow-hidden ring-1 ring-white/10 flex flex-col">
        {/* Notch */}
        <div className="absolute top-0 inset-x-0 h-6 bg-[#1a1a1a] rounded-b-3xl w-[120px] mx-auto z-20" />
        
        {/* Status Bar */}
        <div className="h-12 w-full flex items-center justify-between px-6 text-white text-xs font-medium z-10 pt-2">
          <span>9:41</span>
          <div className="flex gap-1.5 items-center">
            <div className="w-4 h-3 bg-white rounded-[2px]" /> {/* Battery icon mock */}
          </div>
        </div>

        {/* Header */}
        <div className="px-4 pb-3 flex items-center justify-between border-b border-white/10 bg-black/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <ArrowLeft className="w-5 h-5 text-white" />
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#ffe14d] to-orange-500 p-[1px]">
                <div className="w-full h-full rounded-full bg-neutral-900 border border-black flex items-center justify-center overflow-hidden">
                  <span className="text-[10px] font-bold text-white">@</span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white leading-tight">@test_creator</span>
                <span className="text-[10px] text-neutral-400">Instagram</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-white">
            <Phone className="w-5 h-5" />
            <Video className="w-5 h-5" />
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 bg-black p-4 flex flex-col gap-4 overflow-y-auto">
          {/* Timestamp */}
          <div className="text-center text-[10px] text-neutral-500 font-medium my-2">
            Today 9:41 AM
          </div>

          {/* User Trigger Message */}
          <div className="flex justify-end animate-in slide-in-from-bottom-2 fade-in duration-300">
            <div className="bg-[#262626] text-white text-[15px] px-4 py-2.5 rounded-2xl rounded-br-sm max-w-[80%]">
              {ruleType === 'dm' && triggerText ? triggerText : ruleType === 'comment' ? `Commented on your post` : `Reacted to your story`}
            </div>
          </div>

          {/* Bot Response Message */}
          {responseText && (
            <div className="flex items-end gap-2 animate-in slide-in-from-bottom-2 fade-in duration-500 delay-300 fill-mode-both">
              <div className="w-6 h-6 rounded-full bg-neutral-800 flex-shrink-0" />
              <div className="bg-gradient-to-br from-[#ffe14d] to-yellow-500 text-black font-medium text-[15px] px-4 py-2.5 rounded-2xl rounded-bl-sm max-w-[75%] shadow-sm">
                {responseText}
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-3 pb-6 bg-[#0a0a0a] border-t border-white/10 flex items-center gap-3 z-10">
          <div className="w-8 h-8 rounded-full bg-[#262626] flex items-center justify-center flex-shrink-0">
            <Camera className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 h-9 bg-[#262626] rounded-full flex items-center px-4">
            <span className="text-neutral-500 text-sm">Message...</span>
          </div>
          <div className="flex items-center gap-3 text-white flex-shrink-0">
            <Mic className="w-5 h-5" />
            <ImageIcon className="w-5 h-5" />
            <PlusCircle className="w-5 h-5" />
          </div>
        </div>
      </div>
    </div>
  )
}
