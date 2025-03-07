import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  Card,
  Button,
  Input,
  FormGroup,
  FormLabel,
  ErrorMessage,
  Title,
  Subtitle,
  Row,
  Column,
  colors
} from '../common/StyledComponents';
import { timeSlotsApi } from '../../api/api';

// Стилизованные компоненты
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

// Модальное окно
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

const TimeSlotRow = styled.tr`
  background-color: ${props => props.isDragging ? '#f0f0f0' : 'white'};
  transition: background-color 0.2s;
`;

const TimeSlotManager = () => {
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Состояние модального окна
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' или 'edit'
  const [currentSlot, setCurrentSlot] = useState(null);

  // Состояние формы
  const [formData, setFormData] = useState({
    time_start: '',
    time_end: '',
    is_active: true
  });

  const [formError, setFormError] = useState(null);

  // Загрузка временных слотов при монтировании компонента
  useEffect(() => {
    const fetchTimeSlots = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await timeSlotsApi.getTimeSlots();
        setTimeSlots(response.data);
      } catch (err) {
        console.error('Ошибка при загрузке временных слотов:', err);
        setError('Произошла ошибка при загрузке данных. Пожалуйста, попробуйте снова.');
      } finally {
        setLoading(false);
      }
    };

    fetchTimeSlots();
  }, []);

  // Обработчик изменения формы
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Открытие модального окна для создания нового временного слота
  const handleCreate = () => {
    setModalMode('create');
    setFormData({
      time_start: '',
      time_end: '',
      is_active: true
    });
    setFormError(null);
    setShowModal(true);
  };

  // Открытие модального окна для редактирования временного слота
  const handleEdit = (slot) => {
    setModalMode('edit');
    setCurrentSlot(slot);
    setFormData({
      time_start: slot.time_start,
      time_end: slot.time_end,
      is_active: slot.is_active
    });
    setFormError(null);
    setShowModal(true);
  };

  // Удаление временного слота
  const handleDelete = async (id) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот временной слот?')) return;

    try {
      await timeSlotsApi.deleteTimeSlot(id);
      setTimeSlots(prev => prev.filter(slot => slot.id !== id));
    } catch (err) {
      console.error('Ошибка при удалении временного слота:', err);
      alert('Произошла ошибка при удалении. Пожалуйста, попробуйте снова.');
    }
  };

  // Закрытие модального окна
  const handleCloseModal = () => {
    setShowModal(false);
  };

  // Валидация формы
  const validateForm = () => {
    // Валидация формата времени: ЧЧ:ММ
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

    if (!formData.time_start || !timeRegex.test(formData.time_start)) {
      setFormError('Введите корректное время начала в формате ЧЧ:ММ');
      return false;
    }

    if (!formData.time_end || !timeRegex.test(formData.time_end)) {
      setFormError('Введите корректное время окончания в формате ЧЧ:ММ');
      return false;
    }

    return true;
  };

  // Отправка формы
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      if (modalMode === 'create') {
        const response = await timeSlotsApi.createTimeSlot(formData);
        setTimeSlots(prev => [...prev, response.data].sort((a, b) => a.slot_number - b.slot_number));
      } else {
        const response = await timeSlotsApi.updateTimeSlot(currentSlot.id, formData);
        setTimeSlots(prev => prev.map(slot =>
          slot.id === currentSlot.id ? response.data : slot
        ));
      }

      setShowModal(false);
    } catch (err) {
      console.error('Ошибка при сохранении временного слота:', err);
      setFormError(
        err.response?.data?.message ||
        'Произошла ошибка при сохранении. Пожалуйста, попробуйте снова.'
      );
    }
  };

  // Инициализация стандартных временных слотов
  const handleInitDefaults = async () => {
    if (!window.confirm('Вы уверены, что хотите инициализировать временные слоты по умолчанию?')) return;

    try {
      await timeSlotsApi.initDefaultTimeSlots();

      // Перезагрузка временных слотов
      const response = await timeSlotsApi.getTimeSlots();
      setTimeSlots(response.data);

      alert('Временные слоты успешно инициализированы!');
    } catch (err) {
      console.error('Ошибка при инициализации временных слотов:', err);
      alert('Произошла ошибка при инициализации. Возможно, слоты уже существуют.');
    }
  };

  // Изменение порядка слотов
  const handleMoveUp = (index) => {
    if (index === 0) return; // Уже в начале списка

    const newSlots = [...timeSlots];
    const temp = newSlots[index].slot_number;
    newSlots[index].slot_number = newSlots[index - 1].slot_number;
    newSlots[index - 1].slot_number = temp;

    // Сортировка по slot_number
    newSlots.sort((a, b) => a.slot_number - b.slot_number);
    setTimeSlots(newSlots);

    // Сохранение нового порядка на сервере
    const updateOrder = async () => {
      try {
        await timeSlotsApi.reorderTimeSlots(
          newSlots.map((slot, idx) => ({ id: slot.id, slot_number: idx + 1 }))
        );
      } catch (err) {
        console.error('Ошибка при изменении порядка слотов:', err);
        alert('Произошла ошибка при сохранении порядка. Пожалуйста, обновите страницу.');
      }
    };

    updateOrder();
  };

  const handleMoveDown = (index) => {
    if (index === timeSlots.length - 1) return; // Уже в конце списка

    const newSlots = [...timeSlots];
    const temp = newSlots[index].slot_number;
    newSlots[index].slot_number = newSlots[index + 1].slot_number;
    newSlots[index + 1].slot_number = temp;

    // Сортировка по slot_number
    newSlots.sort((a, b) => a.slot_number - b.slot_number);
    setTimeSlots(newSlots);

    // Сохранение нового порядка на сервере
    const updateOrder = async () => {
      try {
        await timeSlotsApi.reorderTimeSlots(
          newSlots.map((slot, idx) => ({ id: slot.id, slot_number: idx + 1 }))
        );
      } catch (err) {
        console.error('Ошибка при изменении порядка слотов:', err);
        alert('Произошла ошибка при сохранении порядка. Пожалуйста, обновите страницу.');
      }
    };

    updateOrder();
  };

  return (
    <div>
      <Card>
        <Row style={{ justifyContent: 'space-between', marginBottom: '20px' }}>
          <Column>
            <Subtitle>Управление временными слотами занятий</Subtitle>
          </Column>

          <Column style={{ flexGrow: 0 }}>
            <Button onClick={handleCreate}>Добавить слот</Button>

            {timeSlots.length === 0 && (
              <Button onClick={handleInitDefaults} style={{ marginLeft: '10px' }}>
                Инициализировать
              </Button>
            )}
          </Column>
        </Row>

        {loading ? (
          <div>Загрузка...</div>
        ) : error ? (
          <div>{error}</div>
        ) : timeSlots.length === 0 ? (
          <div>Временные слоты не найдены. Нажмите "Инициализировать" для создания стандартных слотов.</div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th style={{ width: '60px' }}>№</Th>
                <Th>Начало</Th>
                <Th>Окончание</Th>
                <Th>Статус</Th>
                <Th>Порядок</Th>
                <Th>Действия</Th>
              </tr>
            </thead>
            <tbody>
              {timeSlots.map((slot, index) => (
                <TimeSlotRow key={slot.id}>
                  <Td>{index + 1}</Td>
                  <Td>{slot.time_start}</Td>
                  <Td>{slot.time_end}</Td>
                  <Td>
                    {slot.is_active ? (
                      <span style={{ color: colors.success }}>Активен</span>
                    ) : (
                      <span style={{ color: colors.gray }}>Неактивен</span>
                    )}
                  </Td>
                  <Td>
                    <ActionButton
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      color={colors.secondary}
                    >
                      ↑
                    </ActionButton>
                    <ActionButton
                      onClick={() => handleMoveDown(index)}
                      disabled={index === timeSlots.length - 1}
                      color={colors.secondary}
                    >
                      ↓
                    </ActionButton>
                  </Td>
                  <Td>
                    <ActionButton
                      onClick={() => handleEdit(slot)}
                      color={colors.secondary}
                    >
                      Изменить
                    </ActionButton>
                    <ActionButton
                      onClick={() => handleDelete(slot.id)}
                      color={colors.danger}
                    >
                      Удалить
                    </ActionButton>
                  </Td>
                </TimeSlotRow>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {/* Модальное окно для создания/редактирования временных слотов */}
      {showModal && (
        <Modal>
          <ModalContent>
            <ModalHeader>
              <Title>
                {modalMode === 'create' ? 'Добавить временной слот' : 'Редактировать временной слот'}
              </Title>
              <CloseButton onClick={handleCloseModal}>&times;</CloseButton>
            </ModalHeader>

            <form onSubmit={handleSubmit}>
              <Row>
                <Column>
                  <FormGroup>
                    <FormLabel>Время начала *</FormLabel>
                    <Input
                      name="time_start"
                      value={formData.time_start}
                      onChange={handleFormChange}
                      placeholder="Например: 08:00"
                      required
                    />
                  </FormGroup>
                </Column>

                <Column>
                  <FormGroup>
                    <FormLabel>Время окончания *</FormLabel>
                    <Input
                      name="time_end"
                      value={formData.time_end}
                      onChange={handleFormChange}
                      placeholder="Например: 09:20"
                      required
                    />
                  </FormGroup>
                </Column>
              </Row>

              <FormGroup>
                <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleFormChange}
                    style={{ marginRight: '8px' }}
                  />
                  <span>Активен</span>
                </label>
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

export default TimeSlotManager;