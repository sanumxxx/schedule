import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import styled, { createGlobalStyle } from 'styled-components';

// Pages
import HomePage from './components/pages/HomePage';
import SchedulePage from './components/pages/SchedulePage';
import LoginPage from './components/pages/LoginPage';
import AdminPage from './components/pages/AdminPage';
import ReportsListPage from './components/pages/ReportsListPage';
import DisciplineLessonsReport from './components/pages/DisciplineLessonsReport';

// Admin components for nested routes
import ScheduleEditor from './components/admin/ScheduleEditor';
import ScheduleImport from './components/admin/ScheduleImport';
import UserManagement from './components/admin/UserManagement';
import TimeSlotManager from './components/admin/TimeSlotManager';
import LessonTypeSettings from './components/admin/LessonTypeSettings';

// Global styles
const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }
  
  body {
    background-color: #f6f6f6;
    color: #333;
  }
  
  a {
    text-decoration: none;
    color: inherit;
  }
`;

const AppContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px;
`;

function App() {
  return (
    <Router>
      <GlobalStyle />
      <AppContainer>
        <Routes>
          {/* Main routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/schedule/:type/:id" element={<SchedulePage />} />
          <Route path="/schedule/:type/:id/:semester/:week" element={<SchedulePage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Admin routes with nested routes */}
          <Route path="/admin/*" element={<AdminPage />}>
            {/* These routes are handled inside AdminPage component */}
            <Route path="editor" element={<ScheduleEditor />} />
            <Route path="import" element={<ScheduleImport />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="time_slots" element={<TimeSlotManager />} />
            <Route path="lesson_types" element={<LessonTypeSettings />} />
            <Route path="settings" element={<div>Страница настроек (в разработке)</div>} />
          </Route>

          {/* Reports routes */}
          <Route path="/reports" element={<ReportsListPage />} />
          <Route path="/reports/discipline-lessons" element={<DisciplineLessonsReport />} />

          {/* Catch-all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppContainer>
    </Router>
  );
}

export default App;   