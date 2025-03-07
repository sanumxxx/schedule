import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { 
  Title,
  Card,
  ListContainer,
  ListItem,
  Section,
  colors
} from '../common/StyledComponents';
import Header from '../common/Header';
import SearchBar from '../common/SearchBar';
import TabView from '../common/TabView';
import { scheduleApi } from '../../api/api';

// Переопределяем PageContainer с адаптивными отступами
const PageContainer = styled.div`
  padding: 10px 16px;
  max-width: 1200px;
  margin: 0 auto;
  
  @media (min-width: 768px) {
    padding: 10px 24px;
  }
`;

// Дополнительные стилизованные компоненты для улучшенного дизайна
const Hero = styled.div`
  background: linear-gradient(135deg, ${colors.primary}, ${colors.secondary});
  border-radius: 16px;
  padding: 20px 16px;
  margin-bottom: 20px;
  color: white;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.2);
  
  @media (min-width: 768px) {
    padding: 24px;
  }
`;

const HeroTitle = styled.h1`
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 8px;
  
  @media (min-width: 768px) {
    font-size: 28px;
  }
`;

const HeroSubtitle = styled.p`
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 16px;
  max-width: 600px;
  
  @media (min-width: 768px) {
    font-size: 16px;
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

const EmptyListMessage = styled.div`
  text-align: center;
  padding: 24px 16px;
  color: ${colors.gray};
  
  @media (min-width: 768px) {
    padding: 32px 16px;
  }
`;

const LoadingContainer = styled.div`
  text-align: center;
  padding: 24px 16px;
  color: ${colors.gray};
  
  svg {
    margin-bottom: 8px;
  }
  
  @media (min-width: 768px) {
    padding: 32px 16px;
  }
`;

const Badge = styled.span`
  background-color: ${props => props.bgColor || colors.primary};
  color: white;
  font-size: 12px;
  font-weight: 500;
  padding: 4px 8px;
  border-radius: 100px;
  margin-left: 8px;
`;

const SearchResultsTitle = styled.div`
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  
  @media (min-width: 768px) {
    font-size: 18px;
  }
`;

// Адаптивный TabView с вертикальным отображением на мобильных
const ResponsiveTabContainer = styled.div`
  margin-bottom: 16px;
  
  /* Стили для TabView компонента при мобильной версии */
  & > div {
    display: flex;
    flex-direction: column;
    
    @media (min-width: 480px) {
      flex-direction: row;
    }
  }
  
  /* Стили для Tab компонентов при мобильной версии */
  & > div > div {
    margin-bottom: 8px;
    
    @media (min-width: 480px) {
      margin-bottom: 0;
    }
  }
`;

// Адаптивный ListItem с большими отступами для мобильных
const ResponsiveListItem = styled(ListItem)`
  padding: 16px;
  font-size: 16px;
  
  /* Увеличиваем область касания для мобильных */
  & > div {
    flex: 1;
  }
  
  & > svg {
    min-width: 24px;
    min-height: 24px;
    width: 24px;
    height: 24px;
  }
  
  @media (min-width: 768px) {
    & > svg {
      min-width: 16px;
      min-height: 16px;
      width: 16px;
      height: 16px;
    }
  }
`;

const TABS = [
  { id: 'groups', label: 'Группы' },
  { id: 'teachers', label: 'Преподаватели' },
  { id: 'auditories', label: 'Аудитории' }
];

// Добавим перевод для красивого вывода
const tabTranslation = {
  groups: 'группу',
  teachers: 'преподавателя',
  auditories: 'аудиторию'
};

const HomePage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('groups');
  const [searchText, setSearchText] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);

  // Проверка авторизации при загрузке страницы
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    setIsLoggedIn(!!token);
    setUserRole(user.role);
  }, []);

  // Загрузка данных при изменении таба или поискового запроса
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        let response;

        switch (activeTab) {
          case 'groups':
            response = await scheduleApi.getGroups(searchText);
            break;
          case 'teachers':
            response = await scheduleApi.getTeachers(searchText);
            break;
          case 'auditories':
            response = await scheduleApi.getAuditories(searchText);
            break;
          default:
            response = { data: [] };
        }

        setItems(response.data);
      } catch (err) {
        console.error('Ошибка при загрузке данных:', err);
        setError('Произошла ошибка при загрузке данных. Пожалуйста, попробуйте снова.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab, searchText]);

  // Обработчик изменения вкладки
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchText('');
  };

  // Обработчик поиска
  const handleSearch = (text) => {
    setSearchText(text);
  };

  // Обработчик выбора элемента
  const handleItemSelect = (item) => {
    let itemId;
    switch (activeTab) {
      case 'groups':
        itemId = encodeURIComponent(item.group_name);
        break;
      case 'teachers':
        itemId = encodeURIComponent(item.teacher_name);
        break;
      case 'auditories':
        itemId = encodeURIComponent(item.auditory);
        break;
      default:
        return;
    }

    // Просто переходим к расписанию без указания семестра и недели,
    // чтобы SchedulePage автоматически определил текущую неделю
    navigate(`/schedule/${activeTab.slice(0, -1)}/${itemId}`);
  };

  return (
    <PageContainer>
      <Header isLoggedIn={isLoggedIn} userRole={userRole} />

      <Hero>
        <HeroPattern />
        <HeroTitle>Расписание университета</HeroTitle>
        <HeroSubtitle>
          Удобный доступ к расписанию занятий для студентов, преподавателей и аудиторий
        </HeroSubtitle>

        <ResponsiveTabContainer>
          <TabView
            tabs={TABS}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
        </ResponsiveTabContainer>

        <SearchBar
          onSearch={handleSearch}
          placeholder={`Поиск ${tabTranslation[activeTab] || ''}...`}
        />
      </Hero>

      <Section>
        {searchText && (
          <SearchResultsTitle>
            Результаты поиска
            {items.length > 0 && (
              <Badge bgColor={colors.secondary}>Найдено: {items.length}</Badge>
            )}
          </SearchResultsTitle>
        )}

        <Card>
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
              <div>Загрузка данных...</div>
            </LoadingContainer>
          ) : error ? (
            <EmptyListMessage>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '8px', color: colors.danger }}>
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <div>{error}</div>
            </EmptyListMessage>
          ) : items.length === 0 ? (
            <EmptyListMessage>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '8px' }}>
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <div>
                {searchText
                  ? 'По вашему запросу ничего не найдено'
                  : `Список ${activeTab === 'groups' ? 'групп' : 
                      activeTab === 'teachers' ? 'преподавателей' : 
                      'аудиторий'} пуст`
                }
              </div>
            </EmptyListMessage>
          ) : (
            <ListContainer>
              {items.map((item, index) => {
                const itemName = activeTab === 'groups' ? item.group_name :
                                activeTab === 'teachers' ? item.teacher_name :
                                item.auditory;

                return (
                  <ResponsiveListItem
                    key={index}
                    onClick={() => handleItemSelect(item)}
                  >
                    <div>{itemName}</div>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                  </ResponsiveListItem>
                );
              })}
            </ListContainer>
          )}
        </Card>
      </Section>

      <style jsx="true">{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Добавляем мета-тег для адаптивности */
        @media (max-width: 480px) {
          :root {
            touch-action: manipulation;
          }
        }
      `}</style>
    </PageContainer>
  );
};

export default HomePage;