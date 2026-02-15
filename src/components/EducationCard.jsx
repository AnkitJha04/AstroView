/**
 * EducationCard - Reusable educational content card component
 * Scientific glass panel design matching AstroView theme
 */

import { ChevronDown, ChevronUp, Lightbulb } from "lucide-react";
import { useState } from "react";

/**
 * Main education card with expand/collapse
 */
export default function EducationCard({
  title,
  subtitle,
  icon: Icon,
  children,
  expandable = false,
  defaultExpanded = false,
  accentColor = "#38bdf8",
  className = "",
  loading = false,
  headerAction
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/90 to-slate-950/90 backdrop-blur-sm transition-all duration-300 ${className}`}
      style={{ borderColor: `${accentColor}20` }}
    >
      <div
        className={`flex items-center justify-between px-4 py-3 ${
          expandable ? "cursor-pointer hover:bg-white/5" : ""
        }`}
        onClick={expandable ? () => setExpanded(!expanded) : undefined}
      >
        <div className="flex items-center gap-3">
          {Icon && (
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${accentColor}20`, borderColor: `${accentColor}30` }}
            >
              <Icon className="w-4 h-4" style={{ color: accentColor }} />
            </div>
          )}
          <div>
            <h3 className="text-sm font-medium text-slate-100">{title}</h3>
            {subtitle && (
              <span className="text-[10px] text-slate-500">{subtitle}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {headerAction}
          {expandable && (
            <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center">
              {expanded ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="px-4 pb-4">
          <div className="flex items-center justify-center py-6">
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400/30 border-t-slate-400" />
              Loading...
            </div>
          </div>
        </div>
      )}

      {!loading && (!expandable || expanded) && children && (
        <div className="px-4 pb-4 animate-in fade-in duration-200">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Section within an education card
 */
export function EducationSection({ title, children, icon: Icon }) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex items-center gap-2 mb-2">
        {Icon && <Icon className="w-3.5 h-3.5 text-slate-500" />}
        <h4 className="text-[11px] uppercase tracking-wider text-slate-400 font-medium">
          {title}
        </h4>
      </div>
      <div className="text-[12px] text-slate-300 leading-relaxed">
        {children}
      </div>
    </div>
  );
}

/**
 * Key fact highlight box
 */
export function KeyFact({ children, icon: Icon = Lightbulb }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-amber-500/10 border border-amber-400/20 px-3 py-2.5 my-3">
      <Icon className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
      <div className="text-[11px] text-amber-200/90 leading-relaxed">
        {children}
      </div>
    </div>
  );
}

/**
 * Viewing tip box
 */
export function ViewingTip({ children }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-cyan-500/10 border border-cyan-400/20 px-3 py-2.5 my-3">
      <div className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
        <span className="text-[10px] text-cyan-400">👁</span>
      </div>
      <div className="text-[11px] text-cyan-200/90 leading-relaxed">
        <span className="font-medium">Viewing Tip:</span> {children}
      </div>
    </div>
  );
}

/**
 * Quiz question component
 */
export function QuizQuestion({
  question,
  options,
  correctIndex,
  explanation,
  onAnswer
}) {
  const [selected, setSelected] = useState(null);
  const [showResult, setShowResult] = useState(false);

  const handleSelect = (index) => {
    if (showResult) return;
    setSelected(index);
    setShowResult(true);
    onAnswer?.(index === correctIndex);
  };

  return (
    <div className="space-y-3">
      <div className="text-[13px] text-slate-200 font-medium">
        {question}
      </div>
      <div className="space-y-2">
        {options.map((option, index) => {
          const isSelected = selected === index;
          const isCorrect = index === correctIndex;
          const showCorrect = showResult && isCorrect;
          const showWrong = showResult && isSelected && !isCorrect;

          return (
            <button
              key={index}
              onClick={() => handleSelect(index)}
              disabled={showResult}
              className={`w-full text-left px-3 py-2.5 rounded-xl border text-[12px] transition-all ${
                showCorrect
                  ? "border-green-400/40 bg-green-500/20 text-green-200"
                  : showWrong
                    ? "border-rose-400/40 bg-rose-500/20 text-rose-200"
                    : isSelected
                      ? "border-cyan-400/40 bg-cyan-500/20 text-cyan-100"
                      : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
              }`}
            >
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/10 mr-2 text-[10px]">
                {String.fromCharCode(65 + index)}
              </span>
              {option}
            </button>
          );
        })}
      </div>

      {showResult && (
        <div
          className={`rounded-xl px-3 py-2.5 text-[11px] ${
            selected === correctIndex
              ? "bg-green-500/10 border border-green-400/20 text-green-200"
              : "bg-amber-500/10 border border-amber-400/20 text-amber-200"
          }`}
        >
          <span className="font-medium">
            {selected === correctIndex ? "Correct! " : "Not quite. "}
          </span>
          {explanation}
        </div>
      )}
    </div>
  );
}

/**
 * Progress indicator for tours/lessons
 */
export function ProgressIndicator({ current, total, label }) {
  const percentage = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px] text-slate-500">
        <span>{label}</span>
        <span>{current} / {total}</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-800/50 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Step indicator for guided tours
 */
export function StepIndicator({ steps, currentStep, onStepClick }) {
  return (
    <div className="flex items-center justify-center gap-1.5">
      {steps.map((_, index) => (
        <button
          key={index}
          onClick={() => onStepClick?.(index)}
          className={`w-2 h-2 rounded-full transition-all ${
            index === currentStep
              ? "w-6 bg-cyan-400"
              : index < currentStep
                ? "bg-cyan-400/50"
                : "bg-slate-600"
          }`}
        />
      ))}
    </div>
  );
}

/**
 * Learning mode toggle button
 */
export function LearningModeToggle({ enabled, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] border transition-all ${
        enabled
          ? "border-emerald-400/40 bg-emerald-500/20 text-emerald-100"
          : "border-white/10 bg-white/5 text-slate-400 hover:text-slate-200"
      }`}
    >
      <Lightbulb className="w-3.5 h-3.5" />
      {enabled ? "Learning Mode" : "Explore Mode"}
    </button>
  );
}
