import mongoose from "mongoose";

const questionSchema = mongoose.Schema({
  questionText: { type: String, required: true },
  type: { type: String, enum: ["mcq", "descriptive"], default: "mcq" },
  options: [{ type: String }], // multiple choices (only for mcq)
  correctAnswer: { type: String }, // the exact correct option (only for mcq)
  pdfFile: { type: String, default: "" }, // optional PDF upload url
});

const quizSchema = mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    questions: [questionSchema],
    totalMarks: { type: Number, required: true, default: 0 }, // total weight/marks of the quiz
    duration: { type: Number, required: true }, // in minutes
    status: { type: String, enum: ["draft", "published"], default: "draft" },
  },
  { timestamps: true }
);

export default mongoose.model("Quiz", quizSchema);
