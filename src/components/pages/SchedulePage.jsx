import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

const SchedulePage = () => {
  const navigate = useNavigate();
  const { type, id, semester: semesterParam, week: weekParam } = useParams();
  const [semester, setSemester] = useState(semesterParam ? parseInt(semesterParam) : getCurrentSemester());
  const [week, setWeek] = useState(weekParam ? parseInt(weekParam) : 1);
  const [schedule, setSchedule] = useState([]);
  const [dates, setDates] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [availableWeeks, setAvailableWeeks] = useState([]);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Проверка авторизации пользователя
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      setIsLoggedIn(true);
      setUserRole(user.role);
    } else {
      setIsLoggedIn(false);
      setUserRole(null);
    }
  }, []);

  // Проверка, может ли пользователь редактировать расписание
  const canEditSchedule = isLoggedIn && (userRole === 'admin' || userRole === 'editor');

  // Расшифровка типа расписания
  const typeLabel = type === 'group' ? 'группы' :
                   type === 'teacher' ? 'преподавателя' :
                   'аудитории';

  // Декодирование ID из URL
  const decodedId = decodeURIComponent(id);

  // Функция загрузки расписания (выделена для повторного использования)
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

  // При первом рендере проверяем, установлены ли семестр и неделя
  useEffect(() => {
    // Если семестр или неделя не установлены, используем текущие значения
    if (semester === 0 || week === 0) {
      const currentSemester = getCurrentSemester();
      const currentWeek = getCurrentWeek(currentSemester);

      // Перенаправляем пользователя на URL с текущим семестром и неделей
      if (id) {
        navigate(`/schedule/${type}/${id}/${currentSemester}/${currentWeek}`, { replace: true });

        // Если передана функция для загрузки расписания, вызываем ее
        if (loadSchedule) {
          loadSchedule(id, currentSemester, currentWeek);
        }
      }
    }
  }, [semester, week, type, id, navigate, loadSchedule]);

  // Инициализация начальных данных
  useEffect(() => {
    const initializeSchedule = async () => {
      if (decodedId) {
        await loadSchedule(decodedId, semester, week);
      }
    };

    initializeSchedule();
  }, [decodedId, semester, week, loadSchedule]);

  // Обработчик изменения семестра
  const handleSemesterChange = (e) => {
    const newSemester = parseInt(e.target.value);
    setSemester(newSemester);
    navigate(`/schedule/${type}/${id}/${newSemester}/${week}`, { replace: true });
  };

  // Обработчик изменения недели
  const handleWeekChange = (e) => {
    const newWeek = parseInt(e.target.value);
    setWeek(newWeek);
    navigate(`/schedule/${type}/${id}/${semester}/${newWeek}`, { replace: true });
  };

  // Обработчик экспорта в Excel
  const handleExportToExcel = async () => {
    try {
      await scheduleApi.exportToExcel(type, decodedId, semester, week);
    } catch (err) {
      console.error('Ошибка при экспорте расписания:', err);
      alert('Произошла ошибка при экспорте расписания. Пожалуйста, попробуйте снова.');
    }
  };

  // Возврат на главную страницу
  const handleBack = () => {
    navigate('/');
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

      <Card style={{marginBottom: '16px', padding: '16px'}}>
        <h1 style={{fontSize: '20px', marginBottom: '16px'}}>Расписание {typeLabel} {decodedId}</h1>
        <Row>
          <Column>
            <FormGroup>
              <label>Семестр</label>
              <Select value={semester} onChange={handleSemesterChange}>
                <option value={1}>1 семестр</option>
                <option value={2}>2 семестр</option>
              </Select>
            </FormGroup>
          </Column>
          <Column>
            <FormGroup>
              <label>Неделя</label>
              <Select value={week} onChange={handleWeekChange}>
                {Array.from({ length: 18 }, (_, i) => i + 1).map(num => (
                  <option key={num} value={num}>{num} неделя</option>
                ))}
              </Select>
            </FormGroup>
          </Column>
          <Column>
            <FormGroup>
              <label>&nbsp;</label>
              <Button onClick={handleExportToExcel} style={{display: 'flex', alignItems: 'center'}}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '8px'}}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Экспорт в Excel
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
            isEditable={canEditSchedule} // Передаем флаг, указывающий на возможность редактирования
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