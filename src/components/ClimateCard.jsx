/**
 * ClimateCard - Reusable glass panel card component for climate data
 */

export default function ClimateCard({
  title,
  subtitle,
  icon: Icon,
  children,
  className = "",
  headerAction,
  loading = false,
  error = null
}) {
  return (
    <div
      className={`rounded-3xl panel-glass panel-hover px-5 py-4 transition-all duration-300 ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
              <Icon className="w-4 h-4 text-white" />
            </div>
          )}
          <div>
            <h3 className="text-title">
              {title}
            </h3>
            {subtitle && (
              <span className="text-label">{subtitle}</span>
            )}
          </div>
        </div>
        {headerAction}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-6">
          <div className="flex items-center gap-3 text-xs text-cyan-200">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-200/30 border-t-cyan-200" />
            Loading...
          </div>
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl bg-rose-500/10 border border-rose-400/20 px-3 py-2 text-[11px] text-rose-300">
          {error}
        </div>
      )}

      {!loading && !error && children}
    </div>
  );
}

/**
 * Stat item for displaying key-value pairs
 */
export function ClimateStatItem({ label, value, unit, color, size = "normal" }) {
  const valueSize = size === "large" ? "text-2xl" : "text-sm";
  
  return (
    <div className="flex flex-col">
      <span className="text-label">
        {label}
      </span>
      <span
        className={`${valueSize} text-value`}
        style={{ color: color || "#e2e8f0" }}
      >
        {value}
        {unit && <span className="text-xs text-slate-400 ml-1">{unit}</span>}
      </span>
    </div>
  );
}

/**
 * Risk badge component
 */
export function RiskBadge({ level, color }) {
  return (
    <span
      className="px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-semibold border"
      style={{
        backgroundColor: `${color}20`,
        borderColor: `${color}40`,
        color: color
      }}
    >
      {level}
    </span>
  );
}

/**
 * Progress bar component
 */
export function ClimateProgress({ value, max = 100, color = "#22c55e", label }) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  return (
    <div className="space-y-1">
      {label && (
        <div className="flex justify-between text-[10px] text-slate-400">
          <span>{label}</span>
          <span>{value}/{max}</span>
        </div>
      )}
      <div className="h-2 rounded-full bg-slate-800/50 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            backgroundColor: color
          }}
        />
      </div>
    </div>
  );
}
