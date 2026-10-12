import Enrollment from "../models/Enrollment.js";
import Course from "../models/Course.js";
import Notification from "../models/Notification.js";

// ── Student: Request enrollment ──────────────────────────
export const requestEnrollment = async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId).populate("teacher");
    if (!course) return res.status(404).json({ message: "Course not found" });

    // Check already enrolled/pending
    const existing = await Enrollment.findOne({
      student: req.user._id,
      course: course._id,
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

    // Create pending enrollment
    const enrollment = await Enrollment.create({
      student: req.user._id,
      course: course._id,
      status: "pending",
    });

    // Notify teacher
    if (course.teacher?._id) {
      await Notification.create({
        user: course.teacher._id,
        type: "enrollment_request",
        message: `${req.user.name} requested enrollment in "${course.title}"`,
        link: `/teacher/enrollments`,
      });
    }

    res.status(201).json({
      message: "Enrollment request sent! Waiting for teacher/admin approval.",
      enrollment,
    });
  } catch (error) {
    console.error("requestEnrollment error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ── Student: View my enrollments ─────────────────────────
export const myEnrollments = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ student: req.user._id })
      .populate({
        path: "course",
        populate: { path: "teacher", select: "name email" },
      })
      .sort({ createdAt: -1 });

    res.json(enrollments);
  } catch (error) {
    console.error("myEnrollments error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ── Teacher: Get pending enrollments for their courses ───
export const getPendingEnrollments = async (req, res) => {
  try {
    const courses = await Course.find({ teacher: req.user._id }).select("_id title");
    const courseIds = courses.map((c) => c._id);

    const enrollments = await Enrollment.find({
      course: { $in: courseIds },
      status: "pending",
    })
      .populate("student", "name email")
      .populate("course", "title category")
      .sort({ createdAt: -1 });

    res.json({ enrollments, total: enrollments.length });
  } catch (error) {
    console.error("getPendingEnrollments error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ── Admin: Get ALL enrollments ───────────────────────────
export const getAllEnrollments = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status && status !== "all") filter.status = status;

    const enrollments = await Enrollment.find(filter)
      .populate("student", "name email")
      .populate({
        path: "course",
        populate: { path: "teacher", select: "name email" },
      })
      .sort({ createdAt: -1 });

    res.json({ enrollments, total: enrollments.length });
  } catch (error) {
    console.error("getAllEnrollments error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ── Teacher/Admin: Approve enrollment ───────────────────
export const approveEnrollment = async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id)
      .populate("student", "name email _id")
      .populate({
        path: "course",
        populate: { path: "teacher", select: "_id name" },
      });

    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment not found" });
    }

    // Teacher can only approve for their own courses
    if (
      req.user.role === "teacher" &&
      enrollment.course.teacher._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Already approved?
    if (enrollment.status === "approved") {
      return res.status(400).json({ message: "Already approved" });
    }

    // ✅ Update status to "approved"
    enrollment.status = "approved";
    await enrollment.save();

    // ✅ Add student to course's studentsEnrolled array (avoid duplicates)
    await Course.findByIdAndUpdate(
      enrollment.course._id,
      { $addToSet: { studentsEnrolled: enrollment.student._id } },
      { new: true }
    );

    // ✅ Notify student
    await Notification.create({
      user: enrollment.student._id,
      type: "enrollment_approved",
      message: `Your enrollment in "${enrollment.course.title}" has been approved! You can now access the course.`,
      link: `/student/courses`,
    });

    res.json({ 
      message: "Enrollment approved successfully", 
      enrollment 
    });
  } catch (error) {
    console.error("approveEnrollment error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ── Teacher/Admin: Reject enrollment ────────────────────
export const rejectEnrollment = async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.id)
      .populate("student", "name email _id")
      .populate({
        path: "course",
        populate: { path: "teacher", select: "_id name" },
      });

    if (!enrollment) {
      return res.status(404).json({ message: "Enrollment not found" });
    }

    if (
      req.user.role === "teacher" &&
      enrollment.course.teacher._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    enrollment.status = "rejected";
    await enrollment.save();

    // Notify student
    await Notification.create({
      user: enrollment.student._id,
      type: "info",
      message: `Your enrollment request for "${enrollment.course.title}" was not approved. Please contact your teacher.`,
    });

    res.json({ message: "Enrollment rejected", enrollment });
  } catch (error) {
    console.error("rejectEnrollment error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ── Admin: Direct enroll student ──────────────────────────
export const directEnroll = async (req, res) => {
  try {
    const { studentId, courseId } = req.body;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    // Check if enrollment already exists
    let enrollment = await Enrollment.findOne({ student: studentId, course: courseId });
    if (enrollment) {
      if (enrollment.status === "approved") {
        return res.status(400).json({ message: "Student is already enrolled in this course" });
      }
      enrollment.status = "approved";
      await enrollment.save();
    } else {
      enrollment = await Enrollment.create({
        student: studentId,
        course: courseId,
        status: "approved",
      });
    }

    // Add student to course's studentsEnrolled array (avoid duplicates)
    await Course.findByIdAndUpdate(
      courseId,
      { $addToSet: { studentsEnrolled: studentId } },
      { new: true }
    );

    res.json({ message: "Student enrolled successfully", enrollment });
  } catch (error) {
    console.error("directEnroll error:", error);
    res.status(500).json({ message: error.message });
  }
};