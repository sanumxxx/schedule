import React, { useState, useEffect } from 'react';
import { Navigate, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import {
  PageContainer,
  Title,
  Card,
  Button,
  colors
} from '../common/StyledComponents';
import Header from '../common/Header';
import ScheduleEditor from '../admin/ScheduleEditor';
import ScheduleImport from '../admin/ScheduleImport';
import UserManagement from '../admin/UserManagement';
import TimeSlotManager from '../admin/TimeSlotManager';
import { authApi } from '../../api/api';

// Стили для новой структуры страницы с боковым меню
const AdminLayout = styled.div`
  display: flex;
  margin-top: 20px;
  gap: 20px;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const Sidebar = styled.div`
  flex: 0 0 250px;
  
  @media (max-width: 768px) {
    flex: 1;
    margin-bottom: 16px;
  }
`;

const ContentArea = styled.div`
  flex: 1;
`;

const SidebarCard = styled(Card)`
  padding: 0;
  overflow: hidden;
`;

const MenuGroup = styled.div`
  margin-bottom: 4px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const MenuHeader = styled.div`
  font-weight: 500;
  font-size: 14px;
  color: #8E8E93;
  padding: 12px 16px 8px;
`;

const MenuItem = styled.div`
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-left: 3px solid ${props => props.active ? colors.primary : 'transparent'};
  background-color: ${props => props.active ? '#F0F7FF' : 'transparent'};
  color: ${props => props.active ? colors.primary : '#333'};
  font-weight: ${props => props.active ? '500' : 'normal'};
  
  &:hover {
    background-color: ${props => props.active ? '#F0F7FF' : '#F9F9F9'};
  }
  
  svg {
    margin-right: 10px;
    vertical-align: middle;
  }
  
  span {
    vertical-align: middle;
  }
`;

const MobileMenuToggle = styled.button`
  display: none;
  width: 100%;
  padding: 10px;
  background-color: ${colors.white};
  border: 1px solid ${colors.lightGray};
  border-radius: 8px;
  margin-bottom: 12px;
  text-align: left;
  font-weight: 500;
  cursor: pointer;
  
  @media (max-width: 768px) {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  
  svg {
    transition: transform 0.3s ease;
    transform: ${props => props.expanded ? 'rotate(180deg)' : 'rotate(0deg)'};
  }
`;

const LoadingContainer = styled.div`
  text-align: center;
  padding: 40px 0;
  
  svg {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Определение конфигурации меню с правами доступа
const MENU_CONFIG = [
  {
    group: 'Расписание',
    items: [
      {
        id: 'editor',
        label: 'Редактор расписания',
        path: '/admin/editor',
        component: ScheduleEditor,
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        ),
        roles: ['admin', 'editor']
      },
      {
        id: 'import',
        label: 'Импорт расписания',
        path: '/admin/import',
        component: ScheduleImport,
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
        ),
        roles: ['admin', 'editor']
      },
      {
        id: 'time_slots',
        label: 'Временные слоты',
        path: '/admin/time_slots',
        component: TimeSlotManager,
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        ),
        roles: ['admin']
      }
    ]
  },
  {
    group: 'Управление',
    items: [
      {
        id: 'users',
        label: 'Пользователи',
        path: '/admin/users',
        component: UserManagement,
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        ),
        roles: ['admin']
      }
    ]
  },
  {
    group: 'Настройки',
    items: [
      {
        id: 'settings',
        label: 'Общие настройки',
        path: '/admin/settings',
        component: () => <div>Страница настроек (в разработке)</div>,
        icon: (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        ),
        roles: ['admin']
      }
    ]
  }
];

const AdminPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuExpanded, setMobileMenuExpanded] = useState(false);

  // Получение активного маршрута из текущего пути
  const activeRouteId = location.pathname.split('/').pop();

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

  // Получение всех доступных маршрутов на основе роли пользователя
  const getAvailableRoutes = () => {
    const routes = [];

    MENU_CONFIG.forEach(group => {
      group.items.forEach(item => {
        if (item.roles.includes(userRole)) {
          routes.push(item);
        }
      });
    });

    return routes;
  };

  // Получение первого доступного маршрута
  const getFirstAvailableRoute = () => {
    const availableRoutes = getAvailableRoutes();
    return availableRoutes.length > 0 ? availableRoutes[0].path : '/login';
  };

  // Обработчик перехода к выбранному разделу
  const handleNavigation = (path) => {
    navigate(path);
    setMobileMenuExpanded(false);
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
        <LoadingContainer>
          <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="2" x2="12" y2="6"></line>
            <line x1="12" y1="18" x2="12" y2="22"></line>
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
            <line x1="2" y1="12" x2="6" y2="12"></line>
            <line x1="18" y1="12" x2="22" y2="12"></line>
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
          </svg>
          <div style={{ marginTop: '12px', color: colors.gray }}>Загрузка...</div>
        </LoadingContainer>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Header isLoggedIn={true} userRole={userRole} />

      <Title>Панель администрирования</Title>

      <MobileMenuToggle
        expanded={mobileMenuExpanded}
        onClick={() => setMobileMenuExpanded(!mobileMenuExpanded)}
      >
        <span>Меню администратора</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </MobileMenuToggle>

      <AdminLayout>
        {/* Боковое меню */}
        <Sidebar style={{ display: mobileMenuExpanded || window.innerWidth > 768 ? 'block' : 'none' }}>
          <SidebarCard>
            {MENU_CONFIG.map((group, groupIndex) => {
              // Фильтруем элементы на основе роли пользователя
              const availableItems = group.items.filter(item => item.roles.includes(userRole));

              // Если нет доступных элементов в группе, не показываем группу
              if (availableItems.length === 0) return null;

              return (
                <MenuGroup key={groupIndex}>
                  <MenuHeader>{group.group}</MenuHeader>

                  {availableItems.map(item => (
                    <MenuItem
                      key={item.id}
                      active={activeRouteId === item.id}
                      onClick={() => handleNavigation(item.path)}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </MenuItem>
                  ))}
                </MenuGroup>
              );
            })}
          </SidebarCard>
        </Sidebar>

        {/* Основная область контента */}
        <ContentArea>
          <Card style={{ padding: '20px' }}>
            <Routes>
              {/* Динамически создаем маршруты на основе конфигурации */}
              {MENU_CONFIG.flatMap(group =>
                group.items
                  .filter(item => item.roles.includes(userRole))
                  .map(item => (
                    <Route
                      key={item.id}
                      path={item.path.replace('/admin', '')}
                      element={<item.component />}
                    />
                  ))
              )}

              {/* Редирект на первый доступный маршрут */}
              <Route
                path="/"
                element={<Navigate to={getFirstAvailableRoute().replace('/admin', '')} replace />}
              />
              <Route
                path="*"
                element={<Navigate to={getFirstAvailableRoute().replace('/admin', '')} replace />}
              />
            </Routes>
          </Card>
        </ContentArea>
      </AdminLayout>

      <style jsx="true">{`
        @media (max-width: 768px) {
          body {
            overflow-x: hidden;
          }
        }
      `}</style>
    </PageContainer>
  );
};

export default AdminPage;