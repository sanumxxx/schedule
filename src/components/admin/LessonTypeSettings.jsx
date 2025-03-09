import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import {
  PageContainer,
  Title,
  Card,
  Button,
  Select,
  Input,
  colors,
  FormGroup,
  FormLabel,
  ErrorMessage
} from '../common/StyledComponents';
import Header from '../common/Header';
import { scheduleApi, teacherWorkloadApi, lessonTypesApi } from '../../api/api';

// Custom styled components for this page
const FilterContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 20px;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const FilterGroup = styled.div`
  flex: 1;
  min-width: 200px;
  
  @media (max-width: 768px) {
    width: 100%;
  }
`;

const StatsCard = styled(Card)`
  margin-bottom: 20px;
  padding: 16px;
  
  h3 {
    margin-top: 0;
    margin-bottom: 12px;
    font-size: 18px;
    color: ${colors.primary};
  }
`;

const WorkloadTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 20px;
`;

const TableHeader = styled.th`
  text-align: left;
  padding: 12px;
  border-bottom: 1px solid ${colors.lightGray};
  background-color: #f9f9f9;
`;

const TableCell = styled.td`
  padding: 12px;
  border-bottom: 1px solid ${colors.lightGray};
`;

const WorkloadDetails = styled.div`
  margin-top: 30px;
`;

const SectionTitle = styled.h3`
  font-size: 18px;
  margin-bottom: 16px;
  color: ${colors.primary};
`;

const TeacherWorkloadReport = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);

  // State for filters
  const [semester, setSemester] = useState(queryParams.get('semester') || '1');
  const [selectedTeacher, setSelectedTeacher] = useState(queryParams.get('teacher') || '');
  const [searchTeacher, setSearchTeacher] = useState('');

  // Data states
  const [teachers, setTeachers] = useState([]);
  const [workloadData, setWorkloadData] = useState(null);
  const [lessonTypes, setLessonTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load teachers on component mount
  useEffect(() => {
    fetchTeachers();
    fetchLessonTypes();
  }, []);

  // Load workload data when teacher or semester changes
  useEffect(() => {
    if (selectedTeacher) {
      fetchWorkloadData();

      // Update URL with new filters
      const params = new URLSearchParams();
      params.set('semester', semester);
      params.set('teacher', selectedTeacher);
      navigate({ search: params.toString() }, { replace: true });
    }
  }, [selectedTeacher, semester]);

  const fetchTeachers = async () => {
    try {
      const response = await scheduleApi.getTeachers();
      setTeachers(response.data);
    } catch (err) {
      console.error('Error fetching teachers:', err);
      setError('Не удалось загрузить список преподавателей');
    }
  };

  const fetchLessonTypes = async () => {
    try {
      const response = await lessonTypesApi.getLessonTypes();
      setLessonTypes(response.data);
    } catch (err) {
      console.error('Error fetching lesson types:', err);
      // Don't show error to user, just log it
    }
  };

  const fetchWorkloadData = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await teacherWorkloadApi.getTeacherWorkload(selectedTeacher, semester);
      setWorkloadData(response.data);
    } catch (err) {
      console.error('Error fetching workload data:', err);
      setError('Не удалось загрузить данные о нагрузке преподавателя');
      setWorkloadData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleTeacherSearch = async (e) => {
    const value = e.target.value;
    setSearchTeacher(value);

    try {
      const response = await scheduleApi.getTeachers(value);
      setTeachers(response.data);
    } catch (err) {
      console.error('Error searching teachers:', err);
    }
  };

  const handleExportToExcel = async () => {
    try {
      await teacherWorkloadApi.exportTeacherWorkloadToExcel(selectedTeacher, semester);
    } catch (err) {
      console.error('Error exporting to Excel:', err);
      setError('Не удалось экспортировать отчет в Excel');
    }
  };

  // Helper functions for calculating workload statistics
  const getLessonTypeMultiplier = (lessonType) => {
    const typeConfig = lessonTypes.find(type =>
      type.db_value === lessonType ||
      type.db_value.toLowerCase() === lessonType.toLowerCase()
    );

    return typeConfig ? typeConfig.hours_multiplier : 2; // Default to 2 hours if not found
  };

  const getLessonTypeName = (lessonType) => {
    const typeConfig = lessonTypes.find(type =>
      type.db_value === lessonType ||
      type.db_value.toLowerCase() === lessonType.toLowerCase()
    );

    return typeConfig ? typeConfig.full_name : lessonType;
  };

  const calculateTotalHours = (lessons) => {
    if (!lessons || !lessons.length) return 0;

    return lessons.reduce((total, lesson) => {
      const multiplier = getLessonTypeMultiplier(lesson.lesson_type);
      return total + multiplier;
    }, 0);
  };

  // Generate sample workload data for development
  const generateSampleWorkload = () => {
    return {
      teacher_name: selectedTeacher,
      total_lessons: 45,
      semester: semester,
      academic_hours: 90,
      lessons_by_type: [
        { type: 'лек', count: 15, hours: 30 },
        { type: 'пр', count: 20, hours: 40 },
        { type: 'лаб', count: 10, hours: 20 },
      ],
      lessons_by_discipline: [
        { discipline: 'Математика', count: 20, hours: 40 },
        { discipline: 'Программирование', count: 15, hours: 30 },
        { discipline: 'Физика', count: 10, hours: 20 },
      ],
      lessons_by_group: [
        { group: 'ИСТ-01', count: 20, hours: 40 },
        { group: 'ИСТ-02', count: 15, hours: 30 },
        { group: 'ПМ-01', count: 10, hours: 20 },
      ],
      lessons: [
        {
          id: 1,
          date: '2023-09-01',
          time_start: '08:00',
          time_end: '09:20',
          weekday: 1,
          subject: 'Математика',
          group_name: 'ИСТ-01',
          lesson_type: 'лек',
        },
        // More lessons would be here in real data
      ]
    };
  };

  // If no actual data is returned, use sample data (for development)
  const workload = workloadData || (selectedTeacher ? generateSampleWorkload() : null);

  return (
    <PageContainer>
      <Header />

      <Title>Отчет о нагрузке преподавателя</Title>

      <p style={{ color: colors.gray, marginBottom: '24px' }}>
        Просмотр и анализ учебной нагрузки преподавателя с детализацией по дисциплинам,
        типам занятий и группам.
      </p>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      <FilterContainer>
        <FilterGroup>
          <FormLabel>Преподаватель</FormLabel>
          <Input
            type="text"
            placeholder="Поиск преподавателя..."
            value={searchTeacher}
            onChange={handleTeacherSearch}
          />
          <Select
            value={selectedTeacher}
            onChange={e => setSelectedTeacher(e.target.value)}
            style={{ marginTop: '8px' }}
          >
            <option value="">Выберите преподавателя</option>
            {teachers.map(teacher => (
              <option key={teacher.teacher_name} value={teacher.teacher_name}>
                {teacher.teacher_name}
              </option>
            ))}
          </Select>
        </FilterGroup>

        <FilterGroup>
          <FormLabel>Семестр</FormLabel>
          <Select value={semester} onChange={e => setSemester(e.target.value)}>
            <option value="1">1 семестр</option>
            <option value="2">2 семестр</option>
          </Select>
        </FilterGroup>
      </FilterContainer>

      {selectedTeacher ? (
        loading ? (
          <Card>
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <div style={{ marginBottom: '16px' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                  <line x1="12" y1="2" x2="12" y2="6"></line>
                  <line x1="12" y1="18" x2="12" y2="22"></line>
                  <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                  <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                  <line x1="2" y1="12" x2="6" y2="12"></line>
                  <line x1="18" y1="12" x2="22" y2="12"></line>
                  <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                  <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                </svg>
              </div>
              <div>Загрузка данных...</div>
            </div>
          </Card>
        ) : workload ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
              <Button onClick={handleExportToExcel}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Экспорт в Excel
              </Button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              <StatsCard>
                <h3>Общая статистика</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Всего занятий:</span>
                    <strong>{workload.total_lessons}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Академических часов:</span>
                    <strong>{workload.academic_hours}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Семестр:</span>
                    <strong>{workload.semester}</strong>
                  </div>
                </div>
              </StatsCard>

              <StatsCard>
                <h3>Часы по типам занятий</h3>
                {workload.lessons_by_type.map((item, index) => (
                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span>{getLessonTypeName(item.type)}:</span>
                    <strong>{item.hours} ч. ({item.count} зан.)</strong>
                  </div>
                ))}
              </StatsCard>

              <StatsCard>
                <h3>Часы по дисциплинам</h3>
                {workload.lessons_by_discipline.map((item, index) => (
                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span>{item.discipline}:</span>
                    <strong>{item.hours} ч. ({item.count} зан.)</strong>
                  </div>
                ))}
              </StatsCard>
            </div>

            <WorkloadDetails>
              <SectionTitle>Детализация нагрузки</SectionTitle>

              <Card>
                <WorkloadTable>
                  <thead>
                    <tr>
                      <TableHeader>Дата</TableHeader>
                      <TableHeader>Время</TableHeader>
                      <TableHeader>Дисциплина</TableHeader>
                      <TableHeader>Тип</TableHeader>
                      <TableHeader>Группа</TableHeader>
                      <TableHeader>Акад. часы</TableHeader>
                    </tr>
                  </thead>
                  <tbody>
                    {workload.lessons.map(lesson => (
                      <tr key={lesson.id}>
                        <TableCell>{lesson.date}</TableCell>
                        <TableCell>{`${lesson.time_start} - ${lesson.time_end}`}</TableCell>
                        <TableCell>{lesson.subject}</TableCell>
                        <TableCell>{getLessonTypeName(lesson.lesson_type)}</TableCell>
                        <TableCell>{lesson.group_name}</TableCell>
                        <TableCell>{getLessonTypeMultiplier(lesson.lesson_type)}</TableCell>
                      </tr>
                    ))}
                  </tbody>
                </WorkloadTable>
              </Card>
            </WorkloadDetails>
          </>
        ) : (
          <Card>
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <p>Нет данных о нагрузке для выбранного преподавателя в указанном семестре.</p>
            </div>
          </Card>
        )
      ) : (
        <Card>
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p>Выберите преподавателя для просмотра отчета о нагрузке.</p>
          </div>
        </Card>
      )}

      <style jsx="true">{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </PageContainer>
  );
};

export default TeacherWorkloadReport;