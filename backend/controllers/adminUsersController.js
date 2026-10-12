import User from "../models/User.js";
import { autoEnrollStudentInMatchingCourses } from "../utils/autoEnroll.js";

// ✅ Batch options helper (you can expand this)
const VALID_SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

// GET /api/admin/students
export const getAllStudents = async (req, res) => {
  try {
    const students = await User.find({ role: "student" }).select("-password");
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to fetch students" });
  }
};

// GET /api/admin/teachers
export const getAllTeachers = async (req, res) => {
  try {
    const teachers = await User.find({ role: "teacher" }).select("-password");
    res.json(teachers);
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to fetch teachers" });
  }
};

// POST /api/admin/add-student
export const addStudentAdmin = async (req, res) => {
  try {
    const { name, email, password, phone, status, batch, semester, department, program, regNo } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email, password are required" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "User already exists with this email" });
    }

    // ✅ Validate semester if provided
    if (semester !== undefined && semester !== null && semester !== "") {
      const semNum = Number(semester);
      if (!VALID_SEMESTERS.includes(semNum)) {
        return res.status(400).json({ message: "Semester must be between 1 and 8" });
      }
    }

    const student = await User.create({
      name,
      email,
      password,
      phone: phone || "",
      role: "student",
      status: status || "pending",
      batch: batch || "",
      semester: semester ? Number(semester) : null,
      department: department || "",
      program: program || "",
      regNo: regNo || "",
    });

    if (student.status === "approved") {
      await autoEnrollStudentInMatchingCourses(student._id);
    }

    res.status(201).json({
      message: "Student created successfully",
      student: {
        _id: student._id,
        name: student.name,
        email: student.email,
        phone: student.phone,
        role: student.role,
        status: student.status,
        batch: student.batch,
        semester: student.semester,
        department: student.department,
        regNo: student.regNo,
        createdAt: student.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to create student" });
  }
};

// POST /api/admin/add-teacher
export const addTeacherAdmin = async (req, res) => {
  try {
    const { name, email, password, phone, status } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email, password are required" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "User already exists with this email" });
    }

    const teacher = await User.create({
      name,
      email,
      password,
      phone: phone || "",
      role: "teacher",
      status: status || "pending",
    });

    res.status(201).json({
      message: "Teacher created successfully",
      teacher: {
        _id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        phone: teacher.phone,
        role: teacher.role,
        status: teacher.status,
        createdAt: teacher.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to create teacher" });
  }
};

// PATCH /api/admin/update-user/:id
export const updateUserAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, status, password, batch, semester, department, program, regNo } = req.body;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (status !== undefined) user.status = status;

    // ✅ Only update batch/semester/department/regNo for students
    if (user.role === "student") {
      if (batch !== undefined) user.batch = batch;
      if (department !== undefined) user.department = department;
      if (program !== undefined) user.program = program;
      if (regNo !== undefined) user.regNo = regNo;

      if (semester !== undefined && semester !== null && semester !== "") {
        const semNum = Number(semester);
        if (!VALID_SEMESTERS.includes(semNum)) {
          return res.status(400).json({ message: "Semester must be between 1 and 8" });
        }
        user.semester = semNum;
      } else if (semester === null || semester === "") {
        user.semester = null;
      }
    }

    if (password && password.trim().length > 0) {
      user.password = password;
    }

    const updated = await user.save();

    if (updated.role === "student" && updated.status === "approved") {
      await autoEnrollStudentInMatchingCourses(updated._id);
    }

    res.json({
      message: "User updated successfully",
      user: {
        _id: updated._id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone,
        role: updated.role,
        status: updated.status,
        batch: updated.batch,
        semester: updated.semester,
        department: updated.department,
        regNo: updated.regNo,
        createdAt: updated.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to update user" });
  }
};

// DELETE /api/admin/delete-user/:id
export const deleteUserAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });

    await user.deleteOne();
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to delete user" });
  }
};

// ✅ NEW - POST /api/admin/promote
// Promotes students of a specific batch + semester to next semester, except those excluded (failed, dropped, left)
export const promoteStudents = async (req, res) => {
  try {
    const { batch, semester, excludedStudents } = req.body; // excludedStudents: [{ studentId, status: "failed"|"dropped"|"left" }]

    // ── Validation ──────────────────────────────────────
    if (!batch || !batch.trim()) {
      return res.status(400).json({ message: "batch is required" });
    }

    if (!semester) {
      return res.status(400).json({ message: "semester is required" });
    }

    const currentSem = Number(semester);

    if (!VALID_SEMESTERS.includes(currentSem)) {
      return res.status(400).json({ message: "Semester must be between 1 and 8" });
    }

    if (currentSem === 8) {
      return res.status(400).json({
        message: "Students in semester 8 cannot be promoted further. They have completed the program.",
      });
    }

    const nextSem = currentSem + 1;

    // ── Find students matching batch + semester ──────────
    const students = await User.find({
      role: "student",
      batch: batch.trim(),
      semester: currentSem,
    });

    if (students.length === 0) {
      return res.status(404).json({
        message: `No students found in batch "${batch}" at semester ${currentSem}`,
      });
    }

    const exclusions = Array.isArray(excludedStudents) ? excludedStudents : [];
    const excludedIds = exclusions.map((x) => x.studentId.toString());

    // ── Update excluded students status and keep their semester ──────────
    let excludedCount = 0;
    for (const ex of exclusions) {
      const student = await User.findById(ex.studentId);
      if (student && student.batch === batch.trim() && student.semester === currentSem) {
        student.status = ex.status; // "failed", "dropped", "left"
        await student.save();
        excludedCount++;
      }
    }

    // ── Promote the remaining students ────────────────────
    const promoteResult = await User.updateMany(
      {
        role: "student",
        batch: batch.trim(),
        semester: currentSem,
        _id: { $nin: excludedIds },
      },
      {
        $set: { semester: nextSem, status: "approved" }, // make sure they are active/approved in the next sem
      }
    );

    // Auto-enroll all promoted students in their new semester courses
    const promotedStudents = await User.find({
      role: "student",
      batch: batch.trim(),
      semester: nextSem,
      status: "approved",
      _id: { $nin: excludedIds },
    });

    for (const s of promotedStudents) {
      await autoEnrollStudentInMatchingCourses(s._id);
    }


    res.json({
      message: `Successfully processed promotions for batch ${batch}. Promoted: ${promoteResult.modifiedCount}, Excluded: ${excludedCount}`,
      promoted: promoteResult.modifiedCount,
      excluded: excludedCount,
      batch,
      fromSemester: currentSem,
      toSemester: nextSem,
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to promote students" });
  }
};