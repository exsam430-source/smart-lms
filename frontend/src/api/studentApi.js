// src/api/studentApi.js
import api from './axiosInstance';

export const studentApi = {
  // ============ Dashboard ============
  getDashboard: async () => {
    try {
      const [coursesRes, gradesRes, progressRes, notificationsRes] = await Promise.allSettled([
        api.get('/student/my-courses'),
        api.get('/student/my-grades'),
        api.get('/student/progress'),
        api.get('/student/notifications'),
      ]);

      return {
        courses: coursesRes.status === 'fulfilled' ? coursesRes.value.data : [],
        grades: gradesRes.status === 'fulfilled' ? gradesRes.value.data : [],
        progress: progressRes.status === 'fulfilled'
          ? (progressRes.value.data?.progress || progressRes.value.data || [])
          : [],
        notifications: notificationsRes.status === 'fulfilled' ? notificationsRes.value.data : [],
      };
    } catch (error) {
      console.error('getDashboard error:', error);
      return { courses: [], grades: [], progress: [], notifications: [] };
    }
  },

  // ============ Courses ============
  getApprovedCourses: () => api.get('/student/courses'),
  getMyCourses: () => api.get('/student/my-courses'),
  getCourse: (id) => api.get(`/student/course/${id}`),
  enrollCourse: (courseId) => api.post(`/student/enroll/${courseId}`),

  // ============ Grades & Results ============
  getMyGrades: () => api.get('/student/my-grades'),
  getResults: () => api.get('/student/results'),

  // ============ Progress ============
  getProgress: () => api.get('/student/progress'),

  // ============ Assignments ============
  getAssignments: () => api.get('/assignments'),
  getAssignmentDetails: (id) => api.get(`/assignments/${id}`),
  submitAssignment: (assignmentId, formData) =>
    api.post(`/student/submit/${assignmentId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // ============ Notifications ============
  getNotifications: () => api.get('/student/notifications'),
  markNotificationRead: (id) => api.put(`/student/notifications/${id}/read`),

  // ============ Announcements ============
  getAnnouncements: () => api.get('/announcements'),

  // ============ Quizzes ============
  getCourseQuizzes: (courseId) => api.get(`/quizzes/course/${courseId}`),
  submitQuiz: (data) => api.post('/quizzes/submit', data),
};

export default studentApi;