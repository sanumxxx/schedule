import React, { useState } from 'react';
import styled from 'styled-components';
import { colors } from './StyledComponents';

const SearchContainer = styled.div`
  margin-bottom: 20px;
  position: relative;
`;

const SearchInput = styled.input`
  width: 100%;
  font-size: 16px;
  padding: 12px 16px;
  padding-left: 40px;
  border-radius: 10px;
  border: 1px solid ${colors.lightGray};
  background-color: ${colors.white};
  outline: none;
  
  &:focus {
    border-color: ${colors.primary};
    box-shadow: 0 0 0 1px ${colors.primary}33;
  }
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: ${colors.gray};
  width: 16px;
  height: 16px;
`;

const SearchBar = ({ onSearch, placeholder = 'Поиск...' }) => {
  const [searchText, setSearchText] = useState('');

  const handleChange = (e) => {
    const text = e.target.value;
    setSearchText(text);
    onSearch(text);
  };

  return (
    <SearchContainer>
      <SearchIcon>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </SearchIcon>
      <SearchInput
        type="text"
        placeholder={placeholder}
        value={searchText}
        onChange={handleChange}
      />
    </SearchContainer>
  );
};

export default SearchBar;