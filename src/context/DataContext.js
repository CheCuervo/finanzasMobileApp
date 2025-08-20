import { createContext, useContext, useState } from 'react';

const DataContext = createContext();

export const useData = () => {
  return useContext(DataContext);
};

export const DataProvider = ({ children }) => {
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = () => {
    setRefreshKey(prevKey => prevKey + 1);
  };

  const value = {
    refreshKey,
    triggerRefresh,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
