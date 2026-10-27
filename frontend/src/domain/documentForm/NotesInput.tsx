/*
 * The notes list: every note of a document's `Note[]`, one accordion item
 * each, as a deployment's JSON Forms `Notes` control drew them. A closed item
 * shows the note's first line, an open one the whole note; both name its
 * author and when it was written. A new note goes at the end of the list and
 * is stamped with the signed-in user and the time when it is first written.
 * Which written notes may still be edited or removed is the form's to say
 * (`editRestrictions`); a note not yet written always may.
 *
 * The list changes only when the user adds or removes a note, so nothing
 * moves under the pointer or the focus: a note with no text stays until it
 * is removed, which needs no confirmation, and the document form's save
 * leaves it out (withoutEmptyNotes).
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
import type { FieldProps } from './fields';
import { nameFieldInSummary, type Draft } from './draft';
import type { NotesPath } from './paths';
import {
  flippedFromOpen,
  isItemOpen,
  isNoteEditable,
  shiftedPositions,
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
  /**
   * The document's `notes`, where the save drops a note with no text; at any
   * other path an empty note is saved as it is.
   */
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
  // Named to the draft as every library field is: the error summary names
  // the list as the control does, and the host knows the form renders it.
  nameFieldInSummary(props);
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

  // Which items are open: the positions flipped from the default (every
  // item open with `defaultExpanded`, none without), as notes.ts keeps them.
  const defaultOpen = () => props.defaultExpanded === true;
  const [flipped, setFlipped] = createSignal<ReadonlySet<number>>(new Set());
  const isOpen = (position: number) =>
    isItemOpen(flipped(), position, defaultOpen());
  const positionFromKey = (key: string) =>
    Number(key.slice(key.lastIndexOf('-') + 1));
  const openKeys = () =>
    shown()
      .map((_, position) => position)
      .filter(isOpen)
      .map(itemKey);
  const onOpenChange = (keys: string[]) =>
    setFlipped(
      flippedFromOpen(
        new Set(keys.map(positionFromKey)),
        shown().length,
        defaultOpen()
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
    if (props.newestFirst)
      setFlipped(positions => shiftedPositions(positions, 0, 1));
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
    setFlipped(positions => shiftedPositions(positions, position, -1));
  };

  // A note with text asks first; one with none has nothing to lose.
  const askToRemove = (item: ShownNote) => {
    if (item.note.text === '') remove(item.index);
    else setRemoving(item.index);
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
            data-testid={props.testId ? `${props.testId}-add` : undefined}
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
                      data-testid={
                        props.testId
                          ? `${props.testId}-${position}-text`
                          : undefined
                      }
                    />
                    <HStack justify="end">
                      <Button
                        variant="ghost"
                        size="small"
                        icon={<TrashIcon />}
                        onClick={() => askToRemove(item())}
                        data-testid={
                          props.testId
                            ? `${props.testId}-${position}-remove`
                            : undefined
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
