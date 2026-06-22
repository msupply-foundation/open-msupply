import { useEffect, useRef, useState } from 'react';
import { SearchIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface SearchFieldProps {
  /** Current committed value (from the URL search state). */
  value: string;
  /** Called with the new value after the debounce window. */
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

/**
 * Debounced search input. Types update locally immediately; `onChange` fires
 * once typing settles, so list pages can push it to the URL without a refetch
 * per keystroke. Re-syncs if `value` changes externally (e.g. back button).
 */
export function SearchField({
  value,
  onChange,
  placeholder,
  debounceMs = 300,
}: SearchFieldProps) {
  const [local, setLocal] = useState(value);
  useEffect(() => setLocal(value), [value]);

  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const handle = (next: string) => {
    setLocal(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange(next), debounceMs);
  };

  return (
    <div className="relative w-[260px]">
      <SearchIcon className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={local}
        placeholder={placeholder}
        onChange={e => handle(e.target.value)}
        className="ps-8"
      />
    </div>
  );
}
