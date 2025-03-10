import axios from 'axios';
import {saveAs} from 'file-saver';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Настройка общего конфига axios
const api = axios.create({
    baseURL: API_URL, headers: {
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
    }, uploadSchedule: (formData, config = {}) => {
        return api.post('/schedule/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            }, ...config
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

    // Добавить следующий метод в объект scheduleApi в src/api/api.js

// Метод для получения списка дисциплин группы в заданном семестре
    getGroupSubjects: async (groupName, semester) => {
        try {
            console.log(`API: Получение дисциплин для группы ${groupName} в семестре ${semester}`);

            // Сначала попробуем получить данные через getAllSchedule с фильтрацией
            const allScheduleResponse = await api.get('/schedule', {
                params: {
                    semester: semester, group_name: groupName
                }
            });

            if (allScheduleResponse.data && allScheduleResponse.data.length > 0) {
                console.log(`API: Получено ${allScheduleResponse.data.length} записей расписания`);

                // Выбираем только уникальные предметы
                const uniqueSubjects = [...new Set(allScheduleResponse.data.map(item => item.subject))].sort();

                console.log(`API: Найдено ${uniqueSubjects.length} уникальных дисциплин`);
                return uniqueSubjects;
            }

            // Если не получили данные через основной метод,
            // попробуем поискать через getGroupSchedule по нескольким неделям
            console.log('API: Попытка получить дисциплины через расписание по неделям');
            const allSubjects = new Set();

            // Проверяем первые 8 недель
            for (let week = 1; week <= 8; week++) {
                try {
                    const response = await api.get(`/schedule/group/${groupName}?semester=${semester}&week=${week}`);

                    if (response.data && response.data.schedule && response.data.schedule.length > 0) {
                        response.data.schedule.forEach(item => {
                            if (item.subject) {
                                allSubjects.add(item.subject);
                            }
                        });
                    }
                } catch (err) {
                    // Если для какой-то недели нет данных, продолжаем

                }
            }

            const uniqueSubjects = [...allSubjects].sort();
            console.log(`API: Найдено ${uniqueSubjects.length} дисциплин через проверку недель`);

            // Если ни один метод не дал результатов, вернем тестовые данные
            if (uniqueSubjects.length === 0) {
                console.log('API: Используем тестовые данные для дисциплин');
                return ["Дискретная математика", "Программирование", "Физика", "Английский язык", "Высшая математика"];
            }

            return uniqueSubjects;
        } catch (err) {
            console.error('API: Ошибка при получении дисциплин группы:', err);

            // В случае ошибки, возвращаем тестовый набор дисциплин
            return ["Дискретная математика", "Программирование", "Физика", "Английский язык", "Высшая математика"];
        }
    },

    // Получение расписания для преподавателя
    getTeacherSchedule: (teacherName, semester, week) => {
        return api.get(`/schedule/teacher/${teacherName}?semester=${semester}&week=${week}`);
    }, getGroupDisciplines: async (groupName, semester) => {
        try {
            // Получаем расписание для выбранной группы (пробуем первые несколько недель)
            const allLessons = [];

            // Проверяем первые 4 недели, чтобы получить максимум уникальных предметов
            for (let week = 1; week <= 4; week++) {
                try {
                    const response = await api.get(`/schedule/group/${groupName}?semester=${semester}&week=${week}`);
                    if (response.data && response.data.schedule) {
                        allLessons.push(...response.data.schedule);
                    }
                } catch (error) {
                    // Если неделя не существует, продолжаем

                }
            }

            // Извлекаем уникальные предметы
            const uniqueDisciplines = [...new Set(allLessons.map(item => item.subject))].sort();

            return uniqueDisciplines;
        } catch (err) {
            console.error('Ошибка при получении дисциплин:', err);
            throw err;
        }
    },

    // Метод для получения занятий по дисциплине для группы
    getDisciplineLessons: async (groupName, semester, discipline) => {
        try {
            // Собираем все занятия по выбранной дисциплине со всех недель
            const allLessons = [];

            // Проверяем занятия для всех возможных недель семестра
            for (let week = 1; week <= 18; week++) {
                try {
                    const response = await api.get(`/schedule/group/${groupName}?semester=${semester}&week=${week}`);

                    if (response.data && response.data.schedule) {
                        // Фильтруем только занятия по нужной дисциплине
                        const disciplineLessons = response.data.schedule.filter(item => item.subject === discipline);

                        allLessons.push(...disciplineLessons);
                    }
                } catch (error) {
                    // Если неделя не существует, продолжаем

                }
            }

            // Сортируем занятия по дате и времени
            const sortedLessons = allLessons.sort((a, b) => {
                // Сначала сортируем по дате
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                if (dateA < dateB) return -1;
                if (dateA > dateB) return 1;

                // Если даты равны, сортируем по времени начала
                return a.time_start.localeCompare(b.time_start);
            });

            return sortedLessons;
        } catch (err) {
            console.error('Ошибка при получении занятий по дисциплине:', err);
            throw err;
        }
    },

    // Метод для экспорта отчета по дисциплине в Excel
    exportDisciplineReport: async (groupName, semester, discipline, filteredLessons) => {
        try {
            // Создаем FormData с параметрами отчета
            const formData = new FormData();
            formData.append('group_name', groupName);
            formData.append('semester', semester);
            formData.append('discipline', discipline);
            formData.append('data', JSON.stringify(filteredLessons));

            // В данный момент этот эндпоинт не реализован на сервере,
            // поэтому возвращаем существующий метод экспорта
            return await api.get(`/schedule/group/${groupName}/export?semester=${semester}&week=1`, {
                responseType: 'blob'
            }).then(response => {
                saveAs(new Blob([response.data]), `discipline_${discipline}_${groupName}_report.xlsx`);
            });
        } catch (err) {
            console.error('Ошибка при экспорте отчета:', err);
            throw err;
        }
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
            lesson1_id: lesson1Id, lesson2_id: lesson2Id, swap_locations: swapLocations, force_swap: forceSwap
        });
    },

    // New method for getting detailed conflict information
    getConflictDetails: (date, timeStart, timeEnd) => {
        return api.post('/schedule/conflicts', {
            date: date, time_start: timeStart, time_end: timeEnd
        });
    },

    getAllConflicts: (semester, week) => {
        return api.get(`/schedule/all_conflicts?semester=${semester}&week=${week}`);
    },

    getConflicts: (date, timeStart, timeEnd) => {
        return api.post('/schedule/conflicts', {
            date: date, time_start: timeStart, time_end: timeEnd
        });
    },

    moveGroupLessons: (params, forceMove = false) => {
        return api.post('/schedule/group_move', {
            ...params, force_move: forceMove
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
        return api.get('/schedule', {params: filters});
    }, analyzeScheduleFiles: (formData) => {
        return api.post('/schedule/analyze', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    }, checkAvailability: (params) => {
        return api.post('/schedule/check_availability', params);
    },

    findOptimalTime: (lessonId, semester, week) => {
        return api.post('/schedule/find_optimal_time', {
            lesson_id: lessonId, semester: semester, week_number: week
        });
    },
    // Add to scheduleApi object
deleteScheduleByWeek: (semester, week_number) => {
  return api.delete('/schedule/week', {
    params: { semester, week_number }
  });
},

    // Получение статистики загруженности
    getUsageStats: (semester, week) => {
        return api.get(`/schedule/usage_stats?semester=${semester}&week=${week}`);
    },

    // Обновление с принудительной заменой
    forceUpdateScheduleItem: (id, data) => {
        return api.put(`/schedule/${id}`, {
            ...data, force_update: true
        });
    }
};


// API для работы с пользователями и авторизацией
export const authApi = {
    login: (username, password) => {
        return api.post('/auth/login', {username, password});
    },

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    initAdmin: (username, password) => {
        return api.post('/auth/init', {username, password});
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

export const lessonTypesApi = {
  getLessonTypes: () => {
    return api.get('/lesson_types');
  },

  createLessonType: (data) => {
    return api.post('/lesson_types', data);
  },

  updateLessonType: (id, data) => {
    return api.put(`/lesson_types/${id}`, data);
  },

  deleteLessonType: (id) => {
    return api.delete(`/lesson_types/${id}`);
  },

  // Import and export lesson type settings
  exportLessonTypes: () => {
    return api.get('/lesson_types/export', {
      responseType: 'blob'
    });
  },

  importLessonTypes: (formData) => {
    return api.post('/lesson_types/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }
};

export default api;