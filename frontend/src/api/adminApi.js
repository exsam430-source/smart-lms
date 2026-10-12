// src/api/adminApi.js
import api from "./axiosInstance";

export const adminApi = {
  // ── Dashboard ──────────────────────────────────────────
  getDashboard: () => api.get("/admin/dashboard"),

  // ── Students ───────────────────────────────────────────
  getStudents: () => api.get("/admin/students"),
  addStudent: (data) => api.post("/admin/add-student", data),

  // ── Teachers ───────────────────────────────────────────
  getTeachers: () => api.get("/admin/teachers"),
  addTeacher: (data) => api.post("/admin/add-teacher", data),

  // ── Common update/delete user ──────────────────────────
  updateUser: (id, data) => api.patch(`/admin/update-user/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/delete-user/${id}`),

  // ── Courses ────────────────────────────────────────────
  getCourses: () => api.get("/admin/courses"),
  createCourse: (data) => api.post("/admin/courses", data),
  updateCourse: (id, data) => api.put(`/admin/courses/${id}`, data),
  deleteCourse: (id) => api.delete(`/admin/courses/${id}`),

  // ── Enrollments ────────────────────────────────────────
  getAllEnrollments: (status) =>
    api.get("/enrollments/all", { params: { status } }),
  approveEnrollment: (id) => api.put(`/enrollments/approve/${id}`),
  rejectEnrollment: (id) => api.put(`/enrollments/reject/${id}`),

  // ── Announcements ──────────────────────────────────────
  getAnnouncements: () => api.get("/admin/announcements"),
  createAnnouncement: (data) => api.post("/admin/announcement", data),
  updateAnnouncement: (id, data) => api.put(`/admin/announcement/${id}`, data),
  deleteAnnouncement: (id) => api.delete(`/admin/announcement/${id}`),

  // ✅ NEW - Promote Students
  // Promotes all students of a specific batch + semester to next semester
  // body: { batch: "2022-2026", semester: 1 }
  promoteStudents: (data) => api.post("/admin/promote", data),

  // Direct enroll student
  directEnroll: (studentId, courseId) => api.post("/enrollments/direct-enroll", { studentId, courseId }),

  // ── Departments ────────────────────────────────────────
  getDepartments: () => api.get("/departments"),
  createDepartment: (data) => api.post("/departments", data),
  updateDepartment: (id, data) => api.put(`/departments/${id}`, data),
  deleteDepartment: (id) => api.delete(`/departments/${id}`),
};

export default adminApi;