// src/api/quizApi.js
import api from './axiosInstance';

export const quizApi = {
  // Teacher
  createQuiz: (data) => api.post('/quizzes/create', data),
  getQuizSubmissions: (quizId) => api.get(`/quizzes/submissions/${quizId}`),
  getTeacherQuizzes: (courseId) => api.get(`/quizzes/course/${courseId}`),
  gradeDescriptive: (data) => api.post('/quizzes/grade', data),
  getQuizMarksExcel: (quizId) => api.get(`/quizzes/submissions/${quizId}/export`),
  uploadPdf: (formData) => api.post('/quizzes/upload-pdf', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),

  // Student
  getCourseQuizzes: (courseId) => api.get(`/quizzes/course/${courseId}`),
  submitQuiz: (data) => api.post('/quizzes/submit', data),
};

export default quizApi;