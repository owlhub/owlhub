"use client";

import React from 'react';
import Image from 'next/image';

interface AppIconProps {
  iconName: string | undefined;
  size?: number;
  className?: string;
}

/**
 * AppIcon component for displaying app icons
 * 
 * @param iconName - The name of the icon (e.g., 'gitlab', 'jira')
 * @param size - The size of the icon in pixels (default: 24)
 * @param className - Additional CSS classes
 */
export default function AppIcon({ iconName, size = 24, className = '' }: AppIconProps) {
  // If no icon name is provided, return a fallback icon
  if (!iconName) {
    return <span className={`text-2xl ${className}`}>🔌</span>;
  }

  // Path to the SVG icon
  const iconPath = `/assets/app-icons/${iconName.toLowerCase()}.svg`;

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size, display: 'inline-block' }}>
      <Image
        src={iconPath}
        alt={`${iconName} icon`}
        width={size}
        height={size}
        style={{ objectFit: 'contain' }}
        onError={(e) => {
          // If the image fails to load, replace with fallback
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent) {
            parent.innerHTML = '🔌';
            parent.className = `text-2xl ${className}`;
          }
        }}
      />
    </div>
  );
}
