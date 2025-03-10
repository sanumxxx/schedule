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

// This would be imported from your API file
const lessonTypesApi = {
  getLessonTypes: async () => {
    // Fetch from backend
    // For now return mock data
    return {
      data: [
        {
          id: 1,
          type_name: 'Лекция',
          db_values: ['лек.', 'л.', 'лекция'],
          full_name: 'Лекция',
          hours_multiplier: 2,
          color: '#E9F0FC'
        },
        {
          id: 2,
          type_name: 'Практика',
          db_values: ['пр.', 'практ.', 'практика'],
          full_name: 'Практическое занятие',
          hours_multiplier: 2,
          color: '#E3F9E5'
        },
      ]
    };
  },
  createLessonType: async (data) => {
    // Would send to backend
    console.log('Creating lesson type:', data);
    return {
      data: {
        id: Math.floor(Math.random() * 1000),
        ...data
      }
    };
  },
  updateLessonType: async (id, data) => {
    // Would send to backend
    console.log('Updating lesson type:', id, data);
    return {
      data: {
        id,
        ...data
      }
    };
  },
  deleteLessonType: async (id) => {
    // Would send to backend
    console.log('Deleting lesson type:', id);
    return { success: true };
  }
};

// Styled components
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

const ColorPreview = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: inline-block;
  margin-right: 8px;
  vertical-align: middle;
  background-color: ${props => props.color || '#CCCCCC'};
  border: 1px solid rgba(0, 0, 0, 0.1);
`;

const ColorPickerWrapper = styled.div`
  position: relative;
  margin-bottom: 16px;
`;

const ColorPickerPreview = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 4px;
  background-color: ${props => props.color};
  border: 1px solid rgba(0, 0, 0, 0.1);
  cursor: pointer;
  margin-top: 8px;
`;

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

const VariantField = styled.div`
  margin-bottom: 12px;
`;

const VariantRow = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const StyledHelpText = styled.p`
  font-size: 14px;
  color: ${colors.gray};
  margin: 8px 0 16px 0;
`;

const LessonTypeSettings = () => {
  const [lessonTypes, setLessonTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal and form state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [currentType, setCurrentType] = useState(null);
  const [formData, setFormData] = useState({
    type_name: '',
    db_values: ['', '', ''],
    full_name: '',
    hours_multiplier: 2,
    color: '#E9F0FC'
  });
  const [formError, setFormError] = useState(null);

  // Fetch lesson types on component mount
  useEffect(() => {
    const fetchLessonTypes = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await lessonTypesApi.getLessonTypes();
        setLessonTypes(response.data);
      } catch (err) {
        console.error('Error fetching lesson types:', err);
        setError('Произошла ошибка при загрузке типов занятий');
      } finally {
        setLoading(false);
      }
    };

    fetchLessonTypes();
  }, []);

  // Open modal to create new lesson type
  const handleCreate = () => {
    setModalMode('create');
    setFormData({
      type_name: '',
      db_values: ['', '', ''],
      full_name: '',
      hours_multiplier: 2,
      color: '#E9F0FC'
    });
    setFormError(null);
    setShowModal(true);
  };

  // Open modal to edit lesson type
  const handleEdit = (type) => {
    setModalMode('edit');
    setCurrentType(type);

    // Ensure db_values is an array of length 3
    const db_values = Array.isArray(type.db_values) ?
      [...type.db_values, '', '', ''].slice(0, 3) :
      ['', '', ''];

    setFormData({
      type_name: type.type_name || '',
      db_values: db_values,
      full_name: type.full_name || '',
      hours_multiplier: type.hours_multiplier || 2,
      color: type.color || '#E9F0FC'
    });

    setFormError(null);
    setShowModal(true);
  };

  // Delete a lesson type
  const handleDelete = async (id) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот тип занятия?')) return;

    try {
      await lessonTypesApi.deleteLessonType(id);
      setLessonTypes(prev => prev.filter(type => type.id !== id));
    } catch (err) {
      console.error('Error deleting lesson type:', err);
      alert('Произошла ошибка при удалении типа занятия');
    }
  };

  // Close the modal
  const handleCloseModal = () => {
    setShowModal(false);
  };

  // Handle form field changes
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle changes to db values (the variations)
  const handleDbValueChange = (index, value) => {
    const newDbValues = [...formData.db_values];
    newDbValues[index] = value;

    setFormData(prev => ({
      ...prev,
      db_values: newDbValues
    }));
  };

  // Form validation
  const validateForm = () => {
    if (!formData.type_name.trim()) {
      setFormError('Название типа занятия обязательно');
      return false;
    }

    if (!formData.db_values[0].trim()) {
      setFormError('Хотя бы одно обозначение в БД обязательно');
      return false;
    }

    return true;
  };

  // Submit the form
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      // Filter out empty db values
      const cleanedData = {
        ...formData,
        db_values: formData.db_values.filter(v => v.trim() !== '')
      };

      if (modalMode === 'create') {
        const response = await lessonTypesApi.createLessonType(cleanedData);
        setLessonTypes(prev => [...prev, response.data]);
      } else {
        const response = await lessonTypesApi.updateLessonType(currentType.id, cleanedData);
        setLessonTypes(prev =>
          prev.map(type => type.id === currentType.id ? response.data : type)
        );
      }

      setShowModal(false);
    } catch (err) {
      console.error('Error saving lesson type:', err);
      setFormError('Произошла ошибка при сохранении типа занятия');
    }
  };

  return (
    <div>
      <Card>
        <Row style={{ justifyContent: 'space-between', marginBottom: '20px' }}>
          <Column>
            <Subtitle>Настройка типов занятий</Subtitle>
            <StyledHelpText>
              Здесь вы можете настроить соответствие между обозначениями типов занятий в базе данных и их отображением в интерфейсе.
            </StyledHelpText>
          </Column>

          <Column style={{ flexGrow: 0 }}>
            <Button onClick={handleCreate}>Добавить тип занятия</Button>
          </Column>
        </Row>

        {loading ? (
          <div>Загрузка...</div>
        ) : error ? (
          <div>{error}</div>
        ) : lessonTypes.length === 0 ? (
          <div>Типы занятий не найдены. Добавьте первый тип, нажав кнопку выше.</div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Тип занятия</Th>
                <Th>Обозначения в БД</Th>
                <Th>Полное название</Th>
                <Th>Ак. часов</Th>
                <Th>Цвет</Th>
                <Th>Действия</Th>
              </tr>
            </thead>
            <tbody>
              {lessonTypes.map(type => (
                <tr key={type.id}>
                  <Td>{type.type_name}</Td>
                  <Td>{Array.isArray(type.db_values) ? type.db_values.join(', ') : type.db_values}</Td>
                  <Td>{type.full_name}</Td>
                  <Td>{type.hours_multiplier}</Td>
                  <Td>
                    <ColorPreview color={type.color} />
                    {type.color}
                  </Td>
                  <Td>
                    <ActionButton
                      onClick={() => handleEdit(type)}
                      color={colors.secondary}
                    >
                      Изменить
                    </ActionButton>
                    <ActionButton
                      onClick={() => handleDelete(type.id)}
                      color={colors.danger}
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

      {/* Modal for creating/editing lesson types */}
      {showModal && (
        <Modal>
          <ModalContent>
            <ModalHeader>
              <Title>
                {modalMode === 'create' ? 'Добавить тип занятия' : 'Редактировать тип занятия'}
              </Title>
              <CloseButton onClick={handleCloseModal}>&times;</CloseButton>
            </ModalHeader>

            <form onSubmit={handleSubmit}>
              <FormGroup>
                <FormLabel>Название типа занятия *</FormLabel>
                <Input
                  name="type_name"
                  value={formData.type_name}
                  onChange={handleFormChange}
                  placeholder="Например: Лекция"
                  required
                />
              </FormGroup>

              <FormGroup>
                <FormLabel>Полное название</FormLabel>
                <Input
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleFormChange}
                  placeholder="Например: Лекционное занятие"
                />
                <StyledHelpText>
                  Полное название для отображения в отчетах и интерфейсе
                </StyledHelpText>
              </FormGroup>

              <FormGroup>
                <FormLabel>Обозначения в базе данных *</FormLabel>
                <StyledHelpText>
                  Укажите варианты обозначений этого типа занятия в базе данных
                </StyledHelpText>

                <VariantField>
                  {formData.db_values.map((value, index) => (
                    <VariantRow key={index}>
                      <Input
                        value={value}
                        onChange={(e) => handleDbValueChange(index, e.target.value)}
                        placeholder={`Вариант ${index + 1} (например: лек.)`}
                        required={index === 0}
                      />
                    </VariantRow>
                  ))}
                </VariantField>
              </FormGroup>

              <Row>
                <Column>
                  <FormGroup>
                    <FormLabel>Академических часов</FormLabel>
                    <Input
                      type="number"
                      name="hours_multiplier"
                      value={formData.hours_multiplier}
                      onChange={handleFormChange}
                      min="1"
                      max="8"
                    />
                    <StyledHelpText>
                      Количество академических часов за одно занятие
                    </StyledHelpText>
                  </FormGroup>
                </Column>

                <Column>
                  <FormGroup>
                    <FormLabel>Цвет в расписании</FormLabel>
                    <Input
                      type="color"
                      name="color"
                      value={formData.color}
                      onChange={handleFormChange}
                      style={{ width: '100%', height: '40px' }}
                    />
                    <StyledHelpText>
                      Выберите цвет для отображения в расписании
                    </StyledHelpText>
                  </FormGroup>
                </Column>
              </Row>

              {formError && <ErrorMessage>{formError}</ErrorMessage>}

              <Row style={{ marginTop: '20px' }}>
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

export default LessonTypeSettings;