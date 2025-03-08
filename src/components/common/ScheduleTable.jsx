import React, {useEffect, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import styled from 'styled-components';
import {format} from 'date-fns';
import {ru} from 'date-fns/locale';
import {colors} from './StyledComponents';
import {scheduleApi, timeSlotsApi} from '../../api/api';
import ReactDOM from 'react-dom';

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

    ${props => props.hasConflict && `
    border: 1px solid ${colors.danger};
    border-left: 3px solid ${colors.danger};
  `}
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

const ConflictInfo = styled(Info)`
    color: ${props => props.type === 'warning' ? '#FF9500' : colors.danger};
    font-weight: ${props => props.type === 'warning' ? '400' : '500'};
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

const ConflictBadge = styled(Badge)`
    background-color: ${props => props.type === 'teacher' ? '#FFECEC' : props.type === 'group' ? '#FFF3DC' : props.type === 'auditory' ? '#E2F5FF' : '#FFECEC'};
    color: ${props => props.type === 'teacher' ? colors.danger : props.type === 'group' ? '#FF9500' : props.type === 'auditory' ? '#007AFF' : colors.danger};
    border: 0.5px solid ${props => props.type === 'teacher' ? '#FFCECE' : props.type === 'group' ? '#FFE1A5' : props.type === 'auditory' ? '#B8E2FF' : '#FFCECE'};
    margin-right: 4px;
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

    &::-webkit-scrollbar {
        width: 6px;
    }

    &::-webkit-scrollbar-track {
        background: #F2F2F7;
        border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb {
        background-color: #C7C7CC;
        border-radius: 3px;
    }
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
    position: fixed; /* Изменено с absolute на fixed для позиционирования относительно окна */
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    display: ${props => props.visible ? 'block' : 'none'};
    overflow: hidden;
    z-index: 1000; /* Увеличен z-index, чтобы меню было поверх всех элементов */
    min-width: 170px;
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
        stroke: ${props => props.danger ? colors.danger : props.warning ? '#FF9500' : colors.primary};
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
    background-color: ${props => props.danger ? colors.danger : props.warning ? '#FF9500' : props.secondary ? 'transparent' : colors.primary};
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

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

// Модальное окно для переноса занятия
const MoveModal = styled(ModalContent)`
    width: 650px;
    max-width: 90%;
    max-height: 80vh;
    overflow-y: auto;
`;

const MoveOption = styled.div`
    padding: 12px;
    border: 1px solid ${props => props.isOccupied ? colors.danger : colors.lightGray};
    border-radius: 8px;
    margin-bottom: 10px;
    cursor: pointer;
    transition: all 0.2s;
    background-color: ${props => props.isOccupied ? '#FFF5F5' : 'white'};
    position: relative;

    &:hover {
        background-color: ${props => props.isOccupied ? '#FFEAEA' : '#F9F9F9'};
        border-color: ${props => props.isOccupied ? colors.danger : colors.primary};
    }

    &:active {
        background-color: ${props => props.isOccupied ? '#FFE0E0' : '#F5F5F5'};
    }

    strong {
        display: block;
        margin-bottom: 4px;
    }
`;

const OccupiedBadge = styled.div`
    position: absolute;
    top: -6px;
    right: -6px;
    background-color: ${colors.danger};
    color: white;
    border-radius: 12px;
    padding: 2px 8px;
    font-size: 10px;
    font-weight: 500;
`;

const ConflictsList = styled.div`
    margin-top: 8px;
    padding: 8px;
    border-radius: 6px;
    background-color: #FFF8F8;
    border: 1px solid #FFE0E0;
    font-size: 12px;
`;

const ConflictItem = styled.div`
    display: flex;
    align-items: center;
    margin-bottom: 6px;
    padding: 4px 0;
    border-bottom: 1px dashed #FFE0E0;

    &:last-child {
        margin-bottom: 0;
        border-bottom: none;
    }

    svg {
        min-width: 14px;
        margin-right: 6px;
        color: ${props => props.type === 'teacher' ? colors.danger : props.type === 'group' ? '#FF9500' : props.type === 'auditory' ? '#007AFF' : colors.danger};
    }
`;

const ConflictTypeTag = styled.span`
    display: inline-block;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 500;
    margin-right: 6px;
    background-color: ${props => props.type === 'teacher' ? '#FFECEC' : props.type === 'group' ? '#FFF3DC' : props.type === 'auditory' ? '#E2F5FF' : '#FFECEC'};
    color: ${props => props.type === 'teacher' ? colors.danger : props.type === 'group' ? '#FF9500' : props.type === 'auditory' ? '#007AFF' : colors.danger};
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

const LoadingSpinner = styled.div`
    display: inline-block;
    width: 20px;
    height: 20px;
    border: 2px solid rgba(0, 122, 255, 0.2);
    border-radius: 50%;
    border-top-color: #007AFF;
    animation: spin 1s ease-in-out infinite;

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }
`;

const AlertBox = styled.div`
    padding: 10px 12px;
    border-radius: 8px;
    background-color: ${props => props.type === 'success' ? '#E3F9E5' : props.type === 'warning' ? '#FFF8E8' : props.type === 'error' ? '#FFEAEF' : '#E9F0FC'};
    border: 1px solid ${props => props.type === 'success' ? '#A1E5A5' : props.type === 'warning' ? '#FFE1A5' : props.type === 'error' ? '#FFAFBF' : '#B8D0F6'};
    margin-bottom: 16px;
    font-size: 13px;
    color: ${props => props.type === 'success' ? '#1E7F24' : props.type === 'warning' ? '#945700' : props.type === 'error' ? '#B30021' : '#0055CC'};
    display: flex;
    align-items: flex-start;

    svg {
        margin-right: 8px;
        min-width: 16px;
        margin-top: 2px;
    }
`;

const SwapModal = styled(ModalContent)`
    width: 650px;
    max-width: 90%;
    max-height: 80vh;
    overflow-y: auto;
`;

const SwapOption = styled.div`
    padding: 12px;
    border: 1px solid ${colors.lightGray};
    border-radius: 8px;
    margin-bottom: 12px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        background-color: #F9F9F9;
        border-color: ${colors.primary};
    }

    .title {
        font-weight: 600;
        font-size: 14px;
        margin-bottom: 4px;
    }

    .details {
        font-size: 12px;
        color: ${colors.gray};
    }
`;

const OptimalTimeModal = styled(ModalContent)`
    width: 650px;
    max-width: 90%;
    max-height: 80vh;
    overflow-y: auto;
`;

const OptimalTimeOption = styled(MoveOption)`
    border-color: ${props => props.conflicts === 0 ? '#A1E5A5' : props.conflicts <= 1 ? '#FFE1A5' : props.conflicts <= 2 ? '#FFAFBF' : colors.danger};
    background-color: ${props => props.conflicts === 0 ? '#F5FFF6' : props.conflicts <= 1 ? '#FFFBF0' : props.conflicts <= 2 ? '#FFF5F7' : '#FFECEC'};
`;

const ConfirmationModal = styled(ModalContent)`
    width: 450px;
    max-width: 90%;
    text-align: center;
`;

const DragHandleIcon = styled.div`
    width: 16px;
    height: 16px;
    position: absolute;
    top: 5px;
    left: 5px;
    cursor: move;
    opacity: 0;
    transition: opacity 0.2s;

    ${ScheduleCell}:hover & {
        opacity: 0.7;
    }

    &:hover {
        opacity: 1;
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
const DEFAULT_LESSON_TIMES = [{start: '08:00', end: '09:20'}, {start: '09:30', end: '10:50'}, {
    start: '11:00', end: '12:20'
}, {start: '12:40', end: '14:00'}, {start: '14:10', end: '15:30'}, {start: '15:40', end: '17:00'}, {
    start: '17:10', end: '18:30'
}, {start: '18:40', end: '20:00'}];

// Функция для форматирования даты
const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return format(date, 'd MMM', {locale: ru});
    } catch (e) {
        console.error('Error formatting date:', e);
        return dateString;
    }
};

const ActionMenuPortal = ({ isOpen, position, onClose, children }) => {
  if (!isOpen) return null;

  // Создаем портал, который рендерит содержимое в body, а не внутри родительского компонента
  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'absolute',
          top: position.top + 'px',
          left: position.left + 'px',
          background: 'white',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          borderRadius: '12px',
          minWidth: '170px',
          overflow: 'hidden',
          zIndex: 1000
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

// Функция для полного форматирования даты
const formatFullDate = (dateString) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return format(date, 'd MMMM yyyy', {locale: ru});
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
        'практика': '#E3F9E5', 'практ.': '#E3F9E5',

        'лаб.': '#FFF8E8',  // Лабораторная - желтый в стиле Apple
        'лаб': '#FFF8E8', 'лабораторная': '#FFF8E8',

        'сем.': '#F2E8F7',  // Семинар - фиолетовый в стиле Apple
        'семинар': '#F2E8F7',

        'конс.': '#FFEAEF',  // Консультация - розовый в стиле Apple
        'консультация': '#FFEAEF',

        'экз.': '#FFEFE6',   // Экзамен - оранжевый в стиле Apple
        'экзамен': '#FFEFE6',

        'зач.': '#E9F5FA',   // Зачёт - голубой в стиле Apple
        'зачет': '#E9F5FA', 'зачёт': '#E9F5FA'
    };

    const ActionMenuPortal = ({ isOpen, position, onClose, children }) => {
  if (!isOpen) return null;

  // Создаем портал, который рендерит содержимое в body, а не внутри родительского компонента
  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'absolute',
          top: position.top + 'px',
          left: position.left + 'px',
          background: 'white',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          borderRadius: '12px',
          minWidth: '170px',
          overflow: 'hidden',
          zIndex: 1000
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
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
    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>);

const TeacherIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
    </svg>);

const LocationIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3"></circle>
    </svg>);

const LoadingIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
    </svg>);

const ConflictIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>);

const SwapIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="17 1 21 5 17 9"></polyline>
        <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
        <polyline points="7 23 3 19 7 15"></polyline>
        <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
    </svg>);

const OptimalTimeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>);

const SuccessIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>);

const ErrorIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="15" y1="9" x2="9" y2="15"></line>
        <line x1="9" y1="9" x2="15" y2="15"></line>
    </svg>);

const WarningIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>);

const DragIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="5" r="1"/>
        <circle cx="9" cy="12" r="1"/>
        <circle cx="9" cy="19" r="1"/>
        <circle cx="15" cy="5" r="1"/>
        <circle cx="15" cy="12" r="1"/>
        <circle cx="15" cy="19" r="1"/>
    </svg>);

// Компонент ScheduleTable
const ScheduleTable = ({
                           schedule = [],
                           dates = {},
                           view = 'group',
                           loading = false,
                           loadSchedule = null,
                           isEditable = false
                       }) => {
    const navigate = useNavigate();
    const params = useParams();
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedLesson, setSelectedLesson] = useState(null);
    const [currentDates, setCurrentDates] = useState(dates);
    const [timeSlots, setTimeSlots] = useState([]);
    const [timeSlotsLoading, setTimeSlotsLoading] = useState(true);

    // Новые состояния для функциональности редактирования и управления конфликтами
    const [actionMenuOpen, setActionMenuOpen] = useState(false);
    const [actionMenuPosition, setActionMenuPosition] = useState({lessonId: null});
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [moveModalOpen, setMoveModalOpen] = useState(false);
    const [swapModalOpen, setSwapModalOpen] = useState(false);
    const [optimalTimeModalOpen, setOptimalTimeModalOpen] = useState(false);
    const [confirmationModalOpen, setConfirmationModalOpen] = useState(false);
    const [confirmationAction, setConfirmationAction] = useState(null);
    const [confirmationMessage, setConfirmationMessage] = useState('');
    const [availableMoveOptions, setAvailableMoveOptions] = useState([]);
    const [availableSwapOptions, setAvailableSwapOptions] = useState([]);
    const [optimalTimeOptions, setOptimalTimeOptions] = useState([]);
    const [editFormData, setEditFormData] = useState({});
    const [activeTab, setActiveTab] = useState('info');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [selectedLessonForSwap, setSelectedLessonForSwap] = useState(null);
    const [selectedConflictDetails, setSelectedConflictDetails] = useState(null);
    const [detailedConflictsModalOpen, setDetailedConflictsModalOpen] = useState(false);
    const [conflictHandlingOption, setConflictHandlingOption] = useState('avoid'); // 'avoid', 'force', 'swap'

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
                    id: index + 1, slot_number: index + 1, time_start: time.start, time_end: time.end, is_active: true
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

  // Получение координат кнопки
  const buttonRect = e.currentTarget.getBoundingClientRect();

  // Рассчитываем позицию меню (влево и вниз от кнопки)
  setActionMenuPosition({
    lessonId: lesson.id,
    top: buttonRect.bottom,
    left: buttonRect.left,  // Пусть меню будет слева от кнопки
  });

  setSelectedLesson(lesson); // Запоминаем текущий урок для операций
  setActionMenuOpen(true);
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
            ...lesson, date: lesson.date // Убедитесь, что дата в правильном формате
        });
        setActiveTab('edit');
        setEditModalOpen(true);
        setActionMenuOpen(false);
    };

    // Обработчик удаления
    const handleDelete = (e, lessonId) => {
        if (e) e.stopPropagation();
        setConfirmationMessage('Вы уверены, что хотите удалить это занятие?');
        setConfirmationAction(() => async () => {
            try {
                await scheduleApi.deleteScheduleItem(lessonId);
                // Перезагружаем расписание
                if (loadSchedule) {
                    loadSchedule(itemId, semester, week);
                }
                setSuccess('Занятие успешно удалено');
                setTimeout(() => setSuccess(null), 3000);
            } catch (err) {
                console.error('Ошибка при удалении занятия:', err);
                setError('Произошла ошибка при удалении занятия.');
                setTimeout(() => setError(null), 3000);
            }
        });
        setConfirmationModalOpen(true);
        setActionMenuOpen(false);
    };

    // Обработчик открытия модального окна для переноса занятия
    const handleOpenMoveModal = async (e, lesson) => {
        if (e) e.stopPropagation();
        setSelectedLesson(lesson);
        setMoveModalOpen(true);
        setActionMenuOpen(false);
        setConflictHandlingOption('avoid');

        try {
            // Show loading state while fetching availability data
            setAvailableMoveOptions([]);

            // Получаем данные о доступности с проверкой конфликтов по всем параметрам
            const availabilityResponse = await scheduleApi.checkDetailedAvailability({
                semester: semester,
                week_number: week,
                lesson_id: lesson.id,
                auditory: lesson.auditory,
                teacher_name: lesson.teacher_name,
                group_name: lesson.group_name
            });

            const occupiedSlots = availabilityResponse.data.occupied_slots || [];

            // Создаем карту конфликтов для быстрого поиска
            const conflictsMap = {};
            occupiedSlots.forEach(slot => {
                const key = `${slot.weekday}_${slot.time_start}`;
                if (!conflictsMap[key]) {
                    conflictsMap[key] = [];
                }
                conflictsMap[key].push(slot);
            });

            // Генерируем список доступных вариантов для перемещения
            const options = [];

            // Для каждого дня недели
            for (let dayIndex = 1; dayIndex <= 6; dayIndex++) {
                if (currentDates[dayIndex]) {
                    // Для каждого временного слота
                    for (const slot of timeSlots) {
                        // Пропускаем текущую позицию (совпадение дня и времени)
                        if (dayIndex === lesson.weekday && slot.time_start === lesson.time_start) continue;

                        // Проверяем, есть ли конфликты для этого времени
                        const key = `${dayIndex}_${slot.time_start}`;
                        const conflicts = conflictsMap[key] || [];

                        // Группируем конфликты по типу
                        const teacherConflicts = conflicts.filter(c => c.conflict_type === 'teacher');
                        const groupConflicts = conflicts.filter(c => c.conflict_type === 'group');
                        const auditoryConflicts = conflicts.filter(c => c.conflict_type === 'auditory');

                        // Определяем, занято ли это время
                        const isOccupied = conflicts.length > 0;

                        options.push({
                            weekday: dayIndex,
                            date: currentDates[dayIndex],
                            time_start: slot.time_start,
                            time_end: slot.time_end,
                            weekdayName: WEEKDAYS_FULL[dayIndex],
                            dateFormatted: formatDate(currentDates[dayIndex]),
                            isOccupied: isOccupied,
                            conflicts: conflicts,
                            teacherConflicts: teacherConflicts,
                            groupConflicts: groupConflicts,
                            auditoryConflicts: auditoryConflicts,
                            totalConflicts: conflicts.length
                        });
                    }
                }
            }

            // Сортируем варианты - сначала без конфликтов, затем по количеству конфликтов
            const sortedOptions = options.sort((a, b) => {
                // Если один из вариантов не имеет конфликтов, а другой имеет
                if (a.isOccupied !== b.isOccupied) {
                    return a.isOccupied ? 1 : -1;
                }
                // Если оба имеют конфликты, сортируем по общему количеству конфликтов
                if (a.totalConflicts !== b.totalConflicts) {
                    return a.totalConflicts - b.totalConflicts;
                }
                // Затем сортируем по дню недели
                if (a.weekday !== b.weekday) {
                    return a.weekday - b.weekday;
                }
                // Наконец, сортируем по времени
                return a.time_start.localeCompare(b.time_start);
            });

            setAvailableMoveOptions(sortedOptions);
        } catch (err) {
            console.error('Ошибка при проверке доступности:', err);
            // Создаем варианты без информации о доступности как запасной вариант
            const options = [];

            for (let dayIndex = 1; dayIndex <= 6; dayIndex++) {
                if (currentDates[dayIndex]) {
                    for (const slot of timeSlots) {
                        if (dayIndex === lesson.weekday && slot.time_start === lesson.time_start) continue;

                        options.push({
                            weekday: dayIndex,
                            date: currentDates[dayIndex],
                            time_start: slot.time_start,
                            time_end: slot.time_end,
                            weekdayName: WEEKDAYS_FULL[dayIndex],
                            dateFormatted: formatDate(currentDates[dayIndex]),
                            isOccupied: false,
                            conflicts: [],
                            teacherConflicts: [],
                            groupConflicts: [],
                            auditoryConflicts: [],
                            totalConflicts: 0
                        });
                    }
                }
            }

            setAvailableMoveOptions(options);
        }
    };

    // Обработчик перемещения занятия
    const handleMove = async (option) => {
        // При принудительном перемещении запрашиваем подтверждение
        if (option.isOccupied && conflictHandlingOption === 'avoid') {
            // Формируем детальную информацию о конфликтах
            let conflictInfo = '';

            if (option.teacherConflicts && option.teacherConflicts.length > 0) {
                conflictInfo += `\nКонфликты по преподавателю (${option.teacherConflicts.length}): `;
                option.teacherConflicts.forEach((c, i) => {
                    conflictInfo += `\n${i + 1}. ${c.subject}, ${c.group_name}`;
                });
            }

            if (option.groupConflicts && option.groupConflicts.length > 0) {
                conflictInfo += `\nКонфликты по группе (${option.groupConflicts.length}): `;
                option.groupConflicts.forEach((c, i) => {
                    conflictInfo += `\n${i + 1}. ${c.subject}, ${c.teacher_name}`;
                });
            }

            if (option.auditoryConflicts && option.auditoryConflicts.length > 0) {
                conflictInfo += `\nКонфликты по аудитории (${option.auditoryConflicts.length}): `;
                option.auditoryConflicts.forEach((c, i) => {
                    conflictInfo += `\n${i + 1}. ${c.subject}, ${c.teacher_name}, ${c.group_name}`;
                });
            }

            setConfirmationMessage(`Выбранное время имеет конфликты:\n${option.weekdayName}, ${option.dateFormatted}, ${option.time_start}-${option.time_end}${conflictInfo}\n\nВы уверены, что хотите принудительно переместить занятие на это время?`);

            setConfirmationAction(() => async () => {
                try {
                    const updatedData = {
                        ...selectedLesson,
                        weekday: option.weekday,
                        date: option.date,
                        time_start: option.time_start,
                        time_end: option.time_end,
                        force_update: true // Устанавливаем флаг принудительного обновления
                    };

                    await scheduleApi.forceUpdateScheduleItem(selectedLesson.id, updatedData);

                    if (loadSchedule) {
                        loadSchedule(itemId, semester, week);
                    }
                    setMoveModalOpen(false);
                    setConfirmationModalOpen(false);
                    setSuccess('Занятие успешно перемещено с учетом конфликтов');
                    setTimeout(() => setSuccess(null), 3000);
                } catch (err) {
                    console.error('Ошибка при перемещении занятия:', err);
                    setError('Произошла ошибка при перемещении занятия');
                    setTimeout(() => setError(null), 3000);
                }
            });

            setConfirmationModalOpen(true);
            return;
        }

        // Перемещаем занятие без подтверждения, если нет конфликтов или выбран режим принудительного перемещения
        try {
            const updatedData = {
                ...selectedLesson,
                weekday: option.weekday,
                date: option.date,
                time_start: option.time_start,
                time_end: option.time_end,
                force_update: conflictHandlingOption === 'force' // Устанавливаем флаг принудительного обновления, если выбран соответствующий режим
            };

            // Выполняем запрос на обновление
            const response = await scheduleApi.updateScheduleItem(selectedLesson.id, updatedData);

            // Если успешно, перезагружаем расписание и закрываем модальное окно
            if (loadSchedule) {
                loadSchedule(itemId, semester, week);
            }
            setMoveModalOpen(false);
            setSuccess('Занятие успешно перемещено');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            console.error('Ошибка при перемещении занятия:', err);

            // Проверяем, является ли это ошибкой конфликта (статус 409)
            if (err.response && err.response.status === 409) {
                // Извлекаем информацию о конфликтах
                const conflictData = err.response.data;
                const conflicts = conflictData.conflicts || [];

                // Создаем более информативное сообщение об ошибке
                let errorMessage = conflictData.message || 'Произошла ошибка при перемещении занятия.';

                if (conflicts && conflicts.length > 0) {
                    // Сохраняем информацию о конфликтах для потенциального показа в модальном окне
                    setSelectedConflictDetails({
                        weekday: option.weekday,
                        date: option.date,
                        time_start: option.time_start,
                        time_end: option.time_end,
                        conflicts: conflicts
                    });

                    // Предлагаем пользователю различные способы обработки конфликта
                    setDetailedConflictsModalOpen(true);
                } else {
                    // Общее сообщение об ошибке, если детали конфликтов не получены
                    setError('Обнаружены конфликты при перемещении занятия. Выберите другое время или используйте принудительное перемещение.');
                    setTimeout(() => setError(null), 5000);
                }
            } else {
                // Общее сообщение об ошибке для других типов ошибок
                setError('Произошла ошибка при перемещении занятия.');
                setTimeout(() => setError(null), 3000);
            }
        }
    };

    // Обработчик для отображения подробной информации о конфликтах
    const handleShowDetailedConflicts = (conflicts) => {
        setSelectedConflictDetails(conflicts);
        setDetailedConflictsModalOpen(true);
    };

    // Обработчик для принудительного перемещения занятия с конфликтами
    const handleForceMove = async () => {
        if (!selectedConflictDetails) return;

        try {
            const updatedData = {
                ...selectedLesson,
                weekday: selectedConflictDetails.weekday,
                date: selectedConflictDetails.date,
                time_start: selectedConflictDetails.time_start,
                time_end: selectedConflictDetails.time_end,
                force_update: true // Устанавливаем флаг принудительного обновления
            };

            await scheduleApi.forceUpdateScheduleItem(selectedLesson.id, updatedData);

            if (loadSchedule) {
                loadSchedule(itemId, semester, week);
            }
            setDetailedConflictsModalOpen(false);
            setMoveModalOpen(false);
            setSuccess('Занятие успешно перемещено с принудительной заменой');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            console.error('Ошибка при принудительном перемещении занятия:', err);
            setError('Произошла ошибка при принудительном перемещении занятия');
            setTimeout(() => setError(null), 3000);
        }
    };

    // Обработчик для открытия модального окна обмена занятиями
    const handleOpenSwapModal = async (e, lesson) => {
        if (e) e.stopPropagation();
        setSelectedLesson(lesson);
        setSwapModalOpen(true);
        setActionMenuOpen(false);

        try {
            // Загружаем все занятия, которые можно обменять
            const response = await scheduleApi.getAllSchedule({
                semester: semester, week_number: week
            });

            const allLessons = response.data || [];

            // Фильтруем занятия - исключаем текущее занятие и те, что совпадают по времени
            const swapOptions = allLessons.filter(l => l.id !== lesson.id && !(l.weekday === lesson.weekday && l.time_start === lesson.time_start));

            // Анализируем конфликты для каждого варианта обмена
            const processedOptions = swapOptions.map(option => {
                // Проверяем конфликты для первого занятия во времени второго
                const firstLessonConflicts = {
                    teacher: option.teacher_name === lesson.teacher_name,
                    group: option.group_name === lesson.group_name,
                    auditory: option.auditory === lesson.auditory
                };

                // Проверяем конфликты для второго занятия во времени первого
                const secondLessonConflicts = {
                    teacher: false, group: false, auditory: false
                };

                // Найдем все занятия в то же время, что и первое (помимо него самого)
                const lessonTimeClashes = allLessons.filter(l => l.id !== lesson.id && l.weekday === lesson.weekday && l.time_start === lesson.time_start);

                // Проверяем конфликты со вторым занятием
                lessonTimeClashes.forEach(clash => {
                    if (clash.teacher_name === option.teacher_name) secondLessonConflicts.teacher = true;
                    if (clash.group_name === option.group_name) secondLessonConflicts.group = true;
                    if (clash.auditory === option.auditory) secondLessonConflicts.auditory = true;
                });

                return {
                    ...option,
                    firstLessonConflicts,
                    secondLessonConflicts,
                    totalConflicts: (firstLessonConflicts.teacher ? 1 : 0) + (firstLessonConflicts.group ? 1 : 0) + (firstLessonConflicts.auditory ? 1 : 0) + (secondLessonConflicts.teacher ? 1 : 0) + (secondLessonConflicts.group ? 1 : 0) + (secondLessonConflicts.auditory ? 1 : 0)
                };
            });

            // Сортируем варианты по количеству конфликтов, дню недели и времени
            const sortedOptions = processedOptions.sort((a, b) => {
                if (a.totalConflicts !== b.totalConflicts) {
                    return a.totalConflicts - b.totalConflicts;
                }
                if (a.weekday !== b.weekday) {
                    return a.weekday - b.weekday;
                }
                return a.time_start.localeCompare(b.time_start);
            });

            setAvailableSwapOptions(sortedOptions);
        } catch (err) {
            console.error('Ошибка при загрузке вариантов для обмена:', err);
            setAvailableSwapOptions([]);
        }
    };

    // Обработчик для выбора занятия для обмена
    const handleSelectLessonForSwap = (lesson) => {
        setSelectedLessonForSwap(lesson);
        setConfirmationMessage(`Вы уверены, что хотите обменять местами занятия:\n\n1. ${selectedLesson.subject} (${selectedLesson.group_name}, ${selectedLesson.teacher_name})\n2. ${lesson.subject} (${lesson.group_name}, ${lesson.teacher_name})`);

        setConfirmationAction(() => async () => {
            try {
                await scheduleApi.swapLessons(selectedLesson.id, lesson.id, true, // Обмен местами аудиторий тоже
                    true  // Принудительный обмен при наличии конфликтов
                );

                if (loadSchedule) {
                    loadSchedule(itemId, semester, week);
                }
                setSwapModalOpen(false);
                setConfirmationModalOpen(false);
                setSuccess('Занятия успешно обменены местами');
                setTimeout(() => setSuccess(null), 3000);
            } catch (err) {
                console.error('Ошибка при обмене занятий:', err);
                setError('Произошла ошибка при обмене занятий');
                setTimeout(() => setError(null), 3000);
            }
        });

        setConfirmationModalOpen(true);
    };

    // Обработчик для поиска оптимального времени
    const handleFindOptimalTime = async (e, lesson) => {
        if (e) e.stopPropagation();
        setSelectedLesson(lesson);
        setOptimalTimeModalOpen(true);
        setActionMenuOpen(false);

        try {
            // Получаем оптимальные варианты для перемещения занятия
            const response = await scheduleApi.findOptimalTime(lesson.id, semester, week);

            // Устанавливаем полученные варианты
            setOptimalTimeOptions(response.data.options || []);
        } catch (err) {
            console.error('Ошибка при поиске оптимального времени:', err);

            // Создаем пустой список вариантов при ошибке
            setOptimalTimeOptions([]);
            setError('Произошла ошибка при поиске оптимального времени для занятия');
            setTimeout(() => setError(null), 3000);
        }
    };

    // Обработчик выбора оптимального времени
    const handleSelectOptimalTime = (option) => {
        // Проверяем, есть ли конфликты
        if (option.conflicts && option.conflicts.length > 0) {
            setConfirmationMessage(`Выбранное время имеет ${option.conflicts.length} конфликт(ов). Вы уверены, что хотите переместить занятие?`);

            setConfirmationAction(() => async () => {
                try {
                    const updatedData = {
                        ...selectedLesson,
                        weekday: option.weekday,
                        date: option.date,
                        time_start: option.time_start,
                        time_end: option.time_end,
                        force_update: true
                    };

                    await scheduleApi.forceUpdateScheduleItem(selectedLesson.id, updatedData);

                    if (loadSchedule) {
                        loadSchedule(itemId, semester, week);
                    }
                    setOptimalTimeModalOpen(false);
                    setConfirmationModalOpen(false);
                    setSuccess('Занятие успешно перемещено');
                    setTimeout(() => setSuccess(null), 3000);
                } catch (err) {
                    console.error('Ошибка при перемещении занятия:', err);
                    setError('Произошла ошибка при перемещении занятия');
                    setTimeout(() => setError(null), 3000);
                }
            });

            setConfirmationModalOpen(true);
        } else {
            // Если нет конфликтов, перемещаем без подтверждения
            handleMove(option);
            setOptimalTimeModalOpen(false);
        }
    };

    // Обработчик изменения данных формы редактирования
    const handleEditFormChange = (e) => {
        const {name, value} = e.target;
        setEditFormData(prev => ({
            ...prev, [name]: value
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
            setSuccess('Занятие успешно обновлено');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            console.error('Ошибка при сохранении занятия:', err);

            // Проверяем, является ли это ошибкой конфликта
            if (err.response && err.response.status === 409) {
                const conflictData = err.response.data;

                // Предлагаем пользователю принудительное сохранение
                setError('Обнаружены конфликты при сохранении. Изменения могут затронуть другие занятия.');

                // Создаем новую кнопку для принудительного сохранения
                const formWithForce = {
                    ...editFormData, force_update: true
                };

                // Добавляем функцию для принудительного сохранения
                setConfirmationMessage('Вы уверены, что хотите принудительно сохранить изменения? Это может создать конфликты с другими занятиями.');

                setConfirmationAction(() => async () => {
                    try {
                        await scheduleApi.forceUpdateScheduleItem(selectedLesson.id, formWithForce);

                        if (loadSchedule) {
                            loadSchedule(itemId, semester, week);
                        }

                        setEditModalOpen(false);
                        setConfirmationModalOpen(false);
                        setSuccess('Занятие успешно обновлено с принудительной заменой');
                        setTimeout(() => setSuccess(null), 3000);
                    } catch (err) {
                        console.error('Ошибка при принудительном сохранении занятия:', err);
                        setError('Произошла ошибка при принудительном сохранении занятия');
                        setTimeout(() => setError(null), 3000);
                    }
                });
            } else {
                setError('Произошла ошибка при сохранении. Проверьте правильность заполнения полей.');
            }
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
            setSuccess('Занятие успешно создано');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            console.error('Ошибка при создании занятия:', err);

            // Проверяем, является ли это ошибкой конфликта
            if (err.response && err.response.status === 409) {
                setError('Обнаружены конфликты при создании занятия. Выберите другое время или используйте принудительное создание.');

                // Добавляем функцию для принудительного создания
                setConfirmationMessage('Вы уверены, что хотите принудительно создать занятие? Это может создать конфликты с другими занятиями.');

                setConfirmationAction(() => async () => {
                    try {
                        const formWithForce = {
                            ...editFormData, force_update: true
                        };

                        await scheduleApi.createScheduleItem(formWithForce);

                        if (loadSchedule) {
                            loadSchedule(itemId, semester, week);
                        }

                        setEditModalOpen(false);
                        setConfirmationModalOpen(false);
                        setSuccess('Занятие успешно создано с принудительной заменой');
                        setTimeout(() => setSuccess(null), 3000);
                    } catch (err) {
                        console.error('Ошибка при принудительном создании занятия:', err);
                        setError('Произошла ошибка при принудительном создании занятия');
                        setTimeout(() => setError(null), 3000);
                    }
                });
            } else {
                setError('Произошла ошибка при создании занятия. Проверьте правильность заполнения полей.');
            }
        } finally {
            setSaving(false);
        }
    };

    // Если идет загрузка данных, показываем индикатор загрузки
    if (loading || timeSlotsLoading) {
        return (<LoadingIndicator>
            <LoadingIcon/>
            {loading ? 'Загрузка расписания...' : 'Загрузка временных слотов...'}
        </LoadingIndicator>);
    }

    // Функция для определения, имеет ли занятие конфликты
    const hasConflict = (lesson) => {
        // Здесь может быть логика проверки конфликтов
        // Например, по специальному полю в данных
        return lesson.has_conflicts === true;
    };

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
        const lessonIndex = timeSlots.findIndex(slot => slot.time_start === lesson.time_start && slot.time_end === lesson.time_end);

        if (lessonIndex !== -1 && lesson.weekday >= 1 && lesson.weekday <= 6) {
            scheduleData[lesson.weekday][lessonIndex].push(lesson);
        }
    });

    // Применяем группировку занятий
    for (let weekday = 1; weekday <= 6; weekday++) {
        for (let lessonIndex = 0; lessonIndex < timeSlots.length; lessonIndex++) {
            scheduleData[weekday][lessonIndex] = groupLessons(scheduleData[weekday][lessonIndex], view);
        }
    }

    return (<>
            {success && (<AlertBox type="success">
                <SuccessIcon/>
                {success}
            </AlertBox>)}

            {error && (<AlertBox type="error">
                <ErrorIcon/>
                {error}
            </AlertBox>)}

            <ScheduleContainer>
                <ScheduleGrid>
                    {/* Заголовок с днями недели */}
                    <ScheduleHeaderCell/>
                    {WEEKDAYS.filter((_, index) => index > 0).map((day, index) => (<ScheduleWeekdayHeader key={index}>
                        <strong>{day}</strong>
                        <span>{currentDates[index + 1] ? formatDate(currentDates[index + 1]) : ''}</span>
                    </ScheduleWeekdayHeader>))}

                    {/* Строки с временем занятий */}
                    {timeSlots.map((slot, timeIndex) => (<React.Fragment key={timeIndex}>
                        {/* Ячейка времени */}
                        <ScheduleTimeCell>
                            <strong>{slot.time_start}</strong>
                            <small>{slot.time_end}</small>
                        </ScheduleTimeCell>

                        {/* Ячейки занятий */}
                        {Array.from({length: 6}, (_, dayIndex) => dayIndex + 1).map(weekday => {
                            const lessons = scheduleData[weekday][timeIndex] || [];

                            return (<ScheduleCellWrapper
                                key={`${weekday}-${timeIndex}`}
                                onClick={() => isEditable && handleCreateLesson(weekday, timeIndex)}
                                style={{cursor: isEditable ? 'pointer' : 'default'}}
                            >
                                {lessons.length > 0 ? (lessons.map((lesson, index) => {
                                    const cellColor = getLessonTypeColor(lesson.lesson_type);
                                    const borderColor = getDarkerColor(cellColor);
                                    const hasLessonConflict = hasConflict(lesson);

                                    // Формируем текст для значка типа занятия с подгруппой
                                    const lessonTypeText = lesson.lesson_type + (lesson.subgroup > 0 ? ` (п/г ${lesson.subgroup})` : '');

                                    return (<ScheduleCell
                                        key={index}
                                        color={cellColor}
                                        borderColor={borderColor}
                                        onClick={(e) => {
                                            e.stopPropagation(); // Предотвращаем срабатывание родительского onClick
                                            handleOpenModal(lesson, e);
                                        }}
                                        canEdit={isEditable}
                                        hasConflict={hasLessonConflict}
                                    >
                                        <Subject>
                                            {lesson.subject}
                                            {hasLessonConflict && (<span
                                                style={{color: colors.danger, marginLeft: '4px'}}>*</span>)}
                                        </Subject>

                                        {view !== 'group' && (lesson.group_names?.length > 0 || lesson.group_name) && (
                                            <ClickableInfo onClick={(e) => {
                                                e.stopPropagation();
                                                // Если есть несколько групп, используем первую для навигации
                                                const groupToNav = lesson.group_names?.length > 0 ? lesson.group_names[0] : lesson.group_name;
                                                handleGroupClick(groupToNav, e);
                                            }}>
                                                <GroupIcon/>
                                                <span>
                                  {lesson.group_names?.length > 0 ? (lesson.group_names.length > 1 ? `${lesson.group_names[0]} +${lesson.group_names.length - 1}` : lesson.group_names[0]) : lesson.group_name}
                                </span>
                                            </ClickableInfo>)}

                                        {view !== 'teacher' && lesson.teacher_name && (<ClickableInfo onClick={(e) => {
                                            e.stopPropagation();
                                            handleTeacherClick(lesson.teacher_name, e);
                                        }}>
                                            <TeacherIcon/>
                                            <span>{lesson.teacher_name}</span>
                                        </ClickableInfo>)}

                                        {view !== 'auditory' && (lesson.auditories?.length > 0 || lesson.auditory) && (
                                            <ClickableInfo onClick={(e) => {
                                                e.stopPropagation();
                                                // Если есть несколько аудиторий, используем первую для навигации
                                                const auditoryToNav = lesson.auditories?.length > 0 ? lesson.auditories[0] : lesson.auditory;
                                                handleAuditoryClick(auditoryToNav, e);
                                            }}>
                                                <LocationIcon/>
                                                <span>
                                  {lesson.auditories?.length > 0 ? (lesson.auditories.length > 1 ? `${lesson.auditories[0]} +${lesson.auditories.length - 1}` : lesson.auditories[0]) : lesson.auditory}
                                </span>
                                            </ClickableInfo>)}

                                        {/* Отображение конфликтов, если они есть */}
                                        {hasLessonConflict && (<ConflictInfo>
                                            <ConflictIcon/>
                                            <span>Конфликт расписания</span>
                                        </ConflictInfo>)}

                                        {lesson.lesson_type && (<Badge>
                                            {lessonTypeText}
                                        </Badge>)}

                                        {/* Показ значков конфликтов */}
                                        {hasLessonConflict && (<div style={{
                                            display: 'flex', marginTop: 'auto', marginBottom: '4px'
                                        }}>
                                            <ConflictBadge type="teacher">П</ConflictBadge>
                                            <ConflictBadge type="group">Г</ConflictBadge>
                                            <ConflictBadge type="auditory">А</ConflictBadge>
                                        </div>)}

                                        {/* Кнопка перетаскивания для перемещения занятия */}
                                        {isEditable && (<DragHandleIcon onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenMoveModal(e, lesson);
                                        }}>
                                            <DragIcon/>
                                        </DragHandleIcon>)}

                                        {/* Кнопка действий (три точки) для авторизованных пользователей */}
                                        {isEditable && (<ActionButton
                                            onClick={(e) => handleOpenActionMenu(e, lesson)}
                                            title="Действия"
                                            className="action-button"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                                                 viewBox="0 0 24 24" fill="none" stroke="#666"
                                                 strokeWidth="2" strokeLinecap="round"
                                                 strokeLinejoin="round">
                                                <circle cx="12" cy="12" r="1"></circle>
                                                <circle cx="19" cy="12" r="1"></circle>
                                                <circle cx="5" cy="12" r="1"></circle>
                                            </svg>
                                        </ActionButton>)}

                                        {/* Меню действий */}
                                        {actionMenuOpen && selectedLesson && (
  <ActionMenuPortal
    isOpen={actionMenuOpen}
    position={actionMenuPosition}
    onClose={handleCloseActionMenu}
  >
    <MenuItem onClick={(e) => handleEdit(e, selectedLesson)}>
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
      </svg>
      Редактировать
    </MenuItem>
    <MenuItem onClick={(e) => handleOpenMoveModal(e, selectedLesson)}>
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
    <MenuItem onClick={(e) => handleOpenSwapModal(e, selectedLesson)}>
      <SwapIcon />
      Обменять
    </MenuItem>
    <MenuItem onClick={(e) => handleFindOptimalTime(e, selectedLesson)}>
      <OptimalTimeIcon />
      Найти оптимальное время
    </MenuItem>
    <MenuItem danger onClick={(e) => handleDelete(e, selectedLesson.id)}>
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        <line x1="10" y1="11" x2="10" y2="17"></line>
        <line x1="14" y1="11" x2="14" y2="17"></line>
      </svg>
      Удалить
    </MenuItem>
  </ActionMenuPortal>
)}
                                    </ScheduleCell>);
                                })) : (<ScheduleCell empty/>)}
                            </ScheduleCellWrapper>);
                        })}
                    </React.Fragment>))}
                </ScheduleGrid>
            </ScheduleContainer>

            {/* Модальное окно с подробной информацией */}
            {modalOpen && selectedLesson && (<ModalOverlay onClick={handleCloseModal}>
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
                                <br/>
                                {selectedLesson.time_start} - {selectedLesson.time_end}
                            </ModalValue>
                        </ModalRow>

                        {/* Показываем группы */}
                        {selectedLesson.group_names?.length > 0 ? (<ModalRow>
                            <ModalLabel>Группы</ModalLabel>
                            <ModalValue>
                                {selectedLesson.group_names.map((group, idx) => (
                                    <ClickableInfo key={idx} onClick={(e) => handleGroupClick(group, e)}>
                                        <GroupIcon/>
                                        <span>{group}</span>
                                    </ClickableInfo>))}
                            </ModalValue>
                        </ModalRow>) : selectedLesson.group_name ? (<ModalRow>
                            <ModalLabel>Группа</ModalLabel>
                            <ModalValue>
                                <ClickableInfo onClick={(e) => handleGroupClick(selectedLesson.group_name, e)}>
                                    <GroupIcon/>
                                    <span>{selectedLesson.group_name}</span>
                                </ClickableInfo>
                            </ModalValue>
                        </ModalRow>) : null}
                        {selectedLesson.teacher_name && (<ModalRow>
                            <ModalLabel>Преподаватель</ModalLabel>
                            <ModalValue>
                                <ClickableInfo onClick={(e) => handleTeacherClick(selectedLesson.teacher_name, e)}>
                                    <TeacherIcon/>
                                    <span>{selectedLesson.teacher_name}</span>
                                </ClickableInfo>
                            </ModalValue>
                        </ModalRow>)}
                        {/* Показываем аудитории */}
                        {selectedLesson.auditories?.length > 0 ? (<ModalRow>
                            <ModalLabel>Аудитории</ModalLabel>
                            <ModalValue>
                                {selectedLesson.auditories.map((auditory, idx) => (
                                    <ClickableInfo key={idx} onClick={(e) => handleAuditoryClick(auditory, e)}>
                                        <LocationIcon/>
                                        <span>{auditory}</span>
                                    </ClickableInfo>))}
                            </ModalValue>
                        </ModalRow>) : selectedLesson.auditory ? (<ModalRow>
                            <ModalLabel>Аудитория</ModalLabel>
                            <ModalValue>
                                <ClickableInfo onClick={(e) => handleAuditoryClick(selectedLesson.auditory, e)}>
                                    <LocationIcon/>
                                    <span>{selectedLesson.auditory}</span>
                                </ClickableInfo>
                            </ModalValue>
                        </ModalRow>) : null}
                        {selectedLesson.faculty && (<ModalRow>
                            <ModalLabel>Факультет</ModalLabel>
                            <ModalValue>{selectedLesson.faculty}</ModalValue>
                        </ModalRow>)}
                        <ModalRow>
                            <ModalLabel>Семестр / Неделя / Курс</ModalLabel>
                            <ModalValue>
                                {selectedLesson.semester} семестр / {selectedLesson.week_number} неделя
                                / {selectedLesson.course} курс
                            </ModalValue>
                        </ModalRow>

                        {hasConflict(selectedLesson) && (<ModalRow>
                            <ModalLabel>Конфликты</ModalLabel>
                            <ModalValue style={{color: colors.danger}}>
                                <div style={{display: 'flex', alignItems: 'center', margin: '4px 0'}}>
                                    <ConflictIcon style={{marginRight: '8px'}}/>
                                    <span>Обнаружены конфликты с другими занятиями</span>
                                </div>
                                {/ Здесь можно добавить подробную информацию о конфликтах */}
                            </ModalValue>
                        </ModalRow>)}
                        {/* Кнопки действий для авторизованных пользователей */}
                        {isEditable && (<ButtonRow>
                            <ActionModalButton
                                secondary
                                onClick={handleCloseModal}
                            >
                                Закрыть
                            </ActionModalButton>
                            <div>
                                <ActionModalButton
                                    onClick={(e) => handleEdit(e, selectedLesson)}
                                    style={{marginRight: '8px'}}
                                >
                                    Редактировать
                                </ActionModalButton>
                                <ActionModalButton
                                    onClick={(e) => handleOpenMoveModal(e, selectedLesson)}
                                >
                                    Перенести
                                </ActionModalButton>
                            </div>
                        </ButtonRow>)}
                    </ModalContent>
                </ModalOverlay>)}
            {/* Модальное окно для редактирования/создания занятия */}
            {editModalOpen && (<ModalOverlay onClick={() => setEditModalOpen(false)}>
                <EditModal onClick={(e) => e.stopPropagation()}>
                    <ModalHeader>
                        <ModalTitle>
                            {selectedLesson ? 'Редактирование занятия' : 'Создание нового занятия'}
                        </ModalTitle>
                        <CloseButton onClick={() => setEditModalOpen(false)}>×</CloseButton>
                    </ModalHeader><TabRow>
                    {selectedLesson && (<Tab
                        active={activeTab === 'info'}
                        onClick={() => setActiveTab('info')}
                    >
                        Информация
                    </Tab>)}
                    <Tab
                        active={activeTab === 'edit'}
                        onClick={() => setActiveTab('edit')}
                    >
                        {selectedLesson ? 'Редактирование' : 'Создание'}
                    </Tab>
                </TabRow>

                    {activeTab === 'info' && selectedLesson && (<div>
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
                                <br/>
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
                    </div>)}

                    {activeTab === 'edit' && (<form onSubmit={selectedLesson ? handleSaveEdit : handleCreateNewLesson}>
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

                        <div style={{display: 'flex', gap: '16px'}}>
                            <FormGroup style={{flex: 1}}>
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
                                    <option value="экз.">Экзамен</option>
                                    <option value="зач.">Зачёт</option>
                                </select>
                            </FormGroup>

                            <FormGroup style={{flex: 1}}>
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
                                    <option value={3}>Подгруппа 3</option>
                                </select>
                            </FormGroup>
                        </div>

                        <div style={{display: 'flex', gap: '16px'}}>
                            <FormGroup style={{flex: 1}}>
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

                            <FormGroup style={{flex: 1}}>
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

                        <div style={{display: 'flex', gap: '16px'}}>
                            <FormGroup style={{flex: 1}}>
                                <label htmlFor="time_start">Начало *</label>
                                <select
                                    id="time_start"
                                    name="time_start"
                                    value={editFormData.time_start || ''}
                                    onChange={handleEditFormChange}
                                    required
                                >
                                    {timeSlots.map(slot => (<option key={`start_${slot.id}`} value={slot.time_start}>
                                        {slot.time_start}
                                    </option>))}
                                </select>
                            </FormGroup>

                            <FormGroup style={{flex: 1}}>
                                <label htmlFor="time_end">Окончание *</label>
                                <select
                                    id="time_end"
                                    name="time_end"
                                    value={editFormData.time_end || ''}
                                    onChange={handleEditFormChange}
                                    required
                                >
                                    {timeSlots.map(slot => (<option key={`end_${slot.id}`} value={slot.time_end}>
                                        {slot.time_end}
                                    </option>))}
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

                        <div style={{display: 'flex', gap: '16px'}}>
                            <FormGroup style={{flex: 1}}>
                                <label htmlFor="course">Курс *</label>
                                <select
                                    id="course"
                                    name="course"
                                    value={editFormData.course || 1}
                                    onChange={handleEditFormChange}
                                    required
                                >
                                    {[1, 2, 3, 4, 5, 6].map(num => (<option key={num} value={num}>{num} курс</option>))}
                                </select>
                            </FormGroup>

                            <FormGroup style={{flex: 1}}>
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

                        {error && (<div style={{color: colors.danger, marginBottom: '16px', fontSize: '14px'}}>
                            {error}
                            {error.includes('конфликты') && (<div style={{marginTop: '8px'}}>
                                <ActionModalButton
                                    type="button"
                                    warning
                                    onClick={() => {
                                        setConfirmationModalOpen(true);
                                    }}
                                    style={{fontSize: '12px', padding: '4px 8px'}}
                                >
                                    Принудительное сохранение
                                </ActionModalButton>
                            </div>)}
                        </div>)}

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
                    </form>)}</EditModal>
            </ModalOverlay>)}
            {/* Модальные окна для других операций: переноса, обмена, и т.д. /}
{/ Модальное окно для переноса занятия */}
            {moveModalOpen && selectedLesson && (<ModalOverlay onClick={() => setMoveModalOpen(false)}>
                <MoveModal onClick={(e) => e.stopPropagation()}>
                    <ModalHeader>
                        <ModalTitle>Перенос занятия</ModalTitle>
                        <CloseButton onClick={() => setMoveModalOpen(false)}>×</CloseButton>
                    </ModalHeader>
                    <div style={{marginBottom: '16px'}}>
                        <strong style={{fontSize: '16px'}}>{selectedLesson.subject}</strong>
                        <div style={{marginTop: '4px', fontSize: '14px', color: colors.gray}}>
                            {WEEKDAYS_FULL[selectedLesson.weekday]}, {formatFullDate(selectedLesson.date)}, {selectedLesson.time_start}-{selectedLesson.time_end}
                        </div>
                    </div>

                    <div style={{marginBottom: '16px'}}>
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'
                        }}>
                            <div style={{fontWeight: '500', marginBottom: '0'}}>Выберите новое время:</div>

                            <div style={{display: 'flex', gap: '8px'}}>
                                <select
                                    value={conflictHandlingOption}
                                    onChange={(e) => setConflictHandlingOption(e.target.value)}
                                    style={{
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        border: '1px solid #ddd',
                                        fontSize: '12px'
                                    }}
                                >
                                    <option value="avoid">Избегать конфликтов</option>
                                    <option value="force">Принудительное перемещение</option>
                                </select>
                            </div>
                        </div>

                        {availableMoveOptions.length === 0 ? (
                            <div style={{textAlign: 'center', padding: '20px 0', color: colors.gray}}>
                                <div>Загрузка вариантов...</div>
                                <div style={{marginTop: '10px'}}>
                                    <LoadingSpinner/>
                                </div>
                            </div>) : (<div>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '10px'
                            }}>
                                <div>
          <span style={{
              display: 'inline-block',
              width: '12px',
              height: '12px',
              backgroundColor: 'white',
              border: `1px solid ${colors.lightGray}`,
              borderRadius: '3px',
              marginRight: '5px'
          }}></span>
                                    <span style={{fontSize: '12px', color: colors.gray}}>Доступно</span>
                                </div>
                                <div>
          <span style={{
              display: 'inline-block',
              width: '12px',
              height: '12px',
              backgroundColor: '#FFF5F5',
              border: `1px solid ${colors.danger}`,
              borderRadius: '3px',
              marginRight: '5px'
          }}></span>
                                    <span style={{fontSize: '12px', color: colors.gray}}>Занято</span>
                                </div>
                            </div>

                            <div style={{maxHeight: '300px', overflowY: 'auto'}}>
                                {availableMoveOptions.map((option, index) => (<MoveOption
                                    key={index}
                                    isOccupied={option.isOccupied}
                                    onClick={() => handleMove(option)}
                                >
                                    {option.isOccupied && (<OccupiedBadge>
                                        {option.totalConflicts > 1 ? `${option.totalConflicts} конфликтов` : 'Занято'}
                                    </OccupiedBadge>)}
                                    <strong>{option.weekdayName}, {option.dateFormatted}</strong>
                                    <div>{option.time_start} - {option.time_end}</div>

                                    {option.isOccupied && (<ConflictsList>
                                        <div style={{fontWeight: '500', marginBottom: '4px'}}>Конфликты:</div>

                                        {/* Показываем конфликты по преподавателю */}
                                        {option.teacherConflicts?.length > 0 && (<ConflictItem type="teacher">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"
                                                 viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                 strokeWidth="2"
                                                 strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                                <circle cx="12" cy="7" r="4"></circle>
                                            </svg>
                                            <div>
                                                <ConflictTypeTag
                                                    type="teacher">Преподаватель</ConflictTypeTag>
                                                <span>
                        {option.teacherConflicts.length === 1 ? `${option.teacherConflicts[0].subject} (${option.teacherConflicts[0].group_name})` : `${option.teacherConflicts.length} занятий`}
                      </span>
                                            </div>
                                        </ConflictItem>)}

                                        {/* Показываем конфликты по группе */}
                                        {option.groupConflicts?.length > 0 && (<ConflictItem type="group">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"
                                                 viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                 strokeWidth="2"
                                                 strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                                <circle cx="9" cy="7" r="4"></circle>
                                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                            </svg>
                                            <div>
                                                <ConflictTypeTag type="group">Группа</ConflictTypeTag>
                                                <span>
                        {option.groupConflicts.length === 1 ? `${option.groupConflicts[0].subject} (${option.groupConflicts[0].teacher_name})` : `${option.groupConflicts.length} занятий`}
                      </span>
                                            </div>
                                        </ConflictItem>)}

                                        {/* Показываем конфликты по аудитории */}
                                        {option.auditoryConflicts?.length > 0 && (<ConflictItem type="auditory">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"
                                                 viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                 strokeWidth="2"
                                                 strokeLinecap="round" strokeLinejoin="round">
                                                <path
                                                    d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                                <circle cx="12" cy="10" r="3"></circle>
                                            </svg>
                                            <div>
                                                <ConflictTypeTag type="auditory">Аудитория</ConflictTypeTag>
                                                <span>
                        {option.auditoryConflicts.length === 1 ? `${option.auditoryConflicts[0].subject} (${option.auditoryConflicts[0].teacher_name})` : `${option.auditoryConflicts.length} занятий`}
                      </span>
                                            </div>
                                        </ConflictItem>)}
                                    </ConflictsList>)}
                                </MoveOption>))}
                            </div>
                        </div>)}
                    </div>

                    <ButtonRow>
                        <ActionModalButton
                            secondary
                            onClick={() => setMoveModalOpen(false)}
                        >
                            Отмена
                        </ActionModalButton>
                    </ButtonRow></MoveModal>
            </ModalOverlay>)}
            {/* Остальные модальные окна... /}
{/ Модальное окно для подтверждения действий */}
            {confirmationModalOpen && (<ModalOverlay onClick={() => setConfirmationModalOpen(false)}>
                <ConfirmationModal onClick={(e) => e.stopPropagation()}>
                    <ModalHeader>
                        <ModalTitle>Подтверждение</ModalTitle>
                        <CloseButton onClick={() => setConfirmationModalOpen(false)}>×</CloseButton>
                    </ModalHeader>
                    <div style={{
                        margin: '20px 0', whiteSpace: 'pre-line', textAlign: 'left', fontSize: '14px'
                    }}>
                        {confirmationMessage}
                    </div>

                    <ButtonRow>
                        <ActionModalButton
                            secondary
                            onClick={() => setConfirmationModalOpen(false)}
                        >
                            Отмена
                        </ActionModalButton>

                        <ActionModalButton
                            danger
                            onClick={() => {
                                setConfirmationModalOpen(false);
                                if (confirmationAction) {
                                    confirmationAction();
                                }
                            }}
                        >
                            Подтверждаю
                        </ActionModalButton>
                    </ButtonRow></ConfirmationModal>
            </ModalOverlay>)}
        </>)

}

export default ScheduleTable;