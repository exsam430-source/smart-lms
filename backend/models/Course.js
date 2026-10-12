import mongoose from "mongoose";

const lectureSchema = new mongoose.Schema({
  title: { type: String, default: "Untitled Lecture" },
  fileUrl: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
});

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, default: "Untitled Course" },
    description: { type: String, required: true },
    category: { type: String, required: true },
    duration: { type: String, required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    lectures: [lectureSchema],
    status: { type: String, enum: ["pending", "approved"], default: "pending" },
    studentsEnrolled: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // ✅ NEW - Batch, Semester, Department and Subject for this course
    batch: { type: String, default: "" },      // e.g., "2022-2026"
    semester: { type: Number, default: null }, // e.g., 1 to 8
    department: { type: String, default: "" }, // e.g., "CS", "SE"
    program: { type: String, default: "" },    // e.g., "BSCS", "BSSE"
    subject: { type: String, default: "" },    // e.g., "Web Development"

    // ✅ Configurable weights/total marks per subject/course
    gradingComponents: {
      quizzes: { type: Number, default: 5 },       // quizzes component total weight
      assignments: { type: Number, default: 10 },  // assignments component total weight
      presentation: { type: Number, default: 5 },  // presentation component total weight
      labWork: { type: Number, default: 10 },       // lab work component total weight
      midTerm: { type: Number, default: 20 },       // mid-term component total weight
      finalTerm: { type: Number, default: 50 },     // final-term component total weight
    },
  },
  { timestamps: true }
);

const Course = mongoose.model("Course", courseSchema);
export default Course;