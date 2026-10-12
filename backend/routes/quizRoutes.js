import express from "express";
import {
  createQuiz,
  getCourseQuizzes,
  submitQuiz,
  getQuizSubmissions,
  gradeDescriptive,
  getQuizMarksExcel,
} from "../controllers/quizController.js";
import { protect, role } from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";

const router = express.Router();

// ✅ Teacher creates quiz
router.post("/create", protect, role("teacher"), createQuiz);

// ✅ Teacher uploads PDF for descriptive quiz question
router.post("/upload-pdf", protect, role("teacher"), upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  res.json({ fileUrl: req.file.path.replace(/\\/g, "/") });
});

// ✅ BOTH teacher AND student can fetch quizzes for a course
router.get("/course/:courseId", protect, getCourseQuizzes);

// ✅ Student submits quiz
router.post("/submit", protect, role("student"), submitQuiz);

// ✅ Teacher views submissions
router.get("/submissions/:quizId", protect, role("teacher"), getQuizSubmissions);

// ✅ Teacher grades descriptive answers
router.post("/grade", protect, role("teacher"), gradeDescriptive);

// ✅ Teacher exports submissions marks for Excel paste
router.get("/submissions/:quizId/export", protect, role("teacher"), getQuizMarksExcel);

export default router;