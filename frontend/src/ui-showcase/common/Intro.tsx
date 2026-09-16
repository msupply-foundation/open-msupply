import type { JSX } from 'solid-js';
import { Text } from '../../ui/elements/typography/Text';
import styles from './Intro.module.css';

/**
 * Standalone intro paragraph at the top of a page, outside any card — the
 * page stack provides its spacing. A veneer over the app Text primitive:
 * Text owns the type style; the class adds only colour, measure, and the
 * code chips.
 */
export const Intro = (props: { children: JSX.Element }) => (
  <Text variant="body" class={styles.intro}>
    {props.children}
  </Text>
);
