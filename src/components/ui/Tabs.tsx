// src/components/ui/Tabs.tsx
import React, { useState } from 'react';

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  defaultActiveTab?: string;
  onTabChange?: (tabId: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  defaultActiveTab,
  onTabChange,
}) => {
  const [activeTab, setActiveTab] = useState(defaultActiveTab || tabs[0]?.id);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    onTabChange?.(tabId);
  };

  const activeTabContent = tabs.find(tab => tab.id === activeTab)?.content;

  return (
    <div className="w-full">
      {/* Tab Headers */}
      <div className="border-b-2 border-black bg-gray-50">
        <div className="flex space-x-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && handleTabChange(tab.id)}
              disabled={tab.disabled}
              className={`
                px-6 py-3 font-medium border-r-2 border-black transition-all duration-200
                ${activeTab === tab.id
                  ? 'bg-[#7ca1eb] text-white border-b-0 translate-y-[2px] shadow-[0px_-2px_0px_0px_rgba(0,0,0,1)]'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border-b-2'
                }
                ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white border-2 border-black border-t-0 p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        {activeTabContent}
      </div>
    </div>
  );
};