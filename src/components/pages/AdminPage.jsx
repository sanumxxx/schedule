import React, { useState, useEffect } from 'react';
import { Navigate, Routes, Route, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import {
  PageContainer,
  Title,
  TabsContainer,
  Tab,
  Card,
  Button,
  Section,
  colors
} from '../common/StyledComponents';
import Header from '../common/Header';
import ScheduleEditor from '../admin/ScheduleEditor';
import ScheduleImport from '../admin/ScheduleImport';
import UserManagement from '../admin/UserManagement';
import { authApi } from '../../api/api';

const PageContentContainer = styled.div`
  padding: 20px 0;
`;

const TabContent = styled.div`
  margin-top: 20px;
`;

const AdminPage = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('editor');

  // Проверка авторизации при загрузке страницы
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');

      if (!token) {
        setIsLoggedIn(false);
        setLoading(false);
        return;
      }

      try {
        const response = await authApi.getCurrentUser();
        const user = response.data;

        setIsLoggedIn(true);
        setUserRole(user.role);

        // Обновляем данные пользователя в localStorage
        localStorage.setItem('user', JSON.stringify(user));
      } catch (err) {
        console.error('Ошибка при проверке авторизации:', err);

        // Удаляем токен при ошибке авторизации
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        setIsLoggedIn(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Обработчик изменения вкладки
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    navigate(`/admin/${tab}`);
  };

  // Если не авторизован или не имеет прав, перенаправляем на страницу входа
  if (!loading && (!isLoggedIn || (userRole !== 'admin' && userRole !== 'editor'))) {
    return <Navigate to="/login" replace />;
  }

  // Показываем загрузку, пока проверяем авторизацию
  if (loading) {
    return (
      <PageContainer>
        <Header isLoggedIn={true} />
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ display: 'inline-block', width: '30px', height: '30px', border: '3px solid rgba(0,0,0,0.1)', borderTopColor: colors.primary, borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <div style={{ marginTop: '12px', color: colors.gray }}>Загрузка...</div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Header isLoggedIn={true} userRole={userRole} />

      <PageContentContainer>
        <Title>Панель администрирования</Title>

        <TabsContainer>
          <Tab
            active={activeTab === 'editor'}
            onClick={() => handleTabChange('editor')}
          >
            Редактор расписания
          </Tab>

          <Tab
            active={activeTab === 'import'}
            onClick={() => handleTabChange('import')}
          >
            Импорт расписания
          </Tab>

          {userRole === 'admin' && (
            <Tab
              active={activeTab === 'users'}
              onClick={() => handleTabChange('users')}
            >
              Пользователи
            </Tab>
          )}
        </TabsContainer>

        <TabContent>
          <Routes>
            <Route path="/" element={<Navigate to="/admin/editor" replace />} />
            <Route path="/editor" element={<ScheduleEditor />} />
            <Route path="/import" element={<ScheduleImport />} />

            {userRole === 'admin' && (
              <Route path="/users" element={<UserManagement />} />
            )}

            <Route path="*" element={<Navigate to="/admin/editor" replace />} />
          </Routes>
        </TabContent>
      </PageContentContainer>

      <style jsx="true">{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </PageContainer>
  );
};

export default AdminPage;