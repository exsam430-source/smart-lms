import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, default: "" },
    role: { type: String, enum: ["student", "teacher", "admin"], default: "student" },
    status: { type: String, enum: ["pending", "approved", "rejected", "failed", "dropped", "left"], default: "pending" },

    // ✅ NEW - Only relevant for students
    batch: { type: String, default: "" },       // e.g., "2022-2026"
    semester: { type: Number, default: null },   // e.g., 1 to 8
    department: { type: String, default: "" },   // e.g., "CS", "SE"
    program: { type: String, default: "" },      // e.g., "BSCS", "BSSE"
    regNo: { type: String, default: "" },        // e.g., "FA22-BCS-089"
  },
  { timestamps: true }
);

// Password compare
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// Hash password before save
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model("User", userSchema);
export default User;