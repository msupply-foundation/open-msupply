export { ArrowLeft } from './ArrowLeft';
export { ArrowRightIcon } from './ArrowRight';
export { Book } from './Book';
export { CheckIcon } from './Check';
export { CheckboxChecked } from './CheckboxChecked';
export { CheckboxIndeterminate } from './CheckboxIndeterminate';
export { CheckboxEmpty } from './CheckboxEmpty';
export { ChevronDown } from './ChevronDown';
export { Circle } from './Circle';
export { Close } from './Close';
export { Clock } from './Clock';
export { Copy } from './Copy';
export { Customers } from './Customers';
export { Dashboard } from './Dashboard';
export { Delete } from './Delete';
export { Download } from './Download';
export { Edit } from './Edit';
export { Home } from './Home';
export { InvoiceIcon } from './Invoice';
export { MenuDots } from './MenuDots';
export { Messages } from './Messages';
export { MSupplyGuy } from './MSupplyGuy';
export { PlusCircle } from './PlusCircle';
export { Power } from './Power';
export { Printer } from './Printer';
export { Radio } from './Radio';
export { Reports } from './Reports';
export { Rewind } from './Rewind';
export { Settings } from './Settings';
export { SortAsc } from './SortAsc';
export { SortDesc } from './SortDesc';
export { Stock } from './Stock';
export { Suppliers } from './Suppliers';
export { Tools } from './Tools';
export { Translate } from './Translate';
export { UnhappyMan } from './UnhappyMan';
export { UserIcon } from './User';
export { XCircleIcon } from './XCircle';

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
  fontSize?: 'small' | 'medium' | 'large' | 'inherit';
}
