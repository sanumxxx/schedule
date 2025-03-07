import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PageContainer,
  Title,
  Card,
  FormContainer,
  FormGroup,
  FormLabel,
  Input,
  Button,
  ErrorMessage
} from '../common/StyledComponents';
import Header from '../common/Header';
import { authApi } from '../../api/api';

const LoginPage = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username || !password) {
      setError('Пожалуйста, введите логин и пароль.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await authApi.login(username, password);

      // Сохранение токена и информации о пользователе
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      // Перенаправление на главную страницу или админ-панель
      if (response.data.user.role === 'admin' || response.data.user.role === 'editor') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error('Ошибка при авторизации:', err);
      setError(
        err.response?.data?.message ||
        'Произошла ошибка при авторизации. Пожалуйста, проверьте логин и пароль.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <Header />

      <FormContainer>
        <Title>Авторизация</Title>

        <Card>
          <form onSubmit={handleSubmit}>
            <FormGroup>
              <FormLabel htmlFor="username">Логин</FormLabel>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
              />
            </FormGroup>

            <FormGroup>
              <FormLabel htmlFor="password">Пароль</FormLabel>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </FormGroup>

            {error && <ErrorMessage>{error}</ErrorMessage>}

            <Button type="submit" disabled={loading}>
              {loading ? 'Вход...' : 'Войти'}
            </Button>
          </form>
        </Card>
      </FormContainer>
    </PageContainer>
  );
};

export default LoginPage;