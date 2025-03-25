import React, { PropsWithChildren, useRef } from 'react';
import { Grid, RouteBuilder, useNavigate } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

import { Footer } from './Footer';
import { ListPrefs } from './ListPrefs';

export const LineEditBase = ({
  children,
  // items,
  currentId,
}: PropsWithChildren & {
  // items: InvoiceItemFragment[];
  currentId: string;
}) => {
  const navigate = useNavigate();

  // This ref is attached to the currently selected list item, and is used to
  // "scroll into view" when the Previous/Next buttons are clicked in the NavBar
  const scrollRef = useRef<null | HTMLLIElement>(null);
  const scrollSelectedItemIntoView = () =>
    // Small time delay to allow the ref to change to the previous/next item in
    // the list before scrolling to it
    setTimeout(() => scrollRef.current?.scrollIntoView(), 100);

  const items = [];
  const setSelectedPref = (id: string) =>
    navigate(
      RouteBuilder.create(AppRoute.Manage)
        .addPart(AppRoute.Preferences)
        .addPart(id)
        .build()
    );

  return (
    <Grid
      container
      spacing={2}
      direction="row"
      padding={3}
      paddingTop={2}
      width="100%"
    >
      <Grid size={{ xs: 3 }}>
        <ListPrefs
          currentId={currentId}
          prefs={items}
          scrollRef={scrollRef}
          setSelectedPref={setSelectedPref}
        />
      </Grid>
      <Grid size={{ xs: 9 }}>{children}</Grid>
    </Grid>
  );
};
