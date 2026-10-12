import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PageLoader } from '../components/common/Loader';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import { ROLES } from '../utils/constants';

// Layouts
import AuthLayout from '../layouts/AuthLayout';
import AdminLayout from '../layouts/AdminLayout';
import TeacherLayout from '../layouts/TeacherLayout';
import StudentLayout from '../layouts/StudentLayout';

// Auth Components
import LoginForm from '../components/auth/LoginForm';
import RegisterForm from '../components/auth/RegisterForm';

// Lazy load pages for better performance
const Home = lazy(() => import('../pages/Home'));
const NotFound = lazy(() => import('../pages/NotFound'));

// Admin Pages
const AdminDashboard = lazy(() => import('../pages/admin/Dashboard'));
const AdminStudents = lazy(() => import('../pages/admin/Students'));
const AdminTeachers = lazy(() => import('../pages/admin/Teachers'));
const AdminCourses = lazy(() => import('../pages/admin/Courses'));
const AdminDepartments = lazy(() => import('../pages/admin/Departments'));
const AdminAnnouncements = lazy(() => import('../pages/admin/Announcements'));
const AdminEnrollments = lazy(() => import('../pages/admin/Enrollments'));

// Teacher Pages
const TeacherDashboard = lazy(() => import('../pages/teacher/Dashboard'));
const TeacherCourses = lazy(() => import('../pages/teacher/MyCourses'));
const TeacherAssignments = lazy(() => import('../pages/teacher/Assignments'));
const TeacherSubmissions = lazy(() => import('../pages/teacher/Submissions'));
const TeacherAnnouncements = lazy(() => import('../pages/teacher/Announcements'));
const TeacherQuizzes = lazy(() => import('../pages/teacher/Quizzes'));
const TeacherEnrollments = lazy(() => import('../pages/teacher/Enrollments'));


// Student Pages
const StudentDashboard = lazy(() => import('../pages/student/Dashboard'));
const StudentCourses = lazy(() => import('../pages/student/MyCourses'));
const StudentCourseDetail = lazy(() => import('../pages/student/CourseDetail'));
const StudentAssignments = lazy(() => import('../pages/student/Assignments'));
const StudentAnnouncements = lazy(() => import('../pages/student/Announcements'));
const StudentQuizzes = lazy(() => import('../pages/student/Quizzes'));

const AppRoutes = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        
        {/* Auth Routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginForm />} />
          <Route path="/register" element={<RegisterForm />} />
        </Route>

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN]}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="students" element={<AdminStudents />} />
          <Route path="teachers" element={<AdminTeachers />} />
          <Route path="courses" element={<AdminCourses />} />
          <Route path="departments" element={<AdminDepartments />} />
          <Route path="enrollments" element={<AdminEnrollments />} />
          <Route path="announcements" element={<AdminAnnouncements />} />
        </Route>

        {/* Teacher Routes */}
        <Route
          path="/teacher"
          element={
            <ProtectedRoute allowedRoles={[ROLES.TEACHER]}>
              <TeacherLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<TeacherDashboard />} />
          <Route path="courses" element={<TeacherCourses />} />
          <Route path="assignments" element={<TeacherAssignments />} />
          <Route path="quizzes" element={<TeacherQuizzes />} />
          <Route path="enrollments" element={<TeacherEnrollments />} />
          <Route path="submissions" element={<TeacherSubmissions />} />
          <Route path="announcements" element={<TeacherAnnouncements />} />
        </Route>

        {/* Student Routes */}
        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRoles={[ROLES.STUDENT]}>
              <StudentLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="courses" element={<StudentCourses />} />
          <Route path="courses/:courseId" element={<StudentCourseDetail />} /> {/* <-- add this */}
          <Route path="assignments" element={<StudentAssignments />} />
          <Route path="quizzes" element={<StudentQuizzes />} />
          <Route path="announcements" element={<StudentAnnouncements />} />
        </Route>

        {/* 404 Page */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;