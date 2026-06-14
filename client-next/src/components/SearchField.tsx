import { useEffect, useRef, useState } from 'react';
import { InputAdornment, TextField } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

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
    <TextField
      size="small"
      value={local}
      placeholder={placeholder}
      onChange={e => handle(e.target.value)}
      sx={{ width: 260 }}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
