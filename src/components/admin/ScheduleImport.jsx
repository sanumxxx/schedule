import React, { useState, useRef } from 'react';
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
  const [importProgress, setImportProgress] = useState(0);

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

      alert('Расписание успешно импортировано!');

      // Сбрасываем состояние после успешного импорта
      setFiles([]);
      setAnalyzed(false);
      setWeeks([]);
    } catch (err) {
      console.error('Ошибка при импорте расписания:', err);
      setError(err.response?.data?.message || 'Произошла ошибка при импорте расписания');
    } finally {
      setImporting(false);
    }
  };

  // Преобразование российской даты (DD-MM-YYYY) в формат для отображения
  const formatDate = (dateStr) => {
    if (!dateStr) return '';

    const [day, month, year] = dateStr.split('-');
    const months = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];

    return `${day} ${months[parseInt(month) - 1]} ${year}`;
  };

  return (
    <ImportContainer>
      <Title>Импорт расписания</Title>

      <StepCard>
        <StepTitle><span>1</span> Выберите семестр</StepTitle>
        <FormGroup>
          <FormLabel>Семестр</FormLabel>
          <Select value={semester} onChange={handleSemesterChange} disabled={analyzed || importing}>
            <option value={1}>1 семестр</option>
            <option value={2}>2 семестр</option>
          </Select>
        </FormGroup>
      </StepCard>

      <StepCard>
        <StepTitle><span>2</span> Загрузите файлы расписания (JSON)</StepTitle>

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
      </StepCard>

      {analyzed && (
        <StepCard>
          <StepTitle><span>3</span> Выберите недели для импорта</StepTitle>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h4 style={{ margin: 0 }}>Доступные недели ({weeks.length})</h4>
            <div>
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
    </ImportContainer>
  );
};

export default ScheduleImport;