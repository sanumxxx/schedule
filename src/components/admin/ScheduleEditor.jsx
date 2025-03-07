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
import SearchBar from '../common/SearchBar';
import { scheduleApi, timeSlotsApi } from '../../api/api';

// Стили для таблицы расписания
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
  max-width: 600px;
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

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid rgba(0, 122, 255, 0.2);
  border-radius: 50%;
  border-top-color: #007AFF;
  animation: spin 1s ease-in-out infinite;
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const ScheduleEditor = () => {
  const [scheduleItems, setScheduleItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');

  // Состояние для модального окна
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' или 'edit'
  const [currentItem, setCurrentItem] = useState(null);

  // Состояние для фильтрации
  const [filters, setFilters] = useState({
    semester: '',
    week_number: '',
    group_name: '',
    teacher_name: ''
  });

  // Состояние для временных слотов
  const [timeSlots, setTimeSlots] = useState([]);
  const [timeSlotsLoading, setTimeSlotsLoading] = useState(true);

  // Состояние для формы
  const [formData, setFormData] = useState({
    semester: 1,
    week_number: 1,
    group_name: '',
    course: 1,
    faculty: '',
    subject: '',
    lesson_type: 'лек.',
    subgroup: 0,
    date: '',
    time_start: '',
    time_end: '',
    weekday: 1,
    teacher_name: '',
    auditory: ''
  });

  const [formError, setFormError] = useState(null);

  // Загрузка данных при монтировании компонента и изменении фильтров или поиска
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Загрузка временных слотов
        if (timeSlotsLoading) {
          try {
            const timeSlotsResponse = await timeSlotsApi.getTimeSlots();
            const activeSlots = timeSlotsResponse.data
              .filter(slot => slot.is_active)
              .sort((a, b) => a.slot_number - b.slot_number);
            setTimeSlots(activeSlots);

            // Установка значений по умолчанию для формы, если есть временные слоты
            if (activeSlots.length > 0) {
              setFormData(prev => ({
                ...prev,
                time_start: activeSlots[0].time_start,
                time_end: activeSlots[0].time_end
              }));
            }
          } catch (err) {
            console.error('Ошибка при загрузке временных слотов:', err);
          } finally {
            setTimeSlotsLoading(false);
          }
        }

        // Формируем параметры запроса из фильтров
        const params = { ...filters };

        // Добавляем поисковый запрос, если он есть
        if (searchText) {
          params.search = searchText;
        }

        const response = await scheduleApi.getAllSchedule(params);
        setScheduleItems(response.data);
      } catch (err) {
        console.error('Ошибка при загрузке расписания:', err);
        setError('Произошла ошибка при загрузке расписания. Пожалуйста, попробуйте снова.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters, searchText, timeSlotsLoading]);

  // Обработчик поиска
  const handleSearch = (text) => {
    setSearchText(text);
  };

  // Обработчик изменения фильтров
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Обработчик сброса фильтров
  const handleResetFilters = () => {
    setFilters({
      semester: '',
      week_number: '',
      group_name: '',
      teacher_name: ''
    });
    setSearchText('');
  };

  // Обработчик изменения формы
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Открытие модального окна для создания записи
  const handleCreate = () => {
    setModalMode('create');

    // Установка значений по умолчанию
    const defaultFormData = {
      semester: 1,
      week_number: 1,
      group_name: '',
      course: 1,
      faculty: '',
      subject: '',
      lesson_type: 'лек.',
      subgroup: 0,
      date: new Date().toISOString().split('T')[0],
      weekday: 1,
      teacher_name: '',
      auditory: ''
    };

    // Добавляем значения времени из первого доступного временного слота
    if (timeSlots.length > 0) {
      defaultFormData.time_start = timeSlots[0].time_start;
      defaultFormData.time_end = timeSlots[0].time_end;
    } else {
      defaultFormData.time_start = '08:00';
      defaultFormData.time_end = '09:20';
    }

    setFormData(defaultFormData);
    setFormError(null);
    setShowModal(true);
  };

  // Открытие модального окна для редактирования записи
  const handleEdit = (item) => {
    setModalMode('edit');
    setCurrentItem(item);

    // Преобразуем поля к нужному формату
    const formattedItem = {
      ...item,
      date: item.date // Предполагается, что дата приходит в формате YYYY-MM-DD
    };

    setFormData(formattedItem);
    setFormError(null);
    setShowModal(true);
  };

  // Обработчик удаления записи
  const handleDelete = async (id) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту запись?')) return;

    try {
      await scheduleApi.deleteScheduleItem(id);

      // Обновляем список после удаления
      setScheduleItems(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error('Ошибка при удалении записи:', err);
      alert('Произошла ошибка при удалении записи. Пожалуйста, попробуйте снова.');
    }
  };

  // Закрытие модального окна
  const handleCloseModal = () => {
    setShowModal(false);
  };

  // Валидация формы
  const validateForm = () => {
    const requiredFields = [
      'semester', 'week_number', 'group_name', 'course',
      'subject', 'date', 'time_start', 'time_end', 'weekday'
    ];

    for (const field of requiredFields) {
      if (!formData[field]) {
        setFormError(`Поле "${field}" обязательно для заполнения`);
        return false;
      }
    }

    return true;
  };

  // Обработчик отправки формы
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      if (modalMode === 'create') {
        const response = await scheduleApi.createScheduleItem(formData);

        // Добавляем новую запись в список
        setScheduleItems(prev => [...prev, response.data]);
      } else {
        const response = await scheduleApi.updateScheduleItem(currentItem.id, formData);

        // Обновляем запись в списке
        setScheduleItems(prev =>
          prev.map(item => item.id === currentItem.id ? response.data : item)
        );
      }

      // Закрываем модальное окно
      setShowModal(false);
    } catch (err) {
      console.error('Ошибка при сохранении расписания:', err);
      setFormError(
        err.response?.data?.message ||
        'Произошла ошибка при сохранении расписания. Пожалуйста, попробуйте снова.'
      );
    }
  };

  return (
    <div>
      <Card style={{ marginBottom: '20px' }}>
        <Subtitle>Фильтры</Subtitle>
        <Row>
          <Column>
            <FormGroup>
              <FormLabel>Семестр</FormLabel>
              <Select
                name="semester"
                value={filters.semester}
                onChange={handleFilterChange}
              >
                <option value="">Все</option>
                <option value="1">1 семестр</option>
                <option value="2">2 семестр</option>
              </Select>
            </FormGroup>
          </Column>

          <Column>
            <FormGroup>
              <FormLabel>Неделя</FormLabel>
              <Select
                name="week_number"
                value={filters.week_number}
                onChange={handleFilterChange}
              >
                <option value="">Все</option>
                {Array.from({ length: 18 }, (_, i) => i + 1).map(num => (
                  <option key={num} value={num}>{num} неделя</option>
                ))}
              </Select>
            </FormGroup>
          </Column>

          <Column>
            <FormGroup>
              <FormLabel>Группа</FormLabel>
              <Input
                name="group_name"
                value={filters.group_name}
                onChange={handleFilterChange}
                placeholder="Введите группу"
              />
            </FormGroup>
          </Column>

          <Column>
            <FormGroup>
              <FormLabel>Преподаватель</FormLabel>
              <Input
                name="teacher_name"
                value={filters.teacher_name}
                onChange={handleFilterChange}
                placeholder="Введите преподавателя"
              />
            </FormGroup>
          </Column>
        </Row>

        <Button onClick={handleResetFilters} secondary>Сбросить фильтры</Button>
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between', marginBottom: '20px' }}>
          <Column>
            <SearchBar
              onSearch={handleSearch}
              placeholder="Поиск по предмету, аудитории..."
            />
          </Column>

          <Column style={{ flexGrow: 0 }}>
            <Button onClick={handleCreate}>Добавить занятие</Button>
          </Column>
        </Row>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <LoadingSpinner />
            <div style={{ marginTop: '12px' }}>Загрузка...</div>
          </div>
        ) : error ? (
          <div>{error}</div>
        ) : scheduleItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#8E8E93' }}>
            Нет данных
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <Table>
              <thead>
                <tr>
                  <Th>Группа</Th>
                  <Th>Предмет</Th>
                  <Th>Тип</Th>
                  <Th>Дата</Th>
                  <Th>Время</Th>
                  <Th>Аудитория</Th>
                  <Th>Преподаватель</Th>
                  <Th>Действия</Th>
                </tr>
              </thead>
              <tbody>
                {scheduleItems.map(item => (
                  <tr key={item.id}>
                    <Td>{item.group_name}</Td>
                    <Td>{item.subject}</Td>
                    <Td>{item.lesson_type}</Td>
                    <Td>{item.date}</Td>
                    <Td>{item.time_start}-{item.time_end}</Td>
                    <Td>{item.auditory}</Td>
                    <Td>{item.teacher_name}</Td>
                    <Td>
                      <ActionButton
                        onClick={() => handleEdit(item)}
                        color="#5AC8FA"
                      >
                        Изменить
                      </ActionButton>
                      <ActionButton
                        onClick={() => handleDelete(item.id)}
                        color="#FF3B30"
                      >
                        Удалить
                      </ActionButton>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card>

      {/* Модальное окно для создания/редактирования */}
      {showModal && (
        <Modal>
          <ModalContent>
            <ModalHeader>
              <Title>{modalMode === 'create' ? 'Добавить занятие' : 'Редактировать занятие'}</Title>
              <CloseButton onClick={handleCloseModal}>&times;</CloseButton>
            </ModalHeader>

            <form onSubmit={handleSubmit}>
              <Row>
                <Column>
                  <FormGroup>
                    <FormLabel>Семестр *</FormLabel>
                    <Select
                      name="semester"
                      value={formData.semester}
                      onChange={handleFormChange}
                      required
                    >
                      <option value={1}>1 семестр</option>
                      <option value={2}>2 семестр</option>
                    </Select>
                  </FormGroup>
                </Column>

                <Column>
                  <FormGroup>
                    <FormLabel>Неделя *</FormLabel>
                    <Select
                      name="week_number"
                      value={formData.week_number}
                      onChange={handleFormChange}
                      required
                    >
                      {Array.from({ length: 18 }, (_, i) => i + 1).map(num => (
                        <option key={num} value={num}>{num} неделя</option>
                      ))}
                    </Select>
                  </FormGroup>
                </Column>

                <Column>
                  <FormGroup>
                    <FormLabel>Курс *</FormLabel>
                    <Select
                      name="course"
                      value={formData.course}
                      onChange={handleFormChange}
                      required
                    >
                      {Array.from({ length: 6 }, (_, i) => i + 1).map(num => (
                        <option key={num} value={num}>{num} курс</option>
                      ))}
                    </Select>
                  </FormGroup>
                </Column>
              </Row>

              <Row>
                <Column>
                  <FormGroup>
                    <FormLabel>Группа *</FormLabel>
                    <Input
                      name="group_name"
                      value={formData.group_name}
                      onChange={handleFormChange}
                      placeholder="Например: 2411-0101.1"
                      required
                    />
                  </FormGroup>
                </Column>

                <Column>
                  <FormGroup>
                    <FormLabel>Факультет</FormLabel>
                    <Input
                      name="faculty"
                      value={formData.faculty}
                      onChange={handleFormChange}
                      placeholder="Например: Технический факультет"
                    />
                  </FormGroup>
                </Column>
              </Row>

              <FormGroup>
                <FormLabel>Предмет *</FormLabel>
                <Input
                  name="subject"
                  value={formData.subject}
                  onChange={handleFormChange}
                  placeholder="Название предмета"
                  required
                />
              </FormGroup>

              <Row>
                <Column>
                  <FormGroup>
                    <FormLabel>Тип занятия</FormLabel>
                    <Select
                      name="lesson_type"
                      value={formData.lesson_type}
                      onChange={handleFormChange}
                    >
                      <option value="лек.">Лекция</option>
                      <option value="пр.">Практика</option>
                      <option value="лаб.">Лабораторная</option>
                      <option value="сем.">Семинар</option>
                      <option value="конс.">Консультация</option>
                    </Select>
                  </FormGroup>
                </Column>

                <Column>
                  <FormGroup>
                    <FormLabel>Подгруппа</FormLabel>
                    <Select
                      name="subgroup"
                      value={formData.subgroup}
                      onChange={handleFormChange}
                    >
                      <option value={0}>Общая</option>
                      <option value={1}>Подгруппа 1</option>
                      <option value={2}>Подгруппа 2</option>
                    </Select>
                  </FormGroup>
                </Column>
              </Row>

              <Row>
                <Column>
                  <FormGroup>
                    <FormLabel>Дата *</FormLabel>
                    <Input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleFormChange}
                      required
                    />
                  </FormGroup>
                </Column>

                <Column>
                  <FormGroup>
                    <FormLabel>День недели *</FormLabel>
                    <Select
                      name="weekday"
                      value={formData.weekday}
                      onChange={handleFormChange}
                      required
                    >
                      <option value={1}>Понедельник</option>
                      <option value={2}>Вторник</option>
                      <option value={3}>Среда</option>
                      <option value={4}>Четверг</option>
                      <option value={5}>Пятница</option>
                      <option value={6}>Суббота</option>
                    </Select>
                  </FormGroup>
                </Column>
              </Row>

              <Row>
                <Column>
                  <FormGroup>
                    <FormLabel>Время начала *</FormLabel>
                    <Select
                      name="time_start"
                      value={formData.time_start}
                      onChange={handleFormChange}
                      required
                      disabled={timeSlotsLoading}
                    >
                      {timeSlotsLoading ? (
                        <option value="">Загрузка...</option>
                      ) : timeSlots.length > 0 ? (
                        timeSlots.map(slot => (
                          <option key={`start_${slot.id}`} value={slot.time_start}>{slot.time_start}</option>
                        ))
                      ) : (
                        <>
                          <option value="08:00">08:00</option>
                          <option value="09:30">09:30</option>
                          <option value="11:10">11:10</option>
                          <option value="12:40">12:40</option>
                          <option value="14:10">14:10</option>
                          <option value="15:40">15:40</option>
                          <option value="17:10">17:10</option>
                          <option value="18:40">18:40</option>
                        </>
                      )}
                    </Select>
                  </FormGroup>
                </Column>

                <Column>
                  <FormGroup>
                    <FormLabel>Время окончания *</FormLabel>
                    <Select
                      name="time_end"
                      value={formData.time_end}
                      onChange={handleFormChange}
                      required
                      disabled={timeSlotsLoading}
                    >
                      {timeSlotsLoading ? (
                        <option value="">Загрузка...</option>
                      ) : timeSlots.length > 0 ? (
                        timeSlots.map(slot => (
                          <option key={`end_${slot.id}`} value={slot.time_end}>{slot.time_end}</option>
                        ))
                      ) : (
                        <>
                          <option value="09:20">09:20</option>
                          <option value="10:50">10:50</option>
                          <option value="12:30">12:30</option>
                          <option value="14:00">14:00</option>
                          <option value="15:30">15:30</option>
                          <option value="17:00">17:00</option>
                          <option value="18:30">18:30</option>
                          <option value="20:00">20:00</option>
                        </>
                      )}
                    </Select>
                  </FormGroup>
                </Column>
              </Row>

              <Row>
                <Column>
                  <FormGroup>
                    <FormLabel>Преподаватель</FormLabel>
                    <Input
                      name="teacher_name"
                      value={formData.teacher_name}
                      onChange={handleFormChange}
                      placeholder="ФИО преподавателя"
                    />
                  </FormGroup>
                </Column>

                <Column>
                  <FormGroup>
                    <FormLabel>Аудитория</FormLabel>
                    <Input
                      name="auditory"
                      value={formData.auditory}
                      onChange={handleFormChange}
                      placeholder="Номер аудитории"
                    />
                  </FormGroup>
                </Column>
              </Row>

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

export default ScheduleEditor;