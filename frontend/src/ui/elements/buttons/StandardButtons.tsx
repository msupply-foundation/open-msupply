import { splitProps } from 'solid-js';
import { t } from '../../../intl';
import { SaveIcon, XCircleIcon } from '../../icons';
import { Button, type ButtonProps } from './Button';

/*
 * Pre-composed buttons for the handful of actions that recur across almost
 * every dialog, form and record footer — OK, Cancel, Save, Close, and the
 * "…& next" variants. Each
 * is a thin wrapper over <Button> that fixes the identity (variant, label, and
 * for Save the icon + collapse) so callers get one consistent, translated
 * control instead of re-deciding the tone/label every time:
 *
 *   <OkButton onClick={confirm} />        instead of
 *   <Button variant="primary">{t('button.ok')}</Button>
 *
 * Labels come from the shared intl catalog (button.*), so they translate and
 * stay consistent app-wide. Everything else a <Button> accepts — onClick,
 * disabled, loading, size, type, class, aria-*, … — passes straight through;
 * only `variant`, `icon`, and `children` are owned by the wrapper (they ARE
 * the button's identity). Need a different label or tone? Use <Button>
 * directly — that's the signal you've left "standard" territory.
 */
type StandardButtonProps = Omit<ButtonProps, 'variant' | 'icon' | 'children'>;

/** Primary confirm — the affirmative action in a dialog. */
export const OkButton = (props: StandardButtonProps) => (
  <Button variant="primary" {...props}>
    {t('button.ok')}
  </Button>
);

/** Secondary dismiss — pairs with OK/Save; never the sole action on a view. */
export const CancelButton = (props: StandardButtonProps) => (
  <Button variant="secondary" {...props}>
    {t('button.cancel')}
  </Button>
);

/*
 * Leave a record screen without saving — the action-footer counterpart to
 * CancelButton, sitting beside the status control on a detail footer (Carl,
 * 2026-07-30). Secondary + the close glyph, and LABELLED: a footer action is
 * read as a verb, so an icon-only glyph was the rejected alternative (two
 * verticals had hand-rolled one; three had the labelled form, which won).
 * Collapsible by default like SaveButton — on phones it sheds the label to the
 * icon, keeping the accessible name, which is where an icon-only close is
 * actually the right density.
 */
export const CloseButton = (props: StandardButtonProps) => {
  const [local, rest] = splitProps(props, ['collapsible']);
  return (
    <Button
      variant="secondary"
      icon={<XCircleIcon />}
      collapsible={local.collapsible ?? true}
      {...rest}
    >
      {t('button.close')}
    </Button>
  );
};

/*
 * Primary save with the save icon. Collapsible by default (sheds its label to
 * the icon on phones, ui-standards #btn-icons) since it earns its place in a
 * toolbar; pass `collapsible={false}` to keep the label at every width.
 */
export const SaveButton = (props: StandardButtonProps) => {
  // Let a caller override the default-on collapse, but keep it on otherwise.
  const [local, rest] = splitProps(props, ['collapsible']);
  return (
    <Button
      variant="primary"
      icon={<SaveIcon />}
      collapsible={local.collapsible ?? true}
      {...rest}
    >
      {t('button.save')}
    </Button>
  );
};

/**
 * Primary confirm for a dialog footer that saves — icon-less, like OkButton
 * (ui-standards › controls § dialogs, D55): a footer is read in a fixed
 * position as a verb, not a toolbar, so it earns no icon the way SaveButton's
 * toolbar placement does.
 */
export const DialogSaveButton = (props: StandardButtonProps) => (
  <Button variant="primary" {...props}>
    {t('button.save')}
  </Button>
);

/** Primary save that also advances to the next step in a multi-step flow. */
export const SaveAndNextButton = (props: StandardButtonProps) => (
  <Button variant="primary" {...props}>
    {t('button.save-and-next')}
  </Button>
);
