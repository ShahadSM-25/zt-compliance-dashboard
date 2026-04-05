interface HealthComplyLogoProps {
  /** Height of the logo image in pixels (default: 40) */
  size?: number;
  /** Whether to show the text "HealthComply" beside the logo (default: true) */
  showText?: boolean;
  className?: string;
}

/**
 * HealthComply brand logo component.
 * Uses the official palm-tree shield emblem PNG asset.
 * The image is sized to match the accompanying text height.
 */
export function HealthComplyLogo({
  size = 40,
  showText = true,
  className = "",
}: HealthComplyLogoProps) {
  // Font size matches the text label
  const fontSize = Math.max(size * 0.5, 14);
  // Image height is 1.6× the font size so the shield visually matches the text cap-height
  const imgHeight = fontSize * 1.6;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img
        src="/logo.png"
        alt="HealthComply logo"
        style={{ height: imgHeight, width: "auto" }}
        className="object-contain flex-shrink-0"
      />
      {showText && (
        <span
          className="font-bold tracking-tight whitespace-nowrap"
          style={{ fontSize }}
        >
          HealthComply
        </span>
      )}
    </div>
  );
}
