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

// Функция для создания URL с актуальными параметрами
const generateScheduleUrl = (type, id, semester, week) => {
  return `/schedule/${type}/${encodeURIComponent(id)}/${semester}/${week}`;
};

// Получение текущего семестра (запасной вариант)
const getCurrentSemester = () => {
  const now = new Date();
  const month = now.getMonth() + 1;

  if (month >= 9 || month === 1) {
    return 1; // Первый семестр
  } else if (month >= 2 && month <= 6) {
    return 2; // Второй семестр
  } else {
    return 1;
  }
};

const SchedulePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { type, id, semester: semesterParam, week: weekParam } = useParams();

  // Параметры из URL
  const parsedSemester = semesterParam && !isNaN(parseInt(semesterParam)) ? parseInt(semesterParam) : 0;
  const parsedWeek = weekParam && !isNaN(parseInt(weekParam)) ? parseInt(weekParam) : 0;

  // Состояние компонента
  const [semester, setSemester] = useState(parsedSemester || 1);
  const [week, setWeek] = useState(parsedWeek || 1);
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

  // Декодирование ID из URL
  const decodedId = decodeURIComponent(id || '');

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

  // Отслеживание изменений URL
  useEffect(() => {
    if (semesterParam && weekParam) {
      const urlSemester = parseInt(semesterParam);
      const urlWeek = parseInt(weekParam);

      if (urlSemester !== semester) {
        setSemester(urlSemester);
        fetchAvailableWeeks(urlSemester);
      }
      if (urlWeek !== week) {
        setWeek(urlWeek);
      }
    }
  }, [semesterParam, weekParam, location.pathname]);

  // Проверка прав на редактирование
  const canEditSchedule = isLoggedIn && (userRole === 'admin' || userRole === 'editor');

  // Определение типа для отображения
  const typeLabel = type === 'group' ? 'группы' :
                   type === 'teacher' ? 'преподавателя' :
                   'аудитории';

  // Функция для определения текущей недели по данным из БД
  const fetchCurrentWeekFromDB = useCallback(async () => {
    try {
      // Получаем текущую дату в формате YYYY-MM-DD
      const today = new Date().toISOString().split('T')[0];

      // Получаем все занятия для поиска
      const response = await scheduleApi.getAllSchedule();

      // Поиск занятия на сегодняшнюю дату
      const todaySchedule = response.data.find(item => item.date === today);

      if (todaySchedule) {
        // Если нашли занятие на сегодня, берем из него семестр и неделю
        return {
          semester: todaySchedule.semester,
          week: todaySchedule.week_number
        };
      }

      // Если на сегодня нет занятий, ищем ближайшее будущее занятие
      const todayDate = new Date(today);

      // Сортируем занятия по дате
      const futureSchedules = response.data
        .filter(item => new Date(item.date) >= todayDate)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      if (futureSchedules.length > 0) {
        // Берем данные из ближайшего будущего занятия
        return {
          semester: futureSchedules[0].semester,
          week: futureSchedules[0].week_number
        };
      }

      // Если нет ни сегодняшних, ни будущих занятий, берем последнее прошедшее
      const pastSchedules = response.data
        .filter(item => new Date(item.date) < todayDate)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      if (pastSchedules.length > 0) {
        return {
          semester: pastSchedules[0].semester,
          week: pastSchedules[0].week_number
        };
      }

      // Если совсем нет данных, возвращаем значения по умолчанию
      return { semester: getCurrentSemester(), week: 1 };
    } catch (error) {
      console.error("Ошибка при определении текущей недели:", error);
      return { semester: getCurrentSemester(), week: 1 };
    }
  }, []);

  // Функция для получения доступных недель
  const fetchAvailableWeeks = useCallback(async (sem) => {
    setLoadingWeeks(true);
    try {
      // Получаем все расписание для выбранного семестра
      const response = await scheduleApi.getAllSchedule({
        semester: sem
      });

      // Извлекаем уникальные номера недель
      const weeks = [...new Set(response.data.map(item => item.week_number))];

      // Сортируем недели
      setAvailableWeeks(weeks.sort((a, b) => a - b));
    } catch (err) {
      console.error('Ошибка при получении доступных недель:', err);
      setAvailableWeeks([]);
    } finally {
      setLoadingWeeks(false);
    }
  }, []);

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

      return response.data.schedule || [];
    } catch (err) {
      console.error('Ошибка при загрузке расписания:', err);
      setError('Произошла ошибка при загрузке расписания. Пожалуйста, попробуйте снова.');
      return [];
    } finally {
      setLoading(false);
    }
  }, [type]);

  // Загрузка начальных данных
  useEffect(() => {
    const initSchedule = async () => {
      if (decodedId) {
        if (parsedSemester > 0 && parsedWeek > 0) {
          // Используем параметры из URL
          await loadSchedule(decodedId, parsedSemester, parsedWeek);
          await fetchAvailableWeeks(parsedSemester);
        } else {
          // Определяем текущую неделю из БД
          try {
            const { semester: currentSem, week: currentWeek } = await fetchCurrentWeekFromDB();

            setSemester(currentSem);
            setWeek(currentWeek);

            // Обновляем URL и загружаем данные
            navigate(generateScheduleUrl(type, id, currentSem, currentWeek), { replace: true });
            await loadSchedule(decodedId, currentSem, currentWeek);
            await fetchAvailableWeeks(currentSem);
          } catch (error) {
            console.error("Ошибка при инициализации:", error);

            // Значения по умолчанию
            const defaultSem = getCurrentSemester();
            const defaultWeek = 1;

            setSemester(defaultSem);
            setWeek(defaultWeek);

            navigate(generateScheduleUrl(type, id, defaultSem, defaultWeek), { replace: true });
            await loadSchedule(decodedId, defaultSem, defaultWeek);
            await fetchAvailableWeeks(defaultSem);
          }
        }
      }
    };

    initSchedule();
  }, [decodedId, type, id, parsedSemester, parsedWeek, loadSchedule, fetchAvailableWeeks, fetchCurrentWeekFromDB, navigate]);

  // Обработчик изменения семестра
  const handleSemesterChange = async (e) => {
    const newSemester = parseInt(e.target.value);
    setSemester(newSemester);

    // Загружаем доступные недели для нового семестра
    await fetchAvailableWeeks(newSemester);

    // Выбираем неделю из доступных
    let newWeek = week;
    if (availableWeeks.length > 0) {
      if (!availableWeeks.includes(week)) {
        newWeek = availableWeeks[0];
      }
    } else {
      newWeek = 1;
    }

    setWeek(newWeek);

    // Обновляем URL и загружаем данные
    navigate(generateScheduleUrl(type, id, newSemester, newWeek), { replace: true });
    loadSchedule(decodedId, newSemester, newWeek);
  };

  // Обработчик изменения недели
  const handleWeekChange = (e) => {
    const newWeek = parseInt(e.target.value);
    setWeek(newWeek);

    // Обновляем URL и загружаем данные
    navigate(generateScheduleUrl(type, id, semester, newWeek), { replace: true });
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

  // Обработчик для быстрой установки текущей недели из БД
  const handleSetCurrentWeek = async () => {
    try {
      // Определяем текущую неделю из БД
      const { semester: currentSem, week: currentWeek } = await fetchCurrentWeekFromDB();

      // Обновляем состояния
      setSemester(currentSem);
      setWeek(currentWeek);

      // Обновляем URL и загружаем данные
      navigate(generateScheduleUrl(type, id, currentSem, currentWeek), { replace: true });
      await loadSchedule(decodedId, currentSem, currentWeek);
      await fetchAvailableWeeks(currentSem);
    } catch (error) {
      console.error("Ошибка при установке текущей недели:", error);
      setError('Не удалось определить текущую неделю');
      setTimeout(() => setError(null), 3000);
    }
  };

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
                  ) : availableWeeks.length > 0 ? (
                    // Показываем только недели, которые есть в базе данных
                    availableWeeks.map(num => (
                      <option key={num} value={num}>{num} неделя</option>
                    ))
                  ) : (
                    // Если нет данных, показываем только текущую неделю
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