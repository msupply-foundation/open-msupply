export { AlertIcon } from './Alert';
export { ArrowLeftIcon } from './ArrowLeft';
export { ArrowRightIcon } from './ArrowRight';
export { BarChartIcon } from './BarChart';
export { BookIcon } from './Book';
export { CartIcon } from './Cart';
export { CheckboxCheckedIcon } from './CheckboxChecked';
export { CheckboxEmptyIcon } from './CheckboxEmpty';
export { CheckboxIndeterminateIcon } from './CheckboxIndeterminate';
export { CheckIcon } from './Check';
export { ChevronDownIcon } from './ChevronDown';
export { ChevronsDownIcon } from './ChevronsDown';
export { CircleIcon } from './Circle';
export { ClockIcon } from './Clock';
export { CloseIcon } from './Close';
export { ColumnsIcon } from './Columns';
export { CopyIcon } from './Copy';
export { CustomersIcon } from './Customers';
export { DashboardIcon } from './Dashboard';
export { DeleteIcon } from './Delete';
export { DownloadIcon } from './Download';
export { EditIcon } from './Edit';
export { ExternalLinkIcon } from './ExternalLink';
export { EyeIcon } from './Eye';
export { EyeOffIcon } from './EyeOff';
export { FilterIcon } from './Filter';
export { HomeIcon } from './Home';
export { InfoIcon } from './Info';
export { InvoiceIcon } from './Invoice';
export { ListIcon } from './ListIcon';
export { MenuDotsIcon } from './MenuDots';
export { MessagesIcon } from './Messages';
export { MessageSquareIcon } from './MessageSquare';
export { MinusCircleIcon } from './MinusCircle';
export { MSupplyGuy, AnimatedMSupplyGuy } from './MSupplyGuy';
export { PlusCircleIcon } from './PlusCircle';
export { PowerIcon } from './Power';
export { PrinterIcon } from './Printer';
export { RadioIcon } from './Radio';
export { ReportsIcon } from './Reports';
export { RefreshIcon } from './Refresh';
export { RewindIcon } from './Rewind';
export { SaveIcon } from './Save';
export { ScanIcon } from './Scan';
export { SettingsIcon } from './Settings';
export { SortAscIcon } from './SortAsc';
export { SortDescIcon } from './SortDesc';
export { StockIcon } from './Stock';
export { SuppliersIcon } from './Suppliers';
export { ToolsIcon } from './Tools';
export { TranslateIcon } from './Translate';
export { TruckIcon } from './Truck';
export { UnhappyMan } from './UnhappyMan';
export { UserIcon } from './User';
export { XCircleIcon } from './XCircle';
export { MedicineIcon } from './MedicineIcon';
export { SidebarIcon } from './Sidebar';
export { SearchIcon } from './Search';
export { ZapIcon } from './Zap';

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
