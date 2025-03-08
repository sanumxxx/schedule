// Обновленный компонент Header.jsx с добавлением ссылки на страницу отчетов

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styled from 'styled-components';
import { colors } from './StyledComponents';

const HeaderContainer = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  margin-bottom: 12px;
  position: relative;
`;

const Logo = styled(Link)`
  font-size: 20px;
  font-weight: 600;
  color: ${colors.primary};
  text-decoration: none;
  z-index: 11; /* Поверх мобильного меню */
  
  &:hover {
    opacity: 0.9;
  }
`;

const DesktopNav = styled.nav`
  display: flex;
  gap: 24px;
  align-items: center;
  
  @media (max-width: 768px) {
    display: none; /* Скрываем на мобильных */
  }
`;

const MobileMenuToggle = styled.button`
  display: none; /* Скрыто на десктопе */
  background: none;
  border: none;
  width: 40px;
  height: 40px;
  padding: 8px;
  cursor: pointer;
  position: relative;
  z-index: 11; /* Поверх мобильного меню */
  
  @media (max-width: 768px) {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
  }
`;

const BurgerLine = styled.span`
  display: block;
  width: 24px;
  height: 2px;
  background-color: ${colors.primary};
  transition: 0.3s all;
  
  &:nth-child(1) {
    transform: ${props => props.isOpen ? 'rotate(45deg) translate(5px, 5px)' : 'rotate(0)'};
  }
  
  &:nth-child(2) {
    opacity: ${props => props.isOpen ? '0' : '1'};
  }
  
  &:nth-child(3) {
    transform: ${props => props.isOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'rotate(0)'};
  }
`;

const MobileMenu = styled.div`
  display: none;
  
  @media (max-width: 768px) {
    display: ${props => props.isOpen ? 'flex' : 'none'};
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: white;
    z-index: 10;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 20px;
  }
`;

const MobileNavLink = styled(Link)`
  color: ${colors.gray};
  font-size: 20px;
  font-weight: 500;
  margin: 16px 0;
  text-decoration: none;
  
  &:hover {
    color: ${colors.primary};
  }
  
  &.active {
    color: ${colors.primary};
  }
`;

const MobileAuthButton = styled.button`
  background: none;
  border: 2px solid ${colors.primary};
  color: ${colors.primary};
  font-size: 18px;
  font-weight: 500;
  cursor: pointer;
  padding: 10px 24px;
  border-radius: 8px;
  margin: 16px 0;
  
  &:hover {
    background-color: rgba(0, 122, 255, 0.05);
  }
`;

const NavLink = styled(Link)`
  color: ${colors.gray};
  font-size: 16px;
  font-weight: 500;
  
  &:hover {
    color: ${colors.primary};
  }
  
  &.active {
    color: ${colors.primary};
  }
`;

const AuthButton = styled.button`
  background: none;
  border: none;
  color: ${colors.primary};
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 6px;
  
  &:hover {
    background-color: rgba(0, 122, 255, 0.05);
  }
`;

const Overlay = styled.div`
  display: ${props => props.isOpen ? 'block' : 'none'};
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 9;
`;

const Header = ({ isLoggedIn = false, userRole = null }) => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogin = () => {
    setIsMenuOpen(false);
    navigate('/login');
  };

  const handleLogout = () => {
    setIsMenuOpen(false);
    // Удалить токен и информацию о пользователе
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    // Блокируем прокрутку страницы когда меню открыто
    document.body.style.overflow = isMenuOpen ? 'auto' : 'hidden';
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
    document.body.style.overflow = 'auto';
  };

  return (
    <HeaderContainer>
      <Logo to="/" onClick={closeMenu}>Расписание МелГУ</Logo>

      {/* Десктопная навигация */}
      <DesktopNav>
        <NavLink to="/reports">Отчеты</NavLink>

        {isLoggedIn && (userRole === 'admin' || userRole === 'editor') && (
          <NavLink to="/admin">Администрирование</NavLink>
        )}

        {isLoggedIn ? (
          <AuthButton onClick={handleLogout}>Выйти</AuthButton>
        ) : (
          <AuthButton onClick={handleLogin}>Войти</AuthButton>
        )}
      </DesktopNav>

      {/* Мобильное меню */}
      <MobileMenuToggle onClick={toggleMenu}>
        <BurgerLine isOpen={isMenuOpen} />
        <BurgerLine isOpen={isMenuOpen} />
        <BurgerLine isOpen={isMenuOpen} />
      </MobileMenuToggle>

      <MobileMenu isOpen={isMenuOpen}>
        <MobileNavLink to="/reports" onClick={closeMenu}>
          Отчеты
        </MobileNavLink>

        {isLoggedIn && (userRole === 'admin' || userRole === 'editor') && (
          <MobileNavLink to="/admin" onClick={closeMenu}>
            Администрирование
          </MobileNavLink>
        )}

        {isLoggedIn ? (
          <MobileAuthButton onClick={handleLogout}>
            Выйти
          </MobileAuthButton>
        ) : (
          <MobileAuthButton onClick={handleLogin}>
            Войти
          </MobileAuthButton>
        )}
      </MobileMenu>

      <Overlay isOpen={isMenuOpen} onClick={closeMenu} />
    </HeaderContainer>
  );
};

export default Header;