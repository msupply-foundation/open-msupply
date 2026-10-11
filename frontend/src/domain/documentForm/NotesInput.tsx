/*
 * The notes list: every note of a document's `Note[]`, one accordion item
 * each, as a deployment's JSON Forms `Notes` control drew them. A closed item
 * shows the note's first line, an open one the whole note; both name its
 * author and when it was written. A new note goes at the end of the list and
 * is stamped with the signed-in user and the time when it is first written.
 * Which written notes may still be edited or removed is the form's to say
 * (`editRestrictions`); a note not yet written always may.
 */
import { createSignal, createUniqueId, Index, Show, type JSX } from 'solid-js';
import { localisedDateTime, t } from '../../intl';
import { authUser, userDisplayName } from '../../auth/authContext';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  useAccordionItemExpanded,
} from '../../ui/elements/accordion/Accordion';
import { Button } from '../../ui/elements/buttons/Button';
import { ConfirmDialog } from '../../ui/elements/feedback/ConfirmDialog';
import { TextArea } from '../../ui/elements/inputs/TextArea';
import { Text } from '../../ui/elements/typography/Text';
import { HStack } from '../../ui/layout/Stack/HStack';
import { Stack } from '../../ui/layout/Stack/Stack';
import { PlusCircleIcon, TrashIcon } from '../../ui/icons';
import type { Note } from '../../plugin-sdk/documents';
import type { Draft } from './draft';
import type { FieldProps } from './fields';
import type { NotesPath } from './paths';
import {
  isNoteEditable,
  withNewNote,
  withNoteText,
  withoutNote,
  type NoteEditRestrictions,
} from './notes';
import styles from './NotesInput.module.css';

export interface NotesInputProps<T, P extends NotesPath<T>> extends Omit<
  FieldProps,
  'helperText'
> {
  draft: Draft<T>;
  path: P;
  /** Newest note first (JSON Forms `reverse`); oldest first otherwise. */
  newestFirst?: boolean;
  /** Every note open when the form opens (`defaultExpanded`). */
  defaultExpanded?: boolean;
  /** Which written notes may still be edited or removed. */
  editRestrictions?: NoteEditRestrictions;
}

interface UntypedNotesDraft {
  get(path: string): unknown;
  set(path: string, value: unknown): void;
  errorFor(path: string): string | undefined;
  readOnly(): boolean;
}

// A note and where it sits in the stored list, in the order shown.
interface ShownNote {
  note: Note;
  index: number;
}

/*
 * The closed item's line: the note's first line, cut to the width; an open
 * item shows the whole note below instead.
 */
const NotePreview = (props: { text: string }): JSX.Element => {
  const expanded = useAccordionItemExpanded();
  return (
    <span class={styles.preview}>
      {expanded() ? t('label.note') : props.text.split('\n')[0]}
    </span>
  );
};

export const NotesInput = <T, P extends NotesPath<T>>(
  props: NotesInputProps<T, P>
): JSX.Element => {
  const d = () => props.draft as unknown as UntypedNotesDraft;
  const labelId = createUniqueId();
  const itemKey = (position: number) =>
    `${props.testId ?? 'notes'}-${position}`;

  const notes = () => (d().get(props.path) as Note[] | undefined) ?? [];
  const shown = (): ShownNote[] => {
    const list = notes().map((note, index) => ({ note, index }));
    return props.newestFirst ? list.reverse() : list;
  };
  const positionOf = (index: number) =>
    props.newestFirst ? notes().length - 1 - index : index;

  const readOnly = () => props.disabled === true || d().readOnly();
  const editable = (item: ShownNote) =>
    !readOnly() &&
    isNoteEditable(
      item.note,
      item.index,
      notes().length,
      props.editRestrictions,
      authUser()?.userId,
      Date.now()
    );

  // Which items are open, by their position in the order shown: a note has
  // no id, and its object is replaced on every keystroke. What is kept is the
  // positions the user has opened or closed against the default (every item
  // open with `defaultExpanded`, none without), so notes the draft gains after
  // the form opens take the default too.
  const [flipped, setFlipped] = createSignal<ReadonlySet<number>>(new Set());
  const isOpen = (position: number) =>
    (props.defaultExpanded === true) !== flipped().has(position);
  const positionFromKey = (key: string) =>
    Number(key.slice(key.lastIndexOf('-') + 1));
  const openKeys = () =>
    shown()
      .map((_, position) => position)
      .filter(isOpen)
      .map(itemKey);
  const onOpenChange = (keys: string[]) => {
    const opened = new Set(keys.map(positionFromKey));
    setFlipped(
      new Set(
        shown()
          .map((_, position) => position)
          .filter(p => opened.has(p) !== (props.defaultExpanded === true))
      )
    );
  };
  // Moves the kept positions when a note is added or removed at `from`.
  const shiftFlipped = (from: number, by: 1 | -1) =>
    setFlipped(
      positions =>
        new Set(
          [...positions].flatMap(p => {
            if (by === -1 && p === from) return [];
            return [p >= from ? p + by : p];
          })
        )
    );

  // Each position's note box, while it has one: a position keeps its box
  // when the note drawn there changes, so a new note's box may be one
  // already on the page.
  const boxes: (HTMLTextAreaElement | undefined)[] = [];
  const [removing, setRemoving] = createSignal<number>();

  const add = () => {
    const index = notes().length;
    d().set(props.path, withNewNote(notes()));
    const position = positionOf(index);
    if (props.newestFirst) shiftFlipped(0, 1);
    // A new note opens, whatever the default, and takes the focus once its
    // item has opened.
    if (!isOpen(position))
      setFlipped(positions => new Set([...positions, position]));
    requestAnimationFrame(() => {
      const box = boxes[position];
      if (box?.isConnected) box.focus();
    });
  };

  const remove = (index: number) => {
    const position = positionOf(index);
    d().set(props.path, withoutNote(notes(), index));
    shiftFlipped(position, -1);
  };

  const write = (index: number, text: string) =>
    d().set(
      props.path,
      withNoteText(
        notes(),
        index,
        text,
        { id: authUser()?.userId, name: userDisplayName() },
        new Date().toISOString()
      )
    );

  const signature = (note: Note) =>
    note.created
      ? `${note.authorName ?? ''} (${localisedDateTime(note.created)})`
      : t('label.new');

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      class={styles.list}
      data-testid={props.testId}
    >
      <HStack justify="between">
        <Text as="span" variant="subtitle" id={labelId}>
          {props.label}
        </Text>
        <Show when={!readOnly()}>
          <Button
            variant="secondary"
            size="small"
            icon={<PlusCircleIcon />}
            onClick={add}
            data-testid={props.testId && `${props.testId}-add`}
          >
            {t('button.add-note')}
          </Button>
        </Show>
      </HStack>
      <Accordion multiple value={openKeys()} onValueChange={onOpenChange}>
        <Index each={shown()}>
          {(item, position) => (
            <AccordionItem value={itemKey(position)}>
              <AccordionTrigger
                as="h4"
                end={<span>{signature(item().note)}</span>}
              >
                <NotePreview text={item().note.text} />
              </AccordionTrigger>
              <AccordionContent>
                <Show
                  when={editable(item())}
                  fallback={<p class={styles.text}>{item().note.text}</p>}
                >
                  <Stack gap="sm">
                    <TextArea
                      label={t('label.note')}
                      rows={5}
                      value={item().note.text}
                      error={d().errorFor(`${props.path}.${item().index}.text`)}
                      ref={el => {
                        boxes[position] = el;
                      }}
                      onInput={e => write(item().index, e.currentTarget.value)}
                      // A note left empty is not kept.
                      onBlur={e => {
                        if (e.currentTarget.value === '') remove(item().index);
                      }}
                      data-testid={
                        props.testId && `${props.testId}-${position}-text`
                      }
                    />
                    <HStack justify="end">
                      <Button
                        variant="ghost"
                        size="small"
                        icon={<TrashIcon />}
                        onClick={() => setRemoving(item().index)}
                        data-testid={
                          props.testId && `${props.testId}-${position}-remove`
                        }
                      >
                        {t('label.remove')}
                      </Button>
                    </HStack>
                  </Stack>
                </Show>
              </AccordionContent>
            </AccordionItem>
          )}
        </Index>
      </Accordion>
      <ConfirmDialog
        open={removing() !== undefined}
        onClose={() => setRemoving(undefined)}
        title={t('label.remove')}
        message={t('messages.confirm-remove-item')}
        onConfirm={() => {
          const index = removing();
          if (index !== undefined) remove(index);
        }}
      />
    </div>
  );
};
