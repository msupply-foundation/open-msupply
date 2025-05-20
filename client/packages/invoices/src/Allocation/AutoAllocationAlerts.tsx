import React from 'react';
import { AllocationAlerts } from '../StockOut';
import { useAllocationContext } from './useAllocationContext';
import { getAllocatedQuantity } from './utils';

export const AutoAllocationAlerts = () => {
  const { alerts } = useAllocationContext(state => ({
    autoAllocate: state.autoAllocate,
    alerts: state.alerts,
    allocatedQuantity: getAllocatedQuantity(state),
    allocateIn: state.allocateIn,
  }));

  return <AllocationAlerts allocationAlerts={alerts} />;
};
