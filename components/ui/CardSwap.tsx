"use client"

import React, { useState, useEffect, Children } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'

interface CardSwapProps {
  children: React.ReactNode
  cardDistance?: number
  verticalDistance?: number
  delay?: number
  pauseOnHover?: boolean
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`w-full h-full bg-[#111110] border border-white/10 rounded-2xl p-8 shadow-2xl flex flex-col ${className}`}>
      {children}
    </div>
  )
}

export default function CardSwap({
  children,
  cardDistance = 20,
  verticalDistance = 30,
  delay = 5000,
  pauseOnHover = true
}: CardSwapProps) {
  const [cards, setCards] = useState(Children.toArray(children))
  const [isHovering, setIsHovering] = useState(false)

  useEffect(() => {
    if (pauseOnHover && isHovering) return

    const interval = setInterval(() => {
      setCards((prevCards) => {
        const newCards = [...prevCards]
        const firstCard = newCards.shift()
        if (firstCard) {
          newCards.push(firstCard)
        }
        return newCards
      })
    }, delay)

    return () => clearInterval(interval)
  }, [delay, pauseOnHover, isHovering, cards.length])

  // Framer Motion variants for the stack effect
  const variants: Variants = {
    front: { 
      scale: 1, 
      y: 0, 
      zIndex: 10, 
      opacity: 1,
      transition: { type: 'spring', stiffness: 300, damping: 20 }
    },
    middle: (index: number) => ({ 
      scale: 1 - index * 0.05, 
      y: index * verticalDistance, 
      zIndex: 10 - index, 
      opacity: 1 - index * 0.2,
      transition: { type: 'spring', stiffness: 300, damping: 20 }
    }),
    back: { 
      scale: 0.8, 
      y: verticalDistance * 3, 
      zIndex: 0, 
      opacity: 0,
      transition: { type: 'spring', stiffness: 300, damping: 20 }
    }
  }

  return (
    <div 
      className="relative w-full max-w-2xl mx-auto h-full perspective-1000"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <AnimatePresence mode="popLayout">
        {cards.map((card, index) => {
          // Identify the original key or create one
          const key = (card as React.ReactElement).key || index

          // Top card is index 0
          const isFront = index === 0
          const isVisible = index < 3
          
          return (
            <motion.div
              key={key}
              layout
              initial="back"
              animate={isFront ? "front" : isVisible ? "middle" : "back"}
              exit="back"
              custom={index}
              variants={variants}
              className="absolute inset-0 origin-top"
            >
              {card}
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
