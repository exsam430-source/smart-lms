import mongoose from "mongoose";

const internalMarkSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    presentation: { type: Number, default: 0 },
    lab: { type: Number, default: 0 },
    mid: { type: Number, default: 0 },
    final: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Prevent duplicate marks records for the same student in the same course
internalMarkSchema.index({ student: 1, course: 1 }, { unique: true });

const InternalMark = mongoose.model("InternalMark", internalMarkSchema);
export default InternalMark;
