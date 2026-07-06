/**
 * Global JSX namespace shim for React 19 compatibility.
 *
 * In @types/react@19, the global `JSX` namespace was removed.
 * This shim re-exports it globally so existing code using `JSX.Element`
 * type annotations continues to work.
 */
import type * as React from 'react';

declare global {
  namespace JSX {
    type Element = React.JSX.Element;
    type ElementClass = React.JSX.ElementClass;
    type ElementAttributesProperty = React.JSX.ElementAttributesProperty;
    type ElementChildrenAttribute = React.JSX.ElementChildrenAttribute;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type LibraryManagedAttributes<C, P> = React.JSX.LibraryManagedAttributes<
      C,
      P
    >;
    type IntrinsicElements = React.JSX.IntrinsicElements;
    type IntrinsicAttributes = React.JSX.IntrinsicAttributes;
  }
}
