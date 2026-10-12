// src/pages/teacher/Quizzes.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiClipboardList, HiPlus, HiRefresh, HiSearch,
  HiEye, HiSparkles, HiAcademicCap, HiClock,
  HiUsers, HiCheckCircle, HiX, HiDownload, HiDocumentText, HiChevronRight, HiCheck,
} from 'react-icons/hi';
import toast from 'react-hot-toast';

import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Loader from '../../components/common/Loader';
import { teacherApi } from '../../api/teacherApi';
import { quizApi } from '../../api/quizApi';
import { staggerContainer, slideUp } from '../../utils/constants';
import { formatDate, cn } from '../../utils/helpers';

const TeacherQuizzes = () => {
  const [courses, setCourses] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [pageLoading, setPageLoading] = useState(true);

  // modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isSubOpen, setIsSubOpen] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingSubs, setLoadingSubs] = useState(false);

  // grading descriptive modal
  const [isGradingOpen, setIsGradingOpen] = useState(false);
  const [activeSubmission, setActiveSubmission] = useState(null);
  const [gradingMarks, setGradingMarks] = useState({}); // { questionId: number }
  const [gradingFeedback, setGradingFeedback] = useState({}); // { questionId: string }
  const [submittingGrades, setSubmittingGrades] = useState(false);

  // form
  const emptyForm = () => ({
    title: '',
    description: '',
    courseId: '',
    duration: '',
    totalMarks: '',
    questions: [
      {
        questionText: '',
        type: 'mcq',
        options: ['', '', '', ''],
        correctAnswer: '',
        pdfFile: '',
        pdfUploading: false,
      },
    ],
  });
  const [form, setForm] = useState(emptyForm());

  // ── Fetch all courses + quizzes ─────────────────────────
  const fetchAll = async () => {
    setPageLoading(true);
    try {
      const dashRes = await teacherApi.getCourses();
      const courseList = dashRes?.data?.courses || [];
      setCourses(Array.isArray(courseList) ? courseList : []);

      if (courseList.length === 0) { setQuizzes([]); return; }

      // Fetch quizzes for every course in parallel
      const results = await Promise.allSettled(
        courseList.map((c) =>
          quizApi.getCourseQuizzes(c._id).then((r) => ({
            courseId: c._id,
            courseTitle: c.title,
            list: Array.isArray(r.data) ? r.data : [],
          }))
        )
      );

      const all = [];
      const seen = new Set();
      for (const r of results) {
        if (r.status === 'fulfilled') {
          for (const quiz of r.value.list) {
            if (!seen.has(quiz._id)) {
              seen.add(quiz._id);
              all.push({
                ...quiz,
                course: quiz.course || { _id: r.value.courseId, title: r.value.courseTitle },
              });
            }
          }
        }
      }
      all.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setQuizzes(all);
    } catch (err) {
      console.error('fetchAll error:', err);
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // ── Derived ─────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = quizzes;
    if (courseFilter !== 'all') {
      list = list.filter((q) => {
        const cId = q.course?._id || q.course;
        return cId === courseFilter;
      });
    }
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        (q) => q.title?.toLowerCase().includes(s) || q.course?.title?.toLowerCase().includes(s)
      );
    }
    return list;
  }, [quizzes, courseFilter, search]);

  const stats = useMemo(() => ({
    total: quizzes.length,
    published: quizzes.filter((q) => q.status === 'published').length,
    totalQ: quizzes.reduce((s, q) => s + (q.questions?.length || 0), 0),
  }), [quizzes]);

  // ── Form helpers ────────────────────────────────────────
  const resetForm = () => setForm(emptyForm());

  const addQuestion = () =>
    setForm((p) => ({
      ...p,
      questions: [
        ...p.questions,
        {
          questionText: '',
          type: 'mcq',
          options: ['', '', '', ''],
          correctAnswer: '',
          pdfFile: '',
          pdfUploading: false,
        },
      ],
    }));

  const removeQuestion = (i) =>
    setForm((p) => ({ ...p, questions: p.questions.filter((_, idx) => idx !== i) }));

  const updateQ = (i, field, val) =>
    setForm((p) => {
      const qs = [...p.questions];
      qs[i] = { ...qs[i], [field]: val };
      return { ...p, questions: qs };
    });

  const updateOpt = (qi, oi, val) =>
    setForm((p) => {
      const qs = [...p.questions];
      const opts = [...qs[qi].options];
      opts[oi] = val;
      qs[qi] = { ...qs[qi], options: opts };
      return { ...p, questions: qs };
    });

  const handlePdfUpload = async (qi, file) => {
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed');
      return;
    }

    setForm((p) => {
      const qs = [...p.questions];
      qs[qi] = { ...qs[qi], pdfUploading: true };
      return { ...p, questions: qs };
    });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await quizApi.uploadPdf(formData);
      const fileUrl = res.data?.fileUrl;

      setForm((p) => {
        const qs = [...p.questions];
        qs[qi] = { ...qs[qi], pdfFile: fileUrl, pdfUploading: false };
        return { ...p, questions: qs };
      });
      toast.success('PDF uploaded successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload PDF');
      setForm((p) => {
        const qs = [...p.questions];
        qs[qi] = { ...qs[qi], pdfUploading: false };
        return { ...p, questions: qs };
      });
    }
  };

  // ── Create quiz ─────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.totalMarks || isNaN(form.totalMarks) || Number(form.totalMarks) <= 0) {
      toast.error('Please enter a valid total marks weight');
      return;
    }

    for (let i = 0; i < form.questions.length; i++) {
      const q = form.questions[i];
      if (!q.questionText.trim()) { toast.error(`Q${i + 1}: question text required`); return; }
      if (q.type === 'mcq') {
        if (q.options.some((o) => !o.trim())) { toast.error(`Q${i + 1}: all 4 options required`); return; }
        if (!q.correctAnswer.trim()) { toast.error(`Q${i + 1}: correct answer required`); return; }
        if (!q.options.includes(q.correctAnswer)) {
          toast.error(`Q${i + 1}: correct answer must exactly match one option`); return;
        }
      }
    }

    setSubmitting(true);
    try {
      const res = await quizApi.createQuiz({
        title: form.title,
        description: form.description,
        courseId: form.courseId,
        duration: Number(form.duration),
        totalMarks: Number(form.totalMarks),
        questions: form.questions.map((q) => ({
          questionText: q.questionText,
          type: q.type,
          options: q.type === 'mcq' ? q.options : [],
          correctAnswer: q.type === 'mcq' ? q.correctAnswer : '',
          pdfFile: q.pdfFile,
        })),
      });
      toast.success('Quiz created successfully');
      setIsCreateOpen(false);
      resetForm();
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create quiz');
    } finally {
      setSubmitting(false);
    }
  };

  // ── View submissions ────────────────────────────────────
  const handleViewSubs = async (quiz) => {
    setSelectedQuiz(quiz);
    setLoadingSubs(true);
    setIsSubOpen(true);
    try {
      const res = await quizApi.getQuizSubmissions(quiz._id);
      setSubmissions(Array.isArray(res.data) ? res.data : []);
    } catch {
      setSubmissions([]);
    } finally {
      setLoadingSubs(false);
    }
  };

  // ── Excel Export (tsv clipboard + csv file) ───────────────
  const handleExcelExport = async (type) => {
    if (!selectedQuiz) return;
    try {
      const res = await quizApi.getQuizMarksExcel(selectedQuiz._id);
      const data = res.data;
      if (!data || data.length === 0) {
        toast.error('No submissions to export');
        return;
      }

      if (type === 'clipboard') {
        let tsv = 'Student Name\tStudent Email\tBatch\tSemester\tDepartment\tScore (MCQ Correct)\tWeighted Score\tTotal Marks\tStatus\n';
        data.forEach((row) => {
          tsv += `${row.name}\t${row.email}\t${row.batch}\t${row.semester}\t${row.department}\t${row.mcqCorrect}\t${row.weightedScore}\t${row.totalMarks}\t${row.status}\n`;
        });
        await navigator.clipboard.writeText(tsv);
        toast.success('Quiz marks copied to clipboard! You can paste now directly in Excel.');
      } else {
        // CSV download
        let csv = 'Student Name,Student Email,Batch,Semester,Department,Score (MCQ Correct),Weighted Score,Total Marks,Status,Submitted At\n';
        data.forEach((row) => {
          csv += `"${row.name}","${row.email}","${row.batch}","${row.semester}","${row.department}",${row.mcqCorrect},${row.weightedScore},${row.totalMarks},"${row.status}","${row.submittedAt}"\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${selectedQuiz.title.replace(/\s+/g, '_')}_marks.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('CSV file downloaded successfully!');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to export quiz marks');
    }
  };

  // ── Manual Grading descriptive answers ─────────────────────
  const openGradingModal = (sub) => {
    setActiveSubmission(sub);
    const marksObj = {};
    const feedbackObj = {};
    sub.answers.forEach((ans) => {
      marksObj[ans.questionId] = ans.marksObtained || 0;
      feedbackObj[ans.questionId] = ans.feedback || '';
    });
    setGradingMarks(marksObj);
    setGradingFeedback(feedbackObj);
    setIsGradingOpen(true);
  };

  const handleGradeSubmit = async (e) => {
    e.preventDefault();
    if (!activeSubmission) return;

    setSubmittingGrades(true);
    try {
      const gradesArray = Object.keys(gradingMarks).map((qId) => ({
        questionId: qId,
        marksObtained: Number(gradingMarks[qId]),
        feedback: gradingFeedback[qId],
      }));

      await quizApi.gradeDescriptive({
        submissionId: activeSubmission._id,
        grades: gradesArray,
      });

      toast.success('Submission graded successfully');
      setIsGradingOpen(false);
      setActiveSubmission(null);
      // Reload submissions
      handleViewSubs(selectedQuiz);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit grades');
    } finally {
      setSubmittingGrades(false);
    }
  };

  // ── Stat card ───────────────────────────────────────────
  const StatCard = ({ title, value, icon: Icon, gradient }) => (
    <motion.div
      whileHover={{ y: -5 }}
      className="relative overflow-hidden rounded-2xl border border-dark-100 bg-white shadow-soft hover:shadow-soft-lg transition-all"
    >
      <div className={cn('absolute -top-14 -right-14 w-44 h-44 rounded-full blur-3xl opacity-20 bg-gradient-to-br', gradient)} />
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

  // ── Quiz card ───────────────────────────────────────────
  const QuizCard = ({ quiz }) => (
    <motion.div
      whileHover={{ y: -5 }}
      className="relative overflow-hidden rounded-2xl border border-dark-100 bg-white shadow-soft hover:shadow-soft-lg transition-all"
    >
      <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full blur-3xl opacity-15 bg-gradient-to-br from-primary-500 to-accent-500" />
      <div className="p-6 relative">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white shadow-lg shrink-0">
              <HiClipboardList className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-dark-900 truncate">{quiz.title}</h3>
              <p className="text-sm text-dark-500 truncate">{quiz.course?.title || '—'}</p>
            </div>
          </div>
          <span className="badge badge-success text-xs shrink-0 ml-2">
            {quiz.status || 'published'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="p-2 bg-dark-50 rounded-xl text-center">
            <p className="text-[10px] text-dark-500 mb-0.5">Questions</p>
            <p className="font-bold text-sm text-dark-900">{quiz.questions?.length || 0}</p>
          </div>
          <div className="p-2 bg-dark-50 rounded-xl text-center">
            <p className="text-[10px] text-dark-500 mb-0.5">Weight</p>
            <p className="font-bold text-sm text-dark-900">{quiz.totalMarks || 0} pts</p>
          </div>
          <div className="p-2 bg-dark-50 rounded-xl text-center">
            <p className="text-[10px] text-dark-500 mb-0.5">Duration</p>
            <p className="font-bold text-sm text-dark-900">{quiz.duration} m</p>
          </div>
        </div>

        {quiz.description && (
          <p className="text-sm text-dark-600 mb-3 line-clamp-2">{quiz.description}</p>
        )}
        <p className="text-xs text-dark-400 mb-4">
          Created: {quiz.createdAt ? formatDate(quiz.createdAt) : '—'}
        </p>

        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="outline" icon={HiEye}
            onClick={() => { setSelectedQuiz(quiz); setIsViewOpen(true); }}>
            Preview
          </Button>
          <Button size="sm" icon={HiUsers} onClick={() => handleViewSubs(quiz)}>
            Submissions
          </Button>
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
                <span className="text-sm font-bold">Quiz Manager</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black mb-2">My Quizzes</h1>
              <p className="text-white/80">Create weighted MCQ or descriptive quizzes with custom marks distribution</p>
              <div className="mt-6 grid grid-cols-3 gap-4">
                {[
                  { label: 'Total', val: stats.total },
                  { label: 'Published', val: stats.published },
                  { label: 'Questions', val: stats.totalQ },
                ].map(({ label, val }) => (
                  <div key={label} className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                    <p className="text-white/70 text-xs">{label}</p>
                    <p className="text-2xl font-bold">{val}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" className="border-white/40 text-white hover:bg-white/20"
                icon={HiRefresh} onClick={fetchAll}>Refresh</Button>
              <Button className="bg-white text-primary-700 hover:bg-white/90 shadow-lg"
                icon={HiPlus} onClick={() => { resetForm(); setIsCreateOpen(true); }}>
                Create Quiz
              </Button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* STATS */}
      <motion.div variants={slideUp} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Quizzes"   value={stats.total}     icon={HiClipboardList} gradient="from-primary-500 to-primary-600" />
        <StatCard title="Published"       value={stats.published} icon={HiCheckCircle}   gradient="from-green-500 to-green-600" />
        <StatCard title="Total Questions" value={stats.totalQ}    icon={HiAcademicCap}   gradient="from-accent-500 to-accent-600" />
      </motion.div>

      {/* FILTERS */}
      <motion.div variants={slideUp}>
        <Card padding={false} className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <HiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
              <input type="text" placeholder="Search quizzes..." value={search}
                onChange={(e) => setSearch(e.target.value)} className="input pl-12" />
            </div>
            <select className="input w-auto min-w-[200px]" value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}>
              <option value="all">All Courses</option>
              {courses.map((c) => <option key={c._id} value={c._id}>{c.title}</option>)}
            </select>
          </div>
        </Card>
      </motion.div>

      {/* LIST */}
      {pageLoading ? (
        <div className="py-16"><Loader size="lg" text="Loading quizzes..." /></div>
      ) : (
        <motion.div variants={slideUp} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <AnimatePresence>
            {filtered.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="col-span-full text-center py-16">
                <HiClipboardList className="w-16 h-16 mx-auto mb-4 text-dark-300" />
                <p className="text-dark-500 font-medium">No quizzes found</p>
                <p className="text-sm text-dark-400 mt-1 mb-4">
                  {courses.length === 0 ? 'Create a course first' : 'Create your first quiz'}
                </p>
                {courses.length > 0 && (
                  <Button icon={HiPlus} onClick={() => { resetForm(); setIsCreateOpen(true); }}>
                    Create Quiz
                  </Button>
                )}
              </motion.div>
            ) : filtered.map((quiz) => <QuizCard key={quiz._id} quiz={quiz} />)}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ══ CREATE MODAL ══ */}
      <Modal isOpen={isCreateOpen} onClose={() => { setIsCreateOpen(false); resetForm(); }}
        title="Create New Quiz" description="Build a weighted quiz (MCQ/Descriptive) for students" size="xl">
        <form onSubmit={handleCreate} className="space-y-6 max-h-[75vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Quiz Title" value={form.title} required
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g., JavaScript Midterm Quiz" />
            <div>
              <label className="block text-sm font-semibold text-dark-700 mb-2">
                Course <span className="text-red-500">*</span>
              </label>
              <select className="input" value={form.courseId} required
                onChange={(e) => setForm((p) => ({ ...p, courseId: e.target.value }))}>
                <option value="">-- Select course --</option>
                {courses.map((c) => <option key={c._id} value={c._id}>{c.title}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Duration (minutes)" type="number" min="1" value={form.duration} required
              onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))}
              placeholder="e.g., 30" />
            <Input label="Total Marks Weight" type="number" min="1" value={form.totalMarks} required
              onChange={(e) => setForm((p) => ({ ...p, totalMarks: e.target.value }))}
              placeholder="e.g., 5, 10" />
            <div>
              <label className="block text-sm font-semibold text-dark-700 mb-2">Description</label>
              <textarea className="input" rows={1} value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Optional description..." />
            </div>
          </div>

          {/* Questions */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-dark-900 text-lg">
                Questions ({form.questions.length})
                {form.totalMarks && form.questions.length > 0 && (
                  <span className="text-xs text-primary-600 ml-3 font-normal">
                    (Each question weight: {(Number(form.totalMarks) / form.questions.length).toFixed(2)} marks)
                  </span>
                )}
              </h3>
              <Button type="button" size="sm" icon={HiPlus} onClick={addQuestion}>
                Add Question
              </Button>
            </div>

            <div className="space-y-5">
              {form.questions.map((q, qi) => (
                <motion.div key={qi} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="p-5 border-2 border-dark-100 rounded-2xl bg-dark-50/50 relative">
                  {form.questions.length > 1 && (
                    <button type="button" onClick={() => removeQuestion(qi)}
                      className="absolute top-3 right-3 p-1.5 rounded-lg text-red-500 hover:bg-red-50">
                      <HiX className="w-4 h-4" />
                    </button>
                  )}

                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-sm font-bold">
                        {qi + 1}
                      </div>
                      <span className="font-semibold text-dark-700">Question {qi + 1}</span>
                    </div>

                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm text-dark-700 font-medium cursor-pointer">
                        <input type="radio" name={`qType-${qi}`} checked={q.type === 'mcq'}
                          onChange={() => updateQ(qi, 'type', 'mcq')} className="radio" />
                        Multiple Choice (MCQ)
                      </label>
                      <label className="flex items-center gap-2 text-sm text-dark-700 font-medium cursor-pointer">
                        <input type="radio" name={`qType-${qi}`} checked={q.type === 'descriptive'}
                          onChange={() => updateQ(qi, 'type', 'descriptive')} className="radio" />
                        Descriptive (Description)
                      </label>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-dark-700 mb-2">
                      Question Text <span className="text-red-500">*</span>
                    </label>
                    <textarea className="input" rows={2} value={q.questionText} required
                      onChange={(e) => updateQ(qi, 'questionText', e.target.value)}
                      placeholder="Enter question text..." />
                  </div>

                  {/* Upload PDF helper */}
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-dark-700 mb-1">
                      Attach Reference PDF (Optional)
                    </label>
                    <div className="flex items-center gap-3">
                      <input type="file" accept="application/pdf" className="hidden" id={`pdfFile-${qi}`}
                        onChange={(e) => handlePdfUpload(qi, e.target.files[0])} />
                      <label htmlFor={`pdfFile-${qi}`} className="btn btn-outline btn-sm cursor-pointer flex items-center gap-1">
                        <HiDownload className="w-4 h-4 rotate-180" />
                        {q.pdfFile ? 'Change PDF' : 'Upload PDF'}
                      </label>
                      {q.pdfUploading && <Loader size="sm" text="Uploading..." />}
                      {q.pdfFile && !q.pdfUploading && (
                        <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                          <HiCheckCircle className="w-4 h-4" /> Attached reference PDF
                        </span>
                      )}
                    </div>
                  </div>

                  {q.type === 'mcq' && (
                    <>
                      <div className="mb-4">
                        <label className="block text-sm font-semibold text-dark-700 mb-2">
                          Options <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {q.options.map((opt, oi) => (
                            <div key={oi} className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-700">
                                {String.fromCharCode(65 + oi)}
                              </span>
                              <input type="text" className="input pl-11" value={opt} required={q.type === 'mcq'}
                                onChange={(e) => updateOpt(qi, oi, e.target.value)}
                                placeholder={`Option ${String.fromCharCode(65 + oi)}`} />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-dark-700 mb-2">
                          Correct Answer <span className="text-red-500">*</span>
                        </label>
                        <select className="input" value={q.correctAnswer} required={q.type === 'mcq'}
                          onChange={(e) => updateQ(qi, 'correctAnswer', e.target.value)}>
                          <option value="">-- Select correct option --</option>
                          {q.options.filter((o) => o.trim()).map((opt, oi) => (
                            <option key={oi} value={opt}>
                              {String.fromCharCode(65 + q.options.indexOf(opt))}: {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </motion.div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-dark-100 sticky bottom-0 bg-white pb-1">
            <Button type="button" variant="ghost" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button type="submit" icon={HiPlus} loading={submitting}>Create Quiz</Button>
          </div>
        </form>
      </Modal>

      {/* ══ VIEW PREVIEW MODAL ══ */}
      <Modal isOpen={isViewOpen} onClose={() => { setIsViewOpen(false); setSelectedQuiz(null); }}
        title={selectedQuiz?.title}
        description={`Course: ${selectedQuiz?.course?.title || '—'} • ${selectedQuiz?.duration} min • Total weight: ${selectedQuiz?.totalMarks} marks`}
        size="lg">
        {selectedQuiz && (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-dark-50 rounded-xl text-center">
                <p className="text-xs text-dark-500 mb-1">Duration</p>
                <p className="font-bold text-dark-900">{selectedQuiz.duration} minutes</p>
              </div>
              <div className="p-3 bg-dark-50 rounded-xl text-center">
                <p className="text-xs text-dark-500 mb-1">Questions</p>
                <p className="font-bold text-dark-900">{selectedQuiz.questions?.length || 0}</p>
              </div>
              <div className="p-3 bg-dark-50 rounded-xl text-center">
                <p className="text-xs text-dark-500 mb-1">Question Weight</p>
                <p className="font-bold text-dark-900">{(selectedQuiz.totalMarks / selectedQuiz.questions?.length).toFixed(2)} pts</p>
              </div>
            </div>
            {selectedQuiz.description && <p className="text-dark-600 text-sm">{selectedQuiz.description}</p>}
            <div className="space-y-4">
              {selectedQuiz.questions?.map((q, qi) => (
                <div key={qi} className="p-4 border border-dark-100 rounded-xl bg-dark-50">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <p className="font-semibold text-dark-900">
                      {qi + 1}. {q.questionText}
                      <span className="ml-2 text-xs font-normal px-2 py-0.5 rounded bg-primary-100 text-primary-700 capitalize">
                        {q.type || 'mcq'}
                      </span>
                    </p>
                  </div>

                  {q.pdfFile && (
                    <div className="mb-3">
                      <a href={`http://localhost:5000/${q.pdfFile}`} target="_blank" rel="noreferrer"
                        className="text-xs text-primary-600 font-semibold underline hover:text-primary-800 flex items-center gap-1">
                        <HiDocumentText className="w-4 h-4" /> View Question Reference PDF
                      </a>
                    </div>
                  )}

                  {q.type === 'mcq' || !q.type ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt, oi) => (
                        <div key={oi} className={cn(
                          'px-3 py-2 rounded-lg text-sm border',
                          opt === q.correctAnswer
                            ? 'bg-green-50 border-green-300 text-green-800 font-semibold'
                            : 'bg-white border-dark-200 text-dark-700'
                        )}>
                          {String.fromCharCode(65 + oi)}: {opt}
                          {opt === q.correctAnswer && <span className="ml-2">✓</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 bg-white border border-dashed border-dark-300 text-xs text-dark-500 rounded-lg">
                      Descriptive Question: Students will type their answer in a text description box.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* ══ SUBMISSIONS MODAL ══ */}
      <Modal isOpen={isSubOpen}
        onClose={() => { setIsSubOpen(false); setSelectedQuiz(null); setSubmissions([]); }}
        title={`Submissions — ${selectedQuiz?.title || ''}`} size="xl">
        {loadingSubs ? (
          <div className="py-10"><Loader size="md" text="Loading submissions..." /></div>
        ) : submissions.length === 0 ? (
          <div className="text-center py-12">
            <HiUsers className="w-12 h-12 mx-auto mb-3 text-dark-300" />
            <p className="text-dark-500 font-medium">No submissions yet</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-dark-100">
              <div className="grid grid-cols-3 gap-2 sm:gap-4 flex-1">
                <div className="p-3 bg-blue-50 rounded-xl text-center border border-blue-200">
                  <p className="text-xl font-bold text-blue-700">{submissions.length}</p>
                  <p className="text-[10px] text-blue-600 font-semibold uppercase">Total</p>
                </div>
                <div className="p-3 bg-green-50 rounded-xl text-center border border-green-200">
                  <p className="text-xl font-bold text-green-700">
                    {Math.round(submissions.reduce((s, x) => s + (x.weightedScore || 0), 0) / submissions.length)}
                  </p>
                  <p className="text-[10px] text-green-600 font-semibold uppercase">Avg Weight</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl text-center border border-purple-200">
                  <p className="text-xl font-bold text-purple-700">
                    {Math.max(...submissions.map((s) => s.weightedScore || 0))} / {selectedQuiz?.totalMarks}
                  </p>
                  <p className="text-[10px] text-purple-600 font-semibold uppercase">Top Score</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                <Button size="sm" variant="outline" icon={HiDownload} onClick={() => handleExcelExport('file')}>
                  Download CSV
                </Button>
                <Button size="sm" variant="outline" icon={HiClipboardList} onClick={() => handleExcelExport('clipboard')}>
                  Copy to Clipboard (Excel)
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {submissions.map((sub, idx) => {
                const totalQ = selectedQuiz?.questions?.length || 1;
                const pct = Math.round(((sub.weightedScore || 0) / (selectedQuiz?.totalMarks || 1)) * 100);
                return (
                  <div key={sub._id || idx}
                    className="p-4 border border-dark-100 rounded-xl bg-white hover:bg-dark-50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-dark-900">{sub.student?.name || 'Student'}</p>
                          {sub.student?.department && (
                            <span className="badge badge-info text-[10px]">{sub.student.department} • Sem {sub.student.semester}</span>
                          )}
                        </div>
                        <p className="text-xs text-dark-500">{sub.student?.email} • Batch: {sub.student?.batch || 'N/A'}</p>
                      </div>

                      <div className="flex items-center gap-4 justify-between sm:justify-end">
                        <div className="text-right">
                          <p className="text-base font-bold text-dark-900">
                            {sub.weightedScore} / {selectedQuiz?.totalMarks} marks
                          </p>
                          <p className="text-xs text-dark-500">{pct}% Correct (MCQ Raw: {sub.score}/{totalQ})</p>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          {sub.gradedByTeacher ? (
                            <span className="badge badge-success text-[10px] py-1 px-2 flex items-center gap-1">
                              <HiCheck className="w-3 h-3" /> Graded
                            </span>
                          ) : (
                            <span className="badge badge-warning text-[10px] py-1 px-2 animate-pulse">
                              Pending Grading
                            </span>
                          )}

                          <Button size="xs" variant="ghost" icon={HiChevronRight}
                            onClick={() => openGradingModal(sub)}>
                            Grade / Review
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="w-full h-1.5 bg-dark-100 rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full',
                        pct >= 75 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500')}
                        style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-dark-400 mt-1">
                      Submitted: {sub.createdAt ? formatDate(sub.createdAt) : '—'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Modal>

      {/* ══ MANUAL GRADING MODAL ══ */}
      <Modal isOpen={isGradingOpen} onClose={() => { setIsGradingOpen(false); setActiveSubmission(null); }}
        title={`Grade Submissions — ${activeSubmission?.student?.name || ''}`}
        description="Review descriptive answers and assign custom marks." size="lg">
        {activeSubmission && (
          <form onSubmit={handleGradeSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
            <div className="p-4 rounded-xl bg-primary-50 border border-primary-100 text-xs text-primary-800">
              <p className="font-semibold">Quiz Details:</p>
              <p>Total Weight: {selectedQuiz?.totalMarks} marks | Total Questions: {selectedQuiz?.questions?.length}</p>
              <p>Estimated weight per question: {(selectedQuiz?.totalMarks / selectedQuiz?.questions?.length).toFixed(2)} marks.</p>
            </div>

            <div className="space-y-5">
              {selectedQuiz?.questions.map((q, idx) => {
                const ans = activeSubmission.answers.find((a) => a.questionId.toString() === q._id.toString());
                const questionWeight = (selectedQuiz.totalMarks / selectedQuiz.questions.length);

                return (
                  <div key={q._id} className="p-4 border border-dark-200 rounded-xl bg-white space-y-3">
                    <div className="flex justify-between items-start">
                      <p className="font-semibold text-dark-800 text-sm">
                        Q{idx + 1}: {q.questionText}
                      </p>
                      <span className="badge badge-info text-[10px] capitalize shrink-0">
                        {q.type || 'mcq'} ({questionWeight.toFixed(2)} pts)
                      </span>
                    </div>

                    {q.pdfFile && (
                      <div className="my-1">
                        <a href={`http://localhost:5000/${q.pdfFile}`} target="_blank" rel="noreferrer"
                          className="text-xs text-primary-600 font-semibold underline hover:text-primary-800 flex items-center gap-1">
                          <HiDocumentText className="w-4.5 h-4.5" /> View Reference PDF for this question
                        </a>
                      </div>
                    )}

                    {/* Review answer */}
                    <div className="p-3 bg-dark-50 rounded-lg text-sm text-dark-800">
                      <p className="text-xs text-dark-500 font-medium mb-1">Student's Answer:</p>
                      {q.type === 'mcq' || !q.type ? (
                        <div>
                          <p className="font-semibold">{ans?.answer || 'No Answer'}</p>
                          <p className="text-[10px] text-dark-500 mt-1">
                            {ans?.answer === q.correctAnswer ? (
                              <span className="text-green-600 font-bold">✓ Match (Auto-graded correct)</span>
                            ) : (
                              <span className="text-red-500 font-bold">✗ No Match. Correct is: {q.correctAnswer}</span>
                            )}
                          </p>
                        </div>
                      ) : (
                        <p className="whitespace-pre-line font-medium text-dark-800 italic">
                          "{ans?.answer || 'No text answer submitted'}"
                        </p>
                      )}
                    </div>

                    {/* Grading options for descriptive, MCQ can be overridden but usually is read-only */}
                    {q.type === 'descriptive' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <Input label={`Marks Obtained (Max ${questionWeight.toFixed(2)})`} type="number" step="0.1" min="0" max={questionWeight}
                          value={gradingMarks[q._id] || 0}
                          onChange={(e) => setGradingMarks({ ...gradingMarks, [q._id]: e.target.value })} required />
                        <Input label="Feedback / Remarks" value={gradingFeedback[q._id] || ''}
                          onChange={(e) => setGradingFeedback({ ...gradingFeedback, [q._id]: e.target.value })}
                          placeholder="Provide feedback..." />
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-xs text-dark-500 bg-green-50/50 p-2.5 rounded-lg border border-green-100">
                        <span>Auto-calculated score:</span>
                        <span className="font-bold text-green-700">
                          {ans?.marksObtained || 0} / {questionWeight.toFixed(2)} pts
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-dark-100 sticky bottom-0 bg-white">
              <Button type="button" variant="ghost" onClick={() => { setIsGradingOpen(false); setActiveSubmission(null); }}>
                Cancel
              </Button>
              <Button type="submit" icon={HiCheckCircle} loading={submittingGrades}>Submit Grades</Button>
            </div>
          </form>
        )}
      </Modal>
    </motion.div>
  );
};

export default TeacherQuizzes;