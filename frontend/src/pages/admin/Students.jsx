// src/pages/admin/Students.jsx
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  HiPlus,
  HiSearch,
  HiPencil,
  HiTrash,
  HiPhone,
  HiUsers,
  HiRefresh,
  HiAcademicCap,
  HiArrowUp,
  HiCheckCircle,
} from "react-icons/hi";
import toast from "react-hot-toast";

import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import Modal from "../../components/common/Modal";
import Table from "../../components/common/Table";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import Pagination from "../../components/common/Pagination";

import { useApi } from "../../hooks/useApi";
import { adminApi } from "../../api/adminApi";
import { staggerContainer, slideUp } from "../../utils/constants";
import { cn, formatDate, getInitials, getStatusColor } from "../../utils/helpers";

// ✅ Batch, Semester, and Department options
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

const STATUS_OPTIONS = [
  { value: "approved", label: "Approved" },
  { value: "pending", label: "Pending" },
  { value: "rejected", label: "Rejected" },
  { value: "failed", label: "Failed" },
  { value: "dropped", label: "Dropped" },
  { value: "left", label: "Left" },
];

const Students = () => {
  const { loading, execute } = useApi();

  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterBatch, setFilterBatch] = useState("all");
  const [filterSemester, setFilterSemester] = useState("all");
  const [filterDept, setFilterDept] = useState("all");
  const [filterProgram, setFilterProgram] = useState("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPromoteOpen, setIsPromoteOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [promoting, setPromoting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // ✅ Promote form state
  const [promoteForm, setPromoteForm] = useState({
    batch: "",
    semester: "",
  });
  
  // Track selected status reasons for promotion exclusions
  // studentId -> "failed" | "dropped" | "left"
  const [promoExclusions, setPromoExclusions] = useState({});
  // List of student IDs that are checked (to be promoted)
  const [promoteSelection, setPromoteSelection] = useState(new Set());
  const [departments, setDepartments] = useState([]);


  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    status: "pending",
    batch: "",
    semester: "",
    department: "",
    program: "",
    regNo: "",
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
  const fetchStudents = async () => {
    await execute(() => adminApi.getStudents(), {
      showSuccessToast: false,
      onSuccess: (data) => {
        const list = Array.isArray(data) ? data : data?.data;
        setStudents(Array.isArray(list) ? list : []);
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
    fetchStudents();
    fetchDepartments();
  }, []);

  // ── Form Reset ─────────────────────────────────────────
  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      password: "",
      status: "pending",
      batch: "",
      semester: "",
      department: "",
      program: "",
      regNo: "",
    });
    setSelectedStudent(null);
  };

  // ── Open Modals ────────────────────────────────────────
  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (student) => {
    setSelectedStudent(student);
    setFormData({
      name: student?.name || "",
      email: student?.email || "",
      phone: student?.phone || "",
      password: "",
      status: student?.status || "pending",
      batch: student?.batch || "",
      semester: student?.semester ? String(student.semester) : "",
      department: student?.department || "",
      program: student?.program || "",
      regNo: student?.regNo || "",
    });
    setIsModalOpen(true);
  };

  // Reset promote exclusions/selection when form changes
  const activePromotionStudents = useMemo(() => {
    if (!promoteForm.batch || !promoteForm.semester) return [];
    return students.filter(
      (s) =>
        s.batch === promoteForm.batch &&
        String(s.semester) === promoteForm.semester &&
        s.status === "approved" // only active/approved students can be promoted
    );
  }, [students, promoteForm.batch, promoteForm.semester]);

  useEffect(() => {
    const defaultSelection = new Set();
    const defaultExclusions = {};
    activePromotionStudents.forEach((s) => {
      defaultSelection.add(s._id);
      defaultExclusions[s._id] = "failed"; // default exclusion reason
    });
    setPromoteSelection(defaultSelection);
    setPromoExclusions(defaultExclusions);
  }, [activePromotionStudents]);

  const openPromoteModal = () => {
    setPromoteForm({ batch: "", semester: "" });
    setPromoExclusions({});
    setPromoteSelection(new Set());
    setIsPromoteOpen(true);
  };

  const handleToggleStudentSelection = (studentId) => {
    setPromoteSelection((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const handleToggleSelectAllPromotion = () => {
    if (promoteSelection.size === activePromotionStudents.length) {
      setPromoteSelection(new Set());
    } else {
      setPromoteSelection(new Set(activePromotionStudents.map((s) => s._id)));
    }
  };

  // ── Submit Add/Edit Student ────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      status: formData.status,
      batch: formData.batch || "",
      semester: formData.semester ? Number(formData.semester) : null,
      department: formData.department || "",
      program: formData.program || "",
      regNo: formData.regNo || "",
    };

    if (formData.password && formData.password.trim().length > 0) {
      payload.password = formData.password;
    }

    if (selectedStudent?._id) {
      await execute(() => adminApi.updateUser(selectedStudent._id, payload), {
        showSuccessToast: true,
        successMessage: "Student updated successfully!",
        onSuccess: () => {
          setIsModalOpen(false);
          resetForm();
          fetchStudents();
        },
      });
    } else {
      await execute(
        () =>
          adminApi.addStudent({
            ...payload,
            password: formData.password,
          }),
        {
          showSuccessToast: true,
          successMessage: "Student added successfully!",
          onSuccess: () => {
            setIsModalOpen(false);
            resetForm();
            fetchStudents();
          },
        }
      );
    }
  };

  // ── Delete Student ─────────────────────────────────────
  const handleDelete = async () => {
    if (!selectedStudent?._id) return;

    await execute(() => adminApi.deleteUser(selectedStudent._id), {
      showSuccessToast: true,
      successMessage: "Student deleted successfully!",
      onSuccess: () => {
        setIsDeleteOpen(false);
        setSelectedStudent(null);
        fetchStudents();
      },
    });
  };

  // ── Promote Students Handler ────────────────────────────
  const handlePromote = async (e) => {
    e.preventDefault();

    if (!promoteForm.batch) {
      toast.error("Please select a batch");
      return;
    }
    if (!promoteForm.semester) {
      toast.error("Please select a semester to promote from");
      return;
    }

    const currentSem = Number(promoteForm.semester);
    if (currentSem === 8) {
      toast.error("Semester 8 students cannot be promoted further");
      return;
    }

    // Prepare exclusions list
    const excludedList = [];
    activePromotionStudents.forEach((s) => {
      if (!promoteSelection.has(s._id)) {
        excludedList.push({
          studentId: s._id,
          status: promoExclusions[s._id] || "failed",
        });
      }
    });

    setPromoting(true);
    try {
      const res = await adminApi.promoteStudents({
        batch: promoteForm.batch,
        semester: currentSem,
        excludedStudents: excludedList,
      });

      toast.success(res.data?.message || "Students promoted successfully!");
      setIsPromoteOpen(false);
      setPromoteForm({ batch: "", semester: "" });
      fetchStudents();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to promote students");
    } finally {
      setPromoting(false);
    }
  };

  // ── Filtered Students ──────────────────────────────────
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const name = (s.name || "").toLowerCase();
      const email = (s.email || "").toLowerCase();

      const matchesSearch =
        name.includes(searchTerm.toLowerCase()) ||
        email.includes(searchTerm.toLowerCase());

      const matchesStatus =
        filterStatus === "all" || (s.status || "pending") === filterStatus;

      const matchesBatch =
        filterBatch === "all" || (s.batch || "") === filterBatch;

      const matchesSemester =
        filterSemester === "all" ||
        String(s.semester || "") === filterSemester;

      const matchesDept =
        filterDept === "all" || (s.department || "") === filterDept;

      const matchesProgram =
        filterProgram === "all" || (s.program || "") === filterProgram;

      return matchesSearch && matchesStatus && matchesBatch && matchesSemester && matchesDept && matchesProgram;
    });
  }, [students, searchTerm, filterStatus, filterBatch, filterSemester, filterDept, filterProgram]);

  const filterDeptPrograms = useMemo(() => {
    if (filterDept === "all") {
      const set = new Set();
      departments.forEach((d) => {
        (d.programs || []).forEach((p) => set.add(p.name));
      });
      students.forEach((s) => {
        if (s.program) set.add(s.program);
      });
      return Array.from(set);
    }
    const found = departments.find((d) => d.name === filterDept);
    return found ? (found.programs || []).map((p) => p.name) : [];
  }, [departments, filterDept, students]);

  // ── Pagination ─────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const paginated = filteredStudents.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // ── Unique batches ─────────────────────────────────────
  const existingBatches = useMemo(() => {
    const set = new Set();
    students.forEach((s) => {
      if (s.batch) set.add(s.batch);
    });
    return Array.from(set).sort();
  }, [students]);

  // ── Table Columns ──────────────────────────────────────
  const columns = [
    {
      header: "Student",
      accessor: "name",
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="avatar avatar-md">{getInitials(row.name || row.email)}</div>
          <div className="min-w-0">
            <p className="font-semibold text-dark-900 truncate">{row.name}</p>
            <p className="text-sm text-dark-500 truncate">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: "Reg. No",
      accessor: "regNo",
      render: (value) => (
        <span className="text-sm font-semibold text-dark-700">
          {value || "—"}
        </span>
      ),
    },
    {
      header: "Department",
      accessor: "department",
      render: (value) => (
        <span className="text-sm text-dark-600 truncate max-w-[150px] inline-block">
          {value || "—"}
        </span>
      ),
    },
    {
      header: "Program",
      accessor: "program",
      render: (value) => (
        <span className="text-sm font-semibold text-primary-700 truncate max-w-[120px] inline-block">
          {value || "—"}
        </span>
      ),
    },
    {
      header: "Batch",
      accessor: "batch",
      render: (value) => (
        <span className="text-sm font-medium text-dark-700">
          {value || "—"}
        </span>
      ),
    },
    {
      header: "Semester",
      accessor: "semester",
      render: (value) => (
        <span
          className={cn(
            "px-3 py-1 rounded-full text-xs font-bold",
            value
              ? "bg-primary-100 text-primary-700"
              : "bg-dark-100 text-dark-500"
          )}
        >
          {value ? `Sem ${value}` : "—"}
        </span>
      ),
    },
    {
      header: "Status",
      accessor: "status",
      render: (value) => (
        <span className={cn("badge capitalize", getStatusColor(value || "pending"))}>
          {value || "pending"}
        </span>
      ),
    },
    {
      header: "Phone",
      accessor: "phone",
      render: (value) => (
        <span className="text-xs text-dark-600">
          {value || "N/A"}
        </span>
      ),
    },
    {
      header: "Actions",
      accessor: "_id",
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Button
            size="xs"
            variant="ghost"
            icon={HiPencil}
            onClick={() => openEditModal(row)}
          />
          <Button
            size="xs"
            variant="ghost"
            icon={HiTrash}
            className="text-red-500 hover:text-red-700"
            onClick={() => {
              setSelectedStudent(row);
              setIsDeleteOpen(true);
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={staggerContainer}
      className="space-y-6"
    >
      {/* ── Header ── */}
      <motion.div
        variants={slideUp}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-3xl font-black text-dark-900">Student Directory</h1>
          <p className="text-dark-500">Manage student accounts, academic data and promotions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={HiArrowUp} onClick={openPromoteModal}>
            Promote Students
          </Button>
          <Button icon={HiPlus} onClick={openCreateModal}>
            Add Student
          </Button>
        </div>
      </motion.div>

      {/* ── Filters ── */}
      <motion.div variants={slideUp}>
        <Card padding={false} className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
              <input
                type="text"
                placeholder="Search name/email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>

            {/* Department */}
            <select
              value={filterDept}
              onChange={(e) => {
                setFilterDept(e.target.value);
                setFilterProgram("all");
              }}
              className="input"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d._id || d.name} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>

            {/* Program */}
            <select
              value={filterProgram}
              onChange={(e) => setFilterProgram(e.target.value)}
              className="input"
            >
              <option value="all">All Programs</option>
              {filterDeptPrograms.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            {/* Batch */}
            <select
              value={filterBatch}
              onChange={(e) => setFilterBatch(e.target.value)}
              className="input"
            >
              <option value="all">All Batches</option>
              {existingBatches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            {/* Semester */}
            <select
              value={filterSemester}
              onChange={(e) => setFilterSemester(e.target.value)}
              className="input"
            >
              <option value="all">All Semesters</option>
              {SEMESTER_OPTIONS.map((s) => (
                <option key={s} value={String(s)}>
                  Semester {s}
                </option>
              ))}
            </select>

            {/* Status */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input"
            >
              <option value="all">All Status</option>
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </Card>
      </motion.div>

      {/* ── Table List ── */}
      <motion.div variants={slideUp}>
        <Table columns={columns} data={paginated} loading={loading} />

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-dark-500">
            Showing {paginated.length} of {filteredStudents.length} students
          </p>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </motion.div>

      {/* ══ Add/Edit Student Modal ══ */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={selectedStudent ? "Edit Student Details" : "Add New Student"}
        description={
          selectedStudent
            ? "Update student status, details, department or program"
            : "Create a new student account"
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            value={formData.name}
            onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
            required
          />

          <Input
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
            required
          />

          <Input
            label="Phone Number"
            value={formData.phone}
            onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
          />

          {!selectedStudent ? (
            <Input
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
              required
            />
          ) : (
            <Input
              label="Password (leave blank to keep current)"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
            />
          )}

          <Input
            label="Registration Number"
            name="regNo"
            value={formData.regNo}
            onChange={(e) => setFormData((p) => ({ ...p, regNo: e.target.value }))}
            placeholder="e.g., FA22-BCS-089"
          />

          {/* Department + Program selectors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-dark-700 mb-2">
                Department
              </label>
              <select
                value={formData.department}
                onChange={(e) => setFormData((p) => ({ ...p, department: e.target.value, program: "", batch: "" }))}
                className="input"
                required
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
                value={formData.program}
                onChange={(e) => setFormData((p) => ({ ...p, program: e.target.value, batch: "" }))}
                className="input"
                disabled={!formData.department}
                required
              >
                <option value="">-- Select Program --</option>
                {selectedDeptPrograms.map((p) => (
                  <option key={p._id || p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Batch + Semester in a grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-dark-700 mb-2">
                Batch
              </label>
              <select
                value={formData.batch}
                onChange={(e) => setFormData((p) => ({ ...p, batch: e.target.value }))}
                className="input"
                disabled={!formData.program}
                required
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
                value={formData.semester}
                onChange={(e) => setFormData((p) => ({ ...p, semester: e.target.value }))}
                className="input"
              >
                <option value="">-- Select Semester --</option>
                {SEMESTER_OPTIONS.map((s) => (
                  <option key={s} value={String(s)}>
                    Semester {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-semibold text-dark-700 mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value }))}
              className="input"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-dark-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsModalOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {selectedStudent ? "Update Student" : "Add Student"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ══ Promote Students Modal ══ */}
      <Modal
        isOpen={isPromoteOpen}
        onClose={() => {
          setIsPromoteOpen(false);
          setPromoteForm({ batch: "", semester: "" });
        }}
        title="Promote Students"
        description="Select a batch and current semester. You can uncheck students who failed, dropped or left to exclude them."
        size="lg"
      >
        <form onSubmit={handlePromote} className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
          {/* Info Box */}
          <div className="p-4 bg-primary-50 border border-primary-200 rounded-xl">
            <div className="flex items-start gap-3">
              <HiAcademicCap className="w-5 h-5 text-primary-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-primary-800">
                  How promotion works
                </p>
                <p className="text-sm text-primary-700 mt-1">
                  Checked students will advance to the next semester. Unchecked students will remain in the current semester with their selected reason (Failed, Dropped, Left).
                </p>
              </div>
            </div>
          </div>

          {/* Batch + Semester Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-dark-700 mb-2">
                Batch <span className="text-red-500">*</span>
              </label>
              <select
                value={promoteForm.batch}
                onChange={(e) =>
                  setPromoteForm((p) => ({ ...p, batch: e.target.value }))
                }
                className="input"
                required
              >
                <option value="">-- Select Batch --</option>
                {existingBatches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-dark-700 mb-2">
                Promote FROM Semester <span className="text-red-500">*</span>
              </label>
              <select
                value={promoteForm.semester}
                onChange={(e) =>
                  setPromoteForm((p) => ({ ...p, semester: e.target.value }))
                }
                className="input"
                required
              >
                <option value="">-- Select Semester --</option>
                {SEMESTER_OPTIONS.filter((s) => s < 8).map((s) => (
                  <option key={s} value={String(s)}>
                    Semester {s} → Semester {s + 1}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Selective List */}
          {promoteForm.batch && promoteForm.semester && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between border-b pb-2">
                <p className="text-sm font-bold text-dark-800">
                  Select Students to Promote ({promoteSelection.size} of {activePromotionStudents.length})
                </p>
                <button
                  type="button"
                  className="text-xs font-semibold text-primary-600 hover:text-primary-800"
                  onClick={handleToggleSelectAllPromotion}
                >
                  {promoteSelection.size === activePromotionStudents.length ? "Deselect All" : "Select All"}
                </button>
              </div>

              {activePromotionStudents.length === 0 ? (
                <p className="text-sm text-center py-6 text-dark-400">
                  No active students found in this batch and semester.
                </p>
              ) : (
                <div className="space-y-2 border rounded-xl p-2 bg-dark-50 max-h-[250px] overflow-y-auto">
                  {activePromotionStudents.map((s) => {
                    const isSelected = promoteSelection.has(s._id);
                    return (
                      <div
                        key={s._id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border bg-white shadow-sm"
                      >
                        <label className="flex items-center gap-3 cursor-pointer min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleStudentSelection(s._id)}
                            className="checkbox"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-dark-800 truncate">{s.name}</p>
                            <p className="text-xs text-dark-500 truncate">{s.email}</p>
                          </div>
                        </label>

                        {!isSelected && (
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-bold text-red-500">Reason:</span>
                            <select
                              value={promoExclusions[s._id] || "failed"}
                              onChange={(e) => setPromoExclusions({
                                ...promoExclusions,
                                [s._id]: e.target.value
                              })}
                              className="input py-1 text-xs w-auto min-w-[120px]"
                            >
                              <option value="failed">Failed</option>
                              <option value="dropped">Dropped</option>
                              <option value="left">Left Program</option>
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-dark-100">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setIsPromoteOpen(false);
                setPromoteForm({ batch: "", semester: "" });
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              icon={HiArrowUp}
              loading={promoting}
              disabled={activePromotionStudents.length === 0}
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              Promote Selected Students
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Confirm ── */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => {
          setIsDeleteOpen(false);
          setSelectedStudent(null);
        }}
        onConfirm={handleDelete}
        title="Delete Student"
        message={`Are you sure you want to delete "${selectedStudent?.name}"? This cannot be undone.`}
        confirmText="Delete"
        loading={loading}
      />
    </motion.div>
  );
};

export default Students;