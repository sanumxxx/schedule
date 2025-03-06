import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  Card,
  Button,
  Input,
  Select,
  FormGroup,
  FormLabel,
  ErrorMessage,
  Title,
  Subtitle,
  Row,
  Column
} from '../common/StyledComponents';
import { authApi } from '../../api/api';

// Стили для таблицы пользователей
const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
`;

const Th = styled.th`
  padding: 12px 16px;
  text-align: left;
  border-bottom: 2px solid #E5E5EA;
  font-weight: 500;
`;

const Td = styled.td`
  padding: 12px 16px;
  border-bottom: 1px solid #E5E5EA;
`;

const ActionButton = styled(Button)`
  padding: 8px 12px;
  font-size: 14px;
  margin-right: 8px;
`;

// Компонент модального окна
const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled(Card)`
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 24px;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #8E8E93;
  
  &:hover {
    color: #FF3B30;
  }
`;

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Состояние для модального окна
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' или 'edit'
  const [currentUser, setCurrentUser] = useState(null);

  // Состояние для формы
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'editor',
    fullName: ''
  });

  const [formError, setFormError] = useState(null);

  // Загрузка пользователей при монтировании компонента
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await authApi.getUsers();
        setUsers(response.data);
      } catch (err) {
        console.error('Ошибка при загрузке пользователей:', err);
        setError('Произошла ошибка при загрузке пользователей. Пожалуйста, попробуйте снова.');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Обработчик изменения формы
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Открытие модального окна для создания пользователя
  const handleCreate = () => {
    setModalMode('create');
    setFormData({
      username: '',
      password: '',
      role: 'editor',
      fullName: ''
    });
    setFormError(null);
    setShowModal(true);
  };

  // Открытие модального окна для редактирования пользователя
  const handleEdit = (user) => {
    setModalMode('edit');
    setCurrentUser(user);

    setFormData({
      username: user.username,
      password: '', // Пароль пустой при редактировании
      role: user.role,
      fullName: user.fullName || ''
    });

    setFormError(null);
    setShowModal(true);
  };

  // Обработчик удаления пользователя
  const handleDelete = async (id) => {
    if (!window.confirm('Вы уверены, что хотите удалить этого пользователя?')) return;

    try {
      await authApi.deleteUser(id);

      // Обновляем список после удаления
      setUsers(prev => prev.filter(user => user.id !== id));
    } catch (err) {
      console.error('Ошибка при удалении пользователя:', err);
      alert('Произошла ошибка при удалении пользователя. Пожалуйста, попробуйте снова.');
    }
  };

  // Закрытие модального окна
  const handleCloseModal = () => {
    setShowModal(false);
  };

  // Валидация формы
  const validateForm = () => {
    if (!formData.username) {
      setFormError('Логин обязателен для заполнения');
      return false;
    }

    if (modalMode === 'create' && !formData.password) {
      setFormError('Пароль обязателен для заполнения');
      return false;
    }

    return true;
  };

  // Обработчик отправки формы
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      if (modalMode === 'create') {
        const response = await authApi.createUser(formData);

        // Добавляем нового пользователя в список
        setUsers(prev => [...prev, response.data]);
      } else {
        // При редактировании отправляем пароль только если он был изменен
        const userData = { ...formData };
        if (!userData.password) {
          delete userData.password;
        }

        const response = await authApi.updateUser(currentUser.id, userData);

        // Обновляем пользователя в списке
        setUsers(prev =>
          prev.map(user => user.id === currentUser.id ? response.data : user)
        );
      }

      // Закрываем модальное окно
      setShowModal(false);
    } catch (err) {
      console.error('Ошибка при сохранении пользователя:', err);
      setFormError(
        err.response?.data?.message ||
        'Произошла ошибка при сохранении пользователя. Пожалуйста, попробуйте снова.'
      );
    }
  };

  return (
    <div>
      <Card>
        <Row style={{ justifyContent: 'space-between', marginBottom: '20px' }}>
          <Column>
            <Subtitle>Управление пользователями</Subtitle>
          </Column>

          <Column style={{ flexGrow: 0 }}>
            <Button onClick={handleCreate}>Добавить пользователя</Button>
          </Column>
        </Row>

        {loading ? (
          <div>Загрузка...</div>
        ) : error ? (
          <div>{error}</div>
        ) : users.length === 0 ? (
          <div>Нет пользователей</div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Логин</Th>
                <Th>ФИО</Th>
                <Th>Роль</Th>
                <Th>Действия</Th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <Td>{user.username}</Td>
                  <Td>{user.fullName || '-'}</Td>
                  <Td>{user.role === 'admin' ? 'Администратор' : 'Редактор'}</Td>
                  <Td>
                    <ActionButton
                      onClick={() => handleEdit(user)}
                      color="#5AC8FA"
                    >
                      Изменить
                    </ActionButton>
                    <ActionButton
                      onClick={() => handleDelete(user.id)}
                      color="#FF3B30"
                      disabled={user.role === 'admin'} // Нельзя удалить администратора
                    >
                      Удалить
                    </ActionButton>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {/* Модальное окно для создания/редактирования */}
      {showModal && (
        <Modal>
          <ModalContent>
            <ModalHeader>
              <Title>{modalMode === 'create' ? 'Добавить пользователя' : 'Редактировать пользователя'}</Title>
              <CloseButton onClick={handleCloseModal}>&times;</CloseButton>
            </ModalHeader>

            <form onSubmit={handleSubmit}>
              <FormGroup>
                <FormLabel>Логин *</FormLabel>
                <Input
                  name="username"
                  value={formData.username}
                  onChange={handleFormChange}
                  placeholder="Введите логин"
                  required
                />
              </FormGroup>

              <FormGroup>
                <FormLabel>
                  {modalMode === 'create' ? 'Пароль *' : 'Новый пароль (оставьте пустым, чтобы не менять)'}
                </FormLabel>
                <Input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleFormChange}
                  placeholder="Введите пароль"
                  required={modalMode === 'create'}
                />
              </FormGroup>

              <FormGroup>
                <FormLabel>Роль</FormLabel>
                <Select
                  name="role"
                  value={formData.role}
                  onChange={handleFormChange}
                >
                  <option value="editor">Редактор</option>
                  <option value="admin">Администратор</option>
                </Select>
              </FormGroup>

              <FormGroup>
                <FormLabel>ФИО</FormLabel>
                <Input
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleFormChange}
                  placeholder="Введите ФИО (необязательно)"
                />
              </FormGroup>

              {formError && <ErrorMessage>{formError}</ErrorMessage>}

              <Row>
                <Column>
                  <Button type="button" onClick={handleCloseModal} secondary>
                    Отмена
                  </Button>
                </Column>
                <Column>
                  <Button type="submit">
                    {modalMode === 'create' ? 'Добавить' : 'Сохранить'}
                  </Button>
                </Column>
              </Row>
            </form>
          </ModalContent>
        </Modal>
      )}
    </div>
  );
};

export default UserManagement;