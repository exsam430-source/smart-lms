import mongoose from "mongoose";
import dotenv from "dotenv";
import Department from "../models/Department.js";

dotenv.config();

const initialDepartments = [
  {
    name: "Department of Computer Sciences",
    programs: [
      {
        name: "BS Computer Science (BSCS)",
        batches: ["2020-2024", "2021-2025", "2022-2026", "2023-2027", "2024-2028"],
      },
      {
        name: "BS Software Engineering (BSSE)",
        batches: ["2020-2024", "2021-2025", "2022-2026", "2023-2027", "2024-2028"],
      },
      {
        name: "BS Information Technology (BSIT)",
        batches: ["2020-2024", "2021-2025", "2022-2026", "2023-2027", "2024-2028"],
      },
    ],
  },
  {
    name: "Department of Electrical Engineering",
    programs: [
      {
        name: "BS Electrical Engineering (BSEE)",
        batches: ["2020-2024", "2021-2025", "2022-2026", "2023-2027", "2024-2028"],
      },
    ],
  },
  {
    name: "Department of Business Administration",
    programs: [
      {
        name: "Bachelor of Business Administration (BBA)",
        batches: ["2020-2024", "2021-2025", "2022-2026", "2023-2027", "2024-2028"],
      },
    ],
  },
];

const seedDepartments = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/lms";
    await mongoose.connect(mongoUri);
    console.log("Database connected for seeding departments");

    // Clean old collection records to apply the new schema cleanly
    await Department.deleteMany({});
    console.log("Cleaned existing departments collection.");

    for (const dept of initialDepartments) {
      await Department.create(dept);
      console.log(`Created department: ${dept.name} with ${dept.programs.length} programs.`);
    }

    console.log("Seeding complete!");
    process.exit();
  } catch (error) {
    console.error("Seeding error:", error);
    process.exit(1);
  }
};

seedDepartments();
