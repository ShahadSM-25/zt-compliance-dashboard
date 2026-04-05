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
 */
export function HealthComplyLogo({
  size = 40,
  showText = true,
  className = "",
}: HealthComplyLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img
        src="/logo.png"
        alt="HealthComply logo"
        style={{ height: size, width: "auto", minWidth: size * 0.8 }}
        className="object-contain flex-shrink-0"
      />
      {showText && (
        <span
          className="font-bold tracking-tight whitespace-nowrap"
          style={{ fontSize: Math.max(size * 0.5, 14) }}
        >
          HealthComply
        </span>
      )}
    </div>
  );
}
