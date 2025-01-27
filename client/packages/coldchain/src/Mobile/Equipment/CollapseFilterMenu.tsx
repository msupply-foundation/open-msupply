import React, { FC } from 'react';
import { Box, FilterMenu, Collapse } from 'packages/common/src';
import { useToolbar } from '../../Equipment/ListView/Toolbar';

interface CollapseFilterMenuProps {
	open: boolean;
}

export const CollapseFilterMenu: FC<CollapseFilterMenuProps> = ({ open }) => {

	const { filters } = useToolbar();

	return (
		<Collapse
			in={open}
			sx={{
				flex: 1,
				justifyContent: 'space-between',
				display: 'flex',
				alignItems: 'flex-end',
				padding: '0em .75em .5em .75em'
			}}
		>
			<Box display="flex" gap={1}>
				<FilterMenu filters={filters} />
			</Box>
		</Collapse>
	)
}