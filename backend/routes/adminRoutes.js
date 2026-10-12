import express from "express";
import { protect, role } from "../middleware/authMiddleware.js";

import {
  adminDashboard,
  getAllCourses,
  createCourseAdmin,
  updateCourseAdmin,
  deleteCourseAdmin,
  getAllAssignments,
  createAssignmentAdmin,
  updateAssignmentAdmin,
  deleteAssignmentAdmin,
  getAllSubmissions,
  updateGradeAdmin,
  deleteGradeAdmin,
  getCourseMetricsAdmin,
  getTeacherActivityLogs,
  getAdminAnnouncements,
  createAdminAnnouncement,
  updateAdminAnnouncement,
  deleteAdminAnnouncement,
} from "../controllers/adminController.js";

import {
  getAllStudents,
  getAllTeachers,
  addStudentAdmin,
  addTeacherAdmin,
  updateUserAdmin,
  deleteUserAdmin,
  promoteStudents, // ✅ NEW
} from "../controllers/adminUsersController.js";

const router = express.Router();
router.use(protect, role("admin"));

// ── Users (Students/Teachers) ────────────────────────────
router.get("/students", getAllStudents);
router.post("/add-student", addStudentAdmin);

router.get("/teachers", getAllTeachers);
router.post("/add-teacher", addTeacherAdmin);

router.patch("/update-user/:id", updateUserAdmin);
router.delete("/delete-user/:id", deleteUserAdmin);

// ✅ NEW - Promote students route
// POST /api/admin/promote
// Body: { batch: "2022-2026", semester: 1 }
router.post("/promote", promoteStudents);

// ── Dashboard ────────────────────────────────────────────
router.get("/dashboard", adminDashboard);

// ── Courses ──────────────────────────────────────────────
router.get("/courses", getAllCourses);
router.post("/courses", createCourseAdmin);
router.put("/courses/:id", updateCourseAdmin);
router.delete("/courses/:id", deleteCourseAdmin);

// ── Assignments ──────────────────────────────────────────
router.get("/assignments", getAllAssignments);
router.post("/assignments", createAssignmentAdmin);
router.put("/assignments/:id", updateAssignmentAdmin);
router.delete("/assignments/:id", deleteAssignmentAdmin);

// ── Submissions / Grades ─────────────────────────────────
router.get("/submissions", getAllSubmissions);
router.put("/grades/:id", updateGradeAdmin);
router.delete("/grades/:id", deleteGradeAdmin);

// ── Metrics ──────────────────────────────────────────────
router.get("/course-metrics", getCourseMetricsAdmin);
router.get("/teacher-logs", getTeacherActivityLogs);

// ── Announcements ────────────────────────────────────────
router.get("/announcements", getAdminAnnouncements);
router.post("/announcement", createAdminAnnouncement);
router.put("/announcement/:id", updateAdminAnnouncement);
router.delete("/announcement/:id", deleteAdminAnnouncement);

export default router;