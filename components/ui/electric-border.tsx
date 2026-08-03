import React from 'react';
import styles from './electric-border.module.css';

interface ElectricBorderProps {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  color?: string;
  borderWidth?: number;
  borderRadius?: number;
  speed?: number;
}

export default function ElectricBorder({
  children,
  className = '',
  containerClassName = '',
  color = '#ffe14d',
  borderWidth = 2,
  borderRadius = 16,
  speed = 4,
}: ElectricBorderProps) {
  return (
    <div
      className={`${styles.electricBorderContainer} ${containerClassName}`}
      style={{
        borderRadius: `${borderRadius}px`,
        padding: `${borderWidth}px`,
        '--eb-color': color,
        '--eb-speed': `${speed}s`,
        '--eb-radius': `${borderRadius}px`,
      } as React.CSSProperties}
    >
      <div className={styles.electricBorderEffect} />
      <div 
        className={`${styles.electricBorderContent} ${className}`}
        style={{ borderRadius: `${Math.max(0, borderRadius - borderWidth)}px` }}
      >
        {children}
      </div>
    </div>
  );
}
