import React from 'react';

import Tab from './Tab';

const Tabs = ({ children, activeTab, setActiveTab }) => (
  <div className="tabs">
    <ol className="tab-list">
      {children.map((child) => {
        if (!child.props) {
          return undefined;
        }
        const { label } = child.props;

        return (
          <Tab
            active={activeTab === label}
            key={label}
            label={label}
            onClick={(tab) => setActiveTab(tab)}
          />
        );
      })}
    </ol>
    <div className="tab-content">
      {children.map((child) => {
        if (!child.props || child.props.label !== activeTab) {
          return undefined;
        }
        return child.props.children;
      })}
    </div>
  </div>
);

export default Tabs;
