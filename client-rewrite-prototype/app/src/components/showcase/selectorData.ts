/*
 * Sample data for the Selectors showcase — shaped like the real outbound-shipment
 * domain (items with a code, name, pack size and available stock) so the
 * autocomplete demonstrates the actual item picker, not a toy string list.
 */

export interface DemoItem {
  code: string;
  name: string;
  packSize: number;
  availableStock: number;
}

export const ITEMS: DemoItem[] = [
  { code: 'AMX500', name: 'Amoxicillin 500mg capsules', packSize: 100, availableStock: 2400 },
  { code: 'PCM500', name: 'Paracetamol 500mg tablets', packSize: 1000, availableStock: 18000 },
  { code: 'ORS20', name: 'Oral Rehydration Salts sachets', packSize: 50, availableStock: 620 },
  { code: 'AMOX125', name: 'Amoxicillin 125mg/5ml suspension', packSize: 1, availableStock: 340 },
  { code: 'IBU200', name: 'Ibuprofen 200mg tablets', packSize: 500, availableStock: 0 },
  { code: 'METRO400', name: 'Metronidazole 400mg tablets', packSize: 100, availableStock: 1500 },
  { code: 'CIPRO500', name: 'Ciprofloxacin 500mg tablets', packSize: 100, availableStock: 880 },
  { code: 'DOXY100', name: 'Doxycycline 100mg capsules', packSize: 100, availableStock: 1200 },
  { code: 'ARTLUM', name: 'Artemether/Lumefantrine 20/120mg tablets', packSize: 24, availableStock: 430 },
  { code: 'ZINC20', name: 'Zinc sulfate 20mg dispersible tablets', packSize: 100, availableStock: 990 },
  { code: 'GLOVEM', name: 'Examination gloves, nitrile, medium', packSize: 200, availableStock: 5600 },
  { code: 'SYR5ML', name: 'Syringe, disposable, 5ml with needle', packSize: 100, availableStock: 7300 },
  { code: 'GAUZE10', name: 'Gauze swabs, sterile, 10x10cm', packSize: 100, availableStock: 2100 },
  { code: 'RDT-MAL', name: 'Malaria rapid diagnostic test kit', packSize: 25, availableStock: 150 },
  { code: 'VITA-A', name: 'Vitamin A 200,000 IU capsules', packSize: 500, availableStock: 3400 },
];

/** Short fixed enum — the classic native-<select> case. */
export const PACK_UNITS = [
  { value: 'each', label: 'Each' },
  { value: 'box', label: 'Box' },
  { value: 'vial', label: 'Vial' },
  { value: 'bottle', label: 'Bottle' },
  { value: 'sachet', label: 'Sachet' },
  { value: 'ampoule', label: 'Ampoule' },
];

/** Fixed list, but each option carries a status colour — needs a styled popup. */
export interface StatusOption {
  value: string;
  label: string;
  color: string;
}

export const INVOICE_STATUSES: StatusOption[] = [
  { value: 'new', label: 'New', color: 'var(--gray-main)' },
  { value: 'allocated', label: 'Allocated', color: 'var(--secondary-main)' },
  { value: 'picked', label: 'Picked', color: 'var(--color-warning)' },
  { value: 'shipped', label: 'Shipped', color: 'var(--primary-main)' },
  { value: 'delivered', label: 'Delivered', color: '#2e9e5b' },
  { value: 'verified', label: 'Verified', color: '#1f7a44' },
];
