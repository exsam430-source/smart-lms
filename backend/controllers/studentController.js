// backend/controllers/studentController.js
import Course from "../models/Course.js";
import Assignment from "../models/Assignment.js";
import Submission from "../models/Submission.js";
import Grade from "../models/Grade.js";
import Enrollment from "../models/Enrollment.js";
import Notification from "../models/Notification.js";
import Quiz from "../models/Quiz.js";
import QuizSubmission from "../models/QuizSubmission.js";
import InternalMark from "../models/InternalMark.js";
import { sendNotification } from "./notificationController.js";

// ✅ ============ EXISTING FUNCTIONS (keep as is) ============
export const getApprovedCourses = async (req, res) => {
  try {
    const courses = await Course.find({ status: "approved" }).populate("teacher", "name email");
    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const enrollCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    // Check if already has enrollment record
    const existing = await Enrollment.findOne({ 
      student: req.user._id, 
      course: course._id 
    });

    if (existing) {
      return res.status(400).json({ 
        message:
          existing.status === "pending"
            ? "Enrollment request already sent — waiting for approval"
            : existing.status === "approved"
            ? "You are already enrolled in this course"
            : "Enrollment was rejected — contact your teacher",
        status: existing.status,
      });
    }

    // ✅ Always create as pending — teacher/admin must approve
    const enrollment = await Enrollment.create({
      student: req.user._id,
      course: course._id,
      status: "pending",
    });

    // Notify teacher
    if (course.teacher) {
      await Notification.create({
        user: course.teacher,
        type: "enrollment_request",
        message: `${req.user.name} requested enrollment in "${course.title}"`,
        link: `/teacher/enrollments`,
      });
    }

    res.status(201).json({ 
      message: "Enrollment request sent! Waiting for teacher/admin approval.",
      enrollment 
    });
  } catch (err) {
    console.error("enrollCourse error:", err);
    res.status(500).json({ message: err.message });
  }
};

// Fix getMyCourses - it was only fetching "enrolled" status
export const getMyCourses = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ 
      student: req.user._id, 
      status: "approved"  // ✅ "approved" is the correct status after teacher approves
    })
      .populate({
        path: "course",
        populate: { path: "teacher", select: "name email" },
      });

    // Filter out null courses
    const courses = enrollments
      .map((e) => e.course)
      .filter(Boolean);

    res.json(courses);
  } catch (err) {
    console.error("getMyCourses error:", err);
    res.status(500).json({ message: err.message });
  }
};


export const viewCourseLectures = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate("lectures")
      .populate("teacher", "name");

    if (!course) return res.status(404).json({ message: "Course not found" });

    // ✅ FIXED: was "enrolled", correct status is "approved"
    const enrollment = await Enrollment.findOne({
      student: req.user._id,
      course: course._id,
      status: "approved",
    });

    if (!enrollment) {
      return res.status(403).json({ message: "Access denied. You are not enrolled in this course." });
    }

    res.json(course);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const submitAssignment = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.assignmentId);

    if (!assignment) throw new Error("Assignment not found");

    const alreadySubmitted = await Submission.findOne({
      assignment: assignment._id,
      student: req.user._id,
    });
    if (alreadySubmitted) throw new Error("Already submitted");

    const submission = await Submission.create({
      assignment: assignment._id,
      student: req.user._id,
      fileUrl: req.file.path,
    });

    await sendNotification(
      assignment.teacher,
      "assignment",
      `${req.user.name} submitted assignment "${assignment.title}"`,
      `/teacher/submissions/${assignment._id}`
    );

    res.status(201).json(submission);
  } catch (error) {
    res.status(res.statusCode === 200 ? 500 : res.statusCode).json({ message: error.message });
  }
};

export const getMyGrades = async (req, res) => {
  try {
    // Grades are stored directly on Submission records (submission.grade, submission.status === "graded")
    const gradedSubmissions = await Submission.find({
      student: req.user._id,
      status: "graded",
    })
      .populate({ path: "assignment", select: "title course dueDate" })
      .lean();

    // Shape response to match what the frontend expects:
    // { assignment: { _id, title }, grade, feedback, ... }
    const grades = gradedSubmissions.map((s) => ({
      _id: s._id,
      assignment: s.assignment,
      grade: s.grade,
      feedback: s.feedback || "",
      submittedAt: s.submittedAt,
      gradedAt: s.gradedAt,
    }));

    res.json(grades);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ message: "Notification not found" });

    if (notification.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    notification.isRead = true;
    await notification.save();

    res.json({ message: "Notification marked as read", notification });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getProgress = async (req, res) => {
  try {
    const studentId = req.user._id;

    // ✅ FIXED: only approved enrollments
    const enrollments = await Enrollment.find({
      student: studentId,
      status: "approved",
    }).populate({
      path: "course",
      select: "title",
    });

    const progress = [];

    for (const enrollment of enrollments) {
      const course = enrollment.course;

      // Safety check
      if (!course) continue;

      const assignments = await Assignment.find({ course: course._id });
      const grades = await Grade.find({ course: course._id, student: studentId });

      progress.push({
        courseId: course._id,
        courseTitle: course.title,
        totalAssignments: assignments.length,
        gradedAssignments: grades.length,
        grades: grades.map((g) => ({
          assignment: g.assignment,
          grade: g.grade,
        })),
      });
    }

    res.status(200).json({ progress });
  } catch (error) {
    console.error("getProgress error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/student/results
export const getMyResults = async (req, res) => {
  try {
    const studentId = req.user._id;

    // Find all approved course enrollments for this student
    const enrollments = await Enrollment.find({
      student: studentId,
      status: "approved",
    }).populate("course");

    const results = [];

    for (const enrollment of enrollments) {
      const course = enrollment.course;
      if (!course) continue;

      // 1. Quizzes: Find all published quizzes for the course
      const quizzes = await Quiz.find({ course: course._id, status: "published" });
      const quizIds = quizzes.map((q) => q._id);
      const totalQuizMaxMarks = quizzes.reduce((sum, q) => sum + (q.totalMarks || 0), 0);

      // 2. Assignments: Find all assignments for the course
      const assignments = await Assignment.find({ course: course._id });
      const assignmentIds = assignments.map((a) => a._id);
      const totalAssignmentMaxMarks = assignments.reduce((sum, a) => sum + (a.totalMarks || 0), 0);

      // 3. Quiz Submissions: Calculate weighted score ratio
      const quizSubmissions = await QuizSubmission.find({
        student: studentId,
        quiz: { $in: quizIds },
      });
      let studentObtainedQuizMarks = 0;
      quizSubmissions.forEach((qs) => {
        studentObtainedQuizMarks += qs.weightedScore || 0;
      });
      const quizPercentage = totalQuizMaxMarks > 0 ? (studentObtainedQuizMarks / totalQuizMaxMarks) : 0;
      const quizWeight = course.gradingComponents?.quizzes || 5;
      const finalQuizScore = Number((quizPercentage * quizWeight).toFixed(2));

      // 4. Assignment Submissions: Calculate weighted grade ratio
      const assignmentSubmissions = await Submission.find({
        student: studentId,
        assignment: { $in: assignmentIds },
      });
      let studentObtainedAssignmentMarks = 0;
      assignmentSubmissions.forEach((sub) => {
        if (sub.grade !== undefined) {
          studentObtainedAssignmentMarks += sub.grade || 0;
        }
      });
      const assignPercentage = totalAssignmentMaxMarks > 0 ? (studentObtainedAssignmentMarks / totalAssignmentMaxMarks) : 0;
      const assignWeight = course.gradingComponents?.assignments || 10;
      const finalAssignmentScore = Number((assignPercentage * assignWeight).toFixed(2));

      // 5. Manual Marks
      const manual = await InternalMark.findOne({ student: studentId, course: course._id }) || {
        presentation: 0,
        lab: 0,
        mid: 0,
        final: 0,
      };

      // Total score calculation
      const totalScore = Number(
        (
          finalQuizScore +
          finalAssignmentScore +
          (manual.presentation || 0) +
          (manual.lab || 0) +
          (manual.mid || 0) +
          (manual.final || 0)
        ).toFixed(2)
      );

      results.push({
        courseId: course._id,
        title: course.title,
        subject: course.subject || course.title,
        gradingComponents: course.gradingComponents || {
          quizzes: 5,
          assignments: 10,
          presentation: 5,
          labWork: 10,
          midTerm: 20,
          finalTerm: 50,
        },
        quizMarks: finalQuizScore,
        assignmentMarks: finalAssignmentScore,
        presentationMarks: manual.presentation || 0,
        labMarks: manual.lab || 0,
        midMarks: manual.mid || 0,
        finalMarks: manual.final || 0,
        totalMarks: totalScore,
      });
    }

    res.json(results);
  } catch (error) {
    console.error("getMyResults error:", error);
    res.status(500).json({ message: "Server error fetching results" });
  }
};