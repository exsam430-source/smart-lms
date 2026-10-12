import express from "express";
import { protect, role } from "../middleware/authMiddleware.js";
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "../controllers/departmentController.js";

const router = express.Router();

// Allow all authenticated users to read departments (students/teachers need this for selectors)
router.get("/", protect, getDepartments);

// Admin-only mutations
router.post("/", protect, role("admin"), createDepartment);
router.put("/:id", protect, role("admin"), updateDepartment);
router.delete("/:id", protect, role("admin"), deleteDepartment);

export default router;
