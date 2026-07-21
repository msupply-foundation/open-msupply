import { Show } from 'solid-js';
import { MessageSquareIcon } from '../../icons';
import { t } from '../../../intl';
import { Popover, type PopoverPlacement } from './Popover';
import styles from './Comment.module.css';

export interface CommentProps {
  /** The comment text. When empty/nullish the whole component renders nothing. */
  comment?: string | null;
  /** Popover heading and the trigger's accessible name. Defaults to the
      localised "Comment". */
  label?: string;
  /** Preferred popover side/alignment. Default 'bottom-end' (the current app's
      comment cell opens down-and-across from the icon). */
  placement?: PopoverPlacement;
  /** `data-testid` stamped on the trigger button (e2e/TESTIDS.md). */
  triggerTestId?: string;
}

/*
 * Comment — a quiet comment icon that reveals its text in a popover (a bold
 * heading over the body) on hover/focus, and on click/tap too (so it opens on
 * touch, where there's no hover). Matches the current app's PopoverCell role,
 * ported to the native Popover (see kdd/own-simple-buy-hard); used in list
 * tables' comment column and anywhere a note hides behind an icon. Renders
 * nothing when there is no comment — so callers can drop it into a cell
 * unconditionally.
 *
 * The wrapping span swallows click bubbling so tapping the comment inside a
 * clickable table row doesn't also fire the row's navigation (same guard as
 * ColourTagPicker). It catches bubbling from both the trigger button and the
 * panel — the [popover] panel renders in the top layer but stays a DOM
 * descendant, so its clicks bubble here too.
 */
export const Comment = (props: CommentProps) => (
  <Show when={props.comment}>
    {comment => (
      <span class={styles.wrapper} onClick={e => e.stopPropagation()}>
        <Popover
          openOnHover
          placement={props.placement ?? 'bottom-end'}
          trigger={<MessageSquareIcon />}
          triggerLabel={props.label ?? t('label.comment')}
          triggerClass={styles.trigger}
          triggerTestId={props.triggerTestId}
          class={styles.panel}
        >
          <div class={styles.heading}>{props.label ?? t('label.comment')}</div>
          <p class={styles.body}>{comment()}</p>
        </Popover>
      </span>
    )}
  </Show>
);
