import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { colors } from './StyledComponents';
import { scheduleApi, timeSlotsApi } from '../../api/api';

// Стилизованные компоненты
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
  grid-auto-rows: minmax(min-content, auto);
  
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
  min-height: 95px;
  align-self: stretch;
  
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
  min-height: 95px;
  background-color: ${colors.white};
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 4px;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 3px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background-color: #C7C7CC;
    border-radius: 3px;
  }
`;

const ScheduleCell = styled.div`
  background-color: ${props => props.empty ? colors.white : props.color || '#E1F5FE'};
  padding: 8px 10px;
  font-size: 11px;
  border-radius: ${props => props.empty ? '0' : '12px'};
  min-height: ${props => props.empty ? '100%' : '40px'};
  flex: ${props => props.empty ? '1' : props.flex || '0 0 auto'};
  margin-bottom: ${props => props.empty ? '0' : '3px'};
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
  box-shadow: ${props => props.empty ? 'none' : '0 2px 6px rgba(0, 0, 0, 0.06)'};
  transition: all 0.2s ease-in-out;
  border-left: ${props => props.empty ? 'none' : `3px solid ${props.borderColor || props.color || '#E1F5FE'}`};
  cursor: ${props => props.empty ? 'default' : 'pointer'};
  backdrop-filter: ${props => props.empty ? 'none' : 'saturate(1.1)'};
  
  &:hover {
    box-shadow: ${props => props.empty ? 'none' : '0 3px 8px rgba(0, 0, 0, 0.09)'};
    transform: ${props => props.empty ? 'none' : 'translateY(-1px) scale(1.01)'};
    
    ${props => props.canEdit ? `
      & > .action-button {
        opacity: 1;
      }
    ` : ''}
  }
  
  &:active {
    transform: ${props => props.empty ? 'none' : 'translateY(0px) scale(0.99)'};
    box-shadow: ${props => props.empty ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.08)'};
  }
  
  &:last-child {
    margin-bottom: 0;
  }
  
  @media (max-width: 768px) {
    padding: 7px 9px;
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
  letter-spacing: -0.2px;
  
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
  transition: all 0.2s ease;
  position: relative;
  font-weight: 500;
  
  &:hover {
    color: #0071E3;
    
    svg {
      opacity: 1;
      transform: translateX(1px);
    }
  }
  
  svg {
    transition: transform 0.2s ease;
  }
`;

const Badge = styled.span`
  display: inline-block;
  padding: 2.5px 7px;
  border-radius: 12px;
  font-size: 9px;
  font-weight: 500;
  background-color: rgba(0, 0, 0, 0.035);
  color: #636366;
  margin-top: auto;
  margin-bottom: 2px;
  align-self: flex-start;
  letter-spacing: -0.1px;
  border: 0.5px solid rgba(0, 0, 0, 0.04);
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
  padding: 24px;
  max-width: 90%;
  width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
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
  
  & > div {
    margin-bottom: 6px;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
`;

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

// Кнопка с тремя точками для вызова меню действий
const ActionButton = styled.button`
  position: absolute;
  top: 5px;
  right: 5px;
  background: rgba(255, 255, 255, 0.8);
  width: 24px;
  height: 24px;
  border-radius: 12px;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  opacity: 0;
  backdrop-filter: blur(3px);
  z-index: 2;
  
  &:hover {
    background: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
`;

// Контекстное меню действий
const ActionMenu = styled.div`
  position: absolute;
  top: 30px;
  right: 5px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: ${props => props.visible ? 'block' : 'none'};
  overflow: hidden;
  z-index: 10;
  min-width: 150px;
`;

const MenuItem = styled.div`
  padding: 10px 12px;
  cursor: pointer;
  transition: background 0.2s;
  font-size: 13px;
  display: flex;
  align-items: center;
  
  &:hover {
    background: #F8F8F8;
  }
  
  svg {
    margin-right: 8px;
    stroke: ${props => props.danger ? colors.danger : colors.primary};
  }
`;

// Модальное окно для редактирования занятия
const EditModal = styled(ModalContent)`
  width: 600px;
  max-width: 90%;
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
`;

const ActionModalButton = styled.button`
  background-color: ${props => props.danger ? colors.danger : props.secondary ? 'transparent' : colors.primary};
  color: ${props => props.secondary ? colors.primary : 'white'};
  border: ${props => props.secondary ? `1px solid ${colors.primary}` : 'none'};
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    opacity: 0.9;
  }
`;

// Модальное окно для переноса занятия
const MoveModal = styled(ModalContent)`
  width: 500px;
  max-width: 90%;
`;

const MoveOption = styled.div`
  padding: 12px;
  border: 1px solid ${colors.lightGray};
  border-radius: 8px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background-color: #F9F9F9;
    border-color: ${colors.primary};
  }
  
  &:active {
    background-color: #F5F5F5;
  }
  
  strong {
    display: block;
    margin-bottom: 4px;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 16px;
  
  label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    font-size: 14px;
  }
  
  select, input {
    width: 100%;
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid ${colors.lightGray};
    font-size: 14px;
    
    &:focus {
      border-color: ${colors.primary};
      outline: none;
    }
  }
`;

const TabRow = styled.div`
  display: flex;
  margin-bottom: 16px;
  border-bottom: 1px solid ${colors.lightGray};
`;

const Tab = styled.div`
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid ${props => props.active ? colors.primary : 'transparent'};
  color: ${props => props.active ? colors.primary : colors.gray};
  
  &:hover {
    color: ${colors.primary};
  }
`;

// Вспомогательные функции и константы
// Функция для получения более темного цвета
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

// Функция для группировки занятий в зависимости от типа просмотра
const groupLessons = (lessons, viewType) => {
  if (!lessons || lessons.length <= 1) return lessons;

  // Для группы не выполняем группировку, показываем все занятия отдельно
  if (viewType === 'group') {
    return lessons;
  }

  // Группировка занятий для преподавателя или аудитории
  const groupedLessons = [];
  const groupMap = new Map();

  lessons.forEach(lesson => {
    // Создаем ключ для группировки в зависимости от типа просмотра
    let key;

    if (viewType === 'teacher') {
      // Для преподавателя группируем по предмету и типу занятия
      key = `${lesson.subject}|${lesson.lesson_type}`;
    } else if (viewType === 'auditory') {
      // Для аудитории группируем по предмету, типу занятия и преподавателю
      key = `${lesson.subject}|${lesson.lesson_type}|${lesson.teacher_name}`;
    }

    if (!groupMap.has(key)) {
      // Создаем новую запись с массивами для групп и аудиторий
      groupMap.set(key, {
        ...lesson,
        group_names: lesson.group_name ? [lesson.group_name] : [],
        auditories: lesson.auditory ? [lesson.auditory] : []
      });
    } else {
      const groupedLesson = groupMap.get(key);

      // Добавляем группу, если её ещё нет в массиве
      if (lesson.group_name && !groupedLesson.group_names.includes(lesson.group_name)) {
        groupedLesson.group_names.push(lesson.group_name);
      }

      // Добавляем аудиторию, если её ещё нет в массиве
      if (lesson.auditory && !groupedLesson.auditories.includes(lesson.auditory)) {
        groupedLesson.auditories.push(lesson.auditory);
      }
    }
  });

  // Преобразуем Map в массив
  groupMap.forEach((value) => {
    groupedLessons.push(value);
  });

  return groupedLessons;
};

// Константы для дней недели и времени занятий
const WEEKDAYS = ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const WEEKDAYS_FULL = ['', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

// Фолбэк для временных слотов, если не удастся загрузить из API
const DEFAULT_LESSON_TIMES = [
  { start: '08:00', end: '09:20' },
  { start: '09:30', end: '10:50' },
  { start: '11:00', end: '12:20' },
  { start: '12:40', end: '14:00' },
  { start: '14:10', end: '15:30' },
  { start: '15:40', end: '17:00' },
  { start: '17:10', end: '18:30' },
  { start: '18:40', end: '20:00' }
];

// Функция для форматирования даты
const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return format(date, 'd MMM', { locale: ru });
  } catch (e) {
    console.error('Error formatting date:', e);
    return dateString;
  }
};

// Функция для полного форматирования даты
const formatFullDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return format(date, 'd MMMM yyyy', { locale: ru });
  } catch (e) {
    console.error('Error formatting full date:', e);
    return dateString;
  }
};

// Функция для получения цвета типа занятия
const getLessonTypeColor = (type) => {
  const types = {
    'лек.': '#E9F0FC',  // Лекция - голубой в стиле Apple
    'лекция': '#E9F0FC',

    'пр.': '#E3F9E5',   // Практика - зеленый в стиле Apple
    'практика': '#E3F9E5',
    'практ.': '#E3F9E5',

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

// SVG иконки
const GroupIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const TeacherIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const LocationIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
    <circle cx="12" cy="10" r="3"></circle>
  </svg>
);

const LoadingIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

// Компонент ScheduleTable
const ScheduleTable = ({
  schedule = [],
  dates = {},
  view = 'group',
  loading = false,
  loadSchedule = null,
  isEditable = false // Prop для определения возможности редактирования
}) => {
  const navigate = useNavigate();
  const params = useParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [currentDates, setCurrentDates] = useState(dates);
  const [timeSlots, setTimeSlots] = useState([]);
  const [timeSlotsLoading, setTimeSlotsLoading] = useState(true);

  // Новые состояния для функциональности редактирования
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [actionMenuPosition, setActionMenuPosition] = useState({ lessonId: null });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [availableMoveOptions, setAvailableMoveOptions] = useState([]);
  const [editFormData, setEditFormData] = useState({});
  const [activeTab, setActiveTab] = useState('info');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Получаем текущие параметры из URL
  const itemId = params.id || '';
  const semester = parseInt(params.semester) || 0;
  const week = parseInt(params.week) || 0;

  // Загрузка временных слотов
  useEffect(() => {
    const fetchTimeSlots = async () => {
      try {
        setTimeSlotsLoading(true);
        const response = await timeSlotsApi.getTimeSlots();
        // Фильтруем только активные слоты и сортируем по номеру
        const activeSlots = response.data
          .filter(slot => slot.is_active)
          .sort((a, b) => a.slot_number - b.slot_number);

        if (activeSlots.length > 0) {
          setTimeSlots(activeSlots);
        } else {
          // Фолбэк на стандартные временные слоты
          setTimeSlots(DEFAULT_LESSON_TIMES.map((time, index) => ({
            id: index + 1,
            slot_number: index + 1,
            time_start: time.start,
            time_end: time.end,
            is_active: true
          })));
        }
      } catch (err) {
        console.error('Ошибка при загрузке временных слотов:', err);
        // Фолбэк на стандартные временные слоты при ошибке
        setTimeSlots(DEFAULT_LESSON_TIMES.map((time, index) => ({
          id: index + 1,
          slot_number: index + 1,
          time_start: time.start,
          time_end: time.end,
          is_active: true
        })));
      } finally {
        setTimeSlotsLoading(false);
      }
    };

    fetchTimeSlots();
  }, []);

  // Обновляем даты недели при изменении параметров
  useEffect(() => {
    if (Object.keys(dates).length > 0) {
      setCurrentDates(dates);
    }
  }, [dates]);

  // Обработчик открытия модального окна с информацией
  const handleOpenModal = (lesson, e) => {
    if (e) e.stopPropagation();
    setSelectedLesson(lesson);
    setModalOpen(true);
  };

  // Обработчик закрытия модального окна
  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedLesson(null);
  };

  // Обработчики переходов по расписаниям
  const handleGroupClick = (groupName, e) => {
    if (e) e.stopPropagation();
    navigate(`/schedule/group/${encodeURIComponent(groupName)}/${semester || 1}/${week || 1}`);
  };

  const handleTeacherClick = (teacherName, e) => {
    if (e) e.stopPropagation();
    navigate(`/schedule/teacher/${encodeURIComponent(teacherName)}/${semester || 1}/${week || 1}`);
  };

  const handleAuditoryClick = (auditory, e) => {
    if (e) e.stopPropagation();
    navigate(`/schedule/auditory/${encodeURIComponent(auditory)}/${semester || 1}/${week || 1}`);
  };

  // Обработчик открытия меню действий
  const handleOpenActionMenu = (e, lesson) => {
    if (e) e.stopPropagation();
    setActionMenuPosition({ lessonId: lesson.id });
    setActionMenuOpen(true);
    // Добавляем обработчик для закрытия меню при клике вне его
    document.addEventListener('click', handleCloseActionMenu);
  };

  // Обработчик закрытия меню действий
  const handleCloseActionMenu = () => {
    setActionMenuOpen(false);
    document.removeEventListener('click', handleCloseActionMenu);
  };

  // Обработчик редактирования
  const handleEdit = (e, lesson) => {
    if (e) e.stopPropagation();
    setSelectedLesson(lesson);
    setEditFormData({
      ...lesson,
      date: lesson.date // Убедитесь, что дата в правильном формате
    });
    setActiveTab('edit');
    setEditModalOpen(true);
    setActionMenuOpen(false);
  };

  // Обработчик удаления
  const handleDelete = async (e, lessonId) => {
    if (e) e.stopPropagation();
    if (window.confirm('Вы уверены, что хотите удалить это занятие?')) {
      try {
        await scheduleApi.deleteScheduleItem(lessonId);
        // Перезагружаем расписание
        if (loadSchedule) {
          loadSchedule(itemId, semester, week);
        }
      } catch (err) {
        console.error('Ошибка при удалении занятия:', err);
        alert('Произошла ошибка при удалении занятия.');
      }
    }
    setActionMenuOpen(false);
  };

  // Обработчик открытия модального окна для переноса занятия
  const handleOpenMoveModal = (e, lesson) => {
    if (e) e.stopPropagation();
    setSelectedLesson(lesson);

    // Генерируем список доступных опций для переноса
    const options = [];

    // Для каждого дня недели
    for (let dayIndex = 1; dayIndex <= 6; dayIndex++) {
      if (currentDates[dayIndex]) {
        // Для каждого временного слота
        for (const slot of timeSlots) {
          // Пропускаем текущее время и день
          if (dayIndex === lesson.weekday && slot.time_start === lesson.time_start) continue;

          options.push({
            weekday: dayIndex,
            date: currentDates[dayIndex],
            time_start: slot.time_start,
            time_end: slot.time_end,
            weekdayName: WEEKDAYS_FULL[dayIndex],
            dateFormatted: formatDate(currentDates[dayIndex])
          });
        }
      }
    }

    setAvailableMoveOptions(options);
    setMoveModalOpen(true);
    setActionMenuOpen(false);
  };

  // Обработчик переноса занятия
  const handleMove = async (option) => {
    try {
      // Создаем объект с обновленными данными для переноса
      const updatedData = {
        ...selectedLesson,
        weekday: option.weekday,
        date: option.date,
        time_start: option.time_start,
        time_end: option.time_end
      };

      await scheduleApi.updateScheduleItem(selectedLesson.id, updatedData);

      // Перезагружаем расписание
      if (loadSchedule) {
        loadSchedule(itemId, semester, week);
      }

      setMoveModalOpen(false);
    } catch (err) {
      console.error('Ошибка при переносе занятия:', err);
      alert('Произошла ошибка при переносе занятия.');
    }
  };

  // Обработчик изменения данных формы редактирования
  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Обработчик отправки формы редактирования
  const handleSaveEdit = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await scheduleApi.updateScheduleItem(selectedLesson.id, editFormData);

      // Перезагружаем расписание
      if (loadSchedule) {
        loadSchedule(itemId, semester, week);
      }

      setEditModalOpen(false);
    } catch (err) {
      console.error('Ошибка при сохранении занятия:', err);
      setError('Произошла ошибка при сохранении. Проверьте правильность заполнения полей.');
    } finally {
      setSaving(false);
    }
  };

  // Обработчик создания нового занятия в выбранной ячейке
  const handleCreateLesson = (weekday, timeIndex) => {
    // Создаем начальные данные для нового занятия
    const slot = timeSlots[timeIndex];
    const defaultData = {
      semester: semester,
      week_number: week,
      group_name: view === 'group' ? itemId : '',
      course: 1,
      faculty: '',
      subject: '',
      lesson_type: 'лек.',
      subgroup: 0,
      date: currentDates[weekday],
      time_start: slot.time_start,
      time_end: slot.time_end,
      weekday: weekday,
      teacher_name: view === 'teacher' ? itemId : '',
      auditory: view === 'auditory' ? itemId : ''
    };

    setSelectedLesson(null); // Нет выбранного занятия, т.к. создаем новое
    setEditFormData(defaultData);
    setActiveTab('edit'); // Сразу открываем вкладку редактирования
    setEditModalOpen(true);
  };

  // Обработчик создания нового занятия
  const handleCreateNewLesson = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await scheduleApi.createScheduleItem(editFormData);

      // Перезагружаем расписание
      if (loadSchedule) {
        loadSchedule(itemId, semester, week);
      }

      setEditModalOpen(false);
    } catch (err) {
      console.error('Ошибка при создании занятия:', err);
      setError('Произошла ошибка при создании занятия. Проверьте правильность заполнения полей.');
    } finally {
      setSaving(false);
    }
  };

  // Если идет загрузка данных, показываем индикатор загрузки
  if (loading || timeSlotsLoading) {
    return (
      <LoadingIndicator>
        <LoadingIcon />
        {loading ? 'Загрузка расписания...' : 'Загрузка временных слотов...'}
      </LoadingIndicator>
    );
  }

  // Подготавливаем данные для расписания
  const scheduleData = {};

  // Инициализируем пустыми значениями
  for (let weekday = 1; weekday <= 6; weekday++) {
    scheduleData[weekday] = {};
    for (let lessonIndex = 0; lessonIndex < timeSlots.length; lessonIndex++) {
      scheduleData[weekday][lessonIndex] = [];
    }
  }

  // Заполняем данными из расписания
  schedule.forEach(lesson => {
    const lessonIndex = timeSlots.findIndex(
      slot => slot.time_start === lesson.time_start && slot.time_end === lesson.time_end
    );

    if (lessonIndex !== -1 && lesson.weekday >= 1 && lesson.weekday <= 6) {
      scheduleData[lesson.weekday][lessonIndex].push(lesson);
    }
  });

  // Применяем группировку занятий
  for (let weekday = 1; weekday <= 6; weekday++) {
    for (let lessonIndex = 0; lessonIndex < timeSlots.length; lessonIndex++) {
      scheduleData[weekday][lessonIndex] = groupLessons(
        scheduleData[weekday][lessonIndex],
        view
      );
    }
  }

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
          {timeSlots.map((slot, timeIndex) => (
            <React.Fragment key={timeIndex}>
              {/* Ячейка времени */}
              <ScheduleTimeCell>
                <strong>{slot.time_start}</strong>
                <small>{slot.time_end}</small>
              </ScheduleTimeCell>

              {/* Ячейки занятий */}
              {Array.from({ length: 6 }, (_, dayIndex) => dayIndex + 1).map(weekday => {
                const lessons = scheduleData[weekday][timeIndex] || [];

                return (
                  <ScheduleCellWrapper
                    key={`${weekday}-${timeIndex}`}
                    onClick={() => isEditable && handleCreateLesson(weekday, timeIndex)}
                    style={{ cursor: isEditable ? 'pointer' : 'default' }}
                  >
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
                            onClick={(e) => {
                              e.stopPropagation(); // Предотвращаем срабатывание родительского onClick
                              handleOpenModal(lesson, e);
                            }}
                            canEdit={isEditable}
                          >
                            <Subject>
                              {lesson.subject}
                            </Subject>

                            {view !== 'group' && (lesson.group_names?.length > 0 || lesson.group_name) && (
                              <ClickableInfo onClick={(e) => {
                                e.stopPropagation();
                                // Если есть несколько групп, используем первую для навигации
                                const groupToNav = lesson.group_names?.length > 0
                                  ? lesson.group_names[0]
                                  : lesson.group_name;
                                handleGroupClick(groupToNav, e);
                              }}>
                                <GroupIcon />
                                <span>
                                  {lesson.group_names?.length > 0
                                    ? (lesson.group_names.length > 1
                                        ? `${lesson.group_names[0]} +${lesson.group_names.length - 1}`
                                        : lesson.group_names[0])
                                    : lesson.group_name}
                                </span>
                              </ClickableInfo>
                            )}

                            {view !== 'teacher' && lesson.teacher_name && (
                              <ClickableInfo onClick={(e) => {
                                e.stopPropagation();
                                handleTeacherClick(lesson.teacher_name, e);
                              }}>
                                <TeacherIcon />
                                <span>{lesson.teacher_name}</span>
                              </ClickableInfo>
                            )}

                            {view !== 'auditory' && (lesson.auditories?.length > 0 || lesson.auditory) && (
                              <ClickableInfo onClick={(e) => {
                                e.stopPropagation();
                                // Если есть несколько аудиторий, используем первую для навигации
                                const auditoryToNav = lesson.auditories?.length > 0
                                  ? lesson.auditories[0]
                                  : lesson.auditory;
                                handleAuditoryClick(auditoryToNav, e);
                              }}>
                                <LocationIcon />
                                <span>
                                  {lesson.auditories?.length > 0
                                    ? (lesson.auditories.length > 1
                                        ? `${lesson.auditories[0]} +${lesson.auditories.length - 1}`
                                        : lesson.auditories[0])
                                    : lesson.auditory}
                                </span>
                              </ClickableInfo>
                            )}

                            {lesson.lesson_type && (
                              <Badge>
                                {lessonTypeText}
                              </Badge>
                            )}

                            {/* Кнопка действий (три точки) для авторизованных пользователей */}
                            {isEditable && (
                              <ActionButton
                                onClick={(e) => handleOpenActionMenu(e, lesson)}
                                title="Действия"
                                className="action-button"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="1"></circle>
                                  <circle cx="19" cy="12" r="1"></circle>
                                  <circle cx="5" cy="12" r="1"></circle>
                                </svg>
                              </ActionButton>
                            )}

                            {/* Меню действий */}
                            {actionMenuOpen && actionMenuPosition.lessonId === lesson.id && (
                              <ActionMenu visible={true}>
                                <MenuItem onClick={(e) => handleEdit(e, lesson)}>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                  </svg>
                                  Редактировать
                                </MenuItem>
                                <MenuItem onClick={(e) => handleOpenMoveModal(e, lesson)}>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="5 9 2 12 5 15"></polyline>
                                    <polyline points="9 5 12 2 15 5"></polyline>
                                    <polyline points="15 19 12 22 9 19"></polyline>
                                    <polyline points="19 9 22 12 19 15"></polyline>
                                    <line x1="2" y1="12" x2="22" y2="12"></line>
                                    <line x1="12" y1="2" x2="12" y2="22"></line>
                                  </svg>
                                  Перенести
                                </MenuItem>
                                <MenuItem danger onClick={(e) => handleDelete(e, lesson.id)}>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    <line x1="10" y1="11" x2="10" y2="17"></line>
                                    <line x1="14" y1="11" x2="14" y2="17"></line>
                                  </svg>
                                  Удалить
                                </MenuItem>
                              </ActionMenu>
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

            {/* Показываем группы */}
            {selectedLesson.group_names?.length > 0 ? (
              <ModalRow>
                <ModalLabel>Группы</ModalLabel>
                <ModalValue>
                  {selectedLesson.group_names.map((group, idx) => (
                    <ClickableInfo key={idx} onClick={(e) => handleGroupClick(group, e)}>
                      <GroupIcon />
                      <span>{group}</span>
                    </ClickableInfo>
                  ))}
                </ModalValue>
              </ModalRow>
            ) : selectedLesson.group_name ? (
              <ModalRow>
                <ModalLabel>Группа</ModalLabel>
                <ModalValue>
                  <ClickableInfo onClick={(e) => handleGroupClick(selectedLesson.group_name, e)}>
                    <GroupIcon />
                    <span>{selectedLesson.group_name}</span>
                  </ClickableInfo>
                </ModalValue>
              </ModalRow>
            ) : null}

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

            {/* Показываем аудитории */}
            {selectedLesson.auditories?.length > 0 ? (
              <ModalRow>
                <ModalLabel>Аудитории</ModalLabel>
                <ModalValue>
                  {selectedLesson.auditories.map((auditory, idx) => (
                    <ClickableInfo key={idx} onClick={(e) => handleAuditoryClick(auditory, e)}>
                      <LocationIcon />
                      <span>{auditory}</span>
                    </ClickableInfo>
                  ))}
                </ModalValue>
              </ModalRow>
            ) : selectedLesson.auditory ? (
              <ModalRow>
                <ModalLabel>Аудитория</ModalLabel>
                <ModalValue>
                  <ClickableInfo onClick={(e) => handleAuditoryClick(selectedLesson.auditory, e)}>
                    <LocationIcon />
                    <span>{selectedLesson.auditory}</span>
                  </ClickableInfo>
                </ModalValue>
              </ModalRow>
            ) : null}

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

            {/* Кнопки действий для авторизованных пользователей */}
            {isEditable && (
              <ButtonRow>
                <ActionModalButton
                  secondary
                  onClick={handleCloseModal}
                >
                  Закрыть
                </ActionModalButton>
                <div>
                  <ActionModalButton
                    onClick={(e) => handleEdit(e, selectedLesson)}
                    style={{ marginRight: '8px' }}
                  >
                    Редактировать
                  </ActionModalButton>
                  <ActionModalButton
                    onClick={(e) => handleOpenMoveModal(e, selectedLesson)}
                  >
                    Перенести
                  </ActionModalButton>
                </div>
              </ButtonRow>
            )}
          </ModalContent>
        </ModalOverlay>
      )}

      {/* Модальное окно для редактирования/создания занятия */}
      {editModalOpen && (
        <ModalOverlay onClick={() => setEditModalOpen(false)}>
          <EditModal onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>
                {selectedLesson ? 'Редактирование занятия' : 'Создание нового занятия'}
              </ModalTitle>
              <CloseButton onClick={() => setEditModalOpen(false)}>&times;</CloseButton>
            </ModalHeader>

            <TabRow>
              {selectedLesson && (
                <Tab
                  active={activeTab === 'info'}
                  onClick={() => setActiveTab('info')}
                >
                  Информация
                </Tab>
              )}
              <Tab
                active={activeTab === 'edit'}
                onClick={() => setActiveTab('edit')}
              >
                {selectedLesson ? 'Редактирование' : 'Создание'}
              </Tab>
            </TabRow>

            {activeTab === 'info' && selectedLesson && (
              <div>
                <ModalRow>
                  <ModalLabel>Предмет</ModalLabel>
                  <ModalValue>{selectedLesson.subject}</ModalValue>
                </ModalRow>

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

                <ModalRow>
                  <ModalLabel>Группа</ModalLabel>
                  <ModalValue>{selectedLesson.group_name || '-'}</ModalValue>
                </ModalRow>

                <ModalRow>
                  <ModalLabel>Преподаватель</ModalLabel>
                  <ModalValue>{selectedLesson.teacher_name || '-'}</ModalValue>
                </ModalRow>

                <ModalRow>
                  <ModalLabel>Аудитория</ModalLabel>
                  <ModalValue>{selectedLesson.auditory || '-'}</ModalValue>
                </ModalRow>
              </div>
            )}

            {activeTab === 'edit' && (
              <form onSubmit={selectedLesson ? handleSaveEdit : handleCreateNewLesson}>
                <FormGroup>
                  <label htmlFor="subject">Предмет *</label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={editFormData.subject || ''}
                    onChange={handleEditFormChange}
                    required
                  />
                </FormGroup>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <FormGroup style={{ flex: 1 }}>
                    <label htmlFor="lesson_type">Тип занятия</label>
                    <select
                      id="lesson_type"
                      name="lesson_type"
                      value={editFormData.lesson_type || 'лек.'}
                      onChange={handleEditFormChange}
                    >
                      <option value="лек.">Лекция</option>
                      <option value="пр.">Практика</option>
                      <option value="лаб.">Лабораторная</option>
                      <option value="сем.">Семинар</option>
                      <option value="конс.">Консультация</option>
                    </select>
                  </FormGroup>

                  <FormGroup style={{ flex: 1 }}>
                    <label htmlFor="subgroup">Подгруппа</label>
                    <select
                      id="subgroup"
                      name="subgroup"
                      value={editFormData.subgroup || 0}
                      onChange={handleEditFormChange}
                    >
                      <option value={0}>Общая</option>
                      <option value={1}>Подгруппа 1</option>
                      <option value={2}>Подгруппа 2</option>
                    </select>
                  </FormGroup>
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <FormGroup style={{ flex: 1 }}>
                    <label htmlFor="date">Дата *</label>
                    <input
                      type="date"
                      id="date"
                      name="date"
                      value={editFormData.date || ''}
                      onChange={handleEditFormChange}
                      required
                    />
                  </FormGroup>

                  <FormGroup style={{ flex: 1 }}>
                    <label htmlFor="weekday">День недели *</label>
                    <select
                      id="weekday"
                      name="weekday"
                      value={editFormData.weekday || 1}
                      onChange={handleEditFormChange}
                      required
                    >
                      <option value={1}>Понедельник</option>
                      <option value={2}>Вторник</option>
                      <option value={3}>Среда</option>
                      <option value={4}>Четверг</option>
                      <option value={5}>Пятница</option>
                      <option value={6}>Суббота</option>
                    </select>
                  </FormGroup>
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <FormGroup style={{ flex: 1 }}>
                    <label htmlFor="time_start">Начало *</label>
                    <select
                      id="time_start"
                      name="time_start"
                      value={editFormData.time_start || ''}
                      onChange={handleEditFormChange}
                      required
                    >
                      {timeSlots.map(slot => (
                        <option key={`start_${slot.id}`} value={slot.time_start}>
                          {slot.time_start}
                        </option>
                      ))}
                    </select>
                  </FormGroup>

                  <FormGroup style={{ flex: 1 }}>
                    <label htmlFor="time_end">Окончание *</label>
                    <select
                      id="time_end"
                      name="time_end"
                      value={editFormData.time_end || ''}
                      onChange={handleEditFormChange}
                      required
                    >
                      {timeSlots.map(slot => (
                        <option key={`end_${slot.id}`} value={slot.time_end}>
                          {slot.time_end}
                        </option>
                      ))}
                    </select>
                  </FormGroup>
                </div>

                <FormGroup>
                  <label htmlFor="group_name">Группа *</label>
                  <input
                    type="text"
                    id="group_name"
                    name="group_name"
                    value={editFormData.group_name || ''}
                    onChange={handleEditFormChange}
                    required
                    disabled={view === 'group'}
                  />
                </FormGroup>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <FormGroup style={{ flex: 1 }}>
                    <label htmlFor="course">Курс *</label>
                    <select
                      id="course"
                      name="course"
                      value={editFormData.course || 1}
                      onChange={handleEditFormChange}
                      required
                    >
                      {[1, 2, 3, 4, 5, 6].map(num => (
                        <option key={num} value={num}>{num} курс</option>
                      ))}
                    </select>
                  </FormGroup>

                  <FormGroup style={{ flex: 1 }}>
                    <label htmlFor="faculty">Факультет</label>
                    <input
                      type="text"
                      id="faculty"
                      name="faculty"
                      value={editFormData.faculty || ''}
                      onChange={handleEditFormChange}
                    />
                  </FormGroup>
                </div>

                <FormGroup>
                  <label htmlFor="teacher_name">Преподаватель</label>
                  <input
                    type="text"
                    id="teacher_name"
                    name="teacher_name"
                    value={editFormData.teacher_name || ''}
                    onChange={handleEditFormChange}
                    disabled={view === 'teacher'}
                  />
                </FormGroup>

                <FormGroup>
                  <label htmlFor="auditory">Аудитория</label>
                  <input
                    type="text"
                    id="auditory"
                    name="auditory"
                    value={editFormData.auditory || ''}
                    onChange={handleEditFormChange}
                    disabled={view === 'auditory'}
                  />
                </FormGroup>

                {error && (
                  <div style={{ color: colors.danger, marginBottom: '16px', fontSize: '14px' }}>
                    {error}
                  </div>
                )}

                <ButtonRow>
                  <ActionModalButton
                    type="button"
                    secondary
                    onClick={() => setEditModalOpen(false)}
                  >
                    Отмена
                  </ActionModalButton>

                  <ActionModalButton
                    type="submit"
                    disabled={saving}
                  >
                    {saving ? 'Сохранение...' : (selectedLesson ? 'Сохранить' : 'Создать')}
                  </ActionModalButton>
                </ButtonRow>
              </form>
            )}
          </EditModal>
        </ModalOverlay>
      )}

      {/* Модальное окно для переноса занятия */}
      {moveModalOpen && selectedLesson && (
        <ModalOverlay onClick={() => setMoveModalOpen(false)}>
          <MoveModal onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Перенос занятия</ModalTitle>
              <CloseButton onClick={() => setMoveModalOpen(false)}>&times;</CloseButton>
            </ModalHeader>

            <div style={{ marginBottom: '16px' }}>
              <strong style={{ fontSize: '16px' }}>{selectedLesson.subject}</strong>
              <div style={{ marginTop: '4px', fontSize: '14px', color: colors.gray }}>
                {WEEKDAYS_FULL[selectedLesson.weekday]}, {formatFullDate(selectedLesson.date)}, {selectedLesson.time_start}-{selectedLesson.time_end}
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontWeight: '500', marginBottom: '8px' }}>Выберите новое время:</div>

              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {availableMoveOptions.length > 0 ? (
                  availableMoveOptions.map((option, index) => (
                    <MoveOption
                      key={index}
                      onClick={() => handleMove(option)}
                    >
                      <strong>{option.weekdayName}, {option.dateFormatted}</strong>
                      <div>{option.time_start} - {option.time_end}</div>
                    </MoveOption>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: colors.gray }}>
                    Нет доступных вариантов для переноса
                  </div>
                )}
              </div>
            </div>

            <ButtonRow>
              <ActionModalButton
                secondary
                onClick={() => setMoveModalOpen(false)}
              >
                Отмена
              </ActionModalButton>
            </ButtonRow>
          </MoveModal>
        </ModalOverlay>
      )}
    </>
  );
};

export default ScheduleTable;