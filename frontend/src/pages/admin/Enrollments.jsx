// src/pages/admin/Enrollments.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiUsers, HiRefresh, HiSparkles, HiCheckCircle,
  HiXCircle, HiClock, HiAcademicCap, HiSearch,
  HiBell, HiFilter,
} from 'react-icons/hi';

import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Loader from '../../components/common/Loader';
import { enrollmentApi } from '../../api/enrollmentApi';
import { staggerContainer, slideUp } from '../../utils/constants';
import { formatDate, cn } from '../../utils/helpers';
import toast from 'react-hot-toast';

const AdminEnrollments = () => {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');

  const fetchEnrollments = async (status = statusFilter) => {
    setLoading(true);
    try {
      const res = await enrollmentApi.getAllEnrollments(status);
      const list = res.data?.enrollments || res.data || [];
      setEnrollments(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('fetchEnrollments error:', err);
      toast.error('Failed to load enrollments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEnrollments(); }, []); // eslint-disable-line

  const handleStatusChange = (s) => {
    setStatusFilter(s);
    fetchEnrollments(s);
  };

  const handleApprove = async (id) => {
    setActionId(id);
    try {
      await enrollmentApi.approveEnrollment(id);
      toast.success('Enrollment approved!');
      setEnrollments((prev) =>
        statusFilter === 'pending'
          ? prev.filter((e) => e._id !== id)
          : prev.map((e) => e._id === id ? { ...e, status: 'approved' } : e)
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (id) => {
    setActionId(id);
    try {
      await enrollmentApi.rejectEnrollment(id);
      toast.success('Enrollment rejected.');
      setEnrollments((prev) =>
        statusFilter === 'pending'
          ? prev.filter((e) => e._id !== id)
          : prev.map((e) => e._id === id ? { ...e, status: 'rejected' } : e)
      );
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setActionId(null);
    }
  };

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

  const stats = useMemo(() => ({
    total: enrollments.length,
    pending: enrollments.filter((e) => e.status === 'pending').length,
    approved: enrollments.filter((e) => e.status === 'approved').length,
    rejected: enrollments.filter((e) => e.status === 'rejected').length,
  }), [enrollments]);

  const StatusBadge = ({ status }) => {
    const map = {
      pending: 'badge-warning',
      approved: 'badge-success',
      rejected: 'bg-red-100 text-red-700 border border-red-300',
    };
    return (
      <span className={cn('badge capitalize', map[status] || 'badge-secondary')}>
        {status}
      </span>
    );
  };

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
                <span className="text-sm font-bold">Admin — Enrollment Control</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black mb-2">Enrollments</h1>
              <p className="text-white/80">Review, approve or reject all student enrollment requests</p>
              <div className="mt-6 grid grid-cols-4 gap-3">
                {[
                  { label: 'Total', val: enrollments.length },
                  { label: 'Pending', val: stats.pending },
                  { label: 'Approved', val: stats.approved },
                  { label: 'Rejected', val: stats.rejected },
                ].map(({ label, val }) => (
                  <div key={label} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                    <p className="text-white/70 text-xs">{label}</p>
                    <p className="text-2xl font-bold">{val}</p>
                  </div>
                ))}
              </div>
            </div>
            <Button
              variant="outline"
              className="border-white/40 text-white hover:bg-white/20"
              icon={HiRefresh}
              onClick={() => fetchEnrollments()}
            >
              Refresh
            </Button>
          </div>
        </div>
      </motion.div>

      {/* FILTERS */}
      <motion.div variants={slideUp}>
        <Card padding={false} className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <HiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
              <input
                type="text"
                placeholder="Search student, email or course..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input pl-12"
              />
            </div>

            {/* Status filter tabs */}
            <div className="flex gap-2 flex-wrap">
              {['pending', 'approved', 'rejected', 'all'].map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className={cn(
                    'px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all capitalize',
                    statusFilter === s
                      ? 'bg-primary-600 border-primary-600 text-white shadow-md'
                      : 'bg-white border-dark-200 text-dark-600 hover:border-primary-300'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* LIST */}
      {loading ? (
        <div className="py-16"><Loader size="lg" text="Loading enrollments..." /></div>
      ) : filtered.length === 0 ? (
        <motion.div variants={slideUp}>
          <Card>
            <div className="py-16 text-center">
              <HiCheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400" />
              <p className="text-dark-500 font-medium">No enrollments found</p>
            </div>
          </Card>
        </motion.div>
      ) : (
        <motion.div variants={slideUp} className="space-y-4">
          <AnimatePresence>
            {filtered.map((enrollment) => {
              const isActing = actionId === enrollment._id;
              const isPending = enrollment.status === 'pending';
              return (
                <motion.div
                  key={enrollment._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={cn(
                    'bg-white border rounded-2xl p-5 shadow-soft hover:shadow-soft-lg transition-all',
                    isPending ? 'border-amber-300' : 'border-dark-100'
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Student info */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white font-extrabold text-xl shadow-lg shrink-0">
                        {enrollment.student?.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-dark-900">
                            {enrollment.student?.name || 'Unknown'}
                          </p>
                          <StatusBadge status={enrollment.status} />
                        </div>
                        <p className="text-sm text-dark-500 truncate">{enrollment.student?.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <HiAcademicCap className="w-4 h-4 text-primary-500 shrink-0" />
                          <p className="text-sm font-semibold text-primary-700 truncate">
                            {enrollment.course?.title || '—'}
                          </p>
                        </div>
                        <p className="text-xs text-dark-400 mt-1">
                          Teacher: {enrollment.course?.teacher?.name || '—'} •{' '}
                          {enrollment.createdAt ? formatDate(enrollment.createdAt) : '—'}
                        </p>
                      </div>
                    </div>

                    {/* Actions — only for pending */}
                    {isPending && (
                      <div className="flex gap-3 shrink-0 flex-wrap">
                        <motion.button
                          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                          disabled={isActing}
                          onClick={() => handleApprove(enrollment._id)}
                          className={cn(
                            'flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm',
                            'bg-gradient-to-r from-green-500 to-emerald-600 text-white',
                            'hover:from-green-600 hover:to-emerald-700 shadow-md shadow-green-500/30',
                            'disabled:opacity-60 disabled:cursor-not-allowed transition-all'
                          )}
                        >
                          {isActing
                            ? <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                              </svg>
                            : <HiCheckCircle className="w-4 h-4" />
                          }
                          Approve
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                          disabled={isActing}
                          onClick={() => handleReject(enrollment._id)}
                          className={cn(
                            'flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm',
                            'bg-white border-2 border-red-300 text-red-600',
                            'hover:bg-red-50 hover:border-red-400',
                            'disabled:opacity-60 disabled:cursor-not-allowed transition-all'
                          )}
                        >
                          <HiXCircle className="w-4 h-4" />
                          Reject
                        </motion.button>
                      </div>
                    )}
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

export default AdminEnrollments;