import React, { PropsWithChildren, useRef } from 'react';
import {
  Grid,
  PreferenceDescriptionNode,
  RouteBuilder,
  useNavigate,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

import { ListPrefs } from './ListPrefs';

export const LineEditBase = ({
  children,
  prefs,
  currentKey,
}: PropsWithChildren & {
  prefs: PreferenceDescriptionNode[];
  currentKey: string;
}) => {
  const navigate = useNavigate();

  //t odo remove?
  // This ref is attached to the currently selected list item, and is used to
  // "scroll into view" when the Previous/Next buttons are clicked in the NavBar
  const scrollRef = useRef<null | HTMLLIElement>(null);

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
          currentKey={currentKey}
          prefs={prefs}
          scrollRef={scrollRef}
          setSelectedPref={setSelectedPref}
        />
      </Grid>
      <Grid size={{ xs: 9 }}>{children}</Grid>
    </Grid>
  );
};
