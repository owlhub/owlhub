"use client";

import React, { ReactNode } from "react";

interface PopupButton {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
  style?: React.CSSProperties;
  isDisabled?: boolean;
}

interface PopupProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  buttons: PopupButton[];
  className?: string;
  style?: React.CSSProperties;
  backdropClassName?: string;
}

export default function Popup({
  isOpen,
  onClose,
  title,
  children,
  buttons,
  className = "",
  style = {},
  backdropClassName = "backdrop-blur-sm",
}: PopupProps) {
  if (!isOpen) return null;

  // Handle button styling based on variant
  const getButtonStyles = (variant: PopupButton["variant"] = "secondary") => {
    switch (variant) {
      case "primary":
        return {
          className: "px-4 py-2 rounded-md text-white transition-colors hover:bg-blue-700",
          style: { background: "var(--primary-blue)" },
        };
      case "danger":
        return {
          className: "px-4 py-2 rounded-md text-white transition-colors hover:bg-red-700",
          style: { background: "var(--error)" },
        };
      case "secondary":
      default:
        return {
          className: "px-4 py-2 rounded-md transition-colors hover:bg-[rgba(222,235,255,0.9)] hover:text-[#0052CC]",
          style: { border: "1px solid var(--border-color)" },
        };
    }
  };

  return (
    <div 
      className={`fixed inset-0 flex items-center justify-center z-50 ${backdropClassName}`}
      onClick={onClose}
    >
      <div 
        className={`bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl ${className}`}
        style={{ background: "var(--card-bg)", color: "var(--foreground)", ...style }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <div className="mb-6">
          {children}
        </div>
        <div className="flex justify-end space-x-3">
          {buttons.map((button, index) => {
            const buttonStyles = getButtonStyles(button.variant);
            return (
              <button
                key={index}
                onClick={button.onClick}
                className={button.className || buttonStyles.className}
                style={button.style || buttonStyles.style}
                disabled={button.isDisabled}
              >
                {button.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
