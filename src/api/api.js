import axios from 'axios';
import { saveAs } from 'file-saver';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Настройка общего конфига axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Добавление токена авторизации при его наличии
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// API для работы с расписанием
export const scheduleApi = {
  // Получение списка групп с поиском
  getGroups: (search = '') => {
    return api.get(`/groups?search=${encodeURIComponent(search)}`);
  },

  // Получение списка преподавателей с поиском
  getTeachers: (search = '') => {
    return api.get(`/teachers?search=${encodeURIComponent(search)}`);
  },
  uploadSchedule: (formData, config = {}) => {
    return api.post('/schedule/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      ...config
    });
  },

  // Получение списка аудиторий с поиском
  getAuditories: (search = '') => {
    return api.get(`/auditories?search=${encodeURIComponent(search)}`);
  },

  // Получение расписания для группы
  getGroupSchedule: (groupName, semester, week) => {
    return api.get(`/schedule/group/${groupName}?semester=${semester}&week=${week}`);
  },

  // Получение расписания для преподавателя
  getTeacherSchedule: (teacherName, semester, week) => {
    return api.get(`/schedule/teacher/${teacherName}?semester=${semester}&week=${week}`);
  },

  // Получение расписания для аудитории
  getAuditorySchedule: (auditory, semester, week) => {
    return api.get(`/schedule/auditory/${auditory}?semester=${semester}&week=${week}`);
  },

  // Экспорт расписания в Excel
  exportToExcel: (type, id, semester, week) => {
    return api.get(`/schedule/${type}/${id}/export?semester=${semester}&week=${week}`, {
      responseType: 'blob'
    }).then(response => {
      saveAs(new Blob([response.data]), `${type}_${id}_schedule_${semester}_${week}.xlsx`);
    });
  },

  // CRUD операции для авторизованных пользователей
  createScheduleItem: (data) => {
    return api.post('/schedule', data);
  },

  updateScheduleItem: (id, data) => {
    return api.put(`/schedule/${id}`, data);
  },

  swapLessons: (lesson1Id, lesson2Id, swapLocations = false, forceSwap = false) => {
    return api.post('/schedule/swap', {
      lesson1_id: lesson1Id,
      lesson2_id: lesson2Id,
      swap_locations: swapLocations,
      force_swap: forceSwap
    });
  },

  // New method for getting detailed conflict information
  getConflictDetails: (date, timeStart, timeEnd) => {
    return api.post('/schedule/conflicts', {
      date: date,
      time_start: timeStart,
      time_end: timeEnd
    });
  },

  getAllConflicts: (semester, week) => {
    return api.get(`/schedule/all_conflicts?semester=${semester}&week=${week}`);
  },

  getConflicts: (date, timeStart, timeEnd) => {
    return api.post('/schedule/conflicts', {
      date: date,
      time_start: timeStart,
      time_end: timeEnd
    });
  },

  moveGroupLessons: (params, forceMove = false) => {
    return api.post('/schedule/group_move', {
      ...params,
      force_move: forceMove
    });
  },

  // New method for resolving conflicts
  resolveConflict: (conflictData) => {
    return api.post('/schedule/resolve_conflict', conflictData);
  },

  deleteScheduleItem: (id) => {
    return api.delete(`/schedule/${id}`);
  },

  // Получение всех данных расписания (для админов)
  getAllSchedule: (filters = {}) => {
    return api.get('/schedule', { params: filters });
  },
  analyzeScheduleFiles: (formData) => {
    return api.post('/schedule/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  checkAvailability: (params) => {
    return api.post('/schedule/check_availability', params);
  },

  findOptimalTime: (lessonId, semester, week) => {
    return api.post('/schedule/find_optimal_time', {
      lesson_id: lessonId,
      semester: semester,
      week_number: week
    });
  },

  // Получение статистики загруженности
  getUsageStats: (semester, week) => {
    return api.get(`/schedule/usage_stats?semester=${semester}&week=${week}`);
  },

  // Обновление с принудительной заменой
  forceUpdateScheduleItem: (id, data) => {
    return api.put(`/schedule/${id}`, {
      ...data,
      force_update: true
    });
  }
};





// API для работы с пользователями и авторизацией
export const authApi = {
  login: (username, password) => {
    return api.post('/auth/login', { username, password });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  initAdmin: (username, password) => {
    return api.post('/auth/init', { username, password });
  },

  getCurrentUser: () => {
    return api.get('/auth/me');
  },

  // Управление пользователями (только для администраторов)
  getUsers: () => {
    return api.get('/users');
  },

  createUser: (data) => {
    return api.post('/users', data);
  },

  updateUser: (id, data) => {
    return api.put(`/users/${id}`, data);
  },

  deleteUser: (id) => {
    return api.delete(`/users/${id}`);
  }
};

export const timeSlotsApi = {
  getTimeSlots: () => {
    return api.get('/time_slots');
  },

  createTimeSlot: (data) => {
    return api.post('/time_slots', data);
  },

  updateTimeSlot: (id, data) => {
    return api.put(`/time_slots/${id}`, data);
  },

  deleteTimeSlot: (id) => {
    return api.delete(`/time_slots/${id}`);
  },

  reorderTimeSlots: (order) => {
    return api.post('/time_slots/reorder', order);
  },

  initDefaultTimeSlots: () => {
    return api.post('/time_slots/init');
  }
};

export default api;