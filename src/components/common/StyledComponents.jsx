import styled from 'styled-components';

// Основные цвета в стиле iOS
export const colors = {
  primary: '#007AFF', // Основной синий цвет iOS
  secondary: '#5AC8FA', // Светло-голубой
  success: '#34C759', // Зеленый
  danger: '#FF3B30', // Красный
  warning: '#FF9500', // Оранжевый
  gray: '#8E8E93', // Серый
  lightGray: '#E5E5EA', // Светло-серый
  white: '#FFFFFF', // Белый
  background: '#F2F2F7' // Фон
};

// Карточка в стиле iOS
export const Card = styled.div`
  background-color: ${colors.white};
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 16px;
  margin-bottom: 16px;
`;

// Заголовок
export const Title = styled.h1`
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #333;
`;

// Подзаголовок
export const Subtitle = styled.h2`
  font-size: 20px;
  font-weight: 500;
  margin-bottom: 12px;
  color: #333;
`;

// Контейнер для списка
export const ListContainer = styled.div`
  background-color: ${colors.white};
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 20px;
`;

// Элемент списка
export const ListItem = styled.div`
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid ${colors.lightGray};
  cursor: pointer;
  transition: background-color 0.2s;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background-color: #F9F9F9;
  }
  
  &:active {
    background-color: #EFEFEF;
  }
`;

// Кнопка в стиле iOS
export const Button = styled.button`
  background-color: ${props => props.secondary ? colors.white : props.color || colors.primary};
  color: ${props => props.secondary ? props.color || colors.primary : colors.white};
  font-size: 16px;
  font-weight: 500;
  padding: 12px 20px;
  border-radius: 10px;
  border: ${props => props.secondary ? `1px solid ${props.color || colors.primary}` : 'none'};
  cursor: pointer;
  transition: opacity 0.2s;
  
  &:hover {
    opacity: 0.9;
  }
  
  &:active {
    opacity: 0.7;
  }
  
  &:disabled {
    background-color: ${colors.lightGray};
    color: ${colors.gray};
    cursor: not-allowed;
  }
`;

// Поле ввода в стиле iOS
export const Input = styled.input`
  font-size: 16px;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid ${colors.lightGray};
  outline: none;
  width: ${props => props.width || '100%'};
  
  &:focus {
    border-color: ${colors.primary};
    box-shadow: 0 0 0 1px ${colors.primary}33;
  }
`;

// Селект в стиле iOS
export const Select = styled.select`
  font-size: 16px;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid ${colors.lightGray};
  background-color: ${colors.white};
  outline: none;
  width: ${props => props.width || '100%'};
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%238E8E93' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 16px;
  
  &:focus {
    border-color: ${colors.primary};
    box-shadow: 0 0 0 1px ${colors.primary}33;
  }
`;

// Контейнер для табов
export const TabsContainer = styled.div`
  display: flex;
  background-color: ${colors.lightGray};
  border-radius: 10px;
  padding: 4px;
  margin-bottom: 20px;
`;

// Таб
export const Tab = styled.div`
  flex: 1;
  text-align: center;
  padding: 12px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
  
  background-color: ${props => props.active ? colors.white : 'transparent'};
  color: ${props => props.active ? colors.primary : colors.gray};
  box-shadow: ${props => props.active ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none'};
`;

// Контейнер для сетки расписания
export const ScheduleGrid = styled.div`
  display: grid;
  grid-template-columns: 60px repeat(6, 1fr);
  gap: 1px;
  background-color: ${colors.lightGray};
  border-radius: 12px;
  overflow: hidden;
`;

// Ячейка заголовка расписания
export const ScheduleHeaderCell = styled.div`
  background-color: ${colors.white};
  padding: 12px 8px;
  text-align: center;
  font-weight: 500;
  font-size: 14px;
`;

// Ячейка времени расписания
export const ScheduleTimeCell = styled.div`
  background-color: ${colors.white};
  padding: 12px 8px;
  text-align: center;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100px;
`;

// Ячейка занятия
export const ScheduleCell = styled.div`
  background-color: ${props => props.empty ? colors.white : props.color || '#E1F5FE'};
  padding: 8px;
  font-size: 12px;
  border-radius: ${props => props.empty ? '0' : '8px'};
  margin: 2px;
  height: 96px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

// Контейнер для формы
export const FormContainer = styled.div`
  max-width: 500px;
  margin: 0 auto;
`;

// Группа формы
export const FormGroup = styled.div`
  margin-bottom: 16px;
`;

// Лейбл формы
export const FormLabel = styled.label`
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  font-size: 16px;
`;

// Сообщение об ошибке
export const ErrorMessage = styled.div`
  color: ${colors.danger};
  font-size: 14px;
  margin-top: 8px;
`;

// Контейнер для страницы с отступами
export const PageContainer = styled.div`
  padding: 20px 0;
`;

// Контейнер для секции с отступами
export const Section = styled.div`
  margin-bottom: 30px;
`;

// Контейнер для строки с элементами
export const Row = styled.div`
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
`;

// Контейнер для колонки
export const Column = styled.div`
  flex: ${props => props.size || 1};
`;