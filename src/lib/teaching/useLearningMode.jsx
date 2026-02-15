/**
 * useLearningMode - Global state management for Learning Mode
 * Provides context for teaching features across the app
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "astroview.learning";

const defaultState = {
  learningMode: false,
  presentationMode: false,
  completedLessons: [],
  quizResults: {},
  explanationCache: {},
  tourHistory: [],
  activePrompt: null,
  points: 0,
  exploredObjects: []
};

const LearningContext = createContext(null);

/**
 * Load persisted state from localStorage
 */
const loadPersistedState = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultState;
    const parsed = JSON.parse(stored);
    return { ...defaultState, ...parsed };
  } catch {
    return defaultState;
  }
};

/**
 * Save state to localStorage
 */
const persistState = (state) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
};

/**
 * Learning Mode Provider Component
 */
export function LearningModeProvider({ children }) {
  const [state, setState] = useState(loadPersistedState);

  // Persist state changes
  useEffect(() => {
    persistState(state);
  }, [state]);

  // Toggle learning mode
  const toggleLearningMode = useCallback(() => {
    setState((prev) => ({ ...prev, learningMode: !prev.learningMode }));
  }, []);

  // Toggle presentation mode
  const togglePresentationMode = useCallback(() => {
    setState((prev) => ({ ...prev, presentationMode: !prev.presentationMode }));
  }, []);

  // Mark lesson as completed
  const completeLesson = useCallback((lessonId) => {
    setState((prev) => ({
      ...prev,
      completedLessons: prev.completedLessons.includes(lessonId)
        ? prev.completedLessons
        : [...prev.completedLessons, lessonId]
    }));
  }, []);

  // Record quiz result
  const recordQuizResult = useCallback((lessonId, score, total) => {
    setState((prev) => ({
      ...prev,
      quizResults: {
        ...prev.quizResults,
        [lessonId]: { score, total, timestamp: Date.now() }
      }
    }));
  }, []);

  // Cache AI explanation
  const cacheExplanation = useCallback((key, explanation) => {
    setState((prev) => ({
      ...prev,
      explanationCache: {
        ...prev.explanationCache,
        [key]: { text: explanation, timestamp: Date.now() }
      }
    }));
  }, []);

  // Get cached explanation (valid for 24 hours)
  const getCachedExplanation = useCallback((key) => {
    const cached = state.explanationCache[key];
    if (!cached) return null;
    const age = Date.now() - cached.timestamp;
    if (age > 24 * 60 * 60 * 1000) return null;
    return cached.text;
  }, [state.explanationCache]);

  // Show contextual learning prompt
  const showLearningPrompt = useCallback((prompt) => {
    if (!state.learningMode) return;
    setState((prev) => ({ ...prev, activePrompt: prompt }));
  }, [state.learningMode]);

  // Dismiss prompt
  const dismissPrompt = useCallback(() => {
    setState((prev) => ({ ...prev, activePrompt: null }));
  }, []);

  // Add to tour history
  const addToTourHistory = useCallback((tourId) => {
    setState((prev) => ({
      ...prev,
      tourHistory: [...prev.tourHistory.slice(-9), { tourId, timestamp: Date.now() }]
    }));
  }, []);

  const addPoints = useCallback((points, reason) => {
    if (!Number.isFinite(points) || points <= 0) return;
    setState((prev) => ({
      ...prev,
      points: prev.points + points
    }));
  }, []);

  const awardExploration = useCallback((objectId) => {
    if (!objectId) return;
    setState((prev) => {
      if (prev.exploredObjects.includes(objectId)) return prev;
      return {
        ...prev,
        exploredObjects: [...prev.exploredObjects, objectId],
        points: prev.points + 10
      };
    });
  }, []);

  // Reset all progress
  const resetProgress = useCallback(() => {
    setState({ ...defaultState, learningMode: state.learningMode });
  }, [state.learningMode]);

  const value = useMemo(() => ({
    // State
    learningMode: state.learningMode,
    presentationMode: state.presentationMode,
    completedLessons: state.completedLessons,
    quizResults: state.quizResults,
    activePrompt: state.activePrompt,
    points: state.points,
    exploredObjects: state.exploredObjects,

    // Actions
    toggleLearningMode,
    togglePresentationMode,
    completeLesson,
    recordQuizResult,
    cacheExplanation,
    getCachedExplanation,
    showLearningPrompt,
    dismissPrompt,
    addToTourHistory,
    addPoints,
    awardExploration,
    resetProgress,

    // Computed
    lessonsCompleted: state.completedLessons.length,
    isLessonCompleted: (id) => state.completedLessons.includes(id),
    getLessonScore: (id) => state.quizResults[id] || null,
    totalPoints: state.points,
    exploredCount: state.exploredObjects.length
  }), [
    state,
    toggleLearningMode,
    togglePresentationMode,
    completeLesson,
    recordQuizResult,
    cacheExplanation,
    getCachedExplanation,
    showLearningPrompt,
    dismissPrompt,
    addToTourHistory,
    addPoints,
    awardExploration,
    resetProgress
  ]);

  return (
    <LearningContext.Provider value={value}>
      {children}
    </LearningContext.Provider>
  );
}

/**
 * Hook to access learning mode context
 */
export function useLearningMode() {
  const context = useContext(LearningContext);
  if (!context) {
    throw new Error("useLearningMode must be used within LearningModeProvider");
  }
  return context;
}

export default useLearningMode;
