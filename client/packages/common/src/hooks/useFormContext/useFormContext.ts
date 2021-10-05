import create from 'zustand';
import { Item } from '../..';

type FormContext = {
  item: Item;
  setItem: (item: Item) => void;
};

export const useFormContext = create<FormContext>(set => ({
  item: {
    code: '',
    name: '',
    id: '',
    quantity: 0,
    setQuantity: () => ({}),
  },
  setItem: item => set(state => ({ ...state, item })),
}));
