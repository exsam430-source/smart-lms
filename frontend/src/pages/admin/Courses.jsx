// src/pages/admin/Courses.jsx
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  HiAcademicCap,
  HiPlus,
  HiRefresh,
  HiSearch,
  HiPencil,
  HiTrash,
  HiUsers,
  HiClock,
  HiTag,
  HiClipboardList,
  HiCheckCircle,
  HiExclamationCircle,
} from "react-icons/hi";

import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Modal from "../../components/common/Modal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import Loader from "../../components/common/Loader";

import { adminApi } from "../../api/adminApi";
import { useApi } from "../../hooks/useApi";
import { cn, formatDate, truncateText } from "../../utils/helpers";
import { staggerContainer, slideUp } from "../../utils/constants";
import api from "../../api/axiosInstance";
import toast from "react-hot-toast";

const BATCH_OPTIONS = [
  "2020-2024",
  "2021-2025",
  "2022-2026",
  "2023-2027",
  "2024-2028",
  "2025-2029",
];

const SEMESTER_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];

const DEPT_OPTIONS = [
  "Computer Science (CS)",
  "Software Engineering (SE)",
  "Information Technology (IT)",
  "Electrical Engineering (EE)",
  "Mechanical Engineering (ME)",
  "Business Administration (BBA)",
];

const Courses = () => {
  const { loading, execute } = useApi();

  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); // ✅ NEW
  const [deptFilter, setDeptFilter] = useState("all");
  const [programFilter, setProgramFilter] = useState("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [approvingId, setApprovingId] = useState(null); // ✅ NEW

  // Direct Enrollment Modal States
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const [enrollStudentId, setEnrollStudentId] = useState("");
  const [students, setStudents] = useState([]);
  const [enrolling, setEnrolling] = useState(false);

  // Award List States
  const [isAwardListOpen, setIsAwardListOpen] = useState(false);
  const [awardList, setAwardList] = useState([]);
  const [gradingComponents, setGradingComponents] = useState(null);
  const [loadingAwardList, setLoadingAwardList] = useState(false);
  const [savingAwardList, setSavingAwardList] = useState(false);
  const [departments, setDepartments] = useState([]);


  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    duration: "",
    teacher: "",
    status: "approved",
    subject: "",
    batch: "",
    semester: "",
    department: "",
    program: "",
    quizzes: 5,
    assignments: 10,
    presentation: 5,
    labWork: 10,
    midTerm: 20,
    finalTerm: 50,
  });

  const selectedDeptPrograms = useMemo(() => {
    if (!formData.department) return [];
    const found = departments.find((d) => d.name === formData.department);
    return found ? found.programs || [] : [];
  }, [departments, formData.department]);

  const selectedProgBatches = useMemo(() => {
    if (!formData.program) return [];
    const found = selectedDeptPrograms.find((p) => p.name === formData.program);
    return found ? found.batches || [] : [];
  }, [selectedDeptPrograms, formData.program]);


  // ── Fetch ──────────────────────────────────────────────
  const fetchCourses = async () => {
    await execute(() => adminApi.getCourses(), {
      showSuccessToast: false,
      onSuccess: (data) => {
        const list = Array.isArray(data) ? data : data?.data;
        setCourses(Array.isArray(list) ? list : []);
      },
    });
  };

  const fetchTeachers = async () => {
    await execute(() => adminApi.getTeachers(), {
      showSuccessToast: false,
      onSuccess: (data) => {
        const list = Array.isArray(data) ? data : data?.data;
        setTeachers(Array.isArray(list) ? list : []);
      },
    });
  };

  const fetchDepartments = async () => {
    await execute(() => adminApi.getDepartments(), {
      showSuccessToast: false,
      onSuccess: (data) => {
        setDepartments(Array.isArray(data) ? data : []);
      },
    });
  };

  useEffect(() => {
    fetchCourses();
    fetchTeachers();
    fetchDepartments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Approve course ─────────────────────────────────────
  const handleApproveCourse = async (courseId) => {
    setApprovingId(courseId);
    try {
      await api.put(`/courses/approve/${courseId}`);
      // Update local state immediately
      setCourses((prev) =>
        prev.map((c) =>
          c._id === courseId ? { ...c, status: "approved" } : c
        )
      );
    } catch (err) {
      console.error("Approve error:", err);
    } finally {
      setApprovingId(null);
    }
  };

  // ── Form ───────────────────────────────────────────────
  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "",
      duration: "",
      teacher: "",
      status: "approved",
      subject: "",
      batch: "",
      semester: "",
      department: "",
      program: "",
      quizzes: 5,
      assignments: 10,
      presentation: 5,
      labWork: 10,
      midTerm: 20,
      finalTerm: 50,
    });
    setSelectedCourse(null);
  };

  const openCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEdit = (course) => {
    setSelectedCourse(course);
    setFormData({
      title: course?.title || "",
      description: course?.description || "",
      category: course?.category || "",
      duration: course?.duration || "",
      teacher: course?.teacher?._id || course?.teacher || "",
      status: course?.status || "approved",
      subject: course?.subject || "",
      batch: course?.batch || "",
      semester: course?.semester ? String(course.semester) : "",
      department: course?.department || "",
      program: course?.program || "",
      quizzes: course?.gradingComponents?.quizzes !== undefined ? course.gradingComponents.quizzes : 5,
      assignments: course?.gradingComponents?.assignments !== undefined ? course.gradingComponents.assignments : 10,
      presentation: course?.gradingComponents?.presentation !== undefined ? course.gradingComponents.presentation : 5,
      labWork: course?.gradingComponents?.labWork !== undefined ? course.gradingComponents.labWork : 10,
      midTerm: course?.gradingComponents?.midTerm !== undefined ? course.gradingComponents.midTerm : 20,
      finalTerm: course?.gradingComponents?.finalTerm !== undefined ? course.gradingComponents.finalTerm : 50,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      title: formData.title,
      description: formData.description,
      category: formData.category,
      duration: formData.duration,
      teacher: formData.teacher || null,
      status: formData.status || "approved",
      subject: formData.subject || "",
      batch: formData.batch || "",
      semester: formData.semester ? Number(formData.semester) : null,
      department: formData.department || "",
      program: formData.program || "",
      gradingComponents: {
        quizzes: Number(formData.quizzes) || 0,
        assignments: Number(formData.assignments) || 0,
        presentation: Number(formData.presentation) || 0,
        labWork: Number(formData.labWork) || 0,
        midTerm: Number(formData.midTerm) || 0,
        finalTerm: Number(formData.finalTerm) || 0,
      }
    };

    if (selectedCourse?._id) {
      await execute(() => adminApi.updateCourse(selectedCourse._id, payload), {
        showSuccessToast: true,
        successMessage: "Course updated successfully!",
        onSuccess: () => {
          setIsModalOpen(false);
          resetForm();
          fetchCourses();
        },
      });
    } else {
      await execute(() => adminApi.createCourse(payload), {
        showSuccessToast: true,
        successMessage: "Course created successfully!",
        onSuccess: () => {
          setIsModalOpen(false);
          resetForm();
          fetchCourses();
        },
      });
    }
  };

  const handleOpenAwardListModal = async (course) => {
    setSelectedCourse(course);
    setAwardList([]);
    setGradingComponents(null);
    setLoadingAwardList(true);
    setIsAwardListOpen(true);

    try {
      const res = await api.get(`/teacher/course/${course._id}/award-list`);
      setAwardList(res.data.awardList || []);
      setGradingComponents(res.data.gradingComponents || null);
    } catch (err) {
      console.error("fetchAwardList error:", err);
      toast.error("Failed to load Award List");
      setIsAwardListOpen(false);
    } finally {
      setLoadingAwardList(false);
    }
  };

  const handleSaveAwardList = async () => {
    if (!selectedCourse) return;
    setSavingAwardList(true);

    try {
      const studentsMarks = awardList.map((row) => ({
        studentId: row.studentId,
        presentation: Number(row.presentationMarks) || 0,
        lab: Number(row.labMarks) || 0,
        mid: Number(row.midMarks) || 0,
        final: Number(row.finalMarks) || 0,
      }));

      await api.post(`/teacher/course/${selectedCourse._id}/award-list`, { studentsMarks });
      toast.success("Award List saved successfully!");
      setIsAwardListOpen(false);
    } catch (err) {
      console.error("saveAwardList error:", err);
      toast.error("Failed to save Award List");
    } finally {
      setSavingAwardList(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedCourse?._id) return;
    await execute(() => adminApi.deleteCourse(selectedCourse._id), {
      showSuccessToast: true,
      successMessage: "Course deleted successfully!",
      onSuccess: () => {
        setIsDeleteOpen(false);
        setSelectedCourse(null);
        fetchCourses();
      },
    });
  };

  const fetchStudents = async () => {
    try {
      const res = await adminApi.getStudents();
      const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setStudents(list);
    } catch (err) {
      console.error("fetchStudents error:", err);
    }
  };

  const openEnrollModal = (course) => {
    setSelectedCourse(course);
    setEnrollStudentId("");
    setIsEnrollOpen(true);
    fetchStudents();
  };

  const handleDirectEnroll = async (e) => {
    e.preventDefault();
    if (!enrollStudentId) {
      toast.error("Please select a student");
      return;
    }
    setEnrolling(true);
    try {
      await adminApi.directEnroll(enrollStudentId, selectedCourse._id);
      toast.success("Student enrolled successfully!");
      setIsEnrollOpen(false);
      setSelectedCourse(null);
      fetchCourses();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to enroll student");
    } finally {
      setEnrolling(false);
    }
  };

  // ── Computed ───────────────────────────────────────────
  const categories = useMemo(() => {
    const set = new Set();
    for (const c of courses) set.add(c.category || "Uncategorized");
    return ["all", ...Array.from(set)];
  }, [courses]);

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const t = (c.title || "").toLowerCase();
      const d = (c.description || "").toLowerCase();
      const cat = c.category || "Uncategorized";
      const status = c.status || "pending";

      const matchesSearch =
        t.includes(search.toLowerCase()) || d.includes(search.toLowerCase());
      const matchesCategory = category === "all" || cat === category;
      const matchesStatus = statusFilter === "all" || status === statusFilter; // ✅ NEW
      const matchesDept = deptFilter === "all" || (c.department || "") === deptFilter;
      const matchesProgram = programFilter === "all" || (c.program || "") === programFilter;

      return matchesSearch && matchesCategory && matchesStatus && matchesDept && matchesProgram;
    });
  }, [courses, search, category, statusFilter, deptFilter, programFilter]);

  const filterPrograms = useMemo(() => {
    if (deptFilter === "all") {
      const set = new Set();
      departments.forEach((d) => {
        (d.programs || []).forEach((p) => set.add(p.name));
      });
      courses.forEach((c) => {
        if (c.program) set.add(c.program);
      });
      return Array.from(set);
    }
    const found = departments.find((d) => d.name === deptFilter);
    return found ? (found.programs || []).map((p) => p.name) : [];
  }, [departments, deptFilter, courses]);

  const stats = useMemo(() => {
    const total = courses.length;
    const approved = courses.filter(
      (c) => (c.status || "").toLowerCase() === "approved"
    ).length;
    const pending = courses.filter(
      (c) => (c.status || "").toLowerCase() === "pending"
    ).length;
    const uniqueCategories = new Set(
      courses.map((c) => c.category || "Uncategorized")
    ).size;
    return { total, approved, pending, uniqueCategories };
  }, [courses]);

  // ── Stat Card ──────────────────────────────────────────
  const StatCard3D = ({ title, value, icon: Icon, gradient, hint, onClick }) => (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 280, damping: 18 }}
      onClick={onClick}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-dark-100 bg-white",
        "shadow-[0_18px_35px_-18px_rgba(15,23,42,0.25)]",
        "hover:shadow-[0_28px_55px_-22px_rgba(99,102,241,0.28)] transition-all",
        onClick && "cursor-pointer"
      )}
    >
      <div
        className={cn(
          "absolute -top-14 -right-14 w-44 h-44 rounded-full blur-3xl opacity-20 bg-gradient-to-br",
          gradient
        )}
      />
      <div className="p-5 sm:p-6 relative">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-dark-500">{title}</p>
            <p className="mt-2 text-3xl font-extrabold text-dark-900 tracking-tight truncate">
              {value}
            </p>
            {hint && <p className="mt-1 text-xs text-dark-400">{hint}</p>}
          </div>
          <div
            className={cn(
              "shrink-0 p-4 rounded-2xl text-white shadow-lg bg-gradient-to-br",
              gradient
            )}
          >
            <Icon className="w-7 h-7" />
          </div>
        </div>
        <div className="mt-5 h-[1px] w-full bg-gradient-to-r from-transparent via-dark-200 to-transparent" />
      </div>
    </motion.div>
  );

  // ── Course Card ────────────────────────────────────────
  const CourseCard = ({ course }) => {
    const teacherName = course?.teacher?.name || "Not Assigned";
    const courseCategory = course?.category || "Uncategorized";
    const isPending = course?.status === "pending";
    const isApproving = approvingId === course._id;

    return (
      <motion.div
        whileHover={{ y: -6 }}
        transition={{ type: "spring", stiffness: 280, damping: 18 }}
        className={cn(
          "relative overflow-hidden rounded-2xl border bg-white transition-all",
          "shadow-[0_18px_35px_-18px_rgba(15,23,42,0.25)]",
          "hover:shadow-[0_28px_55px_-22px_rgba(99,102,241,0.28)]",
          isPending
            ? "border-amber-300"        // ✅ highlight pending in amber
            : "border-dark-100"
        )}
      >
        {/* Pending banner */}
        {isPending && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2">
            <HiExclamationCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-xs font-semibold text-amber-700">
              Pending approval — review and approve below
            </p>
          </div>
        )}

        <div className="absolute -top-14 -right-14 w-44 h-44 rounded-full blur-3xl opacity-20 bg-gradient-to-br from-primary-500 to-accent-500" />

        <div className="p-6 relative">
          {/* Header row */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="p-2 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 text-white shadow-lg">
                  <HiAcademicCap className="w-5 h-5" />
                </div>

                {/* Status badge */}
                <span
                  className={cn(
                    "badge capitalize",
                    isPending ? "badge-warning" : "badge-success"
                  )}
                >
                  {course?.status || "pending"}
                </span>
              </div>

              <h3 className="mt-3 text-lg font-extrabold text-dark-900 truncate">
                {course?.title || "Untitled"}
              </h3>

              <p className="mt-2 text-sm text-dark-600">
                {truncateText(course?.description || "No description", 100)}
              </p>
            </div>

            {/* Edit / Delete buttons */}
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => openEdit(course)}
                className="p-2 rounded-xl border border-dark-100 text-dark-600 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                title="Edit"
              >
                <HiPencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setSelectedCourse(course);
                  setIsDeleteOpen(true);
                }}
                className="p-2 rounded-xl border border-dark-100 text-dark-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Delete"
              >
                <HiTrash className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Meta grid */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-dark-50 border border-dark-100">
              <div className="flex items-center gap-2 text-xs font-semibold text-dark-500">
                <HiUsers className="w-4 h-4 text-primary-600" />
                Teacher
              </div>
              <p className="mt-1 text-sm font-semibold text-dark-900 truncate">
                {teacherName}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-dark-50 border border-dark-100">
              <div className="flex items-center gap-2 text-xs font-semibold text-dark-500">
                <HiTag className="w-4 h-4 text-accent-600" />
                Category
              </div>
              <p className="mt-1 text-sm font-semibold text-dark-900 truncate">
                {courseCategory}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-dark-50 border border-dark-100">
              <div className="flex items-center gap-2 text-xs font-semibold text-dark-500">
                <HiClock className="w-4 h-4 text-amber-600" />
                Duration
              </div>
              <p className="mt-1 text-sm font-semibold text-dark-900 truncate">
                {course?.duration || "N/A"}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-dark-50 border border-dark-100">
              <div className="text-xs font-semibold text-dark-500">Subject</div>
              <p className="mt-1 text-sm font-semibold text-dark-900 truncate">
                {course?.subject || "—"}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-dark-50 border border-dark-100">
              <div className="text-xs font-semibold text-dark-500">Target batch & sem</div>
              <p className="mt-1 text-sm font-semibold text-dark-900 truncate">
                {course?.batch || "—"} {course?.semester ? `| S${course.semester}` : ""}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-dark-50 border border-dark-100">
              <div className="text-xs font-semibold text-dark-500">Department / Program</div>
              <p className="mt-1 text-sm font-semibold text-dark-900 truncate">
                {course?.program ? `${course.program} — ${course.department || "N/A"}` : course?.department || "—"}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-dark-50 border border-dark-100">
              <div className="text-xs font-semibold text-dark-500">Created</div>
              <p className="mt-1 text-sm font-semibold text-dark-900 truncate">
                {course?.createdAt ? formatDate(course.createdAt) : "—"}
              </p>
            </div>
          </div>

          {/* ✅ APPROVE BUTTON — only shown for pending courses */}
          {isPending && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4"
            >
              <button
                onClick={() => handleApproveCourse(course._id)}
                disabled={isApproving}
                className={cn(
                  "w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl",
                  "font-bold text-sm transition-all",
                  "bg-gradient-to-r from-green-500 to-emerald-600 text-white",
                  "hover:from-green-600 hover:to-emerald-700",
                  "shadow-lg shadow-green-500/30 hover:shadow-green-500/50",
                  "disabled:opacity-60 disabled:cursor-not-allowed"
                )}
              >
                {isApproving ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Approving...
                  </>
                ) : (
                  <>
                    <HiCheckCircle className="w-5 h-5" />
                    Approve Course
                  </>
                )}
              </button>
            </motion.div>
          )}

          {/* ✅ Already approved indicator */}
          {!isPending && (
            <div className="mt-4 flex items-center justify-between gap-2 flex-wrap border-t border-dark-100 pt-3">
              <div className="flex items-center gap-2 text-green-600 text-sm font-semibold">
                <HiCheckCircle className="w-5 h-5 animate-pulse" />
                <span>Approved</span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  icon={HiClipboardList}
                  onClick={() => handleOpenAwardListModal(course)}
                >
                  Award List
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  icon={HiPlus}
                  onClick={() => openEnrollModal(course)}
                >
                  Enroll Student
                </Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  // ── Render ─────────────────────────────────────────────
  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={staggerContainer}
      className="space-y-6"
    >
      {/* PAGE HEADER */}
      <motion.div
        variants={slideUp}
        className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-dark-900">Courses</h1>
          <p className="text-dark-500 mt-1">
            Manage all courses — approve pending ones so students can enroll
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="ghost" icon={HiRefresh} onClick={fetchCourses}>
            Refresh
          </Button>
          <Button icon={HiPlus} onClick={openCreate}>
            Create Course
          </Button>
        </div>
      </motion.div>

      {/* STAT CARDS */}
      <motion.div
        variants={slideUp}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <StatCard3D
          title="Total Courses"
          value={stats.total}
          icon={HiAcademicCap}
          gradient="from-primary-500 to-primary-600"
          hint="All courses in DB"
          onClick={() => setStatusFilter("all")}
        />
        <StatCard3D
          title="Approved"
          value={stats.approved}
          icon={HiCheckCircle}
          gradient="from-emerald-500 to-emerald-600"
          hint="Click to filter"
          onClick={() => setStatusFilter("approved")}
        />
        <StatCard3D
          title="Pending Approval"
          value={stats.pending}
          icon={HiExclamationCircle}
          gradient="from-amber-500 to-amber-600"
          hint="Click to filter"
          onClick={() => setStatusFilter("pending")}
        />
        <StatCard3D
          title="Categories"
          value={stats.uniqueCategories}
          icon={HiTag}
          gradient="from-accent-500 to-accent-600"
          hint="Unique categories"
        />
      </motion.div>

      {/* PENDING ALERT BANNER */}
      {stats.pending > 0 && (
        <motion.div
          variants={slideUp}
          className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-center gap-3"
        >
          <HiExclamationCircle className="w-6 h-6 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-amber-800">
              {stats.pending} course{stats.pending > 1 ? "s" : ""} waiting for approval
            </p>
            <p className="text-sm text-amber-700">
              Teachers have submitted courses that need your review before students can enroll.
            </p>
          </div>
          <button
            onClick={() => setStatusFilter("pending")}
            className="px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-bold hover:bg-amber-700 transition-colors shrink-0"
          >
            Review Now
          </button>
        </motion.div>
      )}

      {/* SEARCH + FILTERS */}
      <motion.div variants={slideUp}>
        <Card padding={false} className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <HiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                <input
                  type="text"
                  placeholder="Search courses..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input pl-12"
                />
              </div>
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input w-auto min-w-[160px]"
            >
              <option value="all">All Status</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
            </select>

            {/* Department filter */}
            <select
              value={deptFilter}
              onChange={(e) => {
                setDeptFilter(e.target.value);
                setProgramFilter("all");
              }}
              className="input w-auto min-w-[170px]"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d._id || d.name} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>

            {/* Program filter */}
            <select
              value={programFilter}
              onChange={(e) => setProgramFilter(e.target.value)}
              className="input w-auto min-w-[150px]"
            >
              <option value="all">All Programs</option>
              {filterPrograms.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            {/* Category filter */}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input w-auto min-w-[180px]"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === "all" ? "All Categories" : c}
                </option>
              ))}
            </select>
          </div>
        </Card>
      </motion.div>

      {/* COURSE GRID */}
      <motion.div variants={slideUp}>
        {loading ? (
          <div className="py-10">
            <Loader size="lg" text="Loading courses..." />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCourses.map((course) => (
              <CourseCard key={course._id} course={course} />
            ))}
          </div>
        )}

        {!loading && filteredCourses.length === 0 && (
          <div className="py-16 text-center">
            <HiAcademicCap className="w-16 h-16 mx-auto mb-4 text-dark-300" />
            <p className="text-dark-500 font-medium">No courses found</p>
            <p className="text-sm text-dark-400 mt-1">Try adjusting your filters</p>
          </div>
        )}
      </motion.div>

      {/* CREATE / EDIT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={selectedCourse ? "Edit Course" : "Create Course"}
        description="Manage course details"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Course Title"
            name="title"
            value={formData.title}
            onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
            placeholder="e.g., MERN Stack Masterclass"
            required
          />

          <div>
            <label className="block text-sm font-semibold text-dark-700 mb-2">
              Description
            </label>
            <textarea
              className="input"
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              placeholder="Course description..."
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Subject"
              name="subject"
              value={formData.subject}
              onChange={(e) => setFormData((p) => ({ ...p, subject: e.target.value }))}
              placeholder="e.g., Data Structures"
              required
            />
            <Input
              label="Category"
              name="category"
              value={formData.category}
              onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
              placeholder="e.g., Web Development"
              required
            />
            <Input
              label="Duration"
              name="duration"
              value={formData.duration}
              onChange={(e) => setFormData((p) => ({ ...p, duration: e.target.value }))}
              placeholder="e.g., 12 weeks"
              required
            />
          </div>

          {/* Department, Program, Batch, Semester Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-dark-700 mb-2">
                Department
              </label>
              <select
                className="input"
                value={formData.department}
                onChange={(e) => setFormData((p) => ({ ...p, department: e.target.value, program: "", batch: "" }))}
              >
                <option value="">-- Select Department --</option>
                {departments.map((d) => (
                  <option key={d._id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-dark-700 mb-2">
                Program
              </label>
              <select
                className="input"
                value={formData.program}
                onChange={(e) => setFormData((p) => ({ ...p, program: e.target.value, batch: "" }))}
                disabled={!formData.department}
              >
                <option value="">-- Select Program --</option>
                {selectedDeptPrograms.map((p) => (
                  <option key={p._id || p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-dark-700 mb-2">
                Batch / Session
              </label>
              <select
                className="input"
                value={formData.batch}
                onChange={(e) => setFormData((p) => ({ ...p, batch: e.target.value }))}
                disabled={!formData.program}
              >
                <option value="">-- Select Batch --</option>
                {selectedProgBatches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-dark-700 mb-2">
                Semester
              </label>
              <select
                className="input"
                value={formData.semester}
                onChange={(e) => setFormData((p) => ({ ...p, semester: e.target.value }))}
              >
                <option value="">-- Select Semester --</option>
                {SEMESTER_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grading Components Configuration */}
          <div className="bg-dark-50 p-4 rounded-2xl border border-dark-100">
            <h4 className="text-sm font-bold text-dark-800 mb-3">Assessment Components Total Marks</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Input
                label="Quizzes Weight"
                type="number"
                value={formData.quizzes}
                onChange={(e) => setFormData((p) => ({ ...p, quizzes: e.target.value }))}
                required
              />
              <Input
                label="Assignments Weight"
                type="number"
                value={formData.assignments}
                onChange={(e) => setFormData((p) => ({ ...p, assignments: e.target.value }))}
                required
              />
              <Input
                label="Presentation Weight"
                type="number"
                value={formData.presentation}
                onChange={(e) => setFormData((p) => ({ ...p, presentation: e.target.value }))}
                required
              />
              <Input
                label="Lab Work Weight"
                type="number"
                value={formData.labWork}
                onChange={(e) => setFormData((p) => ({ ...p, labWork: e.target.value }))}
                required
              />
              <Input
                label="Mid-Term Weight"
                type="number"
                value={formData.midTerm}
                onChange={(e) => setFormData((p) => ({ ...p, midTerm: e.target.value }))}
                required
              />
              <Input
                label="Final-Term Weight"
                type="number"
                value={formData.finalTerm}
                onChange={(e) => setFormData((p) => ({ ...p, finalTerm: e.target.value }))}
                required
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-dark-500">
              <span>Typically sums up to 100 marks</span>
              <span className="font-bold text-primary-600">
                Current Total: {
                  (Number(formData.quizzes) || 0) +
                  (Number(formData.assignments) || 0) +
                  (Number(formData.presentation) || 0) +
                  (Number(formData.labWork) || 0) +
                  (Number(formData.midTerm) || 0) +
                  (Number(formData.finalTerm) || 0)
                }
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-dark-700 mb-2">
              Assign Teacher (optional)
            </label>
            <select
              className="input"
              value={formData.teacher}
              onChange={(e) => setFormData((p) => ({ ...p, teacher: e.target.value }))}
            >
              <option value="">-- No teacher --</option>
              {teachers.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name} ({t.email})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-dark-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setIsModalOpen(false); resetForm(); }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {selectedCourse ? "Update Course" : "Create Course"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRM */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => { setIsDeleteOpen(false); setSelectedCourse(null); }}
        onConfirm={handleDelete}
        title="Delete Course"
        message={`Are you sure you want to delete "${selectedCourse?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        loading={loading}
      />

      {/* DIRECT ENROLL MODAL */}
      <Modal
        isOpen={isEnrollOpen}
        onClose={() => { setIsEnrollOpen(false); setSelectedCourse(null); }}
        title={`Enroll Student in ${selectedCourse?.title || ""}`}
        description="Directly enroll a student in this course"
        size="md"
      >
        <form onSubmit={handleDirectEnroll} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-dark-700 mb-2">
              Select Student <span className="text-red-500">*</span>
            </label>
            <select
              className="input text-dark-800 font-medium"
              value={enrollStudentId}
              onChange={(e) => setEnrollStudentId(e.target.value)}
              required
            >
              <option value="">-- Choose a student --</option>
              {students.map((s) => (
                <option key={s._id} value={s._id} className="text-dark-800 font-medium">
                  {s.name} ({s.email}) - {s.batch || "No Batch"} [{s.department || "No Dept"}]
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-dark-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => { setIsEnrollOpen(false); setSelectedCourse(null); }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={enrolling} icon={HiPlus}>
              Enroll Student
            </Button>
          </div>
        </form>
      </Modal>

      {/* AWARD LIST MODAL */}
      <Modal
        isOpen={isAwardListOpen}
        onClose={() => {
          setIsAwardListOpen(false);
          setSelectedCourse(null);
        }}
        title={`Award List / Internal Marks — ${selectedCourse?.title || ''}`}
        description="Auto-calculates Quiz & Assignment weights. Manual entry for Presentation, Lab, Mid, and Final."
        size="xl"
      >
        {loadingAwardList ? (
          <div className="py-10 text-center">
            <Loader size="lg" text="Calculating marks and loading award list..." />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Grading components weights banner */}
            {gradingComponents && (
              <div className="p-4 bg-primary-50 rounded-2xl border border-primary-100 flex flex-wrap gap-4 text-xs sm:text-sm text-primary-800">
                <div>
                  <span className="font-bold">Quiz Weight:</span> {gradingComponents.quizzes} marks
                </div>
                <div>
                  <span className="font-bold">Assignment Weight:</span> {gradingComponents.assignments} marks
                </div>
                <div>
                  <span className="font-bold">Presentation Weight:</span> {gradingComponents.presentation} marks
                </div>
                <div>
                  <span className="font-bold">Lab Work Weight:</span> {gradingComponents.labWork} marks
                </div>
                <div>
                  <span className="font-bold">Mid-Term Weight:</span> {gradingComponents.midTerm} marks
                </div>
                <div>
                  <span className="font-bold">Final-Term Weight:</span> {gradingComponents.finalTerm} marks
                </div>
              </div>
            )}

            <div className="overflow-x-auto rounded-2xl border border-dark-100 bg-white">
              <table className="min-w-full divide-y divide-dark-200">
                <thead className="bg-dark-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-dark-500 uppercase tracking-wider">Student Name</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-dark-500 uppercase tracking-wider">Reg. No</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-dark-500 uppercase tracking-wider">Quiz ({gradingComponents?.quizzes})</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-dark-500 uppercase tracking-wider">Assignment ({gradingComponents?.assignments})</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-dark-500 uppercase tracking-wider">Presentation ({gradingComponents?.presentation})</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-dark-500 uppercase tracking-wider">Lab ({gradingComponents?.labWork})</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-dark-500 uppercase tracking-wider">Mid ({gradingComponents?.midTerm})</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-dark-500 uppercase tracking-wider">Final ({gradingComponents?.finalTerm})</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-dark-500 uppercase tracking-wider">Total (100)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-100 bg-white">
                  {awardList.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-sm text-dark-500">
                        No students enrolled in this course.
                      </td>
                    </tr>
                  ) : (
                    awardList.map((row, index) => (
                      <tr key={row.studentId}>
                        <td className="px-4 py-3 text-sm font-bold text-dark-900 whitespace-nowrap">{row.name}</td>
                        <td className="px-4 py-3 text-sm text-dark-600 font-semibold whitespace-nowrap">{row.regNo || "—"}</td>
                        <td className="px-4 py-3 text-sm text-primary-600 font-bold bg-primary-50/30 whitespace-nowrap">{row.quizMarks}</td>
                        <td className="px-4 py-3 text-sm text-accent-600 font-bold bg-accent-50/30 whitespace-nowrap">{row.assignmentMarks}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <input
                            type="number"
                            className="input p-1 w-20 text-center font-semibold border-dark-300 bg-white"
                            value={row.presentationMarks}
                            onChange={(e) => {
                              const val = Math.max(0, Math.min(gradingComponents?.presentation || 100, Number(e.target.value) || 0));
                              setAwardList((prev) =>
                                prev.map((item, idx) =>
                                  idx === index ? { ...item, presentationMarks: val, totalMarks: Number((item.quizMarks + item.assignmentMarks + val + item.labMarks + item.midMarks + item.finalMarks).toFixed(2)) } : item
                                )
                              );
                            }}
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <input
                            type="number"
                            className="input p-1 w-20 text-center font-semibold border-dark-300 bg-white"
                            value={row.labMarks}
                            onChange={(e) => {
                              const val = Math.max(0, Math.min(gradingComponents?.labWork || 100, Number(e.target.value) || 0));
                              setAwardList((prev) =>
                                prev.map((item, idx) =>
                                  idx === index ? { ...item, labMarks: val, totalMarks: Number((item.quizMarks + item.assignmentMarks + item.presentationMarks + val + item.midMarks + item.finalMarks).toFixed(2)) } : item
                                )
                              );
                            }}
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <input
                            type="number"
                            className="input p-1 w-20 text-center font-semibold border-dark-300 bg-white"
                            value={row.midMarks}
                            onChange={(e) => {
                              const val = Math.max(0, Math.min(gradingComponents?.midTerm || 100, Number(e.target.value) || 0));
                              setAwardList((prev) =>
                                prev.map((item, idx) =>
                                  idx === index ? { ...item, midMarks: val, totalMarks: Number((item.quizMarks + item.assignmentMarks + item.presentationMarks + item.labMarks + val + item.finalMarks).toFixed(2)) } : item
                                )
                              );
                            }}
                          />
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <input
                            type="number"
                            className="input p-1 w-20 text-center font-semibold border-dark-300 bg-white"
                            value={row.finalMarks}
                            onChange={(e) => {
                              const val = Math.max(0, Math.min(gradingComponents?.finalTerm || 100, Number(e.target.value) || 0));
                              setAwardList((prev) =>
                                prev.map((item, idx) =>
                                  idx === index ? { ...item, finalMarks: val, totalMarks: Number((item.quizMarks + item.assignmentMarks + item.presentationMarks + item.labMarks + item.midMarks + val).toFixed(2)) } : item
                                )
                              );
                            }}
                          />
                        </td>
                        <td className="px-4 py-3 text-sm font-extrabold text-indigo-700 bg-indigo-50/40 whitespace-nowrap">{row.totalMarks}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-dark-100">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsAwardListOpen(false);
                  setSelectedCourse(null);
                }}
              >
                Close
              </Button>
              {awardList.length > 0 && (
                <Button onClick={handleSaveAwardList} loading={savingAwardList}>
                  Save Award List
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
};

export default Courses;