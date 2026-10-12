import User from "../models/User.js";
import Enrollment from "../models/Enrollment.js";
import Course from "../models/Course.js";
import Notification from "../models/Notification.js";

/**
 * Auto-enroll students whose batch, department, and semester
 * match the course's batch, department, and semester.
 *
 * Only runs when all three fields (batch, department, semester) are set on the course.
 * Skips students who already have an Enrollment record for this course.
 *
 * @param {string} courseId - The ObjectId of the course
 * @returns {number} count of newly enrolled students
 */
export const autoEnrollMatchingStudents = async (courseId) => {
  try {
    const course = await Course.findById(courseId);
    if (!course) return 0;

    // Only auto-enroll if all four criteria are set
    if (!course.batch || !course.department || !course.program || !course.semester) {
      return 0;
    }

    // Find approved students matching batch + department + program + semester
    const matchingStudents = await User.find({
      role: "student",
      status: "approved",
      batch: course.batch,
      department: course.department,
      program: course.program,
      semester: course.semester,
    }).select("_id name");

    if (matchingStudents.length === 0) return 0;

    let enrolledCount = 0;

    for (const student of matchingStudents) {
      // Check if enrollment already exists
      const existing = await Enrollment.findOne({
        student: student._id,
        course: course._id,
      });

      if (existing) {
        // If it exists but was rejected, update it to approved
        if (existing.status === "rejected" || existing.status === "pending") {
          existing.status = "approved";
          await existing.save();

          // Add to studentsEnrolled if not already there
          await Course.findByIdAndUpdate(course._id, {
            $addToSet: { studentsEnrolled: student._id },
          });

          enrolledCount++;
        }
        // If already approved, skip
        continue;
      }

      // Create new enrollment record as "approved"
      await Enrollment.create({
        student: student._id,
        course: course._id,
        status: "approved",
      });

      // Add to course's studentsEnrolled array
      await Course.findByIdAndUpdate(course._id, {
        $addToSet: { studentsEnrolled: student._id },
      });

      // Notify the student
      await Notification.create({
        user: student._id,
        type: "enrollment_approved",
        message: `You have been automatically enrolled in "${course.title}" based on your batch, department, and semester.`,
        link: `/student/courses`,
      });

      enrolledCount++;
    }

    return enrolledCount;
  } catch (error) {
    console.error("autoEnrollMatchingStudents error:", error);
    return 0;
  }
};

/**
 * Auto-enroll a student in all approved courses whose batch, department, and semester
 * match the student's batch, department, and semester.
 *
 * @param {string} studentId - The ObjectId of the student
 */
export const autoEnrollStudentInMatchingCourses = async (studentId) => {
  try {
    const student = await User.findById(studentId);
    if (!student || student.role !== "student" || student.status !== "approved") {
      return;
    }

    if (!student.batch || !student.department || !student.program || !student.semester) {
      return;
    }

    // Find courses matching batch + department + program + semester
    const matchingCourses = await Course.find({
      status: "approved",
      batch: student.batch,
      department: student.department,
      program: student.program,
      semester: student.semester,
    });

    for (const course of matchingCourses) {
      // Check if enrollment already exists
      const existing = await Enrollment.findOne({
        student: student._id,
        course: course._id,
      });

      if (existing) {
        if (existing.status === "rejected" || existing.status === "pending") {
          existing.status = "approved";
          await existing.save();

          await Course.findByIdAndUpdate(course._id, {
            $addToSet: { studentsEnrolled: student._id },
          });
        }
        continue;
      }

      // Create new enrollment record as "approved"
      await Enrollment.create({
        student: student._id,
        course: course._id,
        status: "approved",
      });

      // Add to course's studentsEnrolled array
      await Course.findByIdAndUpdate(course._id, {
        $addToSet: { studentsEnrolled: student._id },
      });

      // Notify the student
      await Notification.create({
        user: student._id,
        type: "enrollment_approved",
        message: `You have been automatically enrolled in "${course.title}" based on your batch, department, and semester.`,
        link: `/student/courses`,
      });
    }
  } catch (error) {
    console.error("autoEnrollStudentInMatchingCourses error:", error);
  }
};
