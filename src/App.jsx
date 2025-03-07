import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import styled, { createGlobalStyle } from 'styled-components';

// Pages
import HomePage from './components/pages/HomePage';
import SchedulePage from './components/pages/SchedulePage';
import LoginPage from './components/pages/LoginPage';
import AdminPage from './components/pages/AdminPage';

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
          <Route path="/" element={<HomePage />} />
          <Route path="/schedule/:type/:id" element={<SchedulePage />} />
          <Route path="/schedule/:type/:id/:semester/:week" element={<SchedulePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin/*" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppContainer>
    </Router>
  );
}

export default App;