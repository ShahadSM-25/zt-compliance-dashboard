interface HealthComplyLogoProps {
  /**
   * Logical size unit (default: 40).
   * The image height is set to this value directly in px.
   */
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
        style={{ height: size, width: size }}
        className="object-contain flex-shrink-0"
      />
      {showText && (
        <span
          className="font-bold tracking-tight whitespace-nowrap"
          style={{ fontSize: size * 0.45 }}
        >
          HealthComply
        </span>
      )}
    </div>
  );
}
