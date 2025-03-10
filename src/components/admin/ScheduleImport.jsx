import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import {
  Button,
  Card,
  Title,
  Select,
  FormGroup,
  FormLabel,
  ErrorMessage,
  colors
} from '../common/StyledComponents';
import { scheduleApi } from '../../api/api';

// Стилизованные компоненты для страницы импорта
const ImportContainer = styled.div`
  margin-bottom: 30px;
`;

const StepTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #333;
  display: flex;
  align-items: center;
  
  span {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background-color: ${colors.primary};
    color: white;
    border-radius: 50%;
    margin-right: 12px;
    font-size: 16px;
  }
`;

const StepCard = styled(Card)`
  margin-bottom: 20px;
  padding: 20px;
`;

const FileUploadContainer = styled.div`
  border: 2px dashed ${colors.lightGray};
  border-radius: 12px;
  padding: 30px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: ${colors.secondary};
    background-color: rgba(0, 122, 255, 0.02);
  }
  
  &.active {
    border-color: ${colors.primary};
    background-color: rgba(0, 122, 255, 0.05);
  }
`;

const FileUploadIcon = styled.div`
  width: 60px;
  height: 60px;
  margin: 0 auto 16px;
  color: ${colors.gray};
  
  svg {
    width: 100%;
    height: 100%;
  }
  
  &.active {
    color: ${colors.primary};
  }
`;

const FileUploadText = styled.div`
  margin-bottom: 16px;
  color: #666;
  
  strong {
    color: ${colors.primary};
    font-weight: 500;
  }
`;

const FileInfo = styled.div`
  margin-top: 20px;
`;

const FileList = styled.ul`
  list-style-type: none;
  padding: 0;
  margin: 0;
`;

const FileItem = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background-color: #f9f9f9;
  border-radius: 8px;
  margin-bottom: 8px;
  
  svg {
    color: ${colors.gray};
    margin-right: 8px;
  }
`;

const FileItemName = styled.div`
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 12px;
`;

const RemoveButton = styled.button`
  background: none;
  border: none;
  color: ${colors.danger};
  cursor: pointer;
  padding: 4px;
  
  &:hover {
    color: #d32f2f; /* Более темный оттенок красного */
  }
`;

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid rgba(0, 122, 255, 0.2);
  border-radius: 50%;
  border-top-color: ${colors.primary};
  animation: spin 1s ease-in-out infinite;
  margin-right: 8px;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const WeeksList = styled.div`
  margin-top: 20px;
`;

const WeekItem = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background-color: #f9f9f9;
  border-radius: 8px;
  margin-bottom: 8px;
  
  &:nth-child(odd) {
    background-color: #f5f5f5;
  }
`;

const WeekInfo = styled.div`
  flex: 1;
  
  h4 {
    margin: 0 0 4px 0;
    font-size: 16px;
    font-weight: 500;
  }
  
  p {
    margin: 0;
    font-size: 14px;
    color: #666;
  }
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  margin-right: 16px;
  cursor: pointer;
`;

const StatusBadge = styled.span`
  display: inline-block;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  color: white;
  background-color: ${props => props.color || colors.primary};
  margin-left: 10px;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background-color: #e0e0e0;
  border-radius: 4px;
  margin-top: 20px;
  overflow: hidden;
  
  div {
    height: 100%;
    background-color: ${colors.primary};
    width: ${props => props.progress || 0}%;
    transition: width 0.3s ease;
  }
`;

// Новые компоненты для отображения проблем
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
  width: 800px;
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

const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
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

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 16px;
`;

const Th = styled.th`
  padding: 10px;
  text-align: left;
  background-color: #f5f5f5;
  border-bottom: 1px solid #ddd;
  font-weight: 500;
`;

const Td = styled.td`
  padding: 10px;
  border-bottom: 1px solid #eee;
  font-size: 14px;
`;

const TabRow = styled.div`
  display: flex;
  border-bottom: 1px solid ${colors.lightGray};
  margin-bottom: 16px;
`;

const Tab = styled.div`
  padding: 8px 16px;
  cursor: pointer;
  border-bottom: 2px solid ${props => props.active ? colors.primary : 'transparent'};
  color: ${props => props.active ? colors.primary : colors.gray};
  font-weight: ${props => props.active ? '500' : 'normal'};
  
  &:hover {
    color: ${colors.primary};
  }
`;

const AlertBox = styled.div`
  padding: 12px 16px;
  margin: 16px 0;
  border-radius: 8px;
  background-color: ${props => props.type === 'warning' ? '#FFF8E8' : props.type === 'error' ? '#FFEAEF' : '#E3F9E5'};
  border: 1px solid ${props => props.type === 'warning' ? '#FFE1A5' : props.type === 'error' ? '#FFAFBF' : '#A1E5A5'};
  color: ${props => props.type === 'warning' ? '#945700' : props.type === 'error' ? '#B30021' : '#1E7F24'};
  display: flex;
  align-items: flex-start;
  
  svg {
    min-width: 20px;
    margin-right: 10px;
    margin-top: 2px;
  }
`;

const StatBlock = styled.div`
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
`;

const StatItem = styled.div`
  flex: 1;
  min-width: 140px;
  
  .stat-label {
    font-size: 12px;
    color: ${colors.gray};
    margin-bottom: 4px;
  }
  
  .stat-value {
    font-size: 24px;
    font-weight: 500;
    color: ${props => props.color || colors.primary};
  }
`;

const DeleteButton = styled(Button)`
  background-color: transparent;
  color: ${colors.danger};
  border: 1px solid ${colors.danger};
  
  &:hover {
    background-color: ${colors.danger}10;
  }
  
  svg {
    margin-right: 8px;
  }
`;

const ScheduleImport = () => {
  const fileInputRef = useRef(null);
  const [semester, setSemester] = useState(1);
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [weeks, setWeeks] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [importProgress, setImportProgress] = useState(0);

  // Состояния для отображения проблем
  const [problemFiles, setProblemFiles] = useState([]);
  const [problemLessons, setProblemLessons] = useState([]);
  const [showProblemFilesModal, setShowProblemFilesModal] = useState(false);
  const [showProblemLessonsModal, setShowProblemLessonsModal] = useState(false);
  const [activeTab, setActiveTab] = useState('files');
  const [importSuccess, setImportSuccess] = useState(false);

  // Новые состояния для управления загруженными неделями
  const [loadedWeeks, setLoadedWeeks] = useState([]);
  const [loadingLoadedWeeks, setLoadingLoadedWeeks] = useState(false);
  const [deletingWeek, setDeletingWeek] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [weekToDelete, setWeekToDelete] = useState(null);
  const [weekDetailsModalOpen, setWeekDetailsModalOpen] = useState(false);
  const [selectedWeekDetails, setSelectedWeekDetails] = useState(null);

  // Загрузка списка загруженных недель при монтировании компонента и изменении семестра
  useEffect(() => {
    fetchLoadedWeeks();
  }, [semester]);

  // Обновление списка загруженных недель после успешного импорта
  useEffect(() => {
    if (importSuccess) {
      fetchLoadedWeeks();
    }
  }, [importSuccess]);

  // Функция для загрузки списка недель, уже загруженных в базу данных
  const fetchLoadedWeeks = async () => {
    setLoadingLoadedWeeks(true);
    try {
      // Эндпоинт должен быть добавлен на бэкенде
      const response = await scheduleApi.getAllSchedule({
        semester: semester
      });

      // Группируем расписание по неделям
      const weeksMap = new Map();

      response.data.forEach(item => {
        if (!weeksMap.has(item.week_number)) {
          weeksMap.set(item.week_number, {
            week_number: item.week_number,
            lessons_count: 0,
            groups: new Set(),
            teachers: new Set(),
            start_date: null,
            end_date: null
          });
        }

        const weekData = weeksMap.get(item.week_number);
        weekData.lessons_count++;

        if (item.group_name) {
          weekData.groups.add(item.group_name);
        }

        if (item.teacher_name) {
          weekData.teachers.add(item.teacher_name);
        }

        const itemDate = new Date(item.date);

        if (!weekData.start_date || itemDate < new Date(weekData.start_date)) {
          weekData.start_date = item.date;
        }

        if (!weekData.end_date || itemDate > new Date(weekData.end_date)) {
          weekData.end_date = item.date;
        }
      });

      // Преобразуем Map в массив и сортируем по номеру недели
      const loadedWeeksArray = Array.from(weeksMap.values()).map(week => ({
        ...week,
        groups_count: week.groups.size,
        teachers_count: week.teachers.size,
        groups: Array.from(week.groups),
        teachers: Array.from(week.teachers)
      })).sort((a, b) => a.week_number - b.week_number);

      setLoadedWeeks(loadedWeeksArray);
    } catch (err) {
      console.error('Ошибка при загрузке недель:', err);
      setError('Не удалось загрузить список загруженных недель');
    } finally {
      setLoadingLoadedWeeks(false);
    }
  };

  // Обработчик удаления недели
  const handleDeleteWeek = (weekNumber) => {
    setWeekToDelete(weekNumber);
    setShowDeleteConfirmation(true);
  };

  // Функция для подтверждения удаления недели
  const confirmDeleteWeek = async () => {
    if (!weekToDelete) return;

    setDeletingWeek(weekToDelete);
    try {
      // Эндпоинт должен быть добавлен на бэкенде
      await scheduleApi.deleteScheduleByWeek(semester, weekToDelete);
      setSuccess(`Неделя ${weekToDelete} успешно удалена`);
      fetchLoadedWeeks(); // Обновляем список недель
    } catch (err) {
      console.error('Ошибка при удалении недели:', err);
      setError(`Не удалось удалить неделю ${weekToDelete}`);
    } finally {
      setDeletingWeek(null);
      setWeekToDelete(null);
      setShowDeleteConfirmation(false);
    }
  };

  // Обработчик открытия модального окна с детальной информацией о неделе
  const handleViewWeekDetails = (week) => {
    setSelectedWeekDetails(week);
    setWeekDetailsModalOpen(true);
  };

  // Обработчик изменения семестра
  const handleSemesterChange = (e) => {
    setSemester(parseInt(e.target.value));
  };

  // Обработчик нажатия на контейнер загрузки
  const handleFileUploadClick = () => {
    fileInputRef.current.click();
  };

  // Обработчик перетаскивания файлов
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  // Обработчик выбора файлов
  const handleFileChange = (e) => {
    const selectedFiles = e.target.files;

    if (selectedFiles.length > 0) {
      const fileArray = Array.from(selectedFiles);

      // Проверяем, что все файлы имеют расширение .json
      const validFiles = fileArray.filter(file => file.name.toLowerCase().endsWith('.json'));

      if (validFiles.length !== fileArray.length) {
        setError('Все файлы должны иметь расширение .json');
        return;
      }

      setFiles(prev => [...prev, ...validFiles]);
      setError(null);

      // Сбрасываем input для возможности выбора того же файла
      e.target.value = '';
    }

    setDragActive(false);
  };

  // Обработчик удаления файла
  const handleRemoveFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setAnalyzed(false);
    setWeeks([]);
  };

  // Обработчик сброса всех выбранных файлов
  const handleResetFiles = () => {
    setFiles([]);
    setAnalyzed(false);
    setWeeks([]);
    setError(null);
  };

  // Обработчик анализа файлов
  const handleAnalyzeFiles = async () => {
    if (files.length === 0) {
      setError('Выберите файлы для анализа');
      return;
    }

    setAnalyzing(true);
    setError(null);
    setProblemFiles([]);

    try {
      // Создаем FormData для отправки файлов
      const formData = new FormData();
      formData.append('semester', semester);

      // Добавляем все файлы в FormData
      files.forEach((file, index) => {
        formData.append(`files[${index}]`, file);
      });

      // Отправляем файлы на сервер для анализа
      const response = await scheduleApi.analyzeScheduleFiles(formData);

      // Получаем список недель из ответа
      if (response.data && response.data.weeks) {
        // Сортируем недели по номеру
        const sortedWeeks = [...response.data.weeks].sort((a, b) => a.week_number - b.week_number);

        // Добавляем поле selected для каждой недели (по умолчанию все выбраны)
        const weeksWithSelection = sortedWeeks.map(week => ({
          ...week,
          selected: true
        }));

        setWeeks(weeksWithSelection);
        setAnalyzed(true);

        // Проверяем и сохраняем информацию о проблемных файлах
        if (response.data.problem_files && response.data.problem_files.length > 0) {
          setProblemFiles(response.data.problem_files);

          // Показываем пользователю уведомление о проблемах
          setError(`Обнаружены проблемы в ${response.data.problem_files.length} файлах. Проверьте подробности.`);
        }
      } else {
        setError('Не удалось получить информацию о неделях из файлов');
      }
    } catch (err) {
      console.error('Ошибка при анализе файлов:', err);
      setError(err.response?.data?.message || 'Произошла ошибка при анализе файлов');
    } finally {
      setAnalyzing(false);
    }
  };

  // Обработчик выбора/отмены недели
  const handleWeekToggle = (index) => {
    setWeeks(prev =>
      prev.map((week, i) =>
        i === index ? { ...week, selected: !week.selected } : week
      )
    );
  };

  // Обработчик выбора/отмены всех недель
  const handleToggleAllWeeks = (selected) => {
    setWeeks(prev => prev.map(week => ({ ...week, selected })));
  };

  // Обработчик импорта расписания
  const handleImportSchedule = async () => {
    const selectedWeeks = weeks.filter(week => week.selected);

    if (selectedWeeks.length === 0) {
      setError('Выберите хотя бы одну неделю для импорта');
      return;
    }

    setImporting(true);
    setImportProgress(0);
    setError(null);
    setProblemLessons([]);
    setImportSuccess(false);

    try {
      // Создаем FormData для отправки файлов и выбранных недель
      const formData = new FormData();
      formData.append('semester', semester);

      // Добавляем все файлы в FormData
      files.forEach((file, index) => {
        formData.append(`files[${index}]`, file);
      });

      // Добавляем выбранные недели
      formData.append('weeks', JSON.stringify(selectedWeeks.map(week => week.week_number)));

      // Отправляем файлы на сервер для импорта
      const response = await scheduleApi.uploadSchedule(formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setImportProgress(percentCompleted);
        }
      });

      // Проверяем наличие проблемных пар
      if (response.data && response.data.problem_lessons && response.data.problem_lessons.length > 0) {
        setProblemLessons(response.data.problem_lessons);

        // Показываем уведомление о проблемных парах
        setError(`Импорт выполнен, но обнаружено ${response.data.problem_lessons.length} проблемных пар. Проверьте подробности.`);
      } else {
        setImportSuccess(true);
      }

      // Показываем сообщение об успехе
      const successMessage = `Расписание успешно импортировано! Добавлено: ${response.data.imported_count} занятий.`;
      alert(successMessage + (response.data.failed_count > 0 ? ` Не удалось импортировать: ${response.data.failed_count} занятий.` : ''));

      // Сбрасываем состояние после успешного импорта
      setFiles([]);
      setAnalyzed(false);
      setWeeks([]);

      // Обновляем список загруженных недель
      fetchLoadedWeeks();
    } catch (err) {
      console.error('Ошибка при импорте расписания:', err);
      setError(err.response?.data?.message || 'Произошла ошибка при импорте расписания');
    } finally {
      setImporting(false);
    }
  };

  // Функция для форматирования российской даты (DD-MM-YYYY) для отображения
  const formatDate = (dateStr) => {
    if (!dateStr) return '';

    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      // Если формат YYYY-MM-DD
      if (parts[0].length === 4) {
        const [year, month, day] = parts;
        const months = [
          'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
          'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
        ];
        return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
      }
      // Если формат DD-MM-YYYY
      else {
        const [day, month, year] = parts;
        const months = [
          'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
          'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
        ];
        return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
      }
    }

    return dateStr;
  };

  return (
    <ImportContainer>
      <Title>Импорт расписания</Title>

      {/* Шаг 1: Управление загруженными неделями */}
      <StepCard>
        <StepTitle><span>1</span> Управление загруженными неделями</StepTitle>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <FormGroup style={{ flex: 1, maxWidth: '200px', marginBottom: 0 }}>
            <FormLabel>Семестр</FormLabel>
            <Select
              value={semester}
              onChange={handleSemesterChange}
              disabled={analyzing || importing || loadingLoadedWeeks}
            >
              <option value={1}>1 семестр</option>
              <option value={2}>2 семестр</option>
            </Select>
          </FormGroup>

          <Button
            onClick={fetchLoadedWeeks}
            secondary
            disabled={loadingLoadedWeeks}
          >
            {loadingLoadedWeeks ? (
              <>
                <LoadingSpinner />
                Загрузка...
              </>
            ) : 'Обновить список'}
          </Button>
        </div>

        {loadingLoadedWeeks ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <LoadingSpinner />
            <div style={{ marginTop: '10px' }}>Загрузка недель...</div>
          </div>
        ) : loadedWeeks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: colors.gray }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <p>Нет загруженных недель для выбранного семестра</p>
          </div>
        ) : (
          <>
            <div style={{ fontWeight: '500', marginBottom: '16px' }}>
              Загруженные недели в базе данных ({loadedWeeks.length})
            </div>

            <StatBlock>
              <StatItem>
                <div className="stat-label">Недель</div>
                <div className="stat-value">{loadedWeeks.length}</div>
              </StatItem>
              <StatItem color="#5AC8FA">
                <div className="stat-label">Всего пар</div>
                <div className="stat-value">
                  {loadedWeeks.reduce((total, week) => total + week.lessons_count, 0)}
                </div>
              </StatItem>
              <StatItem color="#FF9500">
                <div className="stat-label">Групп</div>
                <div className="stat-value">
                  {new Set(loadedWeeks.flatMap(week => week.groups)).size}
                </div>
              </StatItem>
              <StatItem color="#34C759">
                <div className="stat-label">Преподавателей</div>
                <div className="stat-value">
                  {new Set(loadedWeeks.flatMap(week => week.teachers)).size}
                </div>
              </StatItem>
            </StatBlock>

            <WeeksList>
              {loadedWeeks.map((week) => (
                <WeekItem key={week.week_number}>
                  <WeekInfo>
                    <h4>
                      Неделя {week.week_number}
                      {week.start_date && week.end_date && (
                        <small style={{ fontWeight: 'normal', marginLeft: '8px', color: '#666' }}>
                          ({formatDate(week.start_date)} - {formatDate(week.end_date)})
                        </small>
                      )}
                    </h4>
                    <p>
                      Занятий: {week.lessons_count}
                      <span style={{ margin: '0 8px' }}>•</span>
                      Групп: {week.groups_count}
                      <span style={{ margin: '0 8px' }}>•</span>
                      Преподавателей: {week.teachers_count}
                    </p>
                  </WeekInfo>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button
                      secondary
                      onClick={() => handleViewWeekDetails(week)}
                      style={{ padding: '6px 12px', fontSize: '13px' }}
                    >
                      Подробнее
                    </Button>

                    <DeleteButton
                      onClick={() => handleDeleteWeek(week.week_number)}
                      disabled={deletingWeek === week.week_number}
                    >
                      {deletingWeek === week.week_number ? (
                        <LoadingSpinner />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      )}
                      Удалить
                    </DeleteButton>
                  </div>
                </WeekItem>
              ))}
            </WeeksList>
          </>
        )}
      </StepCard>

      {/* Шаг 2: Выбор семестра для импорта */}
      <StepCard>
        <StepTitle><span>2</span> Выбор семестра для импорта</StepTitle>
        <FormGroup>
          <FormLabel>Семестр</FormLabel>
          <Select value={semester} onChange={handleSemesterChange} disabled={analyzed || importing}>
            <option value={1}>1 семестр</option>
            <option value={2}>2 семестр</option>
          </Select>
        </FormGroup>
      </StepCard>

      {/* Шаг 3: Загрузка файлов расписания */}
      <StepCard>
        <StepTitle><span>3</span> Загрузите файлы расписания (JSON)</StepTitle>

        <FileUploadContainer
          className={dragActive ? 'active' : ''}
          onClick={handleFileUploadClick}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);

            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              const droppedFiles = Array.from(e.dataTransfer.files);
              const validFiles = droppedFiles.filter(file => file.name.toLowerCase().endsWith('.json'));

              if (validFiles.length !== droppedFiles.length) {
                setError('Все файлы должны иметь расширение .json');
                return;
              }

              setFiles(prev => [...prev, ...validFiles]);
              setError(null);
            }
          }}
        >
          <FileUploadIcon className={dragActive ? 'active' : ''}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </FileUploadIcon>

          <FileUploadText>
            Перетащите файлы сюда или <strong>нажмите для выбора файлов</strong>
            <p>Поддерживаются файлы JSON с расписаниями факультетов</p>
          </FileUploadText>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            multiple
            style={{ display: 'none' }}
            disabled={analyzing || importing}
          />
        </FileUploadContainer>

        {files.length > 0 && (
          <FileInfo>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0 }}>Выбранные файлы ({files.length})</h4>
              <Button secondary onClick={handleResetFiles} disabled={analyzing || importing}>
                Сбросить все
              </Button>
            </div>

            <FileList>
              {files.map((file, index) => (
                <FileItem key={index}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                  </svg>
                  <FileItemName>{file.name}</FileItemName>
                  <small>{(file.size / 1024).toFixed(1)} КБ</small>
                  <RemoveButton
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile(index);
                    }}
                    disabled={analyzing || importing}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </RemoveButton>
                </FileItem>
              ))}
            </FileList>

            {!analyzed && (
              <Button
                onClick={handleAnalyzeFiles}
                disabled={analyzing || importing}
                style={{ marginTop: '16px' }}
              >
                {analyzing ? (
                  <>
                    <LoadingSpinner />
                    Анализ файлов...
                  </>
                ) : 'Анализировать файлы'}
              </Button>
            )}
          </FileInfo>
        )}

        {/* Отображение проблем с файлами */}
        {problemFiles.length > 0 && (
          <AlertBox type="warning" style={{ marginTop: '16px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <div>
              <div style={{ marginBottom: '8px' }}>Обнаружены проблемы в {problemFiles.length} файлах</div>
              <ActionModalButton
                onClick={() => setShowProblemFilesModal(true)}
                style={{ padding: '4px 8px', fontSize: '12px' }}
              >
                Просмотреть проблемы
              </ActionModalButton>
            </div>
          </AlertBox>
        )}
      </StepCard>

      {/* Шаг 4: Выбор недель для импорта */}
      {analyzed && (
        <StepCard>
          <StepTitle><span>4</span> Выберите недели для импорта</StepTitle>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ fontWeight: '500', marginBottom: '0' }}>Доступные недели ({weeks.length})</div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                secondary
                onClick={() => handleToggleAllWeeks(true)}
                style={{ marginRight: '8px' }}
                disabled={importing}
              >
                Выбрать все
              </Button>
              <Button
                secondary
                onClick={() => handleToggleAllWeeks(false)}
                disabled={importing}
              >
                Отменить все
              </Button>
            </div>
          </div>

          <WeeksList>
            {weeks.map((week, index) => (
              <WeekItem key={index}>
                <Checkbox
                  type="checkbox"
                  checked={week.selected}
                  onChange={() => handleWeekToggle(index)}
                  disabled={importing}
                />
                <WeekInfo>
                  <h4>
                    Неделя {week.week_number}
                    {week.date_start && week.date_end && (
                      <small style={{ fontWeight: 'normal', marginLeft: '8px', color: '#666' }}>
                        ({formatDate(week.date_start)} - {formatDate(week.date_end)})
                      </small>
                    )}
                  </h4>
                  <p>
                    Найдено занятий: {week.lessons_count || 'Н/Д'}
                    {week.groups_count && (
                      <span style={{ marginLeft: '10px' }}>
                        Групп: {week.groups_count}
                      </span>
                    )}
                  </p>
                </WeekInfo>
                {week.status && (
                  <StatusBadge
                    color={week.status === 'new' ? colors.success :
                         week.status === 'exists' ? colors.warning : colors.gray}
                  >
                    {week.status === 'new' ? 'Новая' :
                     week.status === 'exists' ? 'Уже загружена' : week.status}
                  </StatusBadge>
                )}
              </WeekItem>
            ))}
          </WeeksList>

          <Button
            onClick={handleImportSchedule}
            disabled={importing || weeks.filter(w => w.selected).length === 0}
            style={{ marginTop: '20px' }}
          >
            {importing ? (
              <>
                <LoadingSpinner />
                Импорт расписания...
              </>
            ) : 'Импортировать расписание'}
          </Button>

          {importing && (
            <ProgressBar progress={importProgress}>
              <div></div>
            </ProgressBar>
          )}
        </StepCard>
      )}

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {success && (
        <AlertBox>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <div>{success}</div>
        </AlertBox>
      )}

      {importSuccess && (
        <AlertBox type="success">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <div>
            Расписание успешно импортировано! Все данные загружены без ошибок.
          </div>
        </AlertBox>
      )}

      {/* Кнопка для просмотра проблемных пар */}
      {problemLessons.length > 0 && (
        <Card style={{ marginTop: '20px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ margin: 0 }}>Обнаружены проблемные пары</h4>
              <p style={{ color: colors.gray, margin: '8px 0 0 0' }}>
                При импорте не удалось обработать {problemLessons.length} занятий.
                Проверьте детали проблемных пар для исправления.
              </p>
            </div>
            <Button onClick={() => setShowProblemLessonsModal(true)}>
              Просмотреть проблемы
            </Button>
          </div>
        </Card>
      )}

      {/* Модальное окно для отображения проблем с файлами */}
      {showProblemFilesModal && (
        <ModalOverlay onClick={() => setShowProblemFilesModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Проблемные файлы ({problemFiles.length})</ModalTitle>
              <CloseButton onClick={() => setShowProblemFilesModal(false)}>×</CloseButton>
            </ModalHeader>

            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              <Table>
                <thead>
                  <tr>
                    <Th>Файл</Th>
                    <Th>Проблема</Th>
                  </tr>
                </thead>
                <tbody>
                  {problemFiles.map((problem, index) => (
                    <tr key={index}>
                      <Td>{problem.file}</Td>
                      <Td>{problem.error}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>

            <ButtonRow>
              <ActionModalButton onClick={() => setShowProblemFilesModal(false)}>
                Закрыть
              </ActionModalButton>
            </ButtonRow>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* Модальное окно для отображения проблемных пар */}
      {showProblemLessonsModal && (
        <ModalOverlay onClick={() => setShowProblemLessonsModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Проблемные пары ({problemLessons.length})</ModalTitle>
              <CloseButton onClick={() => setShowProblemLessonsModal(false)}>×</CloseButton>
            </ModalHeader>

            <TabRow>
              <Tab active={activeTab === 'files'} onClick={() => setActiveTab('files')}>
                По файлам
              </Tab>
              <Tab active={activeTab === 'groups'} onClick={() => setActiveTab('groups')}>
                По группам
              </Tab>
            </TabRow>

            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {activeTab === 'files' ? (
                <Table>
                  <thead>
                    <tr>
                      <Th>Файл</Th>
                      <Th>Группа</Th>
                      <Th>Предмет</Th>
                      <Th>Дата</Th>
                      <Th>Проблема</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {problemLessons.map((problem, index) => (
                      <tr key={index}>
                        <Td>{problem.file || '-'}</Td>
                        <Td>{problem.group || '-'}</Td>
                        <Td>{problem.subject || '-'}</Td>
                        <Td>{problem.date || '-'}</Td>
                        <Td>{problem.error || 'Неизвестная ошибка'}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <Th>Группа</Th>
                      <Th>Количество проблем</Th>
                      <Th>Типы проблем</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(
                      problemLessons.reduce((map, problem) => {
                        const group = problem.group || 'Не указана';
                        if (!map.has(group)) {
                          map.set(group, { count: 0, errors: new Set() });
                        }
                        map.get(group).count++;
                        map.get(group).errors.add(problem.error || 'Неизвестная ошибка');
                        return map;
                      }, new Map())
                    ).map(([group, data], index) => (
                      <tr key={index}>
                        <Td>{group}</Td>
                        <Td>{data.count}</Td>
                        <Td>
                          <ul style={{ margin: 0, paddingLeft: '16px' }}>
                            {Array.from(data.errors).map((error, i) => (
                              <li key={i}>{error}</li>
                            ))}
                          </ul>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </div>

            <ButtonRow>
              <ActionModalButton onClick={() => setShowProblemLessonsModal(false)}>
                Закрыть
              </ActionModalButton>
            </ButtonRow>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* Модальное окно для подтверждения удаления недели */}
      {showDeleteConfirmation && (
        <ModalOverlay onClick={() => setShowDeleteConfirmation(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <ModalHeader>
              <ModalTitle>Подтверждение удаления</ModalTitle>
              <CloseButton onClick={() => setShowDeleteConfirmation(false)}>×</CloseButton>
            </ModalHeader>

            <div style={{ textAlign: 'center', margin: '20px 0' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={colors.danger} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>

              <p style={{ margin: '16px 0', fontSize: '16px' }}>
                Вы действительно хотите удалить неделю {weekToDelete}?
              </p>

              <p style={{ color: colors.gray, fontSize: '14px' }}>
                Это действие невозможно отменить. Все занятия для этой недели будут безвозвратно удалены.
              </p>
            </div>

            <ButtonRow>
              <ActionModalButton
                secondary
                onClick={() => setShowDeleteConfirmation(false)}
              >
                Отмена
              </ActionModalButton>
              <ActionModalButton
                danger
                onClick={confirmDeleteWeek}
              >
                Удалить
              </ActionModalButton>
            </ButtonRow>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* Модальное окно для подробного просмотра недели */}
      {weekDetailsModalOpen && selectedWeekDetails && (
        <ModalOverlay onClick={() => setWeekDetailsModalOpen(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>
                Неделя {selectedWeekDetails.week_number}
                {selectedWeekDetails.start_date && selectedWeekDetails.end_date && (
                  <small style={{ fontWeight: 'normal', marginLeft: '8px', fontSize: '14px', color: '#666' }}>
                    ({formatDate(selectedWeekDetails.start_date)} - {formatDate(selectedWeekDetails.end_date)})
                  </small>
                )}
              </ModalTitle>
              <CloseButton onClick={() => setWeekDetailsModalOpen(false)}>×</CloseButton>
            </ModalHeader>

            <StatBlock>
              <StatItem>
                <div className="stat-label">Занятий</div>
                <div className="stat-value">{selectedWeekDetails.lessons_count}</div>
              </StatItem>
              <StatItem color="#FF9500">
                <div className="stat-label">Групп</div>
                <div className="stat-value">{selectedWeekDetails.groups_count}</div>
              </StatItem>
              <StatItem color="#34C759">
                <div className="stat-label">Преподавателей</div>
                <div className="stat-value">{selectedWeekDetails.teachers_count}</div>
              </StatItem>
            </StatBlock>

            <TabRow>
              <Tab active={activeTab === 'groups'} onClick={() => setActiveTab('groups')}>
                Группы ({selectedWeekDetails.groups?.length || 0})
              </Tab>
              <Tab active={activeTab === 'teachers'} onClick={() => setActiveTab('teachers')}>
                Преподаватели ({selectedWeekDetails.teachers?.length || 0})
              </Tab>
            </TabRow>

            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {activeTab === 'groups' ? (
                selectedWeekDetails.groups?.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {selectedWeekDetails.groups.map((group, index) => (
                      <div key={index} style={{
                        background: '#f5f5f5',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}>
                        {group}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: colors.gray, textAlign: 'center' }}>
                    Нет информации о группах
                  </p>
                )
              ) : (
                selectedWeekDetails.teachers?.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {selectedWeekDetails.teachers.map((teacher, index) => (
                      <div key={index} style={{
                        background: '#f5f5f5',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}>
                        {teacher}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: colors.gray, textAlign: 'center' }}>
                    Нет информации о преподавателях
                  </p>
                )
              )}
            </div>

            <ButtonRow>
              <ActionModalButton secondary onClick={() => setWeekDetailsModalOpen(false)}>
                Закрыть
              </ActionModalButton>

              <DeleteButton onClick={() => {
                setWeekDetailsModalOpen(false);
                handleDeleteWeek(selectedWeekDetails.week_number);
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                Удалить неделю
              </DeleteButton>
            </ButtonRow>
          </ModalContent>
        </ModalOverlay>
      )}
    </ImportContainer>
  );
};

export default ScheduleImport;