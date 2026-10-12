import Assignment from "../models/Assignment.js";
import Submission from "../models/Submission.js";
import Notification from "../models/Notification.js";
import Enrollment from "../models/Enrollment.js";

// Create assignment (teacher)
export const createAssignment = async (req, res) => {
  try {
    const { title, description, dueDate, courseId } = req.body;

    if (!title || !dueDate || !courseId) {
      return res.status(400).json({ message: "title, dueDate and courseId are required" });
    }

    const assignment = await Assignment.create({
      title,
      description,
      dueDate,
      course: courseId,
      teacher: req.user._id,
    });

    // Notify students of the course
    const submissions = await Submission.find({ course: courseId });
    const notifications = submissions.map(sub => ({
      user: sub.student,
      type: "assignment_posted",
      message: `New assignment "${title}" has been posted.`,
    }));
    await Notification.insertMany(notifications);

    res.status(201).json(assignment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all assignments (teacher or student)
// For students: ONLY fetches assignments for courses in which student is enrolled (approved),
// and enriches each assignment with their own submission status.
export const getAssignments = async (req, res) => {
  try {
    // If the requester is a student, filter assignments by approved enrolled courses
    if (req.user.role === "student") {
      const approvedEnrollments = await Enrollment.find({
        student: req.user._id,
        status: "approved",
      }).select("course");

      const enrolledCourseIds = approvedEnrollments.map((e) => e.course);

      const assignments = await Assignment.find({ course: { $in: enrolledCourseIds } })
        .populate("course", "title")
        .populate("teacher", "name");

      const assignmentIds = assignments.map((a) => a._id);
      const mySubmissions = await Submission.find({
        student: req.user._id,
        assignment: { $in: assignmentIds },
      }).lean();

      const submissionMap = {};
      mySubmissions.forEach((s) => {
        submissionMap[s.assignment.toString()] = s;
      });

      const enriched = assignments.map((a) => ({
        ...a.toObject(),
        mySubmission: submissionMap[a._id.toString()] || null,
      }));

      return res.json(enriched);
    }

    const assignments = await Assignment.find().populate("course", "title").populate("teacher", "name");
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get assignment details by ID
export const getAssignmentDetails = async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.assignmentId);
    if (!assignment) return res.status(404).json({ message: "Assignment not found" });
    res.json(assignment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get submissions for an assignment (teacher only)
export const getSubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find({ assignment: req.params.assignmentId }).populate(
      "student",
      "name email"
    );
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
