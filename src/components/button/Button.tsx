import React, { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = {
  accentColor: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = ({
  accentColor,
  children,
  className = "",
  disabled,
  ...allProps
}: ButtonProps) => {
  React.useEffect(() => {
    document.documentElement.style.setProperty('--theme-color', accentColor);
    document.documentElement.style.setProperty('--theme-hover', `${accentColor}1A`); // 10% opacity
    document.documentElement.style.setProperty('--theme-border', `${accentColor}33`); // 20% opacity
    document.documentElement.style.setProperty('--theme-shadow', `${accentColor}4D`); // 30% opacity
  }, [accentColor]);

  return (
    <button
      className={`theme-button px-3 py-1 rounded-md ${className}`}
      disabled={disabled}
      {...allProps}
    >
      {children}
    </button>
  );
};
