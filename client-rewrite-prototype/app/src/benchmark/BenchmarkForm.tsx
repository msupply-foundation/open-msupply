import { useMemo } from 'react';
import { fieldPath } from '@/benchmark/config';
import { FieldInput } from '@/benchmark/fields/FieldInput';
import { ReadersPanel } from '@/benchmark/readers/Readers';
import styles from './BenchmarkForm.module.css';

/*
 * The form under test: N controlled inputs plus the reactive readers. Its own render
 * boundary never moves during typing — state lives in the tier's context/store and is
 * consumed by the leaf components — so a keystroke's render count is exactly the set
 * of leaves that had to update. That's the number the HUD reports.
 */
export const BenchmarkForm = ({ fields }: { fields: number }) => {
  const paths = useMemo(
    () => Array.from({ length: fields }, (_, i) => fieldPath(i)),
    [fields]
  );

  return (
    <div className={styles.form}>
      <ReadersPanel />
      <div className={styles.grid}>
        {paths.map((path, index) => (
          <FieldInput key={path} path={path} index={index} />
        ))}
      </div>
    </div>
  );
};
