import mongoose from "mongoose";

const quizSubmissionSchema = mongoose.Schema(
  {
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: "Quiz", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    answers: [
      {
        questionId: mongoose.Schema.Types.ObjectId,
        answer: String, // student's answer text (for MCQ choice or descriptive text)
        marksObtained: { type: Number, default: 0 }, // teacher manually assigns for descriptive
        feedback: { type: String, default: "" }, // teacher feedback for descriptive
      }
    ],
    score: { type: Number, default: 0 }, // raw MCQ correct count or sum of marks
    weightedScore: { type: Number, default: 0 }, // final weighted score out of totalMarks
    gradedByTeacher: { type: Boolean, default: false }, // whether teacher graded the descriptive answers
  },
  { timestamps: true }
);

export default mongoose.model("QuizSubmission", quizSubmissionSchema);
