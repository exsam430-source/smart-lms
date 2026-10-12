import mongoose from "mongoose";

const programSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  batches: [
    {
      type: String,
      trim: true,
    },
  ],
});

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    programs: [programSchema],
  },
  { timestamps: true }
);

const Department = mongoose.model("Department", departmentSchema);
export default Department;
