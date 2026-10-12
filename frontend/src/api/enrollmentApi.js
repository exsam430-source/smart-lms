// src/api/enrollmentApi.js
import api from './axiosInstance';

export const enrollmentApi = {
  // Student
  requestEnrollment: (courseId) => api.post(`/enrollments/request/${courseId}`),
  getMyEnrollments: () => api.get('/enrollments/my'),

  // Teacher
  getPendingEnrollments: () => api.get('/enrollments/pending'),
  approveEnrollment: (id) => api.put(`/enrollments/approve/${id}`),
  rejectEnrollment: (id) => api.put(`/enrollments/reject/${id}`),

  // Admin
  getAllEnrollments: (status = 'all') =>
    api.get('/enrollments/all', { params: { status } }),
};

export default enrollmentApi;