// src/pages/student/Quizzes.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiClipboardList, HiRefresh, HiSparkles, HiClock,
  HiAcademicCap, HiCheckCircle, HiPlay, HiArrowRight,
  HiArrowLeft, HiSearch, HiChartBar, HiBadgeCheck, HiStar,
  HiDocumentText,
} from 'react-icons/hi';
import toast from 'react-hot-toast';

import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Loader from '../../components/common/Loader';
import { studentApi } from '../../api/studentApi';
import { quizApi } from '../../api/quizApi';
import { staggerContainer, slideUp } from '../../utils/constants';
import { formatDate, cn } from '../../utils/helpers';

// localStorage key for completed quiz IDs
const STORAGE_KEY = 'lms_completed_quizzes';

const StudentQuizzes = () => {
  const [myCourses, setMyCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [quizzes, setQuizzes] = useState([]);
  const [search, setSearch] = useState('');
  const [pageLoading, setPageLoading] = useState(true);
  const [quizLoading, setQuizLoading] = useState(false);

  // completed quiz IDs from localStorage
  const [completedIds, setCompletedIds] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
    } catch { return new Set(); }
  });

  // quiz taking
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({}); // { [questionId]: answerText }
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTaking, setIsTaking] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // result
  const [result, setResult] = useState(null);
  const [isResultOpen, setIsResultOpen] = useState(false);

  // persist completed IDs
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...completedIds]));
    } catch { /* ignore */ }
  }, [completedIds]);

  // ── Fetch courses ────────────────────────────────────────
  const fetchCourses = async () => {
    setPageLoading(true);
    try {
      const res = await studentApi.getMyCourses();
      const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setMyCourses(list);
      if (list.length > 0) {
        const first = list[0]._id;
        setSelectedCourseId(first);
        await fetchQuizzes(first);
      }
    } catch (err) {
      console.error('fetchCourses error:', err);
    } finally {
      setPageLoading(false);
    }
  };

  // ── Fetch quizzes for a course ───────────────────────────
  const fetchQuizzes = async (courseId) => {
    if (!courseId) return;
    setQuizLoading(true);
    try {
      const res = await quizApi.getCourseQuizzes(courseId);
      const list = Array.isArray(res.data) ? res.data : [];
      setQuizzes(list);
    } catch (err) {
      console.error('fetchQuizzes error:', err);
      setQuizzes([]);
    } finally {
      setQuizLoading(false);
    }
  };

  useEffect(() => { fetchCourses(); }, []); // eslint-disable-line

  useEffect(() => {
    if (selectedCourseId) fetchQuizzes(selectedCourseId);
  }, [selectedCourseId]); // eslint-disable-line

  // ── Timer ────────────────────────────────────────────────
  useEffect(() => {
    if (!isTaking || timeLeft <= 0) return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(id); handleSubmit(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isTaking, timeLeft]); // eslint-disable-line

  // ── Derived ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search) return quizzes;
    const s = search.toLowerCase();
    return quizzes.filter((q) => q.title?.toLowerCase().includes(s));
  }, [quizzes, search]);

  const stats = useMemo(() => ({
    total: quizzes.length,
    completed: quizzes.filter((q) => completedIds.has(q._id)).length,
    pending: quizzes.filter((q) => !completedIds.has(q._id)).length,
  }), [quizzes, completedIds]);

  // ── Helpers ──────────────────────────────────────────────
  const fmtTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const scoreColor = (pct) => pct >= 75 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600';

  const scoreGradient = (pct) =>
    pct >= 75 ? 'from-green-400 to-green-600' : pct >= 50 ? 'from-amber-400 to-amber-600' : 'from-red-400 to-red-600';

  // ── Start quiz ───────────────────────────────────────────
  const handleStart = (quiz) => {
    setActiveQuiz(quiz);
    setCurrentQ(0);
    setAnswers({});
    setTimeLeft(quiz.duration * 60);
    setIsTaking(true);
  };

  // ── Select answer ────────────────────────────────────────
  const handleSelect = (qId, answer) => {
    setAnswers((prev) => ({ ...prev, [qId]: answer }));
  };

  // ── Submit quiz ──────────────────────────────────────────
  const handleSubmit = async (auto = false) => {
    if (!activeQuiz || submitting) return;
    setSubmitting(true);

    const payload = activeQuiz.questions.map((q) => ({
      questionId: q._id,
      answer: answers[q._id] || '',
    }));

    try {
      const res = await quizApi.submitQuiz({ quizId: activeQuiz._id, answers: payload });
      const data = res.data.submission || res.data;

      setCompletedIds((prev) => new Set([...prev, activeQuiz._id]));

      const totalMarks = activeQuiz.totalMarks || 10;
      const pct = Math.round(((data.weightedScore || 0) / totalMarks) * 100);

      setResult({
        score: data.score,
        weightedScore: data.weightedScore,
        totalMarks: totalMarks,
        totalQuestions: activeQuiz.questions.length,
        pct,
        hasDescriptive: activeQuiz.questions.some((q) => q.type === 'descriptive'),
      });
      setIsTaking(false);
      setActiveQuiz(null);
      setIsResultOpen(true);

      if (selectedCourseId) fetchQuizzes(selectedCourseId);
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || 'Submission failed';
      toast.error(msg);
      setIsTaking(false);
      setActiveQuiz(null);
    } finally {
      setSubmitting(false);
    }
  };

  // ── QUIZ TAKING UI ───────────────────────────────────────
  if (isTaking && activeQuiz) {
    const q = activeQuiz.questions[currentQ];
    const total = activeQuiz.questions.length;
    const progress = ((currentQ + 1) / total) * 100;
    const urgent = timeLeft < 60;
    const isLast = currentQ === total - 1;
    const answeredCount = Object.keys(answers).length;

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen flex flex-col">
        {/* Top bar */}
        <div className="sticky top-0 z-20 bg-white border-b border-dark-200 shadow-sm px-4 py-3">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between gap-4 mb-3">
              <div className="min-w-0">
                <p className="font-bold text-dark-900 truncate">{activeQuiz.title}</p>
                <p className="text-xs text-dark-500">Question {currentQ + 1} of {total}</p>
              </div>
              <div className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-lg border-2 shrink-0',
                urgent ? 'bg-red-50 border-red-300 text-red-700 animate-pulse' : 'bg-primary-50 border-primary-200 text-primary-700'
              )}>
                <HiClock className="w-5 h-5" />
                {fmtTime(timeLeft)}
              </div>
            </div>
            <div className="w-full h-2 bg-dark-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </div>

        {/* Question */}
        <div className="flex-1 overflow-y-auto py-8 px-4">
          <div className="max-w-3xl mx-auto space-y-6">
            <AnimatePresence mode="wait">
              <motion.div key={currentQ}
                initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                className="bg-white rounded-2xl border-2 border-dark-100 p-6 shadow-soft">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-bold shrink-0">
                    {currentQ + 1}
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-dark-900">{q.questionText}</p>
                    <span className="badge badge-info text-[10px] capitalize mt-1">
                      Type: {q.type || 'mcq'}
                    </span>
                  </div>
                </div>

                {q.pdfFile && (
                  <div className="mb-6 p-3 bg-primary-50 border border-primary-100 rounded-xl">
                    <a href={`http://localhost:5000/${q.pdfFile}`} target="_blank" rel="noreferrer"
                      className="text-sm text-primary-700 font-semibold underline hover:text-primary-800 flex items-center gap-1.5">
                      <HiDocumentText className="w-5 h-5" />
                      View/Download Attached Reference PDF for this Question
                    </a>
                  </div>
                )}

                {/* Answer inputs based on type */}
                {q.type === 'descriptive' ? (
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-dark-700">Write your description answer here:</label>
                    <textarea rows={6} className="input" placeholder="Type your full answer description here..."
                      value={answers[q._id] || ''}
                      onChange={(e) => handleSelect(q._id, e.target.value)} />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {q.options.map((opt, oi) => {
                      const selected = answers[q._id] === opt;
                      return (
                        <motion.button key={oi} type="button" whileTap={{ scale: 0.99 }}
                          onClick={() => handleSelect(q._id, opt)}
                          className={cn(
                            'w-full text-left px-5 py-4 rounded-xl border-2 transition-all font-medium',
                            selected
                              ? 'bg-primary-50 border-primary-500 text-primary-800 shadow-md'
                              : 'bg-white border-dark-200 text-dark-700 hover:border-primary-300 hover:bg-primary-50/40'
                          )}>
                          <div className="flex items-center gap-3">
                            <span className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 shrink-0',
                              selected ? 'bg-primary-500 border-primary-500 text-white' : 'border-dark-300 text-dark-600'
                            )}>
                              {String.fromCharCode(65 + oi)}
                            </span>
                            {opt}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <Button variant="outline" icon={HiArrowLeft}
                onClick={() => setCurrentQ((q) => Math.max(0, q - 1))} disabled={currentQ === 0}>
                Prev
              </Button>

              {/* Question dots */}
              <div className="flex gap-1.5 flex-wrap justify-center">
                {activeQuiz.questions.map((_, i) => (
                  <button key={i} type="button" onClick={() => setCurrentQ(i)}
                    className={cn(
                      'w-8 h-8 rounded-full text-xs font-bold border-2 transition-colors',
                      i === currentQ ? 'bg-primary-500 border-primary-500 text-white'
                        : answers[activeQuiz.questions[i]._id] ? 'bg-green-100 border-green-400 text-green-700'
                        : 'bg-white border-dark-300 text-dark-500'
                    )}>
                    {i + 1}
                  </button>
                ))}
              </div>

              {isLast ? (
                <Button icon={HiCheckCircle} loading={submitting}
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleSubmit(false)}>
                  Submit Quiz
                </Button>
              ) : (
                <Button icon={HiArrowRight} onClick={() => setCurrentQ((q) => Math.min(total - 1, q + 1))}>
                  Next
                </Button>
              )}
            </div>

            <p className="text-center text-sm text-dark-500">
              {answeredCount} of {total} answered
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── MAIN LIST ────────────────────────────────────────────
  return (
    <motion.div initial="initial" animate="animate" variants={staggerContainer} className="space-y-6">
      {/* HEADER */}
      <motion.div variants={slideUp} className="relative overflow-hidden rounded-3xl">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-accent-600" />
        <div className="absolute inset-0 bg-hero-pattern opacity-10" />
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-accent-300/20 rounded-full blur-3xl" />
        <div className="relative p-6 sm:p-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-white">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 mb-4">
                <HiSparkles className="w-5 h-5" />
                <span className="text-sm font-bold">Quiz Centre</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black mb-2">My Quizzes</h1>
              <p className="text-white/80">Test your knowledge and track your progress</p>
              <div className="mt-6 grid grid-cols-3 gap-4">
                {[
                  { label: 'Total', val: stats.total },
                  { label: 'Completed', val: stats.completed },
                  { label: 'Pending', val: stats.pending },
                ].map(({ label, val }) => (
                  <div key={label} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                    <p className="text-white/70 text-xs">{label}</p>
                    <p className="text-2xl font-bold">{val}</p>
                  </div>
                ))}
              </div>
            </div>
            <Button variant="outline" className="border-white/40 text-white hover:bg-white/20"
              icon={HiRefresh} onClick={() => selectedCourseId && fetchQuizzes(selectedCourseId)}>
              Refresh
            </Button>
          </div>
        </div>
      </motion.div>

      {/* COURSE SELECT + SEARCH */}
      <motion.div variants={slideUp}>
        <Card padding={false} className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-dark-700 mb-2">Select Course</label>
              <select className="input" value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}>
                <option value="">-- Choose a course --</option>
                {myCourses.map((c) => <option key={c._id} value={c._id}>{c.title}</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-dark-700 mb-2">Search</label>
              <div className="relative">
                <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                <input type="text" placeholder="Search quizzes..." value={search}
                  onChange={(e) => setSearch(e.target.value)} className="input pl-10" />
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* QUIZ CARDS */}
      {pageLoading || quizLoading ? (
        <div className="py-10"><Loader size="lg" text="Loading quizzes..." /></div>
      ) : (
        <motion.div variants={slideUp} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence>
            {!selectedCourseId ? (
              <div className="col-span-full text-center py-16">
                <HiAcademicCap className="w-16 h-16 mx-auto mb-4 text-dark-300" />
                <p className="text-dark-500">Select a course to see quizzes</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="col-span-full text-center py-16">
                <HiClipboardList className="w-16 h-16 mx-auto mb-4 text-dark-300" />
                <p className="text-dark-500 font-medium">No quizzes available</p>
                <p className="text-sm text-dark-400 mt-1">Your teacher hasn't created any quizzes yet</p>
              </div>
            ) : filtered.map((quiz) => {
              const done = completedIds.has(quiz._id);
              return (
                <motion.div key={quiz._id}
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ y: -5 }}
                  className="relative overflow-hidden rounded-2xl border border-dark-100 bg-white shadow-soft hover:shadow-soft-lg transition-all">
                  {done && (
                    <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl z-10">
                      ✓ Done
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={cn(
                        'w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg',
                        done ? 'bg-gradient-to-br from-green-500 to-green-600' : 'bg-gradient-to-br from-primary-500 to-accent-500'
                      )}>
                        {done ? <HiCheckCircle className="w-6 h-6" /> : <HiClipboardList className="w-6 h-6" />}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-dark-900 truncate">{quiz.title}</h3>
                        <p className="text-xs text-dark-500">{formatDate(quiz.createdAt)}</p>
                      </div>
                    </div>

                    {quiz.description && (
                      <p className="text-sm text-dark-600 mb-4 line-clamp-2">{quiz.description}</p>
                    )}

                    <div className="grid grid-cols-3 gap-2 mb-5">
                      <div className="p-2 bg-primary-50 rounded-xl text-center">
                        <p className="text-[10px] text-primary-600 mb-0.5">Questions</p>
                        <p className="font-bold text-primary-900 text-sm">{quiz.questions?.length || 0}</p>
                      </div>
                      <div className="p-2 bg-purple-50 rounded-xl text-center">
                        <p className="text-[10px] text-purple-600 mb-0.5">Weight</p>
                        <p className="font-bold text-purple-900 text-sm">{quiz.totalMarks} pts</p>
                      </div>
                      <div className="p-2 bg-amber-50 rounded-xl text-center">
                        <p className="text-[10px] text-amber-600 mb-0.5">Duration</p>
                        <p className="font-bold text-amber-900 text-sm">{quiz.duration} m</p>
                      </div>
                    </div>

                    {done ? (
                      <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-green-50 border border-green-200 text-green-700 font-semibold">
                        <HiBadgeCheck className="w-5 h-5" />
                        Already Submitted
                      </div>
                    ) : (
                      <Button fullWidth icon={HiPlay} onClick={() => handleStart(quiz)}>
                        Start Quiz
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* RESULT MODAL */}
      <Modal isOpen={isResultOpen} onClose={() => setIsResultOpen(false)}
        title="Quiz Result" size="md">
        {result && (
          <div className="text-center space-y-6 py-4">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className={cn(
                'w-32 h-32 rounded-full flex items-center justify-center mx-auto text-white text-3xl font-black shadow-2xl bg-gradient-to-br',
                scoreGradient(result.pct)
              )}>
              {result.pct}%
            </motion.div>

            <div>
              <h3 className={cn('text-2xl font-black mb-2', scoreColor(result.pct))}>
                {result.pct >= 75 ? '🎉 Excellent!' : result.pct >= 50 ? '👍 Good Job!' : '💪 Keep Trying!'}
              </h3>
              <p className="text-sm text-dark-600 px-4">
                Your weighted score is{' '}
                <span className="font-bold text-dark-900">{result.weightedScore} out of {result.totalMarks} marks</span>.
              </p>
              {result.hasDescriptive && (
                <div className="mt-4 p-3 bg-amber-50 rounded-xl text-amber-800 text-xs border border-amber-200">
                  ⚠️ This quiz contains descriptive questions. The above score only includes auto-graded MCQs. Your teacher will grade your descriptions soon, which will increase your final weighted score.
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-green-50 rounded-xl border border-green-200">
                <p className="text-2xl font-bold text-green-700">{result.score}</p>
                <p className="text-xs text-green-600">Correct MCQs</p>
              </div>
              <div className="p-3 bg-dark-50 rounded-xl border border-dark-200">
                <p className={cn('text-2xl font-bold', scoreColor(result.pct))}>{result.weightedScore} pts</p>
                <p className="text-xs text-dark-500">Weighted Score</p>
              </div>
            </div>

            {result.pct >= 75 && !result.hasDescriptive && (
              <div className="flex items-center justify-center gap-2 text-yellow-600">
                <HiStar className="w-6 h-6" />
                <HiStar className="w-6 h-6" />
                <HiStar className="w-6 h-6" />
              </div>
            )}

            <Button fullWidth onClick={() => setIsResultOpen(false)}>Done</Button>
          </div>
        )}
      </Modal>
    </motion.div>
  );
};

export default StudentQuizzes;