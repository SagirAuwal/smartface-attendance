import { NextResponse } from "next/server";
import { renderLogoSvg } from "../components/LogoSvg";

export async function GET() {
  const svgString = renderLogoSvg(32);
  
  return new NextResponse(svgString, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
