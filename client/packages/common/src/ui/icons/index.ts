// Icons sourced from https://feathericons.com/

export { AlertIcon } from './Alert';
export { ArrowLeftIcon } from './ArrowLeft';
export { ArrowRightIcon } from './ArrowRight';
export { BarChartIcon } from './BarChart';
export { BookIcon } from './Book';
export { CartIcon } from './Cart';
export { CentralIcon } from './Central';
export { CheckIcon } from './Check';
export { CheckboxCheckedIcon } from './CheckboxChecked';
export { CheckboxEmptyIcon } from './CheckboxEmpty';
export { CheckboxIndeterminateIcon } from './CheckboxIndeterminate';
export { ChevronDownIcon } from './ChevronDown';
export { ChevronsDownIcon } from './ChevronsDown';
export { CircleAlertIcon } from './CircleAlert';
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
export { FileIcon } from './File';
export { FileUploadIcon } from './FileUpload';
export { FilterIcon } from './Filter';
export { HelpIcon } from './Help';
export { HomeIcon } from './Home';
export { InfoIcon } from './Info';
export { InfoOutlineIcon } from './InfoOutline';
export { InvoiceIcon } from './Invoice';
export { LinkIcon } from './Link';
export { ListIcon } from './List';
export { MSupplyGuy, AnimatedMSupplyGuy } from './MSupplyGuy';
export { MedicineIcon } from './MedicineIcon';
export { MenuDotsIcon } from './MenuDots';
export { MessageSquareIcon } from './MessageSquare';
export { MessagesIcon } from './Messages';
export { MinusCircleIcon } from './MinusCircle';
export { PlusCircleIcon } from './PlusCircle';
export { PowerIcon } from './Power';
export { PrinterIcon } from './Printer';
export { RadioIcon } from './Radio';
export { RefreshIcon } from './Refresh';
export { ReportsIcon } from './Reports';
export { RewindIcon } from './Rewind';
export { SaveIcon } from './Save';
export { ScanIcon } from './Scan';
export { SearchIcon } from './Search';
export { SettingsIcon } from './Settings';
export { SettingsCircleIcon } from './SettingsCircle';
export { SidebarIcon } from './Sidebar';
export { SlidersIcon } from './Sliders';
export { SnowflakeIcon } from './Snowflake';
export { SortAscIcon } from './SortAsc';
export { SortDescIcon } from './SortDesc';
export { StockIcon } from './Stock';
export { SunIcon } from './Sun';
export { SuppliersIcon } from './Suppliers';
export { ThermometerIcon } from './Thermometer';
export { ToolsIcon } from './Tools';
export { TranslateIcon } from './Translate';
export { BarChart2Icon } from './BarChart2';
export { TruckIcon } from './Truck';
export { UnhappyMan } from './UnhappyMan';
export { UploadIcon } from './Upload';
export { UserCircleIcon } from './UserCircle';
export { UserIcon } from './User';
export { XCircleIcon } from './XCircle';
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
