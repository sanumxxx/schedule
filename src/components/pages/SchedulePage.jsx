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

// Переопределяем PageContainer с минимальными отступами
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

// Стилизованный заголовок страницы
const PageHeader = styled.div`
  background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary});
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 12px;
  color: white;
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(0, 122, 255, 0.2);
`;

const Title = styled.h1`
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 0;
  
  @media (min-width: 768px) {
    font-size: 20px;
  }
`;

const HeroPattern = styled.div`
  position: absolute;
  right: -40px;
  top: -20px;
  width: 200px;
  height: 200px;
  opacity: 0.1;
  background-image: radial-gradient(circle, white 2px, transparent 2px);
  background-size: 16px 16px;
  transform: rotate(15deg);
`;

const BackButton = styled(Button)`
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 14px;
  
  svg {
    width: 14px;
    height: 14px;
  }
`;

const SelectorCard = styled(Card)`
  margin-bottom: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  padding: 12px;
`;

const CompactSelect = styled(Select)`
  padding: 8px 10px;
  font-size: 14px;
  border-radius: 8px;
`;

const FilterRow = styled(Row)`
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 8px;
  
  @media (max-width: 768px) {
    gap: 8px;
  }
`;

const FilterColumn = styled(Column)`
  @media (max-width: 768px) {
    width: 100%;
  }
`;

const SelectLabel = styled.div`
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
  color: #555;
`;

const ExportButton = styled(Button)`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 14px;
  
  svg {
    width: 14px;
    height: 14px;
  }
  
  @media (max-width: 768px) {
    width: 100%;
    justify-content: center;
  }
`;

const ScheduleWrapper = styled.div`
  overflow-x: auto; /* Подчеркиваем горизонтальный скролл */
  margin-bottom: 16px;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  background: ${colors.white};
  -webkit-overflow-scrolling: touch; /* Улучшает скролл на iOS */
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

// Определение даты начала семестра
const getSemesterStartDate = (year, semester) => {
  if (semester === 1) {
    // Первый семестр начинается 1 сентября
    return new Date(year, 8, 1); // Месяцы с 0, поэтому 8 = сентябрь
  } else {
    // Второй семестр примерно с 10 февраля
    return new Date(year, 1, 10);
  }
};

// Вычисление текущей учебной недели
const calculateCurrentWeek = (semester) => {
  const now = new Date();
  const year = now.getFullYear();

  // Начало семестра
  const semesterStart = getSemesterStartDate(year, semester);

  // Если текущая дата до начала семестра текущего года,
  // возможно, имеется в виду прошлый учебный год
  if (semester === 1 && now < semesterStart) {
    const lastYearStart = getSemesterStartDate(year - 1, semester);
    const diffDays = Math.floor((now - lastYearStart) / (1000 * 60 * 60 * 24));
    const week = Math.floor(diffDays / 7) + 1;
    return Math.min(week, 18); // Ограничиваем 18 неделями
  }

  // Иначе считаем недели в текущем году
  const diffDays = Math.floor((now - semesterStart) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    // Если текущая дата до начала семестра, предполагаем первую неделю
    return 1;
  }

  const week = Math.floor(diffDays / 7) + 1;
  return Math.min(week, 18); // Ограничиваем 18 неделями
};

const SchedulePage = () => {
  const navigate = useNavigate();
  const { type, id, semester: semesterParam, week: weekParam } = useParams();
  const [semester, setSemester] = useState(semesterParam ? parseInt(semesterParam) : getCurrentSemester());
  const [week, setWeek] = useState(weekParam ? parseInt(weekParam) : 1); // Временное значение, будет обновлено
  const [schedule, setSchedule] = useState([]);
  const [dates, setDates] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [availableWeeks, setAvailableWeeks] = useState([]);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

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

  // Проверка авторизации при загрузке страницы
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    setIsLoggedIn(!!token);
    setUserRole(user.role);
  }, []);

  // Инициализация недель и определение текущей недели
  useEffect(() => {
    const initializeSchedule = async () => {
      try {
        // Получаем доступные недели
        const response = await scheduleApi.getAllSchedule({
          [type === 'group' ? 'group_name' :
            type === 'teacher' ? 'teacher_name' : 'auditory']: decodedId,
          semester: semester
        });

        // Извлекаем уникальные значения недель из расписания
        const uniqueWeeks = [...new Set(response.data.map(item => item.week_number))];

        // Сортируем недели
        const sortedWeeks = uniqueWeeks.sort((a, b) => a - b);

        // Если недель нет, используем недели 1-18
        if (sortedWeeks.length === 0) {
          setAvailableWeeks(Array.from({ length: 18 }, (_, i) => i + 1));
        } else {
          setAvailableWeeks(sortedWeeks);
        }

        // Определяем, нужно ли устанавливать текущую неделю
        const shouldSetCurrentWeek = !weekParam || weekParam === '0';

        if (shouldSetCurrentWeek) {
          // Вычисляем текущую неделю
          const currentWeek = calculateCurrentWeek(semester);

          // Проверяем, есть ли данные для текущей недели
          if (sortedWeeks.includes(currentWeek)) {
            // Если есть данные для текущей недели, используем ее
            setWeek(currentWeek);
          } else if (sortedWeeks.length > 0) {
            // Если нет данных для текущей недели, берем последнюю доступную неделю
            // Находим ближайшую доступную неделю к текущей
            const closestWeek = sortedWeeks.reduce((prev, curr) =>
              Math.abs(curr - currentWeek) < Math.abs(prev - currentWeek) ? curr : prev
            );
            setWeek(closestWeek);
          } else {
            // Если вообще нет данных, показываем неделю 1
            setWeek(1);
          }

          // Обновляем URL с правильными параметрами
          navigate(`/schedule/${type}/${id}/${semester}/${week}`, { replace: true });
        } else if (!sortedWeeks.includes(parseInt(weekParam)) && sortedWeeks.length > 0) {
          // Если указанная неделя не существует, берем первую доступную
          setWeek(sortedWeeks[0]);
          navigate(`/schedule/${type}/${id}/${semester}/${sortedWeeks[0]}`, { replace: true });
        }

        setInitialLoadComplete(true);
      } catch (err) {
        console.error('Ошибка при инициализации расписания:', err);
        setAvailableWeeks(Array.from({ length: 18 }, (_, i) => i + 1));
        setInitialLoadComplete(true);

        // Устанавливаем неделю 1, если нет параметра недели
        if (!weekParam || weekParam === '0') {
          setWeek(1);
          navigate(`/schedule/${type}/${id}/${semester}/1`, { replace: true });
        }
      }
    };

    initializeSchedule();
  }, [semester, type, decodedId, id, navigate, weekParam]);

  // Загрузка расписания при изменении параметров
  useEffect(() => {
    // Загружаем расписание только если семестр и неделя уже инициализированы
    if (initialLoadComplete && week > 0) {
      const fetchSchedule = async () => {
        await loadSchedule(decodedId, semester, week);
      };

      // Обновляем URL при изменении параметров
      if (semesterParam !== semester.toString() || weekParam !== week.toString()) {
        navigate(`/schedule/${type}/${id}/${semester}/${week}`, { replace: true });
      }

      fetchSchedule();
    }
  }, [type, decodedId, semester, week, navigate, semesterParam, weekParam, initialLoadComplete, loadSchedule, id]);

  // Обработчик изменения семестра
  const handleSemesterChange = (e) => {
    setSemester(parseInt(e.target.value));
    // При смене семестра сбрасываем флаг инициализации, чтобы перезагрузить доступные недели
    setInitialLoadComplete(false);
  };

  // Обработчик изменения недели
  const handleWeekChange = (e) => {
    setWeek(parseInt(e.target.value));
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

      <BackButton onClick={handleBack} secondary>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        Назад
      </BackButton>

      <PageHeader>
        <HeroPattern />
        <Title>Расписание {typeLabel} {decodedId}</Title>
      </PageHeader>

      <Section>
        <SelectorCard>
          <FilterRow>
            <FilterColumn>
              <SelectLabel>Семестр</SelectLabel>
              <CompactSelect value={semester} onChange={handleSemesterChange}>
                <option value={1}>1 семестр</option>
                <option value={2}>2 семестр</option>
              </CompactSelect>
            </FilterColumn>

            <FilterColumn>
              <SelectLabel>Неделя</SelectLabel>
              <CompactSelect value={week} onChange={handleWeekChange}>
                {availableWeeks.map(num => (
                  <option key={num} value={num}>{num} неделя</option>
                ))}
              </CompactSelect>
            </FilterColumn>

            <FilterColumn>
              <SelectLabel>&nbsp;</SelectLabel>
              <ExportButton onClick={handleExportToExcel}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Excel
              </ExportButton>
            </FilterColumn>
          </FilterRow>
        </SelectorCard>

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
            />
          )}
        </ScheduleWrapper>
      </Section>

      <style jsx="true">{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </PageContainer>
  );
};

export default SchedulePage;