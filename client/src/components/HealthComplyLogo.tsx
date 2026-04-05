interface HealthComplyLogoProps {
  /** Height of the logo image in pixels (default: 32) */
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
  size = 32,
  showText = true,
  className = "",
}: HealthComplyLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img
        src="/logo.png"
        alt="HealthComply logo"
        style={{ height: size, width: "auto" }}
        className="object-contain"
      />
      {showText && (
        <span
          className="font-bold tracking-tight"
          style={{ fontSize: size * 0.56 }}
        >
          HealthComply
        </span>
      )}
    </div>
  );
}
