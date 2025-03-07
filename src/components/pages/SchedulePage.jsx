import React, { useState, useEffect } from 'react';
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

const SchedulePage = () => {
  const navigate = useNavigate();
  const { type, id, semester: semesterParam, week: weekParam } = useParams();
  const [semester, setSemester] = useState(semesterParam ? parseInt(semesterParam) : 1);
  const [week, setWeek] = useState(weekParam ? parseInt(weekParam) : 1);
  const [schedule, setSchedule] = useState([]);
  const [dates, setDates] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [availableWeeks, setAvailableWeeks] = useState([]);

  // Расшифровка типа расписания
  const typeLabel = type === 'group' ? 'группы' :
                   type === 'teacher' ? 'преподавателя' :
                   'аудитории';

  // Декодирование ID из URL
  const decodedId = decodeURIComponent(id);

  // Проверка авторизации при загрузке страницы
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    setIsLoggedIn(!!token);
    setUserRole(user.role);
  }, []);

  // Загрузка доступных недель при изменении семестра
  useEffect(() => {
    const fetchAvailableWeeks = async () => {
      try {
        // В идеале у нас должен быть специальный API-запрос для получения доступных недель
        // Но так как его нет, используем запрос всего расписания для текущего типа/id/семестра
        // и извлекаем уникальные недели

        // Пример запроса к API (замените его на ваш реальный API-вызов)
        const response = await scheduleApi.getAllSchedule({
          [type === 'group' ? 'group_name' :
            type === 'teacher' ? 'teacher_name' : 'auditory']: decodedId,
          semester: semester
        });

        // Извлекаем уникальные значения недель из расписания
        const uniqueWeeks = [...new Set(response.data.map(item => item.week_number))];

        // Сортируем недели
        const sortedWeeks = uniqueWeeks.sort((a, b) => a - b);

        // Если недель нет или произошла ошибка, используем недели 1-18
        if (sortedWeeks.length === 0) {
          setAvailableWeeks(Array.from({ length: 18 }, (_, i) => i + 1));
        } else {
          setAvailableWeeks(sortedWeeks);

          // Если текущая неделя не в списке доступных, выбираем первую доступную
          if (!sortedWeeks.includes(week)) {
            setWeek(sortedWeeks[0]);
          }
        }
      } catch (err) {
        console.error('Ошибка при загрузке доступных недель:', err);
        // Если произошла ошибка, показываем недели 1-18
        setAvailableWeeks(Array.from({ length: 18 }, (_, i) => i + 1));
      }
    };

    fetchAvailableWeeks();
  }, [type, decodedId, semester]);

  // Загрузка расписания при изменении параметров
  useEffect(() => {
    const fetchSchedule = async () => {
      setLoading(true);
      setError(null);

      try {
        let response;

        switch (type) {
          case 'group':
            response = await scheduleApi.getGroupSchedule(decodedId, semester, week);
            break;
          case 'teacher':
            response = await scheduleApi.getTeacherSchedule(decodedId, semester, week);
            break;
          case 'auditory':
            response = await scheduleApi.getAuditorySchedule(decodedId, semester, week);
            break;
          default:
            throw new Error('Неизвестный тип расписания');
        }

        setSchedule(response.data.schedule || []);
        setDates(response.data.dates || {});
      } catch (err) {
        console.error('Ошибка при загрузке расписания:', err);
        setError('Произошла ошибка при загрузке расписания. Пожалуйста, попробуйте снова.');
      } finally {
        setLoading(false);
      }
    };

    // Обновляем URL при изменении параметров
    if (semesterParam !== semester.toString() || weekParam !== week.toString()) {
      navigate(`/schedule/${type}/${id}/${semester}/${week}`);
    }

    fetchSchedule();
  }, [type, decodedId, semester, week, navigate, semesterParam, weekParam]);

  // Обработчик изменения семестра
  const handleSemesterChange = (e) => {
    setSemester(parseInt(e.target.value));
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