import React from 'react';
import { TabsContainer, Tab } from './StyledComponents';

const TabView = ({ tabs, activeTab, onTabChange }) => {
  return (
    <TabsContainer>
      {tabs.map((tab, index) => (
        <Tab
          key={index}
          active={activeTab === tab.id}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </Tab>
      ))}
    </TabsContainer>
  );
};

export default TabView;