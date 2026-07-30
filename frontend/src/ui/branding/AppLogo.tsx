import { Show } from 'solid-js';
import { MSupplyGuyLogo } from '../icons';
import { customLogo } from './applyBranding';
import styles from './AppLogo.module.css';

/*
 * The app's logo: a site's custom SVG when one is saved (Settings › Display),
 * otherwise the mSupply guy. Every place the logo appears goes through here —
 * the drawer, the login hero and the initialisation hero — so a site's brand
 * is set in one place.
 *
 * `class` sizes the box and is passed to whichever of the two renders, so the
 * two are interchangeable at every call site. The custom SVG is sanitised
 * once, when it arrives (applyBranding.sanitiseSvg), not here.
 */
export const AppLogo = (props: { class?: string }) => (
  <Show when={customLogo()} fallback={<MSupplyGuyLogo class={props.class} />}>
    {svg => (
      <span
        class={`${styles.wrapper} ${props.class ?? ''}`}
        /*
         * The one place this app inlines markup it did not author. The value
         * is sanitised at the door, not here — applyBranding.sanitiseSvg
         * reduces it to an <svg> element with scripts, on* handlers,
         * <foreignObject> and external references removed, and anything it
         * cannot parse never reaches this branch (the signal stays
         * undefined and the stock logo renders instead).
         */
        // eslint-disable-next-line solid/no-innerhtml
        innerHTML={svg()}
        data-testid="app-logo-custom"
      />
    )}
  </Show>
);
