export { ArrowLeft } from './ArrowLeft';
export { Book } from './Book';
export { CheckboxChecked } from './CheckboxChecked';
export { CheckboxIndeterminate } from './CheckboxIndeterminate';
export { CheckboxEmpty } from './CheckboxEmpty';
export { ChevronDown } from './ChevronDown';
export { Close } from './Close';
export { Customers } from './Customers';
export { Dashboard } from './Dashboard';
export { Download } from './Download';
export { Invoice } from './Invoice';
export { MenuDots } from './MenuDots';
export { Messages } from './Messages';
export { MSupplyGuy } from './MSupplyGuy';
export { PlusCircle } from './PlusCircle';
export { Power } from './Power';
export { Printer } from './Printer';
export { Radio } from './Radio';
export { Reports } from './Reports';
export { Settings } from './Settings';
export { SortAsc } from './SortAsc';
export { SortDesc } from './SortDesc';
export { Stock } from './Stock';
export { Suppliers } from './Suppliers';
export { Tools } from './Tools';
export { Translate } from './Translate';
export { UnhappyMan } from './UnhappyMan';
export { Circle } from './Circle';

type Color =
  | 'inherit'
  | 'action'
  | 'disabled'
  | 'primary'
  | 'secondary'
  | 'error'
  | 'info'
  | 'success'
  | 'warning';

export interface SvgIconProps {
  color: Color;
}
