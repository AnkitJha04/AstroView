/**
 * LessonsLibrary - Browsable micro-lessons library with categories, search, and progress
 * Implements requirement: "Micro Lessons Library - Scrollable list of mini-lessons"
 */

import { useState, useMemo, useCallback } from "react";
import { 
  Book, 
  Search, 
  Star, 
  Clock, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  Award,
  Filter,
  Sparkles,
  Satellite,
  Cloud,
  Sun,
  Zap
} from "lucide-react";
import { LESSONS, CATEGORIES, getCategoryIcon, getLessonsByCategory, getAllLessons } from "../lib/teaching/lessonSchema";
import { useLearningMode } from "../lib/teaching/useLearningMode";
import { QuizQuestion, ProgressIndicator } from "./EducationCard";

const CATEGORY_ICONS = {
  "astronomy-basics": Sun,
  "satellite-tech": Satellite,
  "weather-satellites": Cloud,
  "space-weather": Zap,
  "climate-monitoring": Sparkles
};

/**
 * Lesson card component
 */
const LessonCard = ({ lesson, onStart, completed, inProgress }) => {
  const Icon = CATEGORY_ICONS[lesson.category] || Book;
  const category = CATEGORIES[lesson.category];

  return (
    <div 
      className={`
        rounded-xl border transition-all cursor-pointer group
        ${completed 
          ? "border-emerald-500/30 bg-emerald-500/5" 
          : inProgress
            ? "border-cyan-500/40 bg-cyan-500/10"
            : "border-white/5 bg-white/5 hover:border-white/20 hover:bg-white/10"
        }
      `}
      onClick={() => onStart(lesson)}
    >
      <div className="p-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div 
            className={`
              w-10 h-10 rounded-lg flex items-center justify-center shrink-0
              ${completed 
                ? "bg-emerald-500/20 text-emerald-400" 
                : "bg-white/10 text-slate-400 group-hover:text-white"
              }
            `}
          >
            {completed ? <CheckCircle2 size={20} /> : <Icon size={20} />}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="text-[13px] font-medium text-slate-200 truncate">
              {lesson.title}
            </h4>
            <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
              {lesson.description}
            </p>
          </div>

          <ChevronRight 
            size={16} 
            className="text-slate-500 group-hover:text-slate-300 transition-colors shrink-0 mt-1" 
          />
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 mt-3 pt-2 border-t border-white/5">
          <span 
            className="text-[10px] px-2 py-0.5 rounded-full"
            style={{ 
              backgroundColor: `${category?.color || "#6b7280"}20`,
              color: category?.color || "#6b7280"
            }}
          >
            {category?.name || lesson.category}
          </span>
          
          <div className="flex items-center gap-1 text-[10px] text-slate-500">
            <Clock size={10} />
            <span>{lesson.durationMinutes ? `${lesson.durationMinutes} min` : "2 min"}</span>
          </div>

          <div className="flex items-center gap-1 text-[10px] text-slate-500">
            <Book size={10} />
            <span>{lesson.sections?.length || 0} sections</span>
          </div>

          {lesson.quiz && (
            <div className="flex items-center gap-1 text-[10px] text-amber-400">
              <Award size={10} />
              <span>Quiz</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Active lesson view with step progression and quiz
 */
const ActiveLessonView = ({ lesson, onClose, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0, completed: false });

  const step = lesson.sections?.[currentStep];
  const isLastStep = currentStep === (lesson.sections?.length || 1) - 1;
  const category = CATEGORIES[lesson.category];

  const handleNext = () => {
    if (isLastStep) {
      if (lesson.quiz) {
        setShowQuiz(true);
      } else {
        onComplete(lesson.id);
        onClose();
      }
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleQuizComplete = (correct, total) => {
    setQuizScore({ correct, total, completed: true });
    onComplete(lesson.id);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <span 
              className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ 
                backgroundColor: `${category?.color || "#6b7280"}20`,
                color: category?.color || "#6b7280"
              }}
            >
              {category?.name || lesson.category}
            </span>
            <h3 className="text-[15px] font-medium text-white mt-2">{lesson.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2"
          >
            <XCircle size={20} />
          </button>
        </div>

        {/* Progress bar */}
        {!showQuiz && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
              <span>Section {currentStep + 1} of {lesson.sections?.length || 1}</span>
              <span>{Math.round(((currentStep + 1) / (lesson.sections?.length || 1)) * 100)}%</span>
            </div>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-300"
                style={{ 
                  width: `${((currentStep + 1) / (lesson.sections?.length || 1)) * 100}%`,
                  backgroundColor: category?.color || "#38bdf8"
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {showQuiz ? (
          quizScore.completed ? (
            // Quiz results
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <Award className="text-emerald-400" size={32} />
              </div>
              <h4 className="text-[16px] font-medium text-white mb-2">Lesson Complete!</h4>
              <p className="text-[13px] text-slate-400 mb-4">
                Quiz Score: {quizScore.correct}/{quizScore.total}
              </p>
              <div className="text-[12px] text-slate-500">
                {quizScore.correct === quizScore.total 
                  ? "Perfect score! You've mastered this topic."
                  : quizScore.correct >= quizScore.total / 2
                    ? "Good job! Review the lesson to improve further."
                    : "Consider reviewing this lesson again."}
              </div>
            </div>
          ) : (
            // Quiz
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-[14px] font-medium text-white flex items-center gap-2">
                  <Award size={16} className="text-amber-400" />
                  Quick Check
                </h4>
                <button
                  onClick={() => {
                    onComplete(lesson.id);
                    onClose();
                  }}
                  className="text-[11px] text-slate-500 hover:text-slate-300"
                >
                  Skip Quiz
                </button>
              </div>
              <LessonQuiz 
                questions={lesson.quiz} 
                onComplete={handleQuizComplete}
              />
            </div>
          )
        ) : (
          // Lesson step content
          <div className="animate-fadeIn">
            <h4 className="text-[14px] font-medium text-white mb-3">{step?.title}</h4>
            <div className="text-[12px] text-slate-300 leading-relaxed whitespace-pre-wrap">
              {step?.content}
            </div>
            {step?.diagramType && (
              <div className="mt-4 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                <div className="text-[10px] text-cyan-400 font-medium mb-1">Diagram</div>
                <div className="text-[11px] text-slate-300">{step.diagramType}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {!showQuiz || !quizScore.completed ? (
        !showQuiz && (
          <div className="shrink-0 p-4 border-t border-white/10">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
                disabled={currentStep === 0}
                className="px-4 py-2 text-[12px] text-slate-400 hover:text-slate-200 disabled:opacity-30"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                className="px-6 py-2 rounded-lg text-[12px] font-medium bg-cyan-500 text-white hover:bg-cyan-400 transition-colors"
              >
                {isLastStep ? (lesson.quiz ? "Take Quiz" : "Complete") : "Next"}
              </button>
            </div>
            <button
              onClick={onClose}
              className="w-full mt-3 px-4 py-2 rounded-lg text-[11px] text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
            >
              Exit Lesson
            </button>
          </div>
        )
      ) : (
        <div className="shrink-0 p-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="w-full px-6 py-2 rounded-lg text-[12px] font-medium bg-emerald-500 text-white hover:bg-emerald-400 transition-colors"
          >
            Back to Library
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Quiz component for lessons
 */
const LessonQuiz = ({ questions, onComplete }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResult, setShowResult] = useState(false);

  const question = questions[currentQuestion];

  const handleAnswer = (answer) => {
    const newAnswers = { ...answers, [currentQuestion]: answer };
    setAnswers(newAnswers);
    setShowResult(true);
  };

  const handleNext = () => {
    setShowResult(false);
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      // Calculate score
      const correct = questions.reduce((sum, q, i) => 
        sum + (answers[i] === q.correctIndex ? 1 : 0), 0);
      onComplete(correct, questions.length);
    }
  };

  const isCorrect = answers[currentQuestion] === question.correctIndex;

  return (
    <div>
      <div className="text-[10px] text-slate-500 mb-2">
        Question {currentQuestion + 1} of {questions.length}
      </div>

      <div className="text-[13px] text-white font-medium mb-4">
        {question.question}
      </div>

      <div className="space-y-2">
        {question.options.map((option, i) => {
          const isSelected = answers[currentQuestion] === i;
          const isAnswer = question.correctIndex === i;

          return (
            <button
              key={i}
              onClick={() => !showResult && handleAnswer(i)}
              disabled={showResult}
              className={`
                w-full p-3 rounded-lg text-left text-[12px] transition-all
                ${showResult
                  ? isAnswer
                    ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-200"
                    : isSelected
                      ? "bg-red-500/20 border-red-500/50 text-red-200"
                      : "bg-white/5 border-white/10 text-slate-400"
                  : isSelected
                    ? "bg-cyan-500/20 border-cyan-500/50 text-white"
                    : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                }
                border
              `}
            >
              {option}
            </button>
          );
        })}
      </div>

      {showResult && (
        <div className="mt-4">
          <div className={`text-[11px] ${isCorrect ? "text-emerald-400" : "text-red-400"} mb-3`}>
            {isCorrect ? "Correct!" : `Incorrect. The answer is: ${question.options[question.correctIndex]}`}
          </div>
          <button
            onClick={handleNext}
            className="w-full px-4 py-2 rounded-lg text-[12px] font-medium bg-cyan-500 text-white hover:bg-cyan-400"
          >
            {currentQuestion < questions.length - 1 ? "Next Question" : "See Results"}
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * Main Lessons Library component
 */
export default function LessonsLibrary({ visible = true, onClose }) {
  const { completedLessons, completeLesson } = useLearningMode();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(null);
  const [activeLesson, setActiveLesson] = useState(null);

  const allLessons = useMemo(() => getAllLessons(), []);

  const filteredLessons = useMemo(() => {
    let lessons = activeCategory 
      ? getLessonsByCategory(activeCategory)
      : allLessons;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      lessons = lessons.filter(l => 
        l.title.toLowerCase().includes(query) ||
        l.description.toLowerCase().includes(query) ||
        l.tags?.some(k => k.toLowerCase().includes(query))
      );
    }

    return lessons;
  }, [allLessons, activeCategory, searchQuery]);

  const completedCount = useMemo(() => 
    allLessons.filter(l => completedLessons.includes(l.id)).length,
    [allLessons, completedLessons]
  );

  const handleStartLesson = useCallback((lesson) => {
    setActiveLesson(lesson);
  }, []);

  const handleCompleteLesson = useCallback((lessonId) => {
    completeLesson(lessonId);
  }, [completeLesson]);

  if (!visible) return null;

  return (
    <div className="h-full flex flex-col bg-slate-900/95 backdrop-blur-xl">
      {activeLesson ? (
        <ActiveLessonView
          lesson={activeLesson}
          onClose={() => setActiveLesson(null)}
          onComplete={handleCompleteLesson}
        />
      ) : (
        <>
          {/* Header */}
          <div className="shrink-0 p-4 border-b border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Book className="text-white" size={20} />
                </div>
                <div>
                  <h2 className="text-[15px] font-semibold text-white">Lessons Library</h2>
                  <p className="text-[11px] text-slate-400">
                    {completedCount}/{allLessons.length} completed
                  </p>
                </div>
              </div>
              {onClose && (
                <button onClick={onClose} className="text-slate-400 hover:text-white p-2">
                  <XCircle size={20} />
                </button>
              )}
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search lessons..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-[12px] text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            {/* Category filters */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
              <button
                onClick={() => setActiveCategory(null)}
                className={`
                  shrink-0 px-3 py-1.5 rounded-full text-[11px] transition-all
                  ${!activeCategory 
                    ? "bg-cyan-500 text-white" 
                    : "bg-white/5 text-slate-400 hover:bg-white/10"
                  }
                `}
              >
                All
              </button>
              {Object.entries(CATEGORIES).map(([id, cat]) => {
                const Icon = CATEGORY_ICONS[id] || Filter;
                return (
                  <button
                    key={id}
                    onClick={() => setActiveCategory(id)}
                    className={`
                      shrink-0 px-3 py-1.5 rounded-full text-[11px] transition-all flex items-center gap-1.5
                      ${activeCategory === id 
                        ? "text-white" 
                        : "bg-white/5 text-slate-400 hover:bg-white/10"
                      }
                    `}
                    style={activeCategory === id ? { backgroundColor: cat.color } : {}}
                  >
                    <Icon size={12} />
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lessons list */}
          <div className="flex-1 overflow-y-auto p-4">
            {filteredLessons.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Book size={32} className="mx-auto mb-3 opacity-50" />
                <p className="text-[13px]">No lessons found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLessons.map(lesson => (
                  <LessonCard
                    key={lesson.id}
                    lesson={lesson}
                    onStart={handleStartLesson}
                    completed={completedLessons.includes(lesson.id)}
                    inProgress={false}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Progress footer */}
          <div className="shrink-0 p-4 border-t border-white/10">
            <ProgressIndicator
              current={completedCount}
              total={allLessons.length}
              label="Overall Progress"
            />
          </div>
        </>
      )}
    </div>
  );
}
