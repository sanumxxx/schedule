import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import {
  Button,
  Select,
  Row,
  Column,
  Card,
  colors
} from '../common/StyledComponents';
import Header from '../common/Header';
import ScheduleTable from '../common/ScheduleTable';
import { scheduleApi } from '../../api/api';

// Стилизованные компоненты
const PageContainer = styled.div`
  padding: 10px 8px;
  max-width: 1200px;
  margin: 0 auto;
  
  @media (min-width: 768px) {
    padding: 10px 16px;
  }
`;

const Section = styled.div`
  margin-bottom: 16px;
`;

const ScheduleWrapper = styled.div`
  overflow-x: auto;
  margin-bottom: 16px;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  background: ${colors.white};
  -webkit-overflow-scrolling: touch;
`;

const LoadingContainer = styled.div`
  text-align: center;
  padding: 30px 20px;
  color: ${colors.gray};
  
  svg {
    margin-bottom: 8px;
  }
`;

const EmptyMessage = styled.div`
  text-align: center;
  padding: 30px 20px;
  color: ${colors.gray};
`;

const AlertBox = styled.div`
  padding: 10px 16px;
  border-radius: 8px;
  background-color: ${props => props.type === 'error' ? '#FFEAEF' : '#E3F9E5'};
  border: 1px solid ${props => props.type === 'error' ? '#FFAFBF' : '#A1E5A5'};
  color: ${props => props.type === 'error' ? '#B30021' : '#1E7F24'};
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  
  svg {
    margin-right: 10px;
    min-width: 16px;
  }
`;

// Вспомогательные функции
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
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  let year = currentYear;
  let startDate;

  // Определение учебного года
  if (semester === 1 && currentMonth >= 9) {
    // Первый семестр текущего учебного года (осень)
    year = currentYear;
  } else if (semester === 1 && currentMonth < 9) {
    // Первый семестр прошлого учебного года
    year = currentYear - 1;
  } else if (semester === 2 && currentMonth >= 2 && currentMonth <= 8) {
    // Второй семестр текущего учебного года (весна)
    year = currentYear;
  } else if (semester === 2 && (currentMonth === 1 || currentMonth === 12)) {
    // Второй семестр следующего учебного года
    year = currentMonth === 1 ? currentYear : currentYear + 1;
  }

  // Примерные даты начала семестров
  if (semester === 1) {
    // Первый семестр начинается 1 сентября
    startDate = new Date(year, 8, 1); // Месяцы в JS от 0 до 11, где 8 = сентябрь
  } else {
    // Второй семестр начинается в начале февраля
    startDate = new Date(year, 1, 10); // 10 февраля примерно
  }

  // Если текущая дата до начала семестра, возвращаем 1 неделю
  if (now < startDate) {
    return 1;
  }

  // Вычисляем разницу в днях и делим на 7, чтобы получить номер недели
  const diffTime = Math.abs(now - startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const weekNumber = Math.floor(diffDays / 7) + 1;

  return weekNumber;
};

// Функция для создания URL с актуальными параметрами
const generateScheduleUrl = (type, id, semester, week) => {
  return `/schedule/${type}/${encodeURIComponent(id)}/${semester}/${week}`;
};

const SchedulePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { type, id, semester: semesterParam, week: weekParam } = useParams();

  // Просто парсим параметры URL без валидации
  const parsedSemester = semesterParam && !isNaN(parseInt(semesterParam)) ? parseInt(semesterParam) : 0;
  const parsedWeek = weekParam && !isNaN(parseInt(weekParam)) ? parseInt(weekParam) : 0;

  // Устанавливаем состояние точно по URL без автокоррекции
  const [semester, setSemester] = useState(parsedSemester || getCurrentSemester());
  const [week, setWeek] = useState(parsedWeek || getCurrentWeek(parsedSemester || getCurrentSemester()));
  const [schedule, setSchedule] = useState([]);
  const [dates, setDates] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [availableWeeks, setAvailableWeeks] = useState([]);
  const [loadingWeeks, setLoadingWeeks] = useState(false);

  // Проверка авторизации пользователя
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        setIsLoggedIn(true);
        setUserRole(user.role);
      } catch (err) {
        console.error('Ошибка при чтении данных пользователя:', err);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsLoggedIn(false);
        setUserRole(null);
      }
    } else {
      setIsLoggedIn(false);
      setUserRole(null);
    }
  }, []);

  // Эффект для отслеживания изменений URL
  useEffect(() => {
    if (semesterParam && weekParam) {
      const urlSemester = parseInt(semesterParam);
      const urlWeek = parseInt(weekParam);

      // Обновляем состояние, если URL изменился
      if (urlSemester !== semester) {
        setSemester(urlSemester);
        // При смене семестра нужно заново загрузить доступные недели
        fetchAvailableWeeks(urlSemester);
      }
      if (urlWeek !== week) {
        setWeek(urlWeek);
      }
    }
  }, [semesterParam, weekParam, location.pathname]);

  // Проверка, может ли пользователь редактировать расписание
  const canEditSchedule = isLoggedIn && (userRole === 'admin' || userRole === 'editor');

  // Расшифровка типа расписания
  const typeLabel = type === 'group' ? 'группы' :
                   type === 'teacher' ? 'преподавателя' :
                   'аудитории';

  // Декодирование ID из URL
  const decodedId = decodeURIComponent(id || '');

  // Функция для получения доступных недель
  const fetchAvailableWeeks = useCallback(async (sem) => {
    setLoadingWeeks(true);
    try {
      // Здесь нужно вызвать API для получения списка доступных недель для семестра
      // Поскольку такого метода может не быть, мы можем:
      // 1. Либо добавить его в API и на бэкенде
      // 2. Либо использовать временное решение - определять по существующему расписанию

      // Для примера, предположим, что у нас есть метод для получения доступных недель:
      // const response = await scheduleApi.getAvailableWeeks(sem);
      // const weeks = response.data || [];

      // Временное решение - генерируем список недель вокруг текущей
      const currentWeek = parseInt(weekParam) || getCurrentWeek(sem);

      // Создаем массив недель, включая текущую и +/- 5 недель (если семестр 1)
      // или +/- 10 недель (если семестр 2), с учетом текущей из URL
      let weeks = [];

      // Добавляем недели из запроса, если она не в нашем списке
      if (currentWeek && !weeks.includes(currentWeek)) {
        weeks.push(currentWeek);
      }

      // Для 1 семестра обычно недели 1-18, для 2 семестра - недели 18-36
      if (sem === 1) {
        weeks = Array.from({ length: 18 }, (_, i) => i + 1);
      } else {
        weeks = Array.from({ length: 18 }, (_, i) => i + 18);
      }

      // Сортируем и удаляем дубликаты
      weeks = [...new Set(weeks)].sort((a, b) => a - b);

      setAvailableWeeks(weeks);
    } catch (err) {
      console.error('Ошибка при получении доступных недель:', err);
      // Запасной вариант - генерируем базовый список недель
      const currentWeek = parseInt(weekParam) || getCurrentWeek(sem);
      const maxWeek = sem === 1 ? 18 : 36;
      const weeks = Array.from({ length: maxWeek }, (_, i) => i + 1);
      setAvailableWeeks(weeks);
    } finally {
      setLoadingWeeks(false);
    }
  }, [weekParam]);

  // Функция загрузки расписания
  const loadSchedule = useCallback(async (itemId, sem, wk) => {
    setLoading(true);
    setError(null);

    try {
      let response;
      const target = decodeURIComponent(itemId);

      switch (type) {
        case 'group':
          response = await scheduleApi.getGroupSchedule(target, sem, wk);
          break;
        case 'teacher':
          response = await scheduleApi.getTeacherSchedule(target, sem, wk);
          break;
        case 'auditory':
          response = await scheduleApi.getAuditorySchedule(target, sem, wk);
          break;
        default:
          throw new Error('Неизвестный тип расписания');
      }

      setSchedule(response.data.schedule || []);
      setDates(response.data.dates || {});

      // После успешной загрузки, можно обновить информацию о доступных неделях
      // на основе полученных данных (если используете временное решение)

      return response.data.schedule || [];
    } catch (err) {
      console.error('Ошибка при загрузке расписания:', err);
      setError('Произошла ошибка при загрузке расписания. Пожалуйста, попробуйте снова.');
      return [];
    } finally {
      setLoading(false);
    }
  }, [type]);

  // Загрузка начальных данных при монтировании компонента
  useEffect(() => {
    if (decodedId && semester > 0 && week > 0) {
      loadSchedule(decodedId, semester, week);
      fetchAvailableWeeks(semester);
    } else if (decodedId) {
      // Если не заданы параметры, используем текущие значения
      const currentSemester = getCurrentSemester();
      const currentWeek = getCurrentWeek(currentSemester);

      setSemester(currentSemester);
      setWeek(currentWeek);

      // Обновляем URL и загружаем данные
      navigate(generateScheduleUrl(type, id, currentSemester, currentWeek), { replace: true });
      loadSchedule(decodedId, currentSemester, currentWeek);
      fetchAvailableWeeks(currentSemester);
    }
  }, [decodedId, type, id, navigate, loadSchedule, fetchAvailableWeeks]);

  // Обработчик изменения семестра
  const handleSemesterChange = (e) => {
    const newSemester = parseInt(e.target.value);
    // Обновляем состояние
    setSemester(newSemester);

    // Загружаем доступные недели для нового семестра
    fetchAvailableWeeks(newSemester);

    // Выбираем первую доступную неделю из нового семестра
    // или сохраняем текущую, если она попадает в диапазон нового семестра
    let newWeek = week;
    if (newSemester === 1 && week > 18) {
      newWeek = 1;
    } else if (newSemester === 2 && week < 19) {
      newWeek = 19;
    }

    setWeek(newWeek);

    // Обновляем URL и загружаем данные
    navigate(generateScheduleUrl(type, id, newSemester, newWeek), { replace: true });
    loadSchedule(decodedId, newSemester, newWeek);
  };

  // Обработчик изменения недели
  const handleWeekChange = (e) => {
    const newWeek = parseInt(e.target.value);
    // Обновляем состояние
    setWeek(newWeek);
    // Обновляем URL
    navigate(generateScheduleUrl(type, id, semester, newWeek), { replace: true });
    // Загружаем новые данные
    loadSchedule(decodedId, semester, newWeek);
  };

  // Обработчик экспорта в Excel
  const handleExportToExcel = async () => {
    setExporting(true);
    try {
      await scheduleApi.exportToExcel(type, decodedId, semester, week);
      setSuccess('Расписание успешно экспортировано');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Ошибка при экспорте расписания:', err);
      setError('Произошла ошибка при экспорте расписания. Пожалуйста, попробуйте снова.');
      setTimeout(() => setError(null), 5000);
    } finally {
      setExporting(false);
    }
  };

  // Возврат на главную страницу
  const handleBack = () => {
    navigate('/');
  };

  // Обработчик для быстрой установки текущей недели
  const handleSetCurrentWeek = () => {
    const currentSemester = getCurrentSemester();
    const currentWeek = getCurrentWeek(currentSemester);

    // Обновляем состояния
    setSemester(currentSemester);
    setWeek(currentWeek);

    // Обновляем URL и загружаем данные
    navigate(generateScheduleUrl(type, id, currentSemester, currentWeek), { replace: true });
    loadSchedule(decodedId, currentSemester, currentWeek);
    fetchAvailableWeeks(currentSemester);
  };

  // Отфильтрованный список недель для отображения в селекторе
  const filteredWeeks = loadingWeeks
    ? []
    : availableWeeks.length > 0
      ? availableWeeks
      : (semester === 1 ? Array.from({ length: 18 }, (_, i) => i + 1) : Array.from({ length: 18 }, (_, i) => i + 18));

  return (
    <PageContainer>
      <Header isLoggedIn={isLoggedIn} userRole={userRole} />

      <Button onClick={handleBack} secondary style={{marginBottom: '12px'}}>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}>
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        Назад
      </Button>

      {success && (
        <AlertBox>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          {success}
        </AlertBox>
      )}

      {error && !loading && (
        <AlertBox type="error">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          {error}
        </AlertBox>
      )}

      <Card style={{marginBottom: '16px', padding: '16px'}}>
        <h1 style={{fontSize: '20px', marginBottom: '16px'}}>Расписание {typeLabel} {decodedId}</h1>
        <Row>
          <Column>
            <FormGroup>
              <label>Семестр</label>
              <Select value={semester} onChange={handleSemesterChange} disabled={loading}>
                <option value={1}>1 семестр</option>
                <option value={2}>2 семестр</option>
              </Select>
            </FormGroup>
          </Column>
          <Column>
            <FormGroup>
              <label>Неделя</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Select value={week} onChange={handleWeekChange} disabled={loading || loadingWeeks} style={{ flex: 1 }}>
                  {loadingWeeks ? (
                    <option value={week}>Загрузка недель...</option>
                  ) : (
                    // Показываем только недели из списка доступных
                    filteredWeeks.map(num => (
                      <option key={num} value={num}>{num} неделя</option>
                    ))
                  )}
                  {/* Если текущей недели нет в списке, добавляем её отдельно */}
                  {!loadingWeeks && !filteredWeeks.includes(week) && (
                    <option value={week}>{week} неделя</option>
                  )}
                </Select>
                <Button
                  onClick={handleSetCurrentWeek}
                  secondary
                  disabled={loading || loadingWeeks}
                  style={{padding: '8px 12px', fontSize: '13px'}}
                >
                  Текущая
                </Button>
              </div>
            </FormGroup>
          </Column>
          <Column>
            <FormGroup>
              <label>&nbsp;</label>
              <Button
                onClick={handleExportToExcel}
                style={{display: 'flex', alignItems: 'center'}}
                disabled={loading || exporting}
              >
                {exporting ? (
                  <>
                    <div style={{
                      width: '14px',
                      height: '14px',
                      border: '2px solid rgba(255,255,255,0.2)',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      marginRight: '8px',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    Экспорт...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Экспорт в Excel
                  </>
                )}
              </Button>
            </FormGroup>
          </Column>
        </Row>
      </Card>

      <ScheduleWrapper>
        {loading ? (
          <LoadingContainer>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
              <line x1="12" y1="2" x2="12" y2="6"></line>
              <line x1="12" y1="18" x2="12" y2="22"></line>
              <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
              <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
              <line x1="2" y1="12" x2="6" y2="12"></line>
              <line x1="18" y1="12" x2="22" y2="12"></line>
              <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
              <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
            </svg>
            <div>Загрузка...</div>
          </LoadingContainer>
        ) : error ? (
          <EmptyMessage>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.danger} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '8px' }}>
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <div>{error}</div>
          </EmptyMessage>
        ) : schedule.length === 0 ? (
          <EmptyMessage>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={colors.gray} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '8px' }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            <div>Нет занятий на выбранную неделю</div>
          </EmptyMessage>
        ) : (
          <ScheduleTable
            schedule={schedule}
            dates={dates}
            view={type}
            loadSchedule={loadSchedule}
            isEditable={canEditSchedule}
          />
        )}
      </ScheduleWrapper>

      <style jsx="true">{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </PageContainer>
  );
};

// Компонент для группы формы
const FormGroup = styled.div`
  margin-bottom: 16px;
  
  label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    font-size: 14px;
  }
`;

export default SchedulePage;