import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import {
  Title,
  Card,
  colors
} from '../common/StyledComponents';
import Header from '../common/Header';

// Стилизованные компоненты
const PageContainer = styled.div`
  padding: 10px 16px;
  max-width: 1200px;
  margin: 0 auto;
  
  @media (min-width: 768px) {
    padding: 10px 24px;
  }
`;

const ReportCard = styled(Card)`
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const ReportTitle = styled.h3`
  font-size: 18px;
  margin-bottom: 10px;
  color: ${colors.primary};
`;

const ReportDescription = styled.p`
  color: ${colors.gray};
  font-size: 14px;
  margin-bottom: 12px;
  flex-grow: 1;
`;

const ReportIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: ${props => props.bgColor || colors.primary + '15'};
  color: ${props => props.color || colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  
  svg {
    width: 24px;
    height: 24px;
  }
`;

const ReportGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 24px;
`;

const ReportsListPage = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);

  // Проверка авторизации
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    setIsLoggedIn(!!token);
    setUserRole(user.role);
  }, []);

  // Список доступных отчетов
  const availableReports = [
    {
      id: 'discipline-lessons',
      title: 'Занятия по дисциплине',
      description: 'Просмотр всех занятий выбранной дисциплины для конкретной группы с возможностью фильтрации по преподавателям, типам занятий и подгруппам.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"></path>
        </svg>
      ),
      color: colors.primary,
      bgColor: colors.primary + '15',
      path: '/reports/discipline-lessons'
    },
    {
      id: 'teacher-workload',
      title: 'Нагрузка преподавателя',
      description: 'Анализ учебной нагрузки преподавателя с детализацией по дисциплинам, типам занятий и распределением по времени.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      ),
      color: colors.success,
      bgColor: colors.success + '15',
      path: '/reports/teacher-workload',
      comingSoon: true
    },
    {
      id: 'auditory-usage',
      title: 'Занятость аудиторий',
      description: 'Отчет об использовании аудиторий с возможностью анализа загруженности по дням недели и временным слотам.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
          <circle cx="12" cy="10" r="3"></circle>
        </svg>
      ),
      color: colors.warning,
      bgColor: colors.warning + '15',
      path: '/reports/auditory-usage',
      comingSoon: true
    }
  ];

  // Обработчик выбора отчета
  const handleSelectReport = (report) => {
    if (report.comingSoon) {
      alert('Этот отчет находится в разработке и будет доступен в ближайшее время.');
      return;
    }
    navigate(report.path);
  };

  return (
    <PageContainer>
      <Header isLoggedIn={isLoggedIn} userRole={userRole} />

      <Title>Отчеты</Title>

      <p style={{ color: colors.gray, marginBottom: '24px' }}>
        Выберите тип отчета для получения подробной информации о расписании занятий.
      </p>

      <ReportGrid>
        {availableReports.map(report => (
          <ReportCard key={report.id} onClick={() => handleSelectReport(report)}>
            <ReportIcon color={report.color} bgColor={report.bgColor}>
              {report.icon}
            </ReportIcon>
            <ReportTitle>{report.title}</ReportTitle>
            <ReportDescription>{report.description}</ReportDescription>

            {report.comingSoon && (
              <div style={{
                display: 'inline-block',
                padding: '4px 8px',
                backgroundColor: colors.warning + '20',
                color: colors.warning,
                borderRadius: '4px',
                fontSize: '12px',
                alignSelf: 'flex-start'
              }}>
                Скоро
              </div>
            )}
          </ReportCard>
        ))}
      </ReportGrid>
    </PageContainer>
  );
};

export default ReportsListPage;