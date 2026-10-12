// src/pages/student/MyCourses.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  HiAcademicCap,
  HiUsers,
  HiClock,
  HiBookOpen,
  HiClipboardList,
  HiChartBar,
  HiPlay,
  HiCheckCircle,
  HiRefresh,
  HiSparkles,
  HiPlus,
  HiSearch,
  HiXCircle,
  HiExclamationCircle,
  HiBell,
} from 'react-icons/hi';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Loader from '../../components/common/Loader';
import { useApi } from '../../hooks/useApi';
import { studentApi } from '../../api/studentApi';
import { enrollmentApi } from '../../api/enrollmentApi';
import { staggerContainer, slideUp } from '../../utils/constants';
import { cn } from '../../utils/helpers';
import toast from 'react-hot-toast';

const StudentCourses = () => {
  const navigate = useNavigate();
  const { loading, execute } = useApi();

  // ── State ──────────────────────────────────────────────
  const [myCourses, setMyCourses]             = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [myEnrollments, setMyEnrollments]     = useState([]); // ✅ NEW
  const [progress, setProgress]               = useState([]);
  const [selectedCourse, setSelectedCourse]   = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen]   = useState(false);
  const [viewMode, setViewMode]               = useState('grid');
  const [searchQuery, setSearchQuery]         = useState('');
  const [filterDept, setFilterDept]           = useState('all');
  const [filterProgram, setFilterProgram]     = useState('all');
  const [enrolling, setEnrolling]             = useState(false);
  const [enrollingId, setEnrollingId]         = useState(null); // track which course is being enrolled

  // ── Fetch Data ─────────────────────────────────────────
  const fetchData = async () => {
    await Promise.all([
      // My approved/enrolled courses
      execute(() => studentApi.getMyCourses(), {
        showSuccessToast: false,
        onSuccess: (data) => {
          const list = Array.isArray(data) ? data : data?.data || [];
          setMyCourses(list);
        },
        onError: () => setMyCourses([]),
      }),

      // All available approved courses
      execute(() => studentApi.getApprovedCourses(), {
        showSuccessToast: false,
        onSuccess: (data) => {
          const list = Array.isArray(data) ? data : data?.data || [];
          setAvailableCourses(list);
        },
        onError: () => setAvailableCourses([]),
      }),

      // Progress data
      execute(() => studentApi.getProgress(), {
        showSuccessToast: false,
        onSuccess: (data) => {
          const progressData = data?.progress || data || [];
          setProgress(Array.isArray(progressData) ? progressData : []);
        },
        onError: () => setProgress([]),
      }),

      // ✅ NEW: All my enrollment requests (pending/rejected/approved)
      execute(() => enrollmentApi.getMyEnrollments(), {
        showSuccessToast: false,
        onSuccess: (data) => {
          const list = Array.isArray(data) ? data : data?.data || [];
          setMyEnrollments(list);
        },
        onError: () => setMyEnrollments([]),
      }),
    ]);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Computed ───────────────────────────────────────────
  const coursesWithProgress = useMemo(() => {
    return myCourses.map((course) => {
      const courseProgress = progress.find((p) => p.courseId === course._id);
      const progressPercent =
        courseProgress && courseProgress.totalAssignments > 0
          ? Math.round(
              (courseProgress.gradedAssignments / courseProgress.totalAssignments) * 100
            )
          : 0;

      return {
        ...course,
        progressInfo: courseProgress,
        progressPercent,
        completedLectures: course.lectures?.filter((l) => l.completed)?.length || 0,
        totalLectures: course.lectures?.length || 0,
      };
    });
  }, [myCourses, progress]);

  // Courses not yet enrolled or pending
  const notEnrolledCourses = useMemo(() => {
    const enrolledIds = new Set(myCourses.map((c) => c._id));
    const pendingIds = new Set(
      myEnrollments
        .filter((e) => e.status === 'pending' || e.status === 'rejected')
        .map((e) => e.course?._id || e.course)
    );
    return availableCourses.filter(
      (c) => !enrolledIds.has(c._id) && !pendingIds.has(c._id)
    );
  }, [availableCourses, myCourses, myEnrollments]);

  const availableDepartments = useMemo(() => {
    const set = new Set();
    availableCourses.concat(myCourses).forEach((c) => {
      if (c.department) set.add(c.department);
    });
    return Array.from(set);
  }, [availableCourses, myCourses]);

  const availablePrograms = useMemo(() => {
    const set = new Set();
    availableCourses.concat(myCourses).forEach((c) => {
      if (c.program) set.add(c.program);
    });
    return Array.from(set);
  }, [availableCourses, myCourses]);

  const filteredCourses = useMemo(() => {
    return coursesWithProgress.filter((course) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        course.title?.toLowerCase().includes(query) ||
        course.description?.toLowerCase().includes(query) ||
        course.category?.toLowerCase().includes(query);

      const matchesDept = filterDept === 'all' || course.department === filterDept;
      const matchesProgram = filterProgram === 'all' || course.program === filterProgram;

      return matchesSearch && matchesDept && matchesProgram;
    });
  }, [coursesWithProgress, searchQuery, filterDept, filterProgram]);

  const stats = useMemo(() => {
    const total = coursesWithProgress.length;
    const inProgress = coursesWithProgress.filter(
      (c) => c.progressPercent < 100 && c.progressPercent > 0
    ).length;
    const completed = coursesWithProgress.filter((c) => c.progressPercent === 100).length;
    const avgProgress =
      total > 0
        ? Math.round(
            coursesWithProgress.reduce((sum, c) => sum + c.progressPercent, 0) / total
          )
        : 0;
    return { total, inProgress, completed, avgProgress };
  }, [coursesWithProgress]);

  // ✅ Pending + rejected enrollments for banners
  const pendingEnrollments = useMemo(
    () => myEnrollments.filter((e) => e.status === 'pending'),
    [myEnrollments]
  );
  const rejectedEnrollments = useMemo(
    () => myEnrollments.filter((e) => e.status === 'rejected'),
    [myEnrollments]
  );

  // ── Handlers ───────────────────────────────────────────

  // ✅ FIXED: Use enrollmentApi, show proper messages
  const handleEnroll = async (courseId) => {
  setEnrollingId(courseId);
  try {
    const res = await enrollmentApi.requestEnrollment(courseId);
    toast.success(res.data?.message || 'Enrollment request sent!');
    setIsEnrollModalOpen(false);
    fetchData();
  } catch (err) {
    const msg = err.response?.data?.message || 'Failed to send enrollment request';
    const status = err.response?.data?.status;

    // ✅ Show appropriate message based on status
    if (status === 'approved') {
      toast.success('You are already enrolled in this course!');
    } else if (status === 'pending') {
      toast('Your request is already pending approval', {
        icon: '⏳',
      });
    } else if (status === 'rejected') {
      toast.error('Your enrollment was rejected. Contact your teacher.');
    } else {
      toast.error(msg);
    }
  } finally {
    setEnrollingId(null);
  }
};

  const handleViewCourse = async (course) => {
    try {
      const response = await execute(() => studentApi.getCourse(course._id), {
        showSuccessToast: false,
      });
      if (response) {
        setSelectedCourse({ ...course, ...response });
        setIsDetailsModalOpen(true);
      }
    } catch {
      setSelectedCourse(course);
      setIsDetailsModalOpen(true);
    }
  };

  const handleContinue = (courseId) => {
    navigate(`/student/courses/${courseId}`);
  };

  // ── Helpers ────────────────────────────────────────────
  const getProgressColor = (p) => {
    if (p >= 75) return 'from-green-500 to-green-600';
    if (p >= 50) return 'from-blue-500 to-blue-600';
    if (p >= 25) return 'from-amber-500 to-amber-600';
    return 'from-red-500 to-red-600';
  };

  const getCategoryEmoji = (category) => {
    const emojis = {
      'Computer Science': '💻',
      Programming: '⌨️',
      'Web Development': '🌐',
      Database: '🗄️',
      Design: '🎨',
      Business: '📊',
      default: '📚',
    };
    return emojis[category] || emojis.default;
  };

  // ── Stat Card ──────────────────────────────────────────
  const StatCard3D = ({ title, value, icon: Icon, gradient, hint }) => (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-dark-100 bg-white',
        'shadow-[0_18px_35px_-18px_rgba(15,23,42,0.25)]',
        'hover:shadow-[0_28px_55px_-22px_rgba(99,102,241,0.28)] transition-all'
      )}
    >
      <div className={cn('absolute -top-14 -right-14 w-44 h-44 rounded-full blur-3xl opacity-20 bg-gradient-to-br', gradient)} />
      <div className="p-5 relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-dark-500">{title}</p>
            <p className="mt-2 text-3xl font-extrabold text-dark-900">{value}</p>
            {hint && <p className="mt-1 text-xs text-dark-400">{hint}</p>}
          </div>
          <div className={cn('p-4 rounded-2xl text-white shadow-lg bg-gradient-to-br', gradient)}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </div>
    </motion.div>
  );

  // ── Course Card ────────────────────────────────────────
  const CourseCard = ({ course }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
      className="card-hover group relative overflow-hidden rounded-2xl border border-dark-100 bg-white shadow-soft hover:shadow-soft-lg transition-all"
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-2xl shadow-lg shadow-primary-500/30">
              {getCategoryEmoji(course.category)}
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-dark-900 truncate">{course.title}</h3>
              <p className="text-sm text-dark-500">{course.category || 'General'}</p>
            </div>
          </div>
        </div>

        {/* Instructor */}
        <div className="flex items-center gap-2 mb-4 p-3 bg-dark-50 rounded-xl">
          <HiUsers className="w-4 h-4 text-dark-400" />
          <span className="text-sm text-dark-600 truncate">
            <span className="font-medium">Instructor:</span>{' '}
            {course.teacher?.name || 'Not assigned'}
          </span>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-dark-500">Progress</span>
            <span className="font-semibold text-dark-900">{course.progressPercent}%</span>
          </div>
          <div className="w-full h-2 bg-dark-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${course.progressPercent}%` }}
              transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
              className={cn('h-full bg-gradient-to-r rounded-full', getProgressColor(course.progressPercent))}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-2 bg-primary-50 rounded-lg">
            <div className="flex items-center gap-2">
              <HiPlay className="w-4 h-4 text-primary-600" />
              <span className="text-xs text-primary-700">Lectures</span>
            </div>
            <p className="text-sm font-semibold text-primary-900 mt-1">
              {course.totalLectures || 0}
            </p>
          </div>
          <div className="p-2 bg-accent-50 rounded-lg">
            <div className="flex items-center gap-2">
              <HiClipboardList className="w-4 h-4 text-accent-600" />
              <span className="text-xs text-accent-700">Tasks</span>
            </div>
            <p className="text-sm font-semibold text-accent-900 mt-1">
              {course.progressInfo?.gradedAssignments || 0}/
              {course.progressInfo?.totalAssignments || 0}
            </p>
          </div>
        </div>

        {/* Duration */}
        {course.duration && (
          <div className="p-3 bg-amber-50 rounded-xl mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HiClock className="w-4 h-4 text-amber-600" />
                <span className="text-xs text-amber-700 font-medium">Duration</span>
              </div>
              <span className="text-xs text-amber-900 font-semibold">{course.duration}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" onClick={() => handleViewCourse(course)}>
            View Details
          </Button>
          <Button size="sm" icon={HiPlay} onClick={() => handleContinue(course._id)}>
            Continue
          </Button>
        </div>
      </div>
    </motion.div>
  );

  // ── Render ─────────────────────────────────────────────
  return (
    <motion.div initial="initial" animate="animate" variants={staggerContainer} className="space-y-6">

      {/* HEADER */}
      <motion.div variants={slideUp} className="relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 via-primary-700 to-accent-600" />
        <div className="absolute inset-0 bg-hero-pattern opacity-10" />
        <div className="relative p-6 sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-white">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/10">
                <HiSparkles className="w-4 h-4" />
                <span className="text-xs font-semibold">My Learning</span>
              </div>
              <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold">My Courses</h1>
              <p className="mt-2 text-white/80 text-sm sm:text-base">
                Track your enrolled courses and continue learning
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10"
                icon={HiRefresh}
                onClick={fetchData}
              >
                Refresh
              </Button>
              <Button
                className="bg-white text-primary-700 hover:bg-white/90"
                icon={HiPlus}
                onClick={() => setIsEnrollModalOpen(true)}
              >
                Enroll New
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* LOADING */}
      {loading && (
        <div className="py-10">
          <Loader size="lg" text="Loading courses..." />
        </div>
      )}

      {/* ✅ PENDING ENROLLMENT BANNER */}
      {!loading && pendingEnrollments.length > 0 && (
        <motion.div variants={slideUp}>
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl">
            <div className="flex items-center gap-3 mb-3">
              <HiBell className="w-5 h-5 text-amber-600 shrink-0 animate-bounce" />
              <p className="font-bold text-amber-800">
                {pendingEnrollments.length} Pending Enrollment Request{pendingEnrollments.length > 1 ? 's' : ''}
              </p>
            </div>
            <p className="text-sm text-amber-700 mb-3">
              Waiting for teacher/admin approval. You'll be notified once approved.
            </p>
            <div className="space-y-2">
              {pendingEnrollments.map((e) => (
                <div
                  key={e._id}
                  className="flex items-center justify-between p-3 bg-white rounded-xl border border-amber-200"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-lg shrink-0">
                      {getCategoryEmoji(e.course?.category)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-dark-900 text-sm truncate">
                        {e.course?.title || 'Course'}
                      </p>
                      <p className="text-xs text-dark-500">
                        Teacher: {e.course?.teacher?.name || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <span className="badge badge-warning text-xs shrink-0 ml-3 flex items-center gap-1">
                    <HiClock className="w-3 h-3" />
                    Pending
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ✅ REJECTED ENROLLMENT BANNER */}
      {!loading && rejectedEnrollments.length > 0 && (
        <motion.div variants={slideUp}>
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
            <div className="flex items-center gap-3 mb-3">
              <HiXCircle className="w-5 h-5 text-red-500 shrink-0" />
              <p className="font-bold text-red-700">
                {rejectedEnrollments.length} Rejected Enrollment{rejectedEnrollments.length > 1 ? 's' : ''}
              </p>
            </div>
            <p className="text-sm text-red-600 mb-3">
              These enrollment requests were not approved. Contact your teacher for more info.
            </p>
            <div className="space-y-2">
              {rejectedEnrollments.map((e) => (
                <div
                  key={e._id}
                  className="flex items-center justify-between p-3 bg-white rounded-xl border border-red-200"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center text-lg shrink-0">
                      {getCategoryEmoji(e.course?.category)}
                    </div>
                    <p className="font-semibold text-dark-900 text-sm truncate">
                      {e.course?.title || 'Course'}
                    </p>
                  </div>
                  <span className="badge bg-red-100 text-red-700 border border-red-300 text-xs shrink-0 ml-3">
                    Rejected
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* STATS */}
      {!loading && (
        <motion.div variants={slideUp} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard3D title="Total Courses"  value={stats.total}       icon={HiAcademicCap}  gradient="from-blue-500 to-blue-600"    hint="Enrolled courses" />
          <StatCard3D title="In Progress"    value={stats.inProgress}  icon={HiClock}        gradient="from-amber-500 to-amber-600"  hint="Currently learning" />
          <StatCard3D title="Completed"      value={stats.completed}   icon={HiCheckCircle}  gradient="from-green-500 to-green-600"  hint="Finished courses" />
          <StatCard3D title="Avg. Progress"  value={`${stats.avgProgress}%`} icon={HiChartBar} gradient="from-purple-500 to-purple-600" hint="Overall completion" />
        </motion.div>
      )}

      {/* SEARCH + VIEW TOGGLE */}
      {!loading && (
        <motion.div variants={slideUp}>
          <Card padding={false} className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto flex-1">
                <div className="relative w-full sm:w-64">
                  <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                  <input
                    type="text"
                    placeholder="Search courses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input pl-10 w-full"
                  />
                </div>

                {availableDepartments.length > 0 && (
                  <select
                    value={filterDept}
                    onChange={(e) => setFilterDept(e.target.value)}
                    className="input w-auto min-w-[150px]"
                  >
                    <option value="all">All Departments</option>
                    {availableDepartments.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                )}

                {availablePrograms.length > 0 && (
                  <select
                    value={filterProgram}
                    onChange={(e) => setFilterProgram(e.target.value)}
                    className="input w-auto min-w-[140px]"
                  >
                    <option value="all">All Programs</option>
                    {availablePrograms.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex gap-1 p-1 bg-dark-100 rounded-lg shrink-0">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn('p-2 rounded-lg transition-colors',
                    viewMode === 'grid' ? 'bg-white text-primary-600 shadow-sm' : 'text-dark-500')}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn('p-2 rounded-lg transition-colors',
                    viewMode === 'list' ? 'bg-white text-primary-600 shadow-sm' : 'text-dark-500')}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* COURSES GRID / LIST */}
      {!loading && (
        <>
          {viewMode === 'grid' ? (
            <motion.div
              variants={slideUp}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              <AnimatePresence mode="wait">
                {filteredCourses.length === 0 ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="col-span-full text-center py-16">
                    <HiAcademicCap className="w-16 h-16 mx-auto mb-4 text-dark-300" />
                    <p className="text-dark-500 font-medium">No courses found</p>
                    <p className="text-sm text-dark-400 mt-1 mb-4">
                      {searchQuery ? 'Try a different search term' : 'Enroll in courses to start learning'}
                    </p>
                    <Button icon={HiPlus} onClick={() => setIsEnrollModalOpen(true)}>
                      Browse Courses
                    </Button>
                  </motion.div>
                ) : (
                  filteredCourses.map((course) => <CourseCard key={course._id} course={course} />)
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div variants={slideUp} className="space-y-4">
              {filteredCourses.map((course, index) => (
                <motion.div
                  key={course._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="card p-6"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-4xl flex-shrink-0">
                      {getCategoryEmoji(course.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-xl font-bold text-dark-900 truncate">{course.title}</h3>
                          <p className="text-dark-600 mt-1 line-clamp-1">{course.description}</p>
                          <div className="flex flex-wrap gap-4 mt-3 text-sm text-dark-500">
                            <div className="flex items-center gap-1">
                              <HiUsers className="w-4 h-4" />
                              <span>{course.teacher?.name || 'Instructor'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <HiBookOpen className="w-4 h-4" />
                              <span>{course.totalLectures} Lectures</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <HiChartBar className="w-4 h-4" />
                              <span>{course.progressPercent}% Complete</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Button variant="outline" onClick={() => handleViewCourse(course)}>
                            Details
                          </Button>
                          <Button icon={HiPlay} onClick={() => handleContinue(course._id)}>
                            Continue
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </>
      )}

      {/* ✅ ENROLL MODAL — with enrollment status info */}
      <Modal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        title="Available Courses"
        description="Browse and send enrollment requests"
        size="lg"
      >
        <div className="space-y-4 max-h-[28rem] overflow-y-auto">
          {/* Info box */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2">
            <HiExclamationCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-700">
              Enrollment requires <strong>teacher or admin approval</strong>. You'll receive a
              notification once your request is reviewed.
            </p>
          </div>

          {notEnrolledCourses.length === 0 ? (
            <div className="text-center py-8">
              <HiCheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
              <p className="text-dark-500 font-medium">
                {availableCourses.length === 0
                  ? 'No courses available yet'
                  : 'You have requested enrollment in all available courses!'}
              </p>
            </div>
          ) : (
            notEnrolledCourses.map((course) => {
              const isEnrollingThis = enrollingId === course._id;
              return (
                <div
                  key={course._id}
                  className="p-4 rounded-xl border border-dark-100 hover:border-primary-200 hover:bg-primary-50/50 transition-all"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-xl flex-shrink-0">
                        {getCategoryEmoji(course.category)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-dark-900 truncate">{course.title}</h4>
                        <p className="text-sm text-dark-500 truncate">
                          {course.teacher?.name || 'Instructor'} • {course.category}
                        </p>
                        {course.duration && (
                          <p className="text-xs text-dark-400">{course.duration}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      icon={HiPlus}
                      onClick={() => handleEnroll(course._id)}
                      loading={isEnrollingThis}
                      disabled={!!enrollingId}
                    >
                      {isEnrollingThis ? 'Sending...' : 'Request'}
                    </Button>
                  </div>
                </div>
              );
            })
          )}

          {/* Show pending courses in modal too */}
          {pendingEnrollments.length > 0 && (
            <div className="mt-4 pt-4 border-t border-dark-100">
              <p className="text-xs font-semibold text-dark-500 mb-3 uppercase tracking-wide">
                Pending Requests
              </p>
              {pendingEnrollments.map((e) => (
                <div key={e._id}
                  className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-200 mb-2">
                  <p className="text-sm font-semibold text-dark-900 truncate">
                    {e.course?.title || 'Course'}
                  </p>
                  <span className="badge badge-warning text-xs shrink-0 ml-2 flex items-center gap-1">
                    <HiClock className="w-3 h-3" />
                    Pending
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* DETAILS MODAL */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => { setIsDetailsModalOpen(false); setSelectedCourse(null); }}
        title={selectedCourse?.title}
        size="lg"
      >
        {selectedCourse && (
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-dark-900 mb-2">Description</h4>
              <p className="text-dark-600">
                {selectedCourse.description || 'No description available.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-dark-50 rounded-xl">
                <p className="text-sm text-dark-500 mb-1">Category</p>
                <p className="font-semibold text-dark-900">{selectedCourse.category || 'General'}</p>
              </div>
              <div className="p-4 bg-dark-50 rounded-xl">
                <p className="text-sm text-dark-500 mb-1">Duration</p>
                <p className="font-semibold text-dark-900">{selectedCourse.duration || 'N/A'}</p>
              </div>
              <div className="p-4 bg-dark-50 rounded-xl">
                <p className="text-sm text-dark-500 mb-1">Instructor</p>
                <p className="font-semibold text-dark-900">
                  {selectedCourse.teacher?.name || 'Not assigned'}
                </p>
              </div>
              <div className="p-4 bg-dark-50 rounded-xl">
                <p className="text-sm text-dark-500 mb-1">Total Lectures</p>
                <p className="font-semibold text-dark-900">
                  {selectedCourse.lectures?.length || 0}
                </p>
              </div>
            </div>

            <div className="p-4 bg-primary-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-primary-700">Your Progress</span>
                <span className="text-lg font-bold text-primary-700">
                  {selectedCourse.progressPercent || 0}%
                </span>
              </div>
              <div className="w-full h-3 bg-primary-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full"
                  style={{ width: `${selectedCourse.progressPercent || 0}%` }}
                />
              </div>
            </div>

            {selectedCourse.lectures?.length > 0 && (
              <div>
                <h4 className="font-semibold text-dark-900 mb-3">Lectures</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedCourse.lectures.map((lecture, index) => (
                    <div key={index}
                      className="flex items-center gap-3 p-3 bg-dark-50 rounded-lg hover:bg-dark-100 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-sm font-semibold text-primary-600">
                        {index + 1}
                      </div>
                      <p className="font-medium text-dark-900 truncate flex-1">
                        {lecture.title || `Lecture ${index + 1}`}
                      </p>
                      <HiPlay className="w-5 h-5 text-primary-600" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button fullWidth variant="outline" onClick={() => setIsDetailsModalOpen(false)}>
                Close
              </Button>
              <Button
                fullWidth
                icon={HiPlay}
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  handleContinue(selectedCourse._id);
                }}
              >
                Continue Learning
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
};

export default StudentCourses;