// src/pages/student/CourseDetail.jsx
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiArrowLeft, HiUsers, HiClock, HiCheckCircle,
  HiAcademicCap, HiBookOpen, HiVideoCamera,
  HiDocumentText, HiExternalLink, HiChartBar,
  HiPlay, HiBadgeCheck, HiStar,
} from 'react-icons/hi';

import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { useApi } from '../../hooks/useApi';
import { studentApi } from '../../api/studentApi';
import { staggerContainer, slideUp } from '../../utils/constants';
import { cn } from '../../utils/helpers';

// Per-course storage key
const storageKey = (id) => `lms_progress_${id}`;

const StudentCourseDetail = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { loading, execute } = useApi();

  const [course, setCourse] = useState(null);
  const [activeLectureId, setActiveLectureId] = useState(null);

  // ✅ Completed lecture IDs persisted in localStorage
  const [completedIds, setCompletedIds] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(storageKey(courseId)) || '[]'));
    } catch { return new Set(); }
  });

  // Persist whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(storageKey(courseId), JSON.stringify([...completedIds]));
    } catch { /* ignore */ }
  }, [completedIds, courseId]);

  // ── Fetch ────────────────────────────────────────────────
  const fetchCourse = async () => {
    await execute(() => studentApi.getCourse(courseId), {
      showSuccessToast: false,
      onSuccess: (data) => {
        const d = data?.data || data || null;
        setCourse(d);
        if (d?.lectures?.length) {
          setActiveLectureId(d.lectures[0]._id || d.lectures[0].id);
        }
      },
      onError: () => setCourse(null),
    });
  };

  useEffect(() => {
    if (courseId) fetchCourse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  // ── Complete/undo a lecture ──────────────────────────────
  const toggleComplete = useCallback((id) => {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const markAllDone = useCallback(() => {
    if (!course?.lectures) return;
    setCompletedIds(new Set(course.lectures.map((l) => l._id || l.id)));
  }, [course]);

  const resetProgress = useCallback(() => setCompletedIds(new Set()), []);

  // ── Navigation ───────────────────────────────────────────
  const currentIndex = useMemo(() => {
    if (!course?.lectures) return -1;
    return course.lectures.findIndex((l) => (l._id || l.id) === activeLectureId);
  }, [course, activeLectureId]);

  const goNext = useCallback(() => {
    if (!course?.lectures || currentIndex >= course.lectures.length - 1) return;
    const next = course.lectures[currentIndex + 1];
    setActiveLectureId(next._id || next.id);
  }, [course, currentIndex]);

  const goPrev = useCallback(() => {
    if (!course?.lectures || currentIndex <= 0) return;
    const prev = course.lectures[currentIndex - 1];
    setActiveLectureId(prev._id || prev.id);
  }, [course, currentIndex]);

  // ── Helpers ──────────────────────────────────────────────
  const extractYouTubeId = (url) => {
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
      if (u.hostname.includes('youtu.be')) return u.pathname.replace('/', '');
    } catch { /* ignore */ }
    return null;
  };

  const getMediaInfo = (lecture) => {
    if (!lecture) return { type: 'none', url: null };
    const raw = lecture.videoUrl || lecture.video || lecture.mediaUrl ||
      lecture.fileUrl || lecture.url || lecture.link || lecture.videoLink || '';
    if (!raw) return { type: 'none', url: null };
    const url = raw.trim();
    const lower = url.toLowerCase();
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const id = extractYouTubeId(url);
      return id
        ? { type: 'youtube', url: `https://www.youtube.com/embed/${id}` }
        : { type: 'external', url };
    }
    if (lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.ogg'))
      return { type: 'html5', url };
    return { type: 'external', url };
  };

  const safeUrl = (raw) => {
    if (!raw) return null;
    try {
      const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      let origin = 'http://localhost:5000';
      try { origin = new URL(base).origin; } catch { /* keep default */ }
      const urlObj = new URL(raw.startsWith('http') ? raw : `${origin}${raw.startsWith('/') ? '' : '/'}${raw}`);
      const token = localStorage.getItem('token');
      if (token && urlObj.origin === origin) urlObj.searchParams.set('token', token);
      return urlObj.toString();
    } catch { return raw; }
  };

  const getCategoryEmoji = (cat) => ({
    'Computer Science': '💻', Programming: '⌨️', 'Web Development': '🌐',
    Database: '🗄️', Design: '🎨', Business: '📊',
  }[cat] || '📚');

  // ── Derived ──────────────────────────────────────────────
  const activeLecture = useMemo(() => {
    if (!course?.lectures) return null;
    return course.lectures.find((l) => (l._id || l.id) === activeLectureId) || course.lectures[0];
  }, [course, activeLectureId]);

  const lectureStats = useMemo(() => {
    const total = course?.lectures?.length || 0;
    const completed = completedIds.size;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percent };
  }, [course, completedIds]);

  const mediaInfo = useMemo(() => getMediaInfo(activeLecture), [activeLecture]); // eslint-disable-line
  const mediaUrl = useMemo(() => {
    if (!mediaInfo.url) return null;
    if (mediaInfo.type === 'youtube') return mediaInfo.url;
    return safeUrl(mediaInfo.url);
  }, [mediaInfo]); // eslint-disable-line

  const activeDone = activeLecture ? completedIds.has(activeLecture._id || activeLecture.id) : false;
  const isCourseDone = lectureStats.total > 0 && lectureStats.percent === 100;

  const progressColor = (p) =>
    p >= 75 ? 'from-green-500 to-green-600'
    : p >= 50 ? 'from-blue-500 to-blue-600'
    : p >= 25 ? 'from-amber-500 to-amber-600'
    : 'from-red-500 to-red-600';

  // ── Loading / empty ──────────────────────────────────────
  if (loading && !course) return <div className="py-10"><Loader size="lg" text="Loading course..." /></div>;

  if (!loading && !course) return (
    <div className="space-y-4">
      <Button variant="outline" icon={HiArrowLeft} onClick={() => navigate('/student/courses')}>
        Back
      </Button>
      <Card>
        <div className="py-10 text-center">
          <HiAcademicCap className="w-12 h-12 mx-auto mb-3 text-dark-300" />
          <p className="text-dark-600 font-medium">Course not found</p>
          <Button className="mt-4" onClick={() => navigate('/student/courses')}>Go Back</Button>
        </div>
      </Card>
    </div>
  );

  if (!course) return null;
  const { title, description, category, teacher, duration } = course;

  return (
    <motion.div initial="initial" animate="animate" variants={staggerContainer} className="space-y-6">
      {/* Back button */}
      <motion.div variants={slideUp}>
        <Button variant="outline" icon={HiArrowLeft} onClick={() => navigate('/student/courses')}>
          Back to My Courses
        </Button>
      </motion.div>

      {/* ✅ COMPLETION BANNER */}
      <AnimatePresence>
        {isCourseDone && (
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="p-5 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white flex items-center gap-4 shadow-lg shadow-green-500/30">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <HiBadgeCheck className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <p className="text-lg font-extrabold">🎉 Course Completed!</p>
              <p className="text-sm text-white/80">
                You completed all {lectureStats.total} lectures!
              </p>
            </div>
            <HiStar className="w-8 h-8 text-yellow-300 shrink-0" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* COURSE HEADER */}
      <motion.div variants={slideUp} className="relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-accent-600" />
        <div className="absolute inset-0 bg-hero-pattern opacity-10" />
        <div className="relative p-6 sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-4">
              <div className="hidden sm:flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-3xl shadow-lg shrink-0">
                {getCategoryEmoji(category)}
              </div>
              <div className="text-white min-w-0">
                <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/15 border border-white/10 uppercase tracking-wide">
                  {category || 'Course'}
                </span>
                <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold">{title}</h1>
                <p className="mt-2 text-sm text-white/80 line-clamp-2">{description}</p>
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-white/80">
                  <div className="flex items-center gap-2">
                    <HiUsers className="w-4 h-4" />
                    <span>Instructor: <strong>{teacher?.name || 'N/A'}</strong></span>
                  </div>
                  {duration && (
                    <div className="flex items-center gap-2">
                      <HiClock className="w-4 h-4" />
                      <span>{duration}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Progress card */}
            <div className="mt-4 lg:mt-0 w-full max-w-xs shrink-0">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-4">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <p className="text-xs text-white/80">Your Progress</p>
                    <p className="text-2xl font-bold text-white mt-1">{lectureStats.percent}%</p>
                  </div>
                  <HiChartBar className="w-8 h-8 text-white/60" />
                </div>
                <div className="mt-2 h-3 w-full rounded-full bg-white/15 overflow-hidden">
                  <motion.div
                    className={cn('h-full rounded-full bg-gradient-to-r', progressColor(lectureStats.percent))}
                    animate={{ width: `${lectureStats.percent}%` }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
                <p className="mt-2 text-xs text-white/70">
                  {lectureStats.completed}/{lectureStats.total} lectures completed
                </p>
                <div className="mt-3 flex gap-2">
                  <button onClick={markAllDone} disabled={isCourseDone}
                    className="flex-1 text-xs py-1.5 px-2 rounded-lg bg-white/20 hover:bg-white/30 text-white font-semibold transition-colors disabled:opacity-40">
                    Mark All Done
                  </button>
                  <button onClick={resetProgress} disabled={lectureStats.completed === 0}
                    className="flex-1 text-xs py-1.5 px-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 font-semibold transition-colors disabled:opacity-40">
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* MAIN CONTENT */}
      <motion.div variants={slideUp} className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)]">
        {/* LEFT: Lecture list */}
        <Card className="flex flex-col" style={{ maxHeight: '42rem' }}>
          <div className="border-b border-dark-100 pb-3 mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-dark-900">Course Content</h2>
              <p className="text-xs text-dark-500">
                {lectureStats.completed}/{lectureStats.total} completed
              </p>
            </div>
            {/* Mini SVG ring */}
            <div className="relative w-11 h-11">
              <svg className="w-11 h-11 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                <circle cx="18" cy="18" r="15" fill="none" stroke="#6366f1" strokeWidth="3"
                  strokeDasharray={`${(lectureStats.percent / 100) * 94.2} 94.2`}
                  strokeLinecap="round" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-primary-700">
                {lectureStats.percent}%
              </span>
            </div>
          </div>

          {course?.lectures?.length ? (
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {course.lectures.map((lecture, idx) => {
                const id = lecture._id || lecture.id || idx;
                const isActive = id === activeLectureId;
                const isDone = completedIds.has(id);
                return (
                  <motion.button key={id} type="button" whileHover={{ x: 2 }}
                    onClick={() => setActiveLectureId(id)}
                    className={cn(
                      'w-full text-left rounded-xl border px-3 py-3 flex items-start gap-3 transition-all',
                      isActive ? 'border-primary-300 bg-primary-50 shadow-sm' : 'border-dark-100 hover:bg-dark-50'
                    )}>
                    <div className={cn(
                      'mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold shrink-0 transition-colors',
                      isDone ? 'bg-green-100 text-green-700'
                        : isActive ? 'bg-primary-500 text-white' : 'bg-dark-100 text-dark-600'
                    )}>
                      {isDone ? <HiCheckCircle className="w-5 h-5 text-green-600" /> : idx + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn(
                          'font-medium text-sm truncate',
                          isDone ? 'text-green-700 line-through decoration-green-400' : 'text-dark-900'
                        )}>
                          {lecture.title || `Lecture ${idx + 1}`}
                        </p>
                        {isActive && !isDone && <HiPlay className="w-4 h-4 text-primary-600 shrink-0" />}
                      </div>
                      {lecture.description && (
                        <p className="mt-0.5 text-xs text-dark-400 line-clamp-1">{lecture.description}</p>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center py-10 text-center">
              <div>
                <HiBookOpen className="w-10 h-10 mx-auto mb-3 text-dark-300" />
                <p className="text-sm text-dark-500">No lectures yet</p>
              </div>
            </div>
          )}
        </Card>

        {/* RIGHT: Viewer */}
        <div className="space-y-4">
          <Card className="space-y-4">
            {!activeLecture ? (
              <div className="py-10 text-center">
                <HiPlay className="w-12 h-12 mx-auto mb-3 text-dark-300" />
                <p className="text-sm text-dark-500">Select a lecture to start</p>
              </div>
            ) : (
              <>
                {/* Media */}
                <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black/90 flex items-center justify-center">
                  {mediaInfo.type === 'html5' && mediaUrl && (
                    <video key={mediaUrl} className="h-full w-full" controls src={mediaUrl}>
                      Your browser does not support video.
                    </video>
                  )}
                  {mediaInfo.type === 'youtube' && mediaUrl && (
                    <iframe key={mediaUrl} className="h-full w-full" src={mediaUrl}
                      title={activeLecture.title} frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen />
                  )}
                  {mediaInfo.type === 'external' && mediaUrl && (
                    <div className="flex flex-col items-center justify-center text-center px-6">
                      <div className="w-14 h-14 rounded-full bg-primary-500/20 flex items-center justify-center mb-3">
                        <HiVideoCamera className="w-7 h-7 text-primary-200" />
                      </div>
                      <p className="text-sm font-medium text-slate-100">External resource</p>
                      <Button className="mt-4" icon={HiExternalLink}
                        onClick={() => window.open(mediaUrl, '_blank')}>
                        Open Resource
                      </Button>
                    </div>
                  )}
                  {(mediaInfo.type === 'none' || !mediaUrl) && (
                    <div className="flex flex-col items-center justify-center text-center px-6">
                      <div className="w-14 h-14 rounded-full bg-primary-500/20 flex items-center justify-center mb-3">
                        <HiVideoCamera className="w-7 h-7 text-primary-200" />
                      </div>
                      <p className="text-sm font-medium text-slate-100">No media attached</p>
                    </div>
                  )}
                </div>

                {/* Lecture info + complete button */}
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-bold text-dark-900">
                      {activeLecture.title || 'Current Lecture'}
                    </h2>
                    <p className="text-xs text-dark-400 mt-0.5">
                      Lecture {currentIndex + 1} of {lectureStats.total}
                    </p>
                  </div>

                  {/* ✅ BIG CLEAR MARK COMPLETE BUTTON */}
                  <motion.button
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    type="button"
                    onClick={() => toggleComplete(activeLecture._id || activeLecture.id)}
                    className={cn(
                      'flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm border-2 transition-all shrink-0',
                      activeDone
                        ? 'bg-green-500 border-green-500 text-white hover:bg-red-50 hover:border-red-400 hover:text-red-600'
                        : 'bg-primary-600 border-primary-600 text-white hover:bg-primary-700'
                    )}>
                    {activeDone ? (
                      <><HiCheckCircle className="w-5 h-5" /> Completed ✓</>
                    ) : (
                      <><HiPlay className="w-4 h-4" /> Mark as Complete</>
                    )}
                  </motion.button>
                </div>

                {activeLecture.description && (
                  <p className="text-sm text-dark-600">{activeLecture.description}</p>
                )}

                {/* Resources */}
                {activeLecture.resources?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-dark-500 mb-2">Resources</p>
                    {activeLecture.resources.map((res, idx) => (
                      <a key={idx} href={res.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-xs text-primary-700 hover:text-primary-900 mb-1">
                        <HiDocumentText className="w-4 h-4" />
                        <span className="truncate">{res.title}</span>
                      </a>
                    ))}
                  </div>
                )}

                {/* Prev / Complete&Next / Submit */}
                <div className="flex items-center gap-3 pt-4 border-t border-dark-100">
                  <Button variant="outline" icon={HiArrowLeft} onClick={goPrev}
                    disabled={currentIndex <= 0} className="flex-1">
                    Previous
                  </Button>

                  {currentIndex < lectureStats.total - 1 ? (
                    <Button className="flex-1 bg-primary-600 hover:bg-primary-700"
                      onClick={() => {
                        const id = activeLecture._id || activeLecture.id;
                        setCompletedIds((prev) => new Set([...prev, id]));
                        goNext();
                      }}>
                      Complete & Next →
                    </Button>
                  ) : (
                    <Button
                      className={cn('flex-1', activeDone ? 'bg-green-600 hover:bg-green-700' : 'bg-primary-600 hover:bg-primary-700')}
                      icon={activeDone ? HiBadgeCheck : HiCheckCircle}
                      onClick={() => {
                        const id = activeLecture._id || activeLecture.id;
                        setCompletedIds((prev) => new Set([...prev, id]));
                      }}>
                      {activeDone ? 'Course Done! 🎉' : 'Complete Last Lecture'}
                    </Button>
                  )}
                </div>
              </>
            )}
          </Card>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default StudentCourseDetail;