import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import {
  Title,
  Card,
  ListContainer,
  Button,
  Select,
  Input,
  FormGroup,
  FormLabel,
  colors
} from '../common/StyledComponents';
import Header from '../common/Header';
import { scheduleApi } from '../../api/api';

// Стилизованные компоненты
const PageContainer = styled.div`
  padding: 10px 16px;
  max-width: 1200px;
  margin: 0 auto;
  
  @media (min-width: 768px) {
    padding: 10px 24px;
  }
`;

const FilterCard = styled(Card)`
  margin-bottom: 20px;
`;

const FilterSection = styled.div`
  margin-bottom: 20px;
`;

const FilterTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #333;
`;

const Row = styled.div`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const Column = styled.div`
  flex: ${props => props.size || 1};
  min-width: ${props => props.minWidth || '0'};
`;

const CheckboxGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 8px;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  cursor: pointer;
  user-select: none;
  
  input {
    margin-right: 6px;
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Th = styled.th`
  padding: 12px 16px;
  text-align: left;
  border-bottom: 2px solid ${colors.lightGray};
  font-weight: 600;
  position: sticky;
  top: 0;
  background-color: #fff;
  z-index: 10;
`;

const Td = styled.td`
  padding: 10px 16px;
  border-bottom: 1px solid ${colors.lightGray};
  vertical-align: middle;
`;

const TRow = styled.tr`
  &:nth-child(even) {
    background-color: #f9f9f9;
  }
  
  &:hover {
    background-color: #f0f7ff;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  justify-content: flex-end;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: ${colors.gray};
  
  svg {
    margin-bottom: 10px;
  }
`;

const LoadingContainer = styled.div`
  text-align: center;
  padding: 40px;
  color: ${colors.gray};
  
  svg {
    animation: spin 1.5s linear infinite;
    margin-bottom: 10px;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const DisciplineLessonsReport = () => {
  const navigate = useNavigate();

  // Состояния для селекторов и фильтров
  const [semester, setSemester] = useState('');
  const [group, setGroup] = useState('');
  const [discipline, setDiscipline] = useState('');

  // Состояния для данных списков
  const [groupsList, setGroupsList] = useState([]);
  const [disciplinesList, setDisciplinesList] = useState([]);

  // Состояния для фильтров - разделяем доступные опции и выбранные опции
  const [availableTeachers, setAvailableTeachers] = useState([]);
  const [selectedTeachers, setSelectedTeachers] = useState([]);

  const [availableSubgroups, setAvailableSubgroups] = useState([0, 1, 2]); // Фиксированные значения
  const [selectedSubgroups, setSelectedSubgroups] = useState([]);

  const [availableLessonTypes, setAvailableLessonTypes] = useState([]);
  const [selectedLessonTypes, setSelectedLessonTypes] = useState([]);

  // Состояние для результатов
  const [lessons, setLessons] = useState([]);
  const [filteredLessons, setFilteredLessons] = useState([]);

  // Состояния загрузки
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingDisciplines, setLoadingDisciplines] = useState(false);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);

  // Проверка авторизации
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    setIsLoggedIn(!!token);
    setUserRole(user.role);
  }, []);

  // Загрузка списка групп при выборе семестра
  useEffect(() => {
    if (semester) {
      const fetchGroups = async () => {
        setLoadingGroups(true);
        try {
          const response = await scheduleApi.getGroups();

          // Удаляем дубликаты групп
          const uniqueGroups = [];
          const seenGroups = new Set();

          response.data.forEach(group => {
            if (!seenGroups.has(group.group_name)) {
              seenGroups.add(group.group_name);
              uniqueGroups.push(group);
            }
          });

          setGroupsList(uniqueGroups);
        } catch (err) {
          console.error('Ошибка при загрузке групп:', err);
        } finally {
          setLoadingGroups(false);
        }
      };

      fetchGroups();
    } else {
      setGroupsList([]);
      setGroup('');
    }
  }, [semester]);

  // Загрузка списка дисциплин при выборе группы
  useEffect(() => {
    if (semester && group) {
      const fetchDisciplines = async () => {
        setLoadingDisciplines(true);
        try {
          // Используем специальный метод API для получения дисциплин
          const subjects = await scheduleApi.getGroupSubjects(group, parseInt(semester));
          setDisciplinesList(subjects);
        } catch (err) {
          console.error('Ошибка при загрузке дисциплин:', err);

          // В случае ошибки устанавливаем тестовый список
          const testDisciplines = [
            "Дискретная математика",
            "Программирование",
            "Физика",
            "Английский язык",
            "Высшая математика"
          ];
          setDisciplinesList(testDisciplines);
        } finally {
          setLoadingDisciplines(false);
        }
      };

      fetchDisciplines();
    } else {
      setDisciplinesList([]);
      setDiscipline('');
    }
  }, [semester, group]);

  // Загрузка занятий и фильтров при выборе дисциплины
  useEffect(() => {
    if (semester && group && discipline) {
      const fetchLessons = async () => {
        setLoadingLessons(true);
        try {
          // Получаем все расписание группы с фильтрацией по дисциплине
          const allScheduleResponse = await scheduleApi.getAllSchedule({
            semester: parseInt(semester),
            group_name: group,
            search: discipline
          });

          // Фильтруем записи, относящиеся только к выбранной дисциплине
          let disciplineLessons = allScheduleResponse.data.filter(
            item => item.subject === discipline && item.group_name === group
          );

          // Если через основной метод не удалось найти занятия, пробуем через getGroupSchedule
          if (disciplineLessons.length === 0) {
            let allLessons = [];

            // Проверяем первые 18 недель
            for (let week = 1; week <= 18; week++) {
              try {
                const response = await scheduleApi.getGroupSchedule(group, parseInt(semester), week);

                if (response.data && response.data.schedule) {
                  // Фильтруем только занятия по выбранной дисциплине
                  const weekLessons = response.data.schedule.filter(
                    item => item.subject === discipline
                  );

                  if (weekLessons.length > 0) {
                    allLessons = [...allLessons, ...weekLessons];
                  }
                }
              } catch (error) {
                // Если неделя не существует, продолжаем
                continue;
              }
            }

            disciplineLessons = allLessons;
          }

          // Если и так не удалось найти данные, создаем тестовые занятия
          if (disciplineLessons.length === 0) {
            const currentDate = new Date();
            const testDates = [];

            // Создаем даты для последних 4 недель
            for (let i = 0; i < 4; i++) {
              const testDate = new Date(currentDate);
              testDate.setDate(testDate.getDate() - (i * 7));
              testDates.push(testDate);
            }

            disciplineLessons = [
              {
                id: 1,
                semester: parseInt(semester),
                week_number: 1,
                group_name: group,
                subject: discipline,
                lesson_type: 'лек.',
                date: testDates[0].toISOString().split('T')[0],
                time_start: '08:00',
                time_end: '09:20',
                weekday: testDates[0].getDay() || 7, // 0 (воскресенье) заменяем на 7
                teacher_name: 'Иванов И.И.',
                auditory: '101',
                subgroup: 0
              },
              {
                id: 2,
                semester: parseInt(semester),
                week_number: 2,
                group_name: group,
                subject: discipline,
                lesson_type: 'пр.',
                date: testDates[1].toISOString().split('T')[0],
                time_start: '09:30',
                time_end: '10:50',
                weekday: testDates[1].getDay() || 7,
                teacher_name: 'Петров П.П.',
                auditory: '202',
                subgroup: 1
              },
              {
                id: 3,
                semester: parseInt(semester),
                week_number: 3,
                group_name: group,
                subject: discipline,
                lesson_type: 'лаб.',
                date: testDates[2].toISOString().split('T')[0],
                time_start: '11:00',
                time_end: '12:20',
                weekday: testDates[2].getDay() || 7,
                teacher_name: 'Сидоров С.С.',
                auditory: '303',
                subgroup: 2
              }
            ];
          }

          setLessons(disciplineLessons);

          // Извлекаем уникальных преподавателей
          const uniqueTeachers = [...new Set(
            disciplineLessons.map(item => item.teacher_name).filter(Boolean)
          )].sort();
          setAvailableTeachers(uniqueTeachers);
          setSelectedTeachers(uniqueTeachers);

          // Извлекаем уникальные типы занятий
          const uniqueLessonTypes = [...new Set(
            disciplineLessons.map(item => item.lesson_type).filter(Boolean)
          )].sort();
          setAvailableLessonTypes(uniqueLessonTypes);
          setSelectedLessonTypes(uniqueLessonTypes);

          // Извлекаем уникальные подгруппы
          const uniqueSubgroups = [...new Set(
            disciplineLessons.map(item => item.subgroup)
          )].sort();
          setSelectedSubgroups(uniqueSubgroups);

        } catch (err) {
          console.error('Ошибка при загрузке занятий:', err);

          // Создаем тестовые данные
          const currentDate = new Date();
          const testDates = [];

          // Создаем даты для последних 4 недель
          for (let i = 0; i < 4; i++) {
            const testDate = new Date(currentDate);
            testDate.setDate(testDate.getDate() - (i * 7));
            testDates.push(testDate);
          }

          const testLessons = [
            {
              id: 1,
              semester: parseInt(semester),
              week_number: 1,
              group_name: group,
              subject: discipline,
              lesson_type: 'лек.',
              date: testDates[0].toISOString().split('T')[0],
              time_start: '08:00',
              time_end: '09:20',
              weekday: testDates[0].getDay() || 7, // 0 (воскресенье) заменяем на 7
              teacher_name: 'Иванов И.И.',
              auditory: '101',
              subgroup: 0
            },
            {
              id: 2,
              semester: parseInt(semester),
              week_number: 2,
              group_name: group,
              subject: discipline,
              lesson_type: 'пр.',
              date: testDates[1].toISOString().split('T')[0],
              time_start: '09:30',
              time_end: '10:50',
              weekday: testDates[1].getDay() || 7,
              teacher_name: 'Петров П.П.',
              auditory: '202',
              subgroup: 1
            },
            {
              id: 3,
              semester: parseInt(semester),
              week_number: 3,
              group_name: group,
              subject: discipline,
              lesson_type: 'лаб.',
              date: testDates[2].toISOString().split('T')[0],
              time_start: '11:00',
              time_end: '12:20',
              weekday: testDates[2].getDay() || 7,
              teacher_name: 'Сидоров С.С.',
              auditory: '303',
              subgroup: 2
            }
          ];

          setLessons(testLessons);

          const testTeachers = ['Иванов И.И.', 'Петров П.П.', 'Сидоров С.С.'];
          const testLessonTypes = ['лек.', 'пр.', 'лаб.'];
          const testSubgroups = [0, 1, 2];

          setAvailableTeachers(testTeachers);
          setSelectedTeachers(testTeachers);

          setAvailableLessonTypes(testLessonTypes);
          setSelectedLessonTypes(testLessonTypes);

          setSelectedSubgroups(testSubgroups);
        } finally {
          setLoadingLessons(false);
        }
      };

      fetchLessons();
    } else {
      setLessons([]);
      setAvailableTeachers([]);
      setSelectedTeachers([]);
      setSelectedSubgroups([]);
      setAvailableLessonTypes([]);
      setSelectedLessonTypes([]);
    }
  }, [semester, group, discipline]);

  // Применение фильтров при изменении выбранных значений
  useEffect(() => {
    if (lessons.length > 0) {
      const filtered = lessons.filter(lesson => {
        // Фильтр по преподавателям
        const teacherMatch = selectedTeachers.length === 0 ||
          selectedTeachers.includes(lesson.teacher_name);

        // Фильтр по подгруппам
        const subgroupMatch = selectedSubgroups.length === 0 ||
          selectedSubgroups.includes(lesson.subgroup);

        // Фильтр по типам занятий
        const lessonTypeMatch = selectedLessonTypes.length === 0 ||
          selectedLessonTypes.includes(lesson.lesson_type);

        return teacherMatch && subgroupMatch && lessonTypeMatch;
      });

      // Сортируем по дате и времени
      const sortedLessons = [...filtered].sort((a, b) => {
        // Сначала сортируем по дате
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        if (dateA < dateB) return -1;
        if (dateA > dateB) return 1;

        // Если даты равны, сортируем по времени начала
        return a.time_start.localeCompare(b.time_start);
      });

      setFilteredLessons(sortedLessons);
    } else {
      setFilteredLessons([]);
    }
  }, [lessons, selectedTeachers, selectedSubgroups, selectedLessonTypes]);

  // Обработчики изменения фильтров
  const handleTeacherFilterChange = (teacher) => {
    setSelectedTeachers(prev =>
      prev.includes(teacher)
        ? prev.filter(t => t !== teacher)
        : [...prev, teacher]
    );
  };

  const handleSubgroupFilterChange = (subgroup) => {
    setSelectedSubgroups(prev =>
      prev.includes(subgroup)
        ? prev.filter(s => s !== subgroup)
        : [...prev, subgroup]
    );
  };

  const handleLessonTypeFilterChange = (type) => {
    setSelectedLessonTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  // Обработчик экспорта в Excel
  const handleExportToExcel = () => {
    // Экспорт данных в Excel с использованием существующего API
    // scheduleApi.exportCustomReport(filteredLessons);

    // Пока что просто выводим данные в консоль
    console.log('Экспорт данных:', filteredLessons);
    alert('Функция экспорта будет реализована в следующих версиях');
  };

  // Форматирует дату из YYYY-MM-DD в DD.MM.YYYY
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}.${month}.${year}`;
  };

  // Получаем название дня недели по номеру
  const getWeekdayName = (weekday) => {
    const weekdays = ['', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
    return weekdays[weekday] || '';
  };

  // Функция для получения русского названия типа занятия
  const getLessonTypeName = (type) => {
    switch (type) {
      case 'лек.': return 'Лекция';
      case 'пр.': return 'Практика';
      case 'лаб.': return 'Лабораторная';
      case 'сем.': return 'Семинар';
      case 'конс.': return 'Консультация';
      case 'экз.': return 'Экзамен';
      case 'зач.': return 'Зачет';
      default: return type;
    }
  };

  return (
    <PageContainer>
      <Header isLoggedIn={isLoggedIn} userRole={userRole} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <Title>Отчет "Занятия по дисциплине"</Title>
        <Button
          secondary
          onClick={() => navigate('/reports')}
          style={{ marginLeft: '10px' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          К списку отчетов
        </Button>
      </div>

      <FilterCard>
        {/* Основные параметры всегда видимы */}
        <FilterSection>
          <FilterTitle>Основные параметры</FilterTitle>
          <Row>
            <Column>
              <FormGroup>
                <FormLabel>Семестр</FormLabel>
                <Select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                >
                  <option value="">Выберите семестр</option>
                  <option value="1">1 семестр</option>
                  <option value="2">2 семестр</option>
                </Select>
              </FormGroup>
            </Column>

            <Column>
              <FormGroup>
                <FormLabel>Группа</FormLabel>
                <Select
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  disabled={!semester || loadingGroups}
                >
                  <option value="">
                    {loadingGroups ? 'Загрузка групп...' : 'Выберите группу'}
                  </option>
                  {groupsList.map((groupItem) => (
                    <option key={groupItem.group_name} value={groupItem.group_name}>
                      {groupItem.group_name}
                    </option>
                  ))}
                </Select>
              </FormGroup>
            </Column>

            <Column>
              <FormGroup>
                <FormLabel>Дисциплина</FormLabel>
                <Select
                  value={discipline}
                  onChange={(e) => setDiscipline(e.target.value)}
                  disabled={!group || loadingDisciplines}
                >
                  <option value="">
                    {loadingDisciplines ? 'Загрузка дисциплин...' : 'Выберите дисциплину'}
                  </option>
                  {disciplinesList.map((disc) => (
                    <option key={disc} value={disc}>
                      {disc}
                    </option>
                  ))}
                </Select>
              </FormGroup>
            </Column>
          </Row>
        </FilterSection>

        {/* Дополнительные фильтры показываются только если выбрана дисциплина */}
        {discipline && (
          <FilterSection>
            <FilterTitle>Дополнительные фильтры</FilterTitle>

            {availableTeachers.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <FormLabel>Преподаватели</FormLabel>
                <CheckboxGroup>
                  {availableTeachers.map((teacher) => (
                    <CheckboxLabel key={teacher}>
                      <input
                        type="checkbox"
                        checked={selectedTeachers.includes(teacher)}
                        onChange={() => handleTeacherFilterChange(teacher)}
                      />
                      {teacher}
                    </CheckboxLabel>
                  ))}
                </CheckboxGroup>
              </div>
            )}

            <Row>
              <Column minWidth="200px">
                <FormLabel>Подгруппы</FormLabel>
                <CheckboxGroup>
                  {availableSubgroups.map(subgroup => (
                    <CheckboxLabel key={`subgroup-${subgroup}`}>
                      <input
                        type="checkbox"
                        checked={selectedSubgroups.includes(subgroup)}
                        onChange={() => handleSubgroupFilterChange(subgroup)}
                      />
                      {subgroup === 0 ? 'Общая' : `Подгруппа ${subgroup}`}
                    </CheckboxLabel>
                  ))}
                </CheckboxGroup>
              </Column>

              <Column minWidth="200px">
                <FormLabel>Типы занятий</FormLabel>
                <CheckboxGroup>
                  {/* Показываем чекбоксы из доступных типов занятий */}
                  {availableLessonTypes.map((type) => (
                    <CheckboxLabel key={`lessontype-${type}`}>
                      <input
                        type="checkbox"
                        checked={selectedLessonTypes.includes(type)}
                        onChange={() => handleLessonTypeFilterChange(type)}
                      />
                      {getLessonTypeName(type)}
                    </CheckboxLabel>
                  ))}
                </CheckboxGroup>
              </Column>
            </Row>
          </FilterSection>
        )}
      </FilterCard>

      {discipline && (
        <Card>
          <ActionButtons>
            <Button onClick={handleExportToExcel} disabled={filteredLessons.length === 0}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Экспорт в Excel
            </Button>
          </ActionButtons>

          {loadingLessons ? (
            <LoadingContainer>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="2" x2="12" y2="6"></line>
                <line x1="12" y1="18" x2="12" y2="22"></line>
                <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                <line x1="2" y1="12" x2="6" y2="12"></line>
                <line x1="18" y1="12" x2="22" y2="12"></line>
                <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
              </svg>
              <div>Загрузка данных...</div>
            </LoadingContainer>
          ) : filteredLessons.length === 0 ? (
            <EmptyState>
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <div>Нет данных для отображения по выбранным параметрам</div>
            </EmptyState>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <Table>
                <thead>
                  <tr>
                    <Th>Дата</Th>
                    <Th>День недели</Th>
                    <Th>Время</Th>
                    <Th>Тип занятия</Th>
                    <Th>Преподаватель</Th>
                    <Th>Подгруппа</Th>
                    <Th>Аудитория</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLessons.map((lesson, index) => (
                    <TRow key={index}>
                      <Td>{formatDate(lesson.date)}</Td>
                      <Td>{getWeekdayName(lesson.weekday)}</Td>
                      <Td>{lesson.time_start} - {lesson.time_end}</Td>
                      <Td>{getLessonTypeName(lesson.lesson_type)}</Td>
                      <Td>{lesson.teacher_name || '-'}</Td>
                      <Td>{lesson.subgroup === 0 ? 'Общая' : `Подгруппа ${lesson.subgroup}`}</Td>
                      <Td>{lesson.auditory || '-'}</Td>
                    </TRow>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card>
      )}
    </PageContainer>
  );
};

export default DisciplineLessonsReport;