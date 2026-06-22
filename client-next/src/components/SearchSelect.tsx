import { useState, type ReactNode } from 'react';
import { CheckIcon, ChevronsUpDownIcon, XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Spinner } from '@/components/ui/spinner';

interface SearchSelectProps<T> {
  value: T | null;
  onChange: (value: T | null) => void;
  options: T[];
  getOptionLabel: (option: T) => string;
  /** Stable identity for an option (was MUI isOptionEqualToValue). */
  getOptionKey: (option: T) => string;
  /** Custom row renderer; defaults to the label. */
  renderOption?: (option: T) => ReactNode;
  /** Server-side search: called as the user types (debounce upstream). */
  onInputChange?: (input: string) => void;
  loading?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  clearable?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  loadingText?: string;
  noOptionsText?: string;
  className?: string;
}

/**
 * Combobox replacing MUI Autocomplete. Built on Command + Popover. Filtering is
 * disabled (`shouldFilter={false}`) so server-side search results aren't
 * re-filtered locally — feed it already-filtered `options`.
 */
export function SearchSelect<T>({
  value,
  onChange,
  options,
  getOptionLabel,
  getOptionKey,
  renderOption,
  onInputChange,
  loading,
  disabled,
  autoFocus,
  clearable,
  placeholder,
  searchPlaceholder,
  loadingText = 'Loading…',
  noOptionsText = 'No results',
  className,
}: SearchSelectProps<T>) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          autoFocus={autoFocus}
          className={cn(
            'h-9 w-full justify-between font-normal',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <span className="truncate">
            {value ? getOptionLabel(value) : (placeholder ?? 'Select…')}
          </span>
          {clearable && value ? (
            <XIcon
              className="size-4 shrink-0 opacity-50 hover:opacity-100"
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                onChange(null);
              }}
            />
          ) : (
            <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder ?? placeholder}
            onValueChange={onInputChange}
          />
          <CommandList>
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Spinner className="size-4" />
                {loadingText}
              </div>
            ) : (
              <CommandEmpty>{noOptionsText}</CommandEmpty>
            )}
            {options.map(option => {
              const key = getOptionKey(option);
              const selected = value != null && getOptionKey(value) === key;
              return (
                <CommandItem
                  key={key}
                  value={key}
                  onSelect={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                >
                  <CheckIcon
                    className={cn(
                      'size-4',
                      selected ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {renderOption ? renderOption(option) : getOptionLabel(option)}
                </CommandItem>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
