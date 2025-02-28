import React, { PropsWithChildren, useRef } from 'react';
import { RouteBuilder, useNavigate } from '@openmsupply-client/common';

import { LineEditPageLayout } from './PageLayout';
import { AppBarButtons } from './AppBarButtons';
import { ListItems } from './ListItems';
import { NavBar } from './NavBar';
import { InvoiceItemFragment } from '../../api';

export const LineEditView = ({
  baseRoute,
  children,
  items,
  currentItemId,
  allowCreateNew = false,
}: PropsWithChildren & {
  baseRoute: RouteBuilder;
  items: InvoiceItemFragment[];
  currentItemId: string;
  allowCreateNew?: boolean;
}) => {
  const navigate = useNavigate();

  // This ref is attached to the currently selected list item, and is used to
  // "scroll into view" when the Previous/Next buttons are clicked in the NavBar
  const scrollRef = useRef<null | HTMLLIElement>(null);
  const scrollSelectedItemIntoView = () =>
    // Small time delay to allow the ref to change to the previous/next item in
    // the list before scrolling to it
    setTimeout(() => scrollRef.current?.scrollIntoView(), 100);

  return (
    <>
      <AppBarButtons baseRoute={baseRoute.build()} />
      <LineEditPageLayout
        Left={
          <ListItems
            currentItemId={currentItemId}
            items={items}
            route={baseRoute}
            showNew={allowCreateNew}
            scrollRef={scrollRef}
          />
        }
        Right={
          <>
            {children}
            <NavBar
              itemIds={items.map(item => item.id)}
              currentItemId={currentItemId}
              setItem={itemId => navigate(baseRoute.addPart(itemId).build())}
              scrollIntoView={scrollSelectedItemIntoView}
              canCreateNew={allowCreateNew}
            />
          </>
        }
      />
    </>
  );
};
