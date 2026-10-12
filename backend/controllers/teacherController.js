import Course from "../models/Course.js";
import Assignment from "../models/Assignment.js";
import Submission from "../models/Submission.js";
import Grade from "../models/Grade.js";
import Enrollment from "../models/Enrollment.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import Quiz from "../models/Quiz.js";
import QuizSubmission from "../models/QuizSubmission.js";
import InternalMark from "../models/InternalMark.js";

// ------------------ Teacher Dashboard ------------------
export const teacherDashboard = async (req, res) => {
  try {
    // ✅ Get courses with populated students
    const courses = await Course.find({ teacher: req.user._id }).populate(
      "studentsEnrolled",
      "name email"
    );

    const courseIds = courses.map((c) => c._id);

    // ✅ Get real enrollment counts from Enrollment model
    const enrollmentCounts = await Enrollment.aggregate([
      {
        $match: {
          course: { $in: courseIds },
          status: "approved",
        },
      },
      {
        $group: {
          _id: "$course",
          count: { $sum: 1 },
          students: { $push: "$student" },
        },
      },
    ]);

    // ✅ Merge enrollment data into each course
    const coursesWithCounts = courses.map((course) => {
      const enrollData = enrollmentCounts.find(
        (e) => e._id.toString() === course._id.toString()
      );
      return {
        ...course.toObject(),
        studentsEnrolled: enrollData?.students || course.studentsEnrolled || [],
        enrolledCount: enrollData?.count || course.studentsEnrolled?.length || 0,
      };
    });

    // ✅ Fetch assignments and submissions
    const allAssignments = await Assignment.find({ teacher: req.user._id }).populate("course", "title");
    const assignmentIds = allAssignments.map((a) => a._id);
    const allSubmissions = await Submission.find({ assignment: { $in: assignmentIds } });

    // Grading Progress
    const totalSubmissions = allSubmissions.length;
    const gradedSubmissions = allSubmissions.filter((s) => s.status === "graded").length;
    const pendingSubmissions = totalSubmissions - gradedSubmissions;
    const gradingProgress = totalSubmissions > 0
      ? Math.round((gradedSubmissions / totalSubmissions) * 100)
      : 100;

    // Submission Trends (Last 7 Days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const submissionTrendsRaw = await Submission.aggregate([
      {
        $match: {
          assignment: { $in: assignmentIds },
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: { $dayOfWeek: "$createdAt" },
          count: { $sum: 1 },
        },
      },
    ]);

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const submissionTrends = dayNames.map((name, index) => {
      const match = submissionTrendsRaw.find((t) => t._id === index + 1);
      return {
        name,
        submissions: match ? match.count : 0,
      };
    });

    res.json({
      totalCourses: courses.length,
      courses: coursesWithCounts,
      allAssignments,
      totalSubmissions,
      gradedSubmissions,
      pendingSubmissions,
      gradingProgress,
      submissionTrends,
    });
  } catch (err) {
    console.error("teacherDashboard error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ------------------ Create Course ------------------
export const createCourse = async (req, res) => {
  try {
    const { title, description, category, duration, batch, semester, department, program, subject, gradingComponents } = req.body;

    const course = await Course.create({
      title,
      description,
      category,
      duration,
      teacher: req.user._id,
      status: "pending",
      batch: batch || "",
      semester: semester ? Number(semester) : null,
      department: department || "",
      program: program || "",
      subject: subject || "",
      gradingComponents: gradingComponents || {
        quizzes: 5,
        assignments: 10,
        presentation: 5,
        labWork: 10,
        midTerm: 20,
        finalTerm: 50,
      },
    });

    await Notification.create({
      user: req.user._id,
      type: "info",
      message: `Your course "${title}" has been submitted for admin approval`,
    });

    res.status(201).json(course);
  } catch (error) {
    console.error("createCourse error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ------------------ Update Course ------------------
export const updateCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });

    if (
      req.user.role === "teacher" &&
      course.teacher.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { title, description, category, duration, batch, semester, department, program, subject, gradingComponents } = req.body;
    if (title) course.title = title;
    if (description) course.description = description;
    if (category) course.category = category;
    if (duration) course.duration = duration;
    if (batch !== undefined) course.batch = batch;
    if (semester !== undefined) course.semester = semester ? Number(semester) : null;
    if (department !== undefined) course.department = department;
    if (program !== undefined) course.program = program;
    if (subject !== undefined) course.subject = subject;
    if (gradingComponents !== undefined) course.gradingComponents = gradingComponents;

    await course.save();
    res.json({ message: "Course updated", course });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ------------------ Delete Course ------------------
export const deleteCourse = async (req, res) => {
  try {
    const courseId = req.params.courseId || req.params.id;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    if (
      req.user.role === "teacher" &&
      course.teacher.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await Course.deleteOne({ _id: courseId });

    // ✅ Fixed: use teacher id not null
    await Notification.create({
      user: req.user._id,
      message: `Course "${course.title}" has been deleted`,
      type: "info",
    });

    res.json({ message: "Course deleted", course });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ------------------ Upload Lecture ------------------
export const uploadLecture = async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });
    if (course.teacher.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Not authorized" });

    course.lectures.push({
      title: req.body.title,
      fileUrl: req.file.path,
    });
    await course.save();

    // Notify enrolled students
    const enrollments = await Enrollment.find({
      course: course._id,
      status: "approved",
    });

    if (enrollments.length > 0) {
      const notifications = enrollments.map((en) => ({
        user: en.student,
        type: "lecture",
        message: `A new lecture "${req.body.title}" has been uploaded for "${course.title}".`,
      }));
      await Notification.insertMany(notifications);
    }

    res.json({ message: "Lecture uploaded and students notified" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ------------------ Create Assignment ------------------
export const createAssignment = async (req, res) => {
  try {
    const { courseId, title, description, dueDate, totalMarks } = req.body;
    const assignment = await Assignment.create({
      course: courseId,
      title,
      description,
      dueDate,
      teacher: req.user._id,
      fileUrl: req.file ? req.file.path.replace(/\\/g, "/") : "",
      totalMarks: totalMarks !== undefined ? Number(totalMarks) : 100,
    });

    // ✅ Fixed: use teacher id not null
    await Notification.create({
      user: req.user._id,
      type: "info",
      message: `Assignment "${title}" created successfully`,
    });

    res.status(201).json({ message: "Assignment created", assignment });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ------------------ Update Assignment ------------------
export const updateAssignment = async (req, res) => {
  try {
    const id = req.params.id;
    const assignment = await Assignment.findById(id);
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });

    if (
      req.user.role === "teacher" &&
      assignment.teacher.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { title, description, dueDate, totalMarks } = req.body;
    if (title) assignment.title = title;
    if (description) assignment.description = description;
    if (dueDate) assignment.dueDate = dueDate;
    if (req.file) assignment.fileUrl = req.file.path.replace(/\\/g, "/");
    if (totalMarks !== undefined) assignment.totalMarks = Number(totalMarks);

    await assignment.save();
    res.json({ message: "Assignment updated", assignment });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ------------------ Delete Assignment ------------------
export const deleteAssignment = async (req, res) => {
  try {
    const id = req.params.id;
    const assignment = await Assignment.findById(id);
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });

    if (
      req.user.role === "teacher" &&
      assignment.teacher.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await Assignment.deleteOne({ _id: id });

    // ✅ Fixed: use teacher id not null
    await Notification.create({
      user: req.user._id,
      message: `Assignment "${assignment.title}" deleted`,
      type: "info",
    });

    res.json({ message: "Assignment deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ------------------ Assign Grade ------------------
export const assignGrade = async (req, res) => {
  try {
    const studentId = req.body.studentId || req.body.student;
    const assignmentId = req.body.assignmentId || req.body.assignment;
    const grade = req.body.grade || req.body.marks;

    if (!studentId || !assignmentId || grade == null)
      return res.status(400).json({
        message: "studentId, assignmentId and grade are required",
      });

    const submission = await Submission.findOne({
      student: studentId,
      assignment: assignmentId,
    });
    if (!submission)
      return res.status(404).json({ message: "Submission not found" });

    submission.grade = grade;
    submission.status = "graded";
    submission.gradedBy = req.user._id;
    submission.gradedAt = new Date();

    await submission.save();
    res.json({ message: "Grade assigned", submission });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ------------------ Update Grade ------------------
export const updateGrade = async (req, res) => {
  try {
    const id = req.params.id;
    const submission = await Submission.findById(id)
      .populate("student")
      .populate("assignment");

    if (!submission)
      return res.status(404).json({ message: "Submission not found" });

    if (req.user.role === "teacher") {
      if (
        submission.gradedBy &&
        submission.gradedBy.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({ message: "Not authorized" });
      }
    }

    const { grade, feedback } = req.body;
    if (grade != null) submission.grade = grade;
    if (feedback) submission.feedback = feedback;
    submission.status = "graded";
    submission.gradedBy = req.user._id;
    submission.gradedAt = new Date();

    await submission.save();
    res.json({ message: "Grade updated", submission });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ------------------ Delete Grade ------------------
export const deleteGrade = async (req, res) => {
  try {
    const id = req.params.id;
    const submission = await Submission.findById(id)
      .populate("student")
      .populate("assignment");

    if (!submission)
      return res.status(404).json({ message: "Submission not found" });

    if (req.user.role === "teacher") {
      if (
        submission.gradedBy &&
        submission.gradedBy.toString() !== req.user._id.toString()
      ) {
        return res.status(403).json({ message: "Not authorized" });
      }
    }

    submission.grade = null;
    submission.feedback = null;
    submission.gradedBy = null;
    submission.gradedAt = null;
    submission.status = "submitted";

    await submission.save();
    res.json({ message: "Grade removed", submission });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ------------------ Approve Enrollment ------------------
export const approveEnrollment = async (req, res) => {
  try {
    const enrollment = await Enrollment.findById(req.params.enrollmentId)
      .populate("student", "name email _id")
      .populate("course", "title _id");

    if (!enrollment)
      return res.status(404).json({ message: "Enrollment not found" });

    // ✅ Fixed: use "approved" not "enrolled"
    enrollment.status = "approved";
    await enrollment.save();

    // ✅ Fixed: use $addToSet to avoid duplicates
    await Course.findByIdAndUpdate(enrollment.course._id, {
      $addToSet: { studentsEnrolled: enrollment.student._id },
    });

    // ✅ Fixed: use proper type
    await Notification.create({
      user: enrollment.student._id,
      type: "enrollment_approved",
      message: `Your enrollment in "${enrollment.course.title}" has been approved! You can now access the course.`,
      link: `/student/courses`,
    });

    res.json({ message: "Enrollment approved", enrollment });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ------------------ Get Course Enrolled Students ------------------
export const getCourseStudents = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId).populate(
      "studentsEnrolled",
      "name email batch semester department phone"
    );
    if (!course) return res.status(404).json({ message: "Course not found" });

    if (course.teacher.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    res.json(course.studentsEnrolled);
  } catch (err) {
    console.error("getCourseStudents error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ------------------ Get Award List (Auto-Calculations + Manual Marks) ------------------
export const getAwardList = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId).populate("studentsEnrolled");
    if (!course) return res.status(404).json({ message: "Course not found" });

    // Verify teacher or admin
    if (course.teacher.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    // 1. Quizzes: Find all published quizzes for the course
    const quizzes = await Quiz.find({ course: courseId, status: "published" });
    const quizIds = quizzes.map((q) => q._id);
    const totalQuizMaxMarks = quizzes.reduce((sum, q) => sum + (q.totalMarks || 0), 0);

    // 2. Assignments: Find all assignments for the course
    const assignments = await Assignment.find({ course: courseId });
    const assignmentIds = assignments.map((a) => a._id);
    const totalAssignmentMaxMarks = assignments.reduce((sum, a) => sum + (a.totalMarks || 0), 0);

    // 3. Fetch all existing internal marks (manual grades) for this course
    const manualMarks = await InternalMark.find({ course: courseId });
    const manualMarksMap = {};
    manualMarks.forEach((m) => {
      manualMarksMap[m.student.toString()] = m;
    });

    // 4. Fetch all quiz submissions for these quizzes
    const quizSubmissions = await QuizSubmission.find({ quiz: { $in: quizIds } });
    const quizSubMap = {};
    quizSubmissions.forEach((qs) => {
      const studentId = qs.student.toString();
      if (!quizSubMap[studentId]) quizSubMap[studentId] = {};
      quizSubMap[studentId][qs.quiz.toString()] = qs;
    });

    // 5. Fetch all assignment submissions
    const assignmentSubmissions = await Submission.find({ assignment: { $in: assignmentIds } });
    const assignSubMap = {};
    assignmentSubmissions.forEach((as) => {
      const studentId = as.student.toString();
      if (!assignSubMap[studentId]) assignSubMap[studentId] = {};
      assignSubMap[studentId][as.assignment.toString()] = as;
    });

    // Build the Award List table rows
    const awardList = course.studentsEnrolled.map((student) => {
      const studentIdStr = student._id.toString();

      // Quiz auto-calculation: percentage = obtained / totalMax
      let studentObtainedQuizMarks = 0;
      quizzes.forEach((quiz) => {
        const sub = quizSubMap[studentIdStr]?.[quiz._id.toString()];
        if (sub) {
          studentObtainedQuizMarks += sub.weightedScore || 0;
        }
      });
      const quizPercentage = totalQuizMaxMarks > 0 ? (studentObtainedQuizMarks / totalQuizMaxMarks) : 0;
      const quizWeight = course.gradingComponents?.quizzes || 5;
      const finalQuizScore = Number((quizPercentage * quizWeight).toFixed(2));

      // Assignment auto-calculation: percentage = obtained / totalMax
      let studentObtainedAssignmentMarks = 0;
      assignments.forEach((assign) => {
        const sub = assignSubMap[studentIdStr]?.[assign._id.toString()];
        if (sub && sub.grade !== undefined) {
          studentObtainedAssignmentMarks += sub.grade || 0;
        }
      });
      const assignPercentage = totalAssignmentMaxMarks > 0 ? (studentObtainedAssignmentMarks / totalAssignmentMaxMarks) : 0;
      const assignWeight = course.gradingComponents?.assignments || 10;
      const finalAssignmentScore = Number((assignPercentage * assignWeight).toFixed(2));

      // Manual grades (Presentation, Lab work, Mid-term, Final-term)
      const manual = manualMarksMap[studentIdStr] || {
        presentation: 0,
        lab: 0,
        mid: 0,
        final: 0,
      };

      // Total marks calculation
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

      return {
        studentId: student._id,
        name: student.name,
        email: student.email,
        regNo: student.regNo || "",
        quizMarks: finalQuizScore,
        assignmentMarks: finalAssignmentScore,
        presentationMarks: manual.presentation || 0,
        labMarks: manual.lab || 0,
        midMarks: manual.mid || 0,
        finalMarks: manual.final || 0,
        totalMarks: totalScore,
      };
    });

    res.json({
      gradingComponents: course.gradingComponents || {
        quizzes: 5,
        assignments: 10,
        presentation: 5,
        labWork: 10,
        midTerm: 20,
        finalTerm: 50,
      },
      awardList,
    });
  } catch (error) {
    console.error("getAwardList error:", error);
    res.status(500).json({ message: "Server error fetching award list" });
  }
};

// ------------------ Save Award List (Manual Marks) ------------------
export const saveAwardList = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { studentsMarks } = req.body; // Array of { studentId, presentation, lab, mid, final }

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found" });

    // Verify teacher or admin
    if (course.teacher.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (!Array.isArray(studentsMarks)) {
      return res.status(400).json({ message: "studentsMarks must be an array" });
    }

    for (const sm of studentsMarks) {
      const { studentId, presentation, lab, mid, final } = sm;

      await InternalMark.findOneAndUpdate(
        { student: studentId, course: courseId },
        {
          presentation: Number(presentation) || 0,
          lab: Number(lab) || 0,
          mid: Number(mid) || 0,
          final: Number(final) || 0,
        },
        { upsert: true, new: true }
      );
    }

    res.json({ message: "Award list saved successfully" });
  } catch (error) {
    console.error("saveAwardList error:", error);
    res.status(500).json({ message: "Server error saving award list" });
  }
};