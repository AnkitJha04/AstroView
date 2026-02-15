/**
 * TeachingModule - Main teaching interface with guided tour and object learning
 * Professional scientific education system for AstroView
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Compass,
  Eye,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Target
} from "lucide-react";
import EducationCard, {
  EducationSection,
  KeyFact,
  ViewingTip,
  ProgressIndicator,
  StepIndicator
} from "./EducationCard";
import { useLearningMode } from "../lib/teaching/useLearningMode";
import {
  generateTour,
  getViewingTip,
  generateObjectExplanation,
  getCompassDirection,
  getTourSummary
} from "../lib/teaching/guidedTourEngine";

const AUTO_ADVANCE_DELAY = 15000; // 15 seconds per tour stop

/**
 * Object Learning Panel - Shows when an object is selected
 */
export function ObjectLearningPanel({ object, constellation, onClose }) {
  const { learningMode, cacheExplanation, getCachedExplanation, awardExploration } = useLearningMode();
  const [explanation, setExplanation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const cacheKey = object ? `obj-${object.id || object.name}` : null;

  const fetchExplanation = useCallback(async () => {
    if (!object) return;

    // Check cache first
    const cached = getCachedExplanation(cacheKey);
    if (cached) {
      setExplanation(cached);
      return;
    }

    setLoading(true);
    setError(null);

    const timeoutMs = 45000;
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    try {
      let result = "";
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
          result = await generateObjectExplanation(
            { ...object, constellation },
            controller.signal
          );
          clearTimeout(timeoutId);
          if (result) break;
        } catch (err) {
          clearTimeout(timeoutId);
          const message = err?.message || "";
          if (attempt === 0 && /failed to fetch|network/i.test(message)) {
            await sleep(800);
            continue;
          }
          throw err;
        }
      }

      if (result) {
        setExplanation(result);
        cacheExplanation(cacheKey, result);
        awardExploration(object.id || object.name);
      } else {
        setError("AI explanation unavailable");
        setExplanation(null);
      }
    } catch (err) {
      setError("Unable to generate explanation. Check AI settings and retry.");
      setExplanation(null);
    } finally {
      setLoading(false);
    }
  }, [object, constellation, cacheKey, getCachedExplanation, cacheExplanation, awardExploration]);

  useEffect(() => {
    if (learningMode && object && expanded) {
      fetchExplanation();
    }
  }, [learningMode, object, expanded, fetchExplanation]);

  if (!learningMode || !object) return null;

  return (
    <EducationCard
      title="Learn About This Object"
      subtitle={object.name}
      icon={BookOpen}
      expandable
      defaultExpanded={expanded}
      accentColor="#a78bfa"
      className="mt-4"
      loading={loading}
      headerAction={
        expanded ? null : (
          <button
            onClick={() => setExpanded(true)}
            className="px-2 py-1 rounded-full text-[10px] border border-violet-400/30 bg-violet-500/20 text-violet-200 hover:bg-violet-500/30"
          >
            Expand
          </button>
        )
      }
    >
      {error && (
        <div className="text-[11px] text-amber-300 mb-3 flex items-center justify-between gap-3">
          <span>{error}</span>
          <button
            onClick={fetchExplanation}
            className="btn-tertiary px-2 py-1"
          >
            Retry
          </button>
        </div>
      )}

      {explanation && (
        <div className="space-y-3 text-[12px] text-slate-300 leading-relaxed whitespace-pre-wrap">
          {explanation}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-white/10">
        <ViewingTip>{getViewingTip(object)}</ViewingTip>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3 text-[11px]">
        <div className="rounded-xl bg-white/5 px-3 py-2">
          <div className="text-slate-500 text-[10px]">Position</div>
          <div className="text-slate-200">
            {object.alt?.toFixed(1)}° altitude
          </div>
          <div className="text-slate-400">
            {getCompassDirection(object.az)}
          </div>
        </div>
        <div className="rounded-xl bg-white/5 px-3 py-2">
          <div className="text-slate-500 text-[10px]">Brightness</div>
          <div className="text-slate-200">
            {object.mag !== null ? `Mag ${object.mag.toFixed(2)}` : "N/A"}
          </div>
          <div className="text-slate-400">{object.type}</div>
        </div>
      </div>
    </EducationCard>
  );
}

/**
 * Guided Sky Tour Component
 */
export function GuidedTour({ objects, onCenterObject, onSelectObject, onClose }) {
  const { learningMode, addToTourHistory, awardExploration } = useLearningMode();
  const [tourIds, setTourIds] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [explanation, setExplanation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [explanationError, setExplanationError] = useState(null);
  const objectsById = useMemo(() => new Map(objects.map((obj) => [obj.id, obj])), [objects]);
  const tour = useMemo(
    () => tourIds.map((id) => objectsById.get(id)).filter(Boolean),
    [tourIds, objectsById]
  );

  // Generate tour when objects change
  useEffect(() => {
    if (!objects || objects.length === 0) return;
    const hasAny = tourIds.some((id) => objectsById.has(id));
    if (tourIds.length && hasAny) return;
    const newTour = generateTour(objects, 5);
    if (!newTour.length) return;
    setTourIds(newTour.map((obj) => obj.id));
    setCurrentStep(0);
    setExplanation(null);
    setExplanationError(null);
  }, [objects, objectsById, tourIds]);

  const currentObject = tour[currentStep] || null;
  const tourSummary = useMemo(() => getTourSummary(tour), [tour]);
  const isLastStep = currentStep >= tour.length - 1;

  // Auto-advance when playing
  useEffect(() => {
    if (!isPlaying || tour.length === 0) return;

    const timer = setTimeout(() => {
      if (currentStep < tour.length - 1) {
        setCurrentStep((prev) => prev + 1);
      } else {
        setIsPlaying(false);
      }
    }, AUTO_ADVANCE_DELAY);

    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, tour.length]);

  // Center on current object when step changes
  useEffect(() => {
    if (!tour.length) return;
    if (currentStep < tour.length) return;
    setCurrentStep(Math.max(tour.length - 1, 0));
  }, [currentStep, tour.length]);

  useEffect(() => {
    if (currentObject || !objects.length) return;
    const newTour = generateTour(objects, 5);
    if (!newTour.length) return;
    setTourIds(newTour.map((obj) => obj.id));
    setCurrentStep(0);
    setExplanation(null);
    setExplanationError(null);
  }, [currentObject, objects]);

  useEffect(() => {
    if (currentObject && onCenterObject) {
      onCenterObject(currentObject);
      onSelectObject?.(currentObject);
    }
  }, [currentObject, onCenterObject, onSelectObject]);

  const fetchTourExplanation = useCallback(() => {
    if (!currentObject) return;
    const timeoutMs = 45000;
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setExplanationError(null);

      try {
        let result = "";
        for (let attempt = 0; attempt < 2; attempt += 1) {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
          try {
            result = await generateObjectExplanation(currentObject, controller.signal);
            clearTimeout(timeoutId);
            if (result) break;
          } catch (err) {
            clearTimeout(timeoutId);
            const message = err?.message || "";
            if (attempt === 0 && /failed to fetch|network/i.test(message)) {
              await sleep(800);
              continue;
            }
            throw err;
          }
        }

        if (!cancelled) {
          if (result) {
            setExplanation(result);
            awardExploration(currentObject.id || currentObject.name);
          } else {
            setExplanation(null);
            setExplanationError("AI explanation unavailable");
          }
        }
      } catch (err) {
        if (!cancelled) {
          setExplanation(null);
          setExplanationError("AI explanation unavailable");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [currentObject, awardExploration]);

  useEffect(() => {
    const cleanup = fetchTourExplanation();
    return () => cleanup?.();
  }, [fetchTourExplanation]);

  const handleNext = () => {
    if (currentStep < tour.length - 1) {
      setCurrentStep((prev) => prev + 1);
      return;
    }
    setIsPlaying(false);
    addToTourHistory(`tour-${Date.now()}`);
    onClose?.();
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleRestart = () => {
    const newTour = generateTour(objects, 5);
    if (newTour.length) {
      setTourIds(newTour.map((obj) => obj.id));
    }
    setCurrentStep(0);
    setIsPlaying(false);
    setExplanation(null);
    setExplanationError(null);
    addToTourHistory(`tour-${Date.now()}`);
  };

  const togglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  if (!learningMode || tour.length === 0) return null;

  return (
    <EducationCard
      title="Tonight's Guided Tour"
      subtitle={`${tourSummary.count} objects to explore`}
      icon={Compass}
      accentColor="#38bdf8"
      className="mb-4"
      headerAction={
        <button
          onClick={onClose}
          className="p-1.5 rounded-full bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Close tour"
        >
          <span className="sr-only">Close</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      }
    >
      {/* Tour Summary */}
      <div className="flex items-center gap-4 mb-4 text-[10px] text-slate-500">
        <span>Types: {tourSummary.types.join(", ")}</span>
        {tourSummary.brightest && (
          <span>Brightest: {tourSummary.brightest}</span>
        )}
      </div>

      {/* Progress */}
      <ProgressIndicator
        current={currentStep + 1}
        total={tour.length}
        label="Tour Progress"
      />

      {/* Current Object */}
      {currentObject && (
        <div className="mt-4 p-4 rounded-xl bg-slate-900/50 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-lg font-semibold text-slate-100">
                {currentObject.name}
              </h4>
              <span className="text-[11px] uppercase tracking-wider text-slate-500">
                {currentObject.type}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-cyan-400" />
              <span className="text-[11px] text-cyan-300">
                {currentObject.alt?.toFixed(0)}° {getCompassDirection(currentObject.az)}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-4 text-[11px] text-slate-400">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-400/30 border-t-slate-400" />
              Loading explanation...
            </div>
          ) : explanation ? (
            <div className="text-[12px] text-slate-300 leading-relaxed mb-3 max-h-48 overflow-y-auto">
              {explanation}
            </div>
          ) : explanationError ? (
            <div className="text-[11px] text-amber-300 mb-3 flex items-center justify-between gap-3">
              <span>{explanationError}</span>
              <button
                onClick={fetchTourExplanation}
                className="btn-tertiary px-2 py-1"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="text-[11px] text-slate-400 mb-3">Select a different object.</div>
          )}

          <ViewingTip>{getViewingTip(currentObject)}</ViewingTip>
        </div>
      )}

      {/* Step Indicator */}
      <div className="mt-4">
        <StepIndicator
          steps={tour}
          currentStep={currentStep}
          onStepClick={setCurrentStep}
        />
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-4">
        <button
          onClick={handlePrev}
          disabled={currentStep === 0}
          className="flex items-center gap-1 px-3 py-2 rounded-full text-[11px] border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            className={`p-2 rounded-full border ${
              isPlaying
                ? "border-amber-400/30 bg-amber-500/20 text-amber-200"
                : "border-cyan-400/30 bg-cyan-500/20 text-cyan-200"
            }`}
            title={isPlaying ? "Pause" : "Auto-play"}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={handleRestart}
            className="p-2 rounded-full border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
            title="Restart"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={handleNext}
          disabled={tour.length === 0}
          className="flex items-center gap-1 px-3 py-2 rounded-full text-[11px] border border-cyan-400/30 bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30 disabled:opacity-30"
        >
          {isLastStep ? "Finish" : "Next"}
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* End Tour Button */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <button
          onClick={onClose}
          className="w-full px-4 py-2 rounded-full text-[11px] border border-slate-500/30 bg-slate-500/10 text-slate-300 hover:bg-slate-500/20 transition-colors"
        >
          End Tour
        </button>
      </div>
    </EducationCard>
  );
}

/**
 * Contextual Learning Prompt Banner
 */
export function LearningPromptBanner({ message, prompt, onDismiss, onLearnMore }) {
  const displayMessage = message || prompt?.message;
  if (!displayMessage) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-cyan-400/30 bg-slate-900/95 backdrop-blur-sm shadow-lg">
        <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="flex-1">
          <div className="text-[12px] text-slate-200">{displayMessage}</div>
          {prompt?.lessonId && (
            <button
              onClick={() => onLearnMore?.(prompt.lessonId)}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 mt-1"
            >
              Learn more →
            </button>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-slate-500 hover:text-slate-300 text-lg"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Presentation Mode Wrapper
 */
export function PresentationModeWrapper({ children, enabled }) {
  if (!enabled) return children;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950">
      <div className="h-full flex flex-col">
        {/* Minimal header */}
        <div className="flex items-center justify-center py-4 border-b border-white/10">
          <h1 className="text-2xl font-semibold tracking-[0.3em] uppercase text-slate-100">
            AstroView
          </h1>
        </div>
        {/* Main content with larger typography */}
        <div className="flex-1 overflow-auto p-8 text-lg">
          {children}
        </div>
      </div>
    </div>
  );
}

export default {
  ObjectLearningPanel,
  GuidedTour,
  LearningPromptBanner,
  PresentationModeWrapper
};
