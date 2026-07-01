import { Fragment } from 'react';
import type { ReactNode } from 'react';
import styles from './Breadcrumbs.module.css';

export interface Crumb {
  label: string;
  /** Present → rendered as a link (not the last crumb); absent → current page. */
  to?: string;
}

interface BreadcrumbsProps {
  crumbs: Crumb[];
  /** Section icon shown before the first crumb (brand-orange), per the screenshot. */
  icon?: ReactNode;
}

/*
 * Plain-HTML breadcrumb — a <nav>/<ol> of links with "/" separators, last crumb
 * is the current page (not a link). No headless lib: it's links + separators.
 * Mirrors the current app's Breadcrumbs (16px, links bold, current plain).
 */
export const Breadcrumbs = ({ crumbs, icon }: BreadcrumbsProps) => (
  <nav aria-label="Breadcrumb" className={styles.breadcrumbs}>
    {icon && <span className={styles.icon}>{icon}</span>}
    <ol className={styles.list}>
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1;
        return (
          <Fragment key={`${crumb.label}-${index}`}>
            <li className={styles.crumb}>
              {isLast || !crumb.to ? (
                <span aria-current={isLast ? 'page' : undefined}>
                  {crumb.label}
                </span>
              ) : (
                <a href={crumb.to} className={styles.link}>
                  {crumb.label}
                </a>
              )}
            </li>
            {!isLast && (
              <li aria-hidden className={styles.separator}>
                /
              </li>
            )}
          </Fragment>
        );
      })}
    </ol>
  </nav>
);
