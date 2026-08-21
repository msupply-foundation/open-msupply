import { splitProps } from 'solid-js';
import { t } from '../../../intl';
import { SaveIcon } from '../../icons';
import { Button, type ButtonProps } from './Button';
import { ALT_S, ESCAPE } from '../../utils/shortcuts';

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
 * only `variant`, `icon`, `children`, and the dialog-role props below are owned
 * by the wrapper (they ARE the button's identity). Need a different label or
 * tone? Use <Button> directly — that's the signal you've left "standard"
 * territory, and such a button declares `confirms` by hand instead.
 *
 * BECAUSE the identity is fixed here, these wrappers also tell a surrounding
 * <Dialog> which button confirms it (spec/keyboard KB-E2) via `confirms`, so
 * Enter-to-confirm, the Alt+S / Escape hint badges, and the palette's
 * dialog-contributed Save/Cancel entries all work with no per-dialog wiring.
 * Outside a Dialog those props do nothing.
 */
type StandardButtonProps = Omit<
  ButtonProps,
  'variant' | 'icon' | 'children' | 'shortcut' | 'confirms'
>;

/** Primary confirm — the affirmative action in a dialog. */
export const OkButton = (props: StandardButtonProps) => (
  <Button {...props} variant="primary" confirms="plain" shortcut={ALT_S}>
    {t('button.ok')}
  </Button>
);

/** Secondary dismiss — pairs with OK/Save; never the sole action on a view. */
export const CancelButton = (props: StandardButtonProps) => (
  <Button
    {...props}
    variant="secondary"
    confirms="cancel"
    // Escape already cancels a dialog through the UA's close request; the
    // binding is declared here so the hint badge and the palette entry render
    // from the same value (S2, AC-KB15).
    shortcut={ESCAPE}
  >
    {t('button.cancel')}
  </Button>
);

/*
 * There is deliberately NO CloseButton here. It existed from 2026-07-30 as the
 * action-footer counterpart to CancelButton — secondary, close glyph, labelled
 * — and was adopted by five verticals' detail footers over the migrations that
 * followed. D103 (spec owner, 2026-08-13) then removed the control itself: a
 * detail screen is a PLACE, not a dialog, so it is left by navigating up, in
 * the app bar, where every other screen puts it. A second exit at the opposite
 * corner reads as "dismiss this page" and is a dangerous neighbour to the
 * button that advances a document's status.
 *
 * So a detail footer carries no dismiss at all, and this file offers no
 * component for one. Don't re-add it because a footer "needs" a way out — the
 * way out is the Breadcrumb's parent crumb (ui/layout/Header/Breadcrumb, sized
 * as a real target for exactly this reason) and Escape (KB-X5).
 */

/*
 * Primary save with the save icon. Collapsible by default (sheds its label to
 * the icon on phones, ui-standards #btn-icons) since it earns its place in a
 * toolbar; pass `collapsible={false}` to keep the label at every width.
 *
 * NOTE this is the TOOLBAR save — it claims no dialog role, because a dialog
 * footer uses DialogSaveButton (icon-less, D55). A SaveButton that happens to
 * sit inside a dialog is a page-level save, not that dialog's confirm.
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
  <Button {...props} variant="primary" confirms="plain" shortcut={ALT_S}>
    {t('button.save')}
  </Button>
);

/**
 * Primary save that also advances to the next step in a multi-step flow. The
 * CONTINUING confirm: where it is present and enabled, Enter activates it in
 * preference to the plain Save (KB-E2, AC-KB23).
 */
export const SaveAndNextButton = (props: StandardButtonProps) => (
  <Button {...props} variant="primary" confirms="continuing">
    {t('button.save-and-next')}
  </Button>
);
