import React from "react";
import { renderLogoSvg } from "./LogoSvg";

interface LogoProps {
  className?: string;
  size?: number;
}

export default function Logo({ className = "w-10 h-10", size = 40 }: LogoProps) {
  const svgHtml = renderLogoSvg(size);
  
  return (
    <div
      className={`${className} transition-transform duration-300 hover:scale-105 flex items-center justify-center`}
      style={{ minWidth: size, minHeight: size }}
      dangerouslySetInnerHTML={{ __html: svgHtml }}
    />
  );
}
