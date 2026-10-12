import express from "express";
import { protect, role } from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";

import {
  teacherDashboard,
  createCourse,
  updateCourse,
  deleteCourse,
  uploadLecture,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  assignGrade,
  updateGrade,
  deleteGrade,
  approveEnrollment,
  getCourseStudents,
  getAwardList,
  saveAwardList,
} from "../controllers/teacherController.js";
import { getAnnouncements } from "../controllers/announcementController.js";

const router = express.Router();

router.use(protect, role("teacher", "admin"));

// Dashboard
router.get("/dashboard", teacherDashboard);

// ✅ Teacher announcements (DB)
router.get("/announcements", getAnnouncements);


// Course CRUD
router.post("/create-course", createCourse);
router.put("/course/:id", updateCourse);
// Clean REST route
router.delete("/course/:courseId", protect, role("teacher"), deleteCourse);

// Legacy backward-compatible
router.delete("/delete-course/:courseId", protect, role("teacher"), deleteCourse);


// Lecture
router.post("/upload-lecture/:courseId", upload.single("file"), uploadLecture);

// Assignment CRUD
router.post("/create-assignment", upload.single("file"), createAssignment);
router.put("/update-assignment/:id", upload.single("file"), updateAssignment);
router.delete("/delete-assignment/:id", deleteAssignment);



// Grades
router.post("/assign-grade", assignGrade);
router.put("/update-grade/:id", updateGrade);
router.delete("/delete-grade/:id", deleteGrade);

// Approve Enrollment
router.put("/approve-enrollment/:enrollmentId", approveEnrollment);

// Course Enrolled Students
router.get("/course/:courseId/students", getCourseStudents);

// Award List (Internal Marks)
router.get("/course/:courseId/award-list", getAwardList);
router.post("/course/:courseId/award-list", saveAwardList);

export default router;
