import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { format, getWeek, isWithinInterval, addDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { colors } from './StyledComponents';

// Стилизованные компоненты остаются такими же, как в предыдущей версии...
const ScheduleContainer = styled.div`
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 12px;
  
  /* iOS-style scrollbar */
  &::-webkit-scrollbar {
    height: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: #F2F2F7;
    border-radius: 8px;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: #C7C7CC;
    border-radius: 8px;
  }
`;

const ScheduleGrid = styled.div`
  display: grid;
  grid-template-columns: 50px repeat(6, minmax(140px, 1fr));
  gap: 1px;
  background-color: ${colors.lightGray};
  border-radius: 12px;
  overflow: hidden;
  min-width: 890px;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.05);
  
  @media (max-width: 768px) {
    grid-template-columns: 40px repeat(6, minmax(125px, 1fr));
    min-width: 790px;
  }
`;

const ScheduleHeaderCell = styled.div`
  background-color: ${colors.white};
  padding: 12px 4px;
  text-align: center;
  font-weight: 600;
  font-size: 13px;
  position: sticky;
  top: 0;
  z-index: 10;
  
  @media (max-width: 768px) {
    padding: 10px 3px;
    font-size: 12px;
  }
`;

const ScheduleWeekdayHeader = styled(ScheduleHeaderCell)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  
  strong {
    font-size: 15px;
    margin-bottom: 4px;
    color: #1C1C1E;
    
    @media (max-width: 768px) {
      font-size: 14px;
      margin-bottom: 2px;
    }
  }
  
  span {
    font-size: 12px;
    color: ${colors.gray};
    display: block;
    
    @media (max-width: 768px) {
      font-size: 11px;
    }
  }
`;

const ScheduleTimeCell = styled.div`
  background-color: ${colors.white};
  padding: 6px 2px;
  text-align: center;
  font-size: 11px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 95px;
  
  strong {
    font-size: 13px;
    color: #1C1C1E;
    
    @media (max-width: 768px) {
      font-size: 12px;
    }
  }
  
  small {
    font-size: 11px;
    color: ${colors.gray};
    margin-top: 2px;
    
    @media (max-width: 768px) {
      font-size: 10px;
    }
  }
`;

const ScheduleCellWrapper = styled.div`
  position: relative;
  height: 95px;
  background-color: ${colors.white};
`;

const ScheduleCell = styled.div`
  background-color: ${props => props.empty ? colors.white : props.color || '#E1F5FE'};
  padding: 8px 10px;
  font-size: 11px;
  border-radius: ${props => props.empty ? '0' : '10px'};
  margin: 3px;
  height: calc(100% - 6px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
  box-shadow: ${props => props.empty ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.05)'};
  transition: all 0.2s ease;
  border-left: ${props => props.empty ? 'none' : `3px solid ${props.borderColor || props.color || '#E1F5FE'}`};
  cursor: ${props => props.empty ? 'default' : 'pointer'};
  
  &:hover {
    box-shadow: ${props => props.empty ? 'none' : '0 2px 6px rgba(0, 0, 0, 0.07)'};
    transform: ${props => props.empty ? 'none' : 'translateY(-2px)'};
  }
  
  @media (max-width: 768px) {
    padding: 6px 8px;
    font-size: 10px;
  }
`;

const Subject = styled.div`
  font-weight: 600;
  margin-bottom: 5px;
  font-size: 12px;
  color: #1C1C1E;
  line-height: 1.3;
  max-height: 31px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  
  @media (max-width: 768px) {
    font-size: 11px;
    margin-bottom: 4px;
    max-height: 28px;
  }
`;

const Info = styled.div`
  font-size: 10px;
  color: #636366;
  margin-bottom: 3px;
  display: flex;
  align-items: flex-start;
  line-height: 1.3;
  
  svg {
    flex-shrink: 0;
    min-width: 11px;
    width: 11px;
    height: 11px;
    margin-right: 4px;
    margin-top: 1px;
    opacity: 0.8;
  }
  
  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  @media (max-width: 768px) {
    font-size: 9px;
    margin-bottom: 2px;
  }
`;

const ClickableInfo = styled(Info)`
  cursor: pointer;
  color: ${colors.primary};
  transition: all 0.15s ease;
  position: relative;
  
  &:hover {
    color: #0071E3;
    
    svg {
      opacity: 1;
    }
  }
`;

const Badge = styled.span`
  display: inline-block;
  padding: 2px 6px;
  border-radius: 12px;
  font-size: 9px;
  font-weight: 500;
  background-color: rgba(0, 0, 0, 0.04);
  color: #636366;
  margin-top: auto;
  margin-bottom: 2px;
  align-self: flex-start;
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
`;

const ModalContent = styled.div`
  background-color: white;
  border-radius: 16px;
  padding: 20px;
  max-width: 90%;
  width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
`;

const ModalTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #1C1C1E;
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #8E8E93;
  padding: 0;
  line-height: 1;
  
  &:hover {
    color: #FF3B30;
  }
`;

const ModalRow = styled.div`
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
`;

const ModalLabel = styled.div`
  font-size: 12px;
  color: #8E8E93;
  margin-bottom: 4px;
`;

const ModalValue = styled.div`
  font-size: 14px;
  color: #1C1C1E;
`;

// Компонент для отображения индикатора загрузки
const LoadingIndicator = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 30px;
  color: ${colors.gray};
  font-size: 16px;
  
  svg {
    margin-right: 10px;
    animation: spin 1.5s linear infinite;
  }
  
  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

// Константы и вспомогательные функции
const getDarkerColor = (color) => {
  if (!color || color === '#F2F2F7') return '#D1D1D6';

  if (color.startsWith('#')) {
    const hex = color.slice(1);
    let r = parseInt(hex.slice(0, 2), 16);
    let g = parseInt(hex.slice(2, 4), 16);
    let b = parseInt(hex.slice(4, 6), 16);

    r = Math.max(0, r - 35);
    g = Math.max(0, g - 35);
    b = Math.max(0, b - 35);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  return color;
};

const WEEKDAYS = ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const WEEKDAYS_FULL = ['', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
const LESSON_TIMES = [
  { start: '08:00', end: '09:20' },
  { start: '09:30', end: '10:50' },
  { start: '11:00', end: '12:20' },
  { start: '12:40', end: '14:00' },
  { start: '14:10', end: '15:30' },
  { start: '15:40', end: '17:00' },
  { start: '17:10', end: '18:30' },
  { start: '18:40', end: '20:00' }
];

// Определение текущего семестра на основе даты
const getCurrentSemester = () => {
  const now = new Date();
  const month = now.getMonth() + 1; // Январь = 1, Февраль = 2, и т.д.

  // Первый семестр: Сентябрь (9) - Январь (1)
  // Второй семестр: Февраль (2) - Июнь (6)
  if (month >= 9 || month === 1) {
    return 1; // Первый семестр
  } else if (month >= 2 && month <= 6) {
    return 2; // Второй семестр
  } else {
    // Для июля и августа (каникулы) - берем первый семестр,
    // так как скоро начнется учебный год
    return 1;
  }
};

// Определение текущей учебной недели
const getCurrentWeek = (semester) => {
  const now = new Date();
  const year = now.getFullYear();
  let startDate;

  // Примерные даты начала семестров
  if (semester === 1) {
    // Первый семестр обычно начинается 1 сентября
    startDate = new Date(year, 8, 1); // Месяцы в JS от 0 до 11, где 8 = сентябрь

    // Если текущая дата до 1 сентября, значит имеется в виду прошлый год
    if (now < startDate) {
      startDate = new Date(year - 1, 8, 1);
    }
  } else {
    // Второй семестр обычно начинается в начале февраля
    startDate = new Date(year, 1, 10); // 10 февраля примерно
  }

  // Вычисляем разницу в днях и делим на 7, чтобы получить номер недели
  const diffTime = Math.abs(now - startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const weekNumber = Math.floor(diffDays / 7) + 1;

  // Ограничиваем номер недели 18 (максимальное кол-во недель в семестре)
  return Math.min(weekNumber, 18);
};

// Определение дат на текущей неделе
const getWeekDates = (weekNumber, semester) => {
  const now = new Date();
  const year = now.getFullYear();
  let startDate;

  // Определяем примерную дату начала семестра
  if (semester === 1) {
    startDate = new Date(year, 8, 1); // 1 сентября

    // Если текущая дата до 1 сентября, значит имеется в виду прошлый год
    if (now < startDate) {
      startDate = new Date(year - 1, 8, 1);
    }
  } else {
    startDate = new Date(year, 1, 10); // 10 февраля примерно
  }

  // Вычисляем начало нужной недели
  const weekStartDate = new Date(startDate);
  weekStartDate.setDate(weekStartDate.getDate() + (weekNumber - 1) * 7);

  // Находим понедельник текущей недели
  const dayOfWeek = weekStartDate.getDay(); // 0 = воскресенье, 1 = понедельник, ...
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // если воскресенье, то -6 дней, иначе двигаемся назад до понедельника

  const monday = new Date(weekStartDate);
  monday.setDate(weekStartDate.getDate() + diff);

  // Создаем объект с датами всех дней недели
  const dates = {};
  for (let i = 1; i <= 6; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + (i - 1));
    dates[i] = format(day, 'yyyy-MM-dd');
  }

  return dates;
};

const getLessonTypeColor = (type) => {
  const types = {
    'лек.': '#E9F0FC',  // Лекция - голубой в стиле Apple
    'лекция': '#E9F0FC',

    'пр.': '#E3F3E8',   // Практика - зеленый в стиле Apple
    'практика': '#E3F3E8',
    'практ.': '#E3F3E8',

    'лаб.': '#FFF8E8',  // Лабораторная - желтый в стиле Apple
    'лаб': '#FFF8E8',
    'лабораторная': '#FFF8E8',

    'сем.': '#F2E8F7',  // Семинар - фиолетовый в стиле Apple
    'семинар': '#F2E8F7',

    'конс.': '#FFEAEF',  // Консультация - розовый в стиле Apple
    'консультация': '#FFEAEF',

    'экз.': '#FFEFE6',   // Экзамен - оранжевый в стиле Apple
    'экзамен': '#FFEFE6',

    'зач.': '#E9F5FA',   // Зачёт - голубой в стиле Apple
    'зачет': '#E9F5FA',
    'зачёт': '#E9F5FA'
  };

  const normalizedType = type ? type.toLowerCase() : '';

  for (const [key, value] of Object.entries(types)) {
    if (normalizedType === key.toLowerCase()) {
      return value;
    }
  }

  for (const [key, value] of Object.entries(types)) {
    if (normalizedType.includes(key.toLowerCase())) {
      return value;
    }
  }

  return '#F2F2F7';
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return format(date, 'd MMM', { locale: ru });
};

const formatFullDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return format(date, 'd MMMM yyyy', { locale: ru });
};

// SVG иконки
const LocationIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
);

const TeacherIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const GroupIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const LoadingIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const ScheduleTable = ({ schedule = [], dates = {}, view = 'group', loading = false, loadSchedule = null }) => {
  const navigate = useNavigate();
  const params = useParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [currentDates, setCurrentDates] = useState(dates);

  // Получаем текущие параметры из URL
  const itemId = params.id || '';
  const semester = parseInt(params.semester) || 0;
  const week = parseInt(params.week) || 0;

  // При первом рендере проверяем, установлены ли семестр и неделя
  useEffect(() => {
    // Если семестр или неделя не установлены, используем текущие значения
    if (semester === 0 || week === 0) {
      const currentSemester = getCurrentSemester();
      const currentWeek = getCurrentWeek(currentSemester);

      // Перенаправляем пользователя на URL с текущим семестром и неделей
      if (itemId) {
        navigate(`/schedule/${view}/${itemId}/${currentSemester}/${currentWeek}`, { replace: true });

        // Если передана функция для загрузки расписания, вызываем ее
        if (loadSchedule) {
          loadSchedule(itemId, currentSemester, currentWeek);
        }
      }
    }
  }, [semester, week, view, itemId, navigate, loadSchedule]);

  // Обновляем даты недели, когда меняется неделя
  useEffect(() => {
    if (semester > 0 && week > 0) {
      // Если даты не были переданы, вычисляем их сами
      if (Object.keys(dates).length === 0) {
        const calculatedDates = getWeekDates(week, semester);
        setCurrentDates(calculatedDates);
      } else {
        setCurrentDates(dates);
      }
    }
  }, [dates, semester, week]);

  // Обработчик открытия модального окна
  const handleOpenModal = (lesson, e) => {
    e.stopPropagation();
    setSelectedLesson(lesson);
    setModalOpen(true);
  };

  // Обработчик закрытия модального окна
  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedLesson(null);
  };

  // Обработчики кликов для перехода на другие расписания
  const handleGroupClick = (groupName, e) => {
    e.stopPropagation();
    navigate(`/schedule/group/${encodeURIComponent(groupName)}/${semester || getCurrentSemester()}/${week || getCurrentWeek(semester || getCurrentSemester())}`);
  };

  const handleTeacherClick = (teacherName, e) => {
    e.stopPropagation();
    navigate(`/schedule/teacher/${encodeURIComponent(teacherName)}/${semester || getCurrentSemester()}/${week || getCurrentWeek(semester || getCurrentSemester())}`);
  };

  const handleAuditoryClick = (auditory, e) => {
    e.stopPropagation();
    navigate(`/schedule/auditory/${encodeURIComponent(auditory)}/${semester || getCurrentSemester()}/${week || getCurrentWeek(semester || getCurrentSemester())}`);
  };

  // Если идет загрузка данных, показываем индикатор загрузки
  if (loading) {
    return (
      <LoadingIndicator>
        <LoadingIcon />
        Загрузка расписания...
      </LoadingIndicator>
    );
  }

  // Подготавливаем данные для расписания
  const scheduleData = {};

  // Инициализируем пустыми значениями
  for (let weekday = 1; weekday <= 6; weekday++) {
    scheduleData[weekday] = {};
    for (let lessonIndex = 0; lessonIndex < 8; lessonIndex++) {
      scheduleData[weekday][lessonIndex] = [];
    }
  }

  // Заполняем данными из расписания
  schedule.forEach(lesson => {
    const lessonIndex = LESSON_TIMES.findIndex(
      time => time.start === lesson.time_start && time.end === lesson.time_end
    );

    if (lessonIndex !== -1 && lesson.weekday >= 1 && lesson.weekday <= 6) {
      scheduleData[lesson.weekday][lessonIndex].push(lesson);
    }
  });

  return (
    <>
      <ScheduleContainer>
        <ScheduleGrid>
          {/* Заголовок с днями недели */}
          <ScheduleHeaderCell />
          {WEEKDAYS.filter((_, index) => index > 0).map((day, index) => (
            <ScheduleWeekdayHeader key={index}>
              <strong>{day}</strong>
              <span>{currentDates[index + 1] ? formatDate(currentDates[index + 1]) : ''}</span>
            </ScheduleWeekdayHeader>
          ))}

          {/* Строки с временем занятий */}
          {LESSON_TIMES.map((time, timeIndex) => (
            <React.Fragment key={timeIndex}>
              {/* Ячейка времени */}
              <ScheduleTimeCell>
                <strong>{time.start}</strong>
                <small>{time.end}</small>
              </ScheduleTimeCell>

              {/* Ячейки занятий */}
              {Array.from({ length: 6 }, (_, dayIndex) => dayIndex + 1).map(weekday => {
                const lessons = scheduleData[weekday][timeIndex];

                return (
                  <ScheduleCellWrapper key={`${weekday}-${timeIndex}`}>
                    {lessons.length > 0 ? (
                      lessons.map((lesson, index) => {
                        const cellColor = getLessonTypeColor(lesson.lesson_type);
                        const borderColor = getDarkerColor(cellColor);

                        // Формируем текст для значка типа занятия с подгруппой
                        const lessonTypeText = lesson.lesson_type +
                          (lesson.subgroup > 0 ? ` (п/г ${lesson.subgroup})` : '');

                        return (
                          <ScheduleCell
                            key={index}
                            color={cellColor}
                            borderColor={borderColor}
                            onClick={(e) => handleOpenModal(lesson, e)}
                          >
                            <Subject>
                              {lesson.subject}
                            </Subject>

                            {view !== 'group' && lesson.group_name && (
                              <ClickableInfo onClick={(e) => handleGroupClick(lesson.group_name, e)}>
                                <GroupIcon />
                                <span>{lesson.group_name}</span>
                              </ClickableInfo>
                            )}

                            {view !== 'teacher' && lesson.teacher_name && (
                              <ClickableInfo onClick={(e) => handleTeacherClick(lesson.teacher_name, e)}>
                                <TeacherIcon />
                                <span>{lesson.teacher_name}</span>
                              </ClickableInfo>
                            )}

                            {view !== 'auditory' && lesson.auditory && (
                              <ClickableInfo onClick={(e) => handleAuditoryClick(lesson.auditory, e)}>
                                <LocationIcon />
                                <span>{lesson.auditory}</span>
                              </ClickableInfo>
                            )}

                            {lesson.lesson_type && (
                              <Badge>
                                {lessonTypeText}
                              </Badge>
                            )}
                          </ScheduleCell>
                        );
                      })
                    ) : (
                      <ScheduleCell empty />
                    )}
                  </ScheduleCellWrapper>
                );
              })}
            </React.Fragment>
          ))}
        </ScheduleGrid>
      </ScheduleContainer>

      {/* Модальное окно с подробной информацией */}
      {modalOpen && selectedLesson && (
        <ModalOverlay onClick={handleCloseModal}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>{selectedLesson.subject}</ModalTitle>
              <CloseButton onClick={handleCloseModal}>&times;</CloseButton>
            </ModalHeader>

            <ModalRow>
              <ModalLabel>Тип занятия</ModalLabel>
              <ModalValue>
                {selectedLesson.lesson_type}
                {selectedLesson.subgroup > 0 && ` (Подгруппа ${selectedLesson.subgroup})`}
              </ModalValue>
            </ModalRow>

            <ModalRow>
              <ModalLabel>Дата и время</ModalLabel>
              <ModalValue>
                {formatFullDate(selectedLesson.date)}, {WEEKDAYS_FULL[selectedLesson.weekday]}
                <br />
                {selectedLesson.time_start} - {selectedLesson.time_end}
              </ModalValue>
            </ModalRow>

            {selectedLesson.group_name && (
              <ModalRow>
                <ModalLabel>Группа</ModalLabel>
                <ModalValue>
                  <ClickableInfo onClick={(e) => handleGroupClick(selectedLesson.group_name, e)}>
                    <GroupIcon />
                    <span>{selectedLesson.group_name}</span>
                  </ClickableInfo>
                </ModalValue>
              </ModalRow>
            )}

            {selectedLesson.teacher_name && (
              <ModalRow>
                <ModalLabel>Преподаватель</ModalLabel>
                <ModalValue>
                  <ClickableInfo onClick={(e) => handleTeacherClick(selectedLesson.teacher_name, e)}>
                    <TeacherIcon />
                    <span>{selectedLesson.teacher_name}</span>
                  </ClickableInfo>
                </ModalValue>
              </ModalRow>
            )}

            {selectedLesson.auditory && (
              <ModalRow>
                <ModalLabel>Аудитория</ModalLabel>
                <ModalValue>
                  <ClickableInfo onClick={(e) => handleAuditoryClick(selectedLesson.auditory, e)}>
                    <LocationIcon />
                    <span>{selectedLesson.auditory}</span>
                  </ClickableInfo>
                </ModalValue>
              </ModalRow>
            )}

            {selectedLesson.faculty && (
              <ModalRow>
                <ModalLabel>Факультет</ModalLabel>
                <ModalValue>{selectedLesson.faculty}</ModalValue>
              </ModalRow>
            )}

            <ModalRow>
              <ModalLabel>Семестр / Неделя / Курс</ModalLabel>
              <ModalValue>
                {selectedLesson.semester} семестр / {selectedLesson.week_number} неделя / {selectedLesson.course} курс
              </ModalValue>
            </ModalRow>
          </ModalContent>
        </ModalOverlay>
      )}
    </>
  );
};

export default ScheduleTable;