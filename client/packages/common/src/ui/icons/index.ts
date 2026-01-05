// Icons sourced from https://feathericons.com/

export { AlertIcon } from './Alert';
export { ArrowLeftIcon } from './ArrowLeft';
export { ArrowRightIcon } from './ArrowRight';
export { BarIcon } from './Bar';
export { BarChartIcon } from './BarChart';
export { BarChart2Icon } from './BarChart2';
export { BookIcon } from './Book';
export { CartIcon } from './Cart';
export { CentralIcon } from './Central';
export { CheckIcon } from './Check';
export { CheckCircleIcon } from './CheckCircle';
export { CheckboxCheckedIcon } from './CheckboxChecked';
export { CheckboxEmptyIcon } from './CheckboxEmpty';
export { CheckboxIndeterminateIcon } from './CheckboxIndeterminate';
export { ChevronDownIcon } from './ChevronDown';
export { ChevronsDownIcon } from './ChevronsDown';
export { CircleAlertIcon } from './CircleAlert';
export { CircleIcon } from './Circle';
export { ClockIcon } from './Clock';
export { CloseIcon } from './Close';
export { CollapseIcon } from './Collapse';
export { ColumnsIcon } from './Columns';
export { CopyIcon } from './Copy';
export { CameraIcon } from './Camera';
export { CustomersIcon } from './Customers';
export { DashboardIcon } from './Dashboard';
export { DeleteIcon } from './Delete';
export { UploadIcon } from './Upload';
export { EditIcon } from './Edit';
export { EmergencyIcon } from './Emergency';
export { ExpandIcon } from './Expand';
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
export { LocationIcon } from './Location';
export { MaximiseIcon } from './Maximise';
export { MailIcon } from './Mail';
export { MSupplyGuy, AnimatedMSupplyGuy } from './MSupplyGuy';
export { MedicineIcon } from './MedicineIcon';
export { MenuDotsIcon } from './MenuDots';
export { MessageSquareIcon } from './MessageSquare';
export { MessagesIcon } from './Messages';
export { MinimiseIcon } from './Minimise';
export { MinusIcon } from './Minus';
export { MinusCircleIcon } from './MinusCircle';
export { PlusIcon } from './Plus';
export { PlusCircleIcon } from './PlusCircle';
export { PowerIcon } from './Power';
export { PrinterIcon } from './Printer';
export { QrCodeScannerIcon } from './QrCodeScanner';
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
export { SwipeIcon } from './Swipe';
export { ThermometerIcon } from './Thermometer';
export { ToolsIcon } from './Tools';
export { TranslateIcon } from './Translate';
export { TrendingDownIcon } from './TrendingDown';
export { TruckIcon } from './Truck';
export { TuneIcon } from './Tune';
export { UnhappyMan } from './UnhappyMan';
export { DownloadIcon } from './Download';
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
