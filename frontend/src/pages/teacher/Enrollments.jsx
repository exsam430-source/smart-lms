// src/pages/teacher/Enrollments.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiUsers, HiRefresh, HiSparkles, HiCheckCircle,
  HiXCircle, HiClock, HiAcademicCap, HiSearch,
  HiBell, HiExclamationCircle,
} from 'react-icons/hi';

import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { enrollmentApi } from '../../api/enrollmentApi';
import { staggerContainer, slideUp } from '../../utils/constants';
import { formatDate, cn } from '../../utils/helpers';
import toast from 'react-hot-toast';

const TeacherEnrollments = () => {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null); // ID being approved/rejected
  const [search, setSearch] = useState('');

  // ── Fetch pending enrollments ────────────────────────────
  const fetchEnrollments = async () => {
    setLoading(true);
    try {
      const res = await enrollmentApi.getPendingEnrollments();
      const list = res.data?.enrollments || res.data || [];
      setEnrollments(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('fetchEnrollments error:', err);
      toast.error('Failed to load enrollment requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEnrollments(); }, []);

  // ── Approve ──────────────────────────────────────────────
  const handleApprove = async (id) => {
    setActionId(id);
    try {
      await enrollmentApi.approveEnrollment(id);
      toast.success('Enrollment approved! Student can now access the course.');
      // Remove from list
      setEnrollments((prev) => prev.filter((e) => e._id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve');
    } finally {
      setActionId(null);
    }
  };

  // ── Reject ───────────────────────────────────────────────
  const handleReject = async (id) => {
    setActionId(id);
    try {
      await enrollmentApi.rejectEnrollment(id);
      toast.success('Enrollment rejected.');
      setEnrollments((prev) => prev.filter((e) => e._id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject');
    } finally {
      setActionId(null);
    }
  };

  // ── Filtered ─────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search) return enrollments;
    const s = search.toLowerCase();
    return enrollments.filter(
      (e) =>
        e.student?.name?.toLowerCase().includes(s) ||
        e.student?.email?.toLowerCase().includes(s) ||
        e.course?.title?.toLowerCase().includes(s)
    );
  }, [enrollments, search]);

  // ── Stat card ────────────────────────────────────────────
  const StatCard = ({ title, value, icon: Icon, gradient }) => (
    <motion.div
      whileHover={{ y: -4 }}
      className="relative overflow-hidden rounded-2xl border border-dark-100 bg-white shadow-soft transition-all"
    >
      <div className={cn('absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl opacity-20 bg-gradient-to-br', gradient)} />
      <div className="p-5 relative flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-dark-500">{title}</p>
          <p className="mt-2 text-3xl font-extrabold text-dark-900">{value}</p>
        </div>
        <div className={cn('p-4 rounded-2xl text-white shadow-lg bg-gradient-to-br', gradient)}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </motion.div>
  );

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
                <span className="text-sm font-bold">Enrollment Manager</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black mb-2">Enrollment Requests</h1>
              <p className="text-white/80">
                Review and approve student enrollment requests for your courses
              </p>
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                  <p className="text-white/70 text-xs">Pending Requests</p>
                  <p className="text-2xl font-bold">{enrollments.length}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                  <p className="text-white/70 text-xs">Showing</p>
                  <p className="text-2xl font-bold">{filtered.length}</p>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              className="border-white/40 text-white hover:bg-white/20"
              icon={HiRefresh}
              onClick={fetchEnrollments}
            >
              Refresh
            </Button>
          </div>
        </div>
      </motion.div>

      {/* STATS */}
      <motion.div variants={slideUp} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title="Pending Requests"
          value={enrollments.length}
          icon={HiClock}
          gradient="from-amber-500 to-amber-600"
        />
        <StatCard
          title="Unique Courses"
          value={new Set(enrollments.map((e) => e.course?._id)).size}
          icon={HiAcademicCap}
          gradient="from-primary-500 to-primary-600"
        />
      </motion.div>

      {/* PENDING ALERT */}
      {enrollments.length > 0 && (
        <motion.div
          variants={slideUp}
          className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-center gap-3"
        >
          <HiBell className="w-6 h-6 text-amber-600 shrink-0 animate-bounce" />
          <div className="flex-1">
            <p className="font-bold text-amber-800">
              {enrollments.length} student{enrollments.length > 1 ? 's' : ''} waiting for your approval
            </p>
            <p className="text-sm text-amber-700">
              Students cannot access course content until you approve their request.
            </p>
          </div>
        </motion.div>
      )}

      {/* SEARCH */}
      <motion.div variants={slideUp}>
        <Card padding={false} className="p-4">
          <div className="relative">
            <HiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              placeholder="Search by student name, email or course..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-12"
            />
          </div>
        </Card>
      </motion.div>

      {/* LIST */}
      {loading ? (
        <div className="py-16"><Loader size="lg" text="Loading enrollment requests..." /></div>
      ) : filtered.length === 0 ? (
        <motion.div variants={slideUp}>
          <Card>
            <div className="py-16 text-center">
              <HiCheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400" />
              <p className="text-dark-500 font-medium text-lg">
                {search ? 'No results found' : 'No pending enrollment requests!'}
              </p>
              <p className="text-sm text-dark-400 mt-1">
                {search ? 'Try a different search term' : 'All enrollment requests have been processed.'}
              </p>
            </div>
          </Card>
        </motion.div>
      ) : (
        <motion.div variants={slideUp} className="space-y-4">
          <AnimatePresence>
            {filtered.map((enrollment) => {
              const isActing = actionId === enrollment._id;
              return (
                <motion.div
                  key={enrollment._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="bg-white border border-dark-100 rounded-2xl p-5 shadow-soft hover:shadow-soft-lg transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Student avatar + info */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-extrabold text-xl shadow-lg shrink-0">
                        {enrollment.student?.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-dark-900 truncate">
                          {enrollment.student?.name || 'Unknown Student'}
                        </p>
                        <p className="text-sm text-dark-500 truncate">
                          {enrollment.student?.email}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <HiAcademicCap className="w-4 h-4 text-primary-500 shrink-0" />
                          <p className="text-sm font-semibold text-primary-700 truncate">
                            {enrollment.course?.title || 'Unknown Course'}
                          </p>
                        </div>
                        <p className="text-xs text-dark-400 mt-1">
                          Requested: {enrollment.createdAt ? formatDate(enrollment.createdAt) : '—'}
                        </p>
                      </div>
                    </div>

                    {/* Status + Actions */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
                      <span className="badge badge-warning flex items-center gap-1">
                        <HiClock className="w-3.5 h-3.5" />
                        Pending
                      </span>

                      {/* APPROVE button */}
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        disabled={isActing}
                        onClick={() => handleApprove(enrollment._id)}
                        className={cn(
                          'flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all',
                          'bg-gradient-to-r from-green-500 to-emerald-600 text-white',
                          'hover:from-green-600 hover:to-emerald-700',
                          'shadow-md shadow-green-500/30',
                          'disabled:opacity-60 disabled:cursor-not-allowed'
                        )}
                      >
                        {isActing ? (
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                        ) : (
                          <HiCheckCircle className="w-4 h-4" />
                        )}
                        Approve
                      </motion.button>

                      {/* REJECT button */}
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        disabled={isActing}
                        onClick={() => handleReject(enrollment._id)}
                        className={cn(
                          'flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all',
                          'bg-white border-2 border-red-300 text-red-600',
                          'hover:bg-red-50 hover:border-red-400',
                          'disabled:opacity-60 disabled:cursor-not-allowed'
                        )}
                      >
                        <HiXCircle className="w-4 h-4" />
                        Reject
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
};

export default TeacherEnrollments;