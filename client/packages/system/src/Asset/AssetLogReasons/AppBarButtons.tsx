// import React from 'react';
// import {
//   DownloadIcon,
//   useNotification,
//   AppBarButtonsPortal,
//   Grid,
//   useTranslation,
//   FileUtils,
//   LoadingButton,
//   EnvUtils,
//   Platform,
//   InfoIcon,
//   useIsCentralServerApi,
//   RouteBuilder,
//   useNavigate,
// } from '@openmsupply-client/common';
// import { AppRoute } from '@openmsupply-client/config';
// import { useAssetData } from '../api';
// import { assetCategoryListItemsToCsv } from '../utils';

// export const AppBarButtonsComponent = () => {
//   const t = useTranslation(['catalogue']);
//   const navigate = useNavigate();

//   const isCentralServer = useIsCentralServerApi();

//   const path = RouteBuilder.create(AppRoute.Catalogue)
//     .addPart(AppRoute.Assets)
//     .addPart(AppRoute.LogReasons)
//     .build();

//   return (
//     <AppBarButtonsPortal>
//       <Grid container gap={1}>
//         {isCentralServer && <></>}
//         {/* {isCentralServer && ( */}

//         {/* )} */}
//       </Grid>
//     </AppBarButtonsPortal>
//   );
// };

// export const AppBarButtons = React.memo(AppBarButtonsComponent);
