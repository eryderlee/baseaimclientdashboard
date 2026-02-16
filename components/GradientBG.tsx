"use client";

export default function GradientBG() {
  return (
    <div className="moving-gradient-hero" aria-hidden="true">
      <div className="gradient-base" />
      <div className="wave-layer wave-1" />
      <div className="wave-layer wave-2" />
      <div className="wave-layer wave-3" />
      <div className="wave-layer wave-4" />
      <div className="wave-layer wave-5" />
      <div className="gradient-overlay" />
    </div>
  );
}
