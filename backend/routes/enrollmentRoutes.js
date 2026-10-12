import express from "express";
import {
  requestEnrollment,
  approveEnrollment,
  rejectEnrollment,
  myEnrollments,
  getPendingEnrollments,
  getAllEnrollments,
  directEnroll,
} from "../controllers/enrollmentController.js";
import { protect, role } from "../middleware/authMiddleware.js";

const router = express.Router();

// Student
router.post("/request/:courseId", protect, role("student"), requestEnrollment);
router.get("/my", protect, role("student"), myEnrollments);

// Teacher
router.get("/pending", protect, role("teacher"), getPendingEnrollments);

// Teacher OR Admin
router.put("/approve/:id", protect, role("teacher", "admin"), approveEnrollment);
router.put("/reject/:id", protect, role("teacher", "admin"), rejectEnrollment);

// Admin only
router.get("/all", protect, role("admin"), getAllEnrollments);
router.post("/direct-enroll", protect, role("admin"), directEnroll);

export default router;