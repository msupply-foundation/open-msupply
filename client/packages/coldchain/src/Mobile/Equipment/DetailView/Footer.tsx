import React, { FC } from 'react';
import {
	Box,
	ButtonWithIcon,
	useTranslation,
	XCircleIcon,
	useBreadcrumbs,	
	LoadingButton,
} from '@openmsupply-client/common';

interface FooterProps {
	isSaving: boolean;
	isDirty?: boolean;
	showSaveConfirmation: () => void;
}

export const Footer: FC<FooterProps> = ({
	isSaving,
	isDirty,
	showSaveConfirmation
}) => {
	const t = useTranslation();
	const { navigateUpOne } = useBreadcrumbs();	

	return (
		<Box
			sx={{
				display: 'flex',
				alignItems: 'center',
				alignContent: 'space-evenly',
				justifyContent: 'center',
				gap: '1.5em',
				height: '70px',
				position: 'absolute',
				left: '0',
				bottom: '0',
				width: '100%',
				backgroundColor: theme => theme.palette.background.white,
			}}
		>

			<ButtonWithIcon
				shouldShrink={false}
				Icon={<XCircleIcon />}
				label={t('button.close')}
				color="secondary"
				sx={{ fontSize: '12px' }}
				onClick={() => navigateUpOne()}
			/>
			<LoadingButton
				color="secondary"
				shouldShrink={false}
				disabled={
					!isDirty
				}
				isLoading={isSaving}
				onClick={showSaveConfirmation}
				label={t('button.save')}
			/>

		</Box>
	)
}