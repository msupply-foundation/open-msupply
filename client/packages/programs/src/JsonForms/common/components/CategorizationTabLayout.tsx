import React, { FC, useState } from 'react';
import {
  and,
  Categorization,
  categorizationHasCategory,
  Category,
  isVisible,
  LayoutProps,
  optionIs,
  RankedTester,
  rankWith,
  uiTypeIs,
} from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';
import { Button, Grid, Hidden } from '@mui/material';
import { styled } from '@mui/material/styles';
import { DialogButton } from '@openmsupply-client/common';
import { ModalProps, useDialog } from '@common/hooks';
import {
  AjvProps,
  MaterialLayoutRendererProps,
  renderLayoutElements,
  withAjvProps,
} from '@jsonforms/material-renderers';
import { isEmpty } from 'lodash';

interface CategoryModalProps extends ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CategoryModal: FC<CategoryModalProps> = ({
  children,
  isOpen,
  onClose,
  ...modalProps
}) => {
  const { Modal } = useDialog({
    isOpen,
    onClose,
  });
  return <Modal {...modalProps}>{children}</Modal>;
};

export const categorizationTabLayoutTester: RankedTester = rankWith(
  2,
  and(
    uiTypeIs('Categorization'),
    categorizationHasCategory,
    optionIs('variant', 'tab')
  )
);

const Icon = styled('i')(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  height: 50,
  width: 50,
}));

// Specialized layout render to fix some layout issues in the modal
const CategoryLayoutRendererComponent = ({
  visible,
  elements,
  schema,
  path,
  enabled,
  direction,
  renderers,
  cells,
}: MaterialLayoutRendererProps) => {
  if (isEmpty(elements) || !schema || path === undefined) {
    return null;
  } else {
    return (
      <Hidden xsUp={!visible}>
        <Grid
          container
          direction={direction}
          spacing={direction === 'row' ? 2 : 0}
          // this is changed compared to the default renderer:
          flexWrap={'nowrap'}
        >
          {renderLayoutElements(
            elements,
            schema,
            path,
            enabled ?? true,
            renderers,
            cells
          )}
        </Grid>
      </Hidden>
    );
  }
};
const CategoryLayoutRenderer = React.memo(CategoryLayoutRendererComponent);

const UIComponent: FC<LayoutProps & AjvProps> = ({
  ajv,
  data,
  path,
  renderers,
  schema,
  uischema,
  visible,
  cells,
}) => {
  const [activeCategory, setActiveCategory] = useState<number | undefined>();
  const categorization = uischema as Categorization;

  const categories = categorization.elements.filter(
    (category: Category | Categorization): category is Category =>
      isVisible(category, data, '', ajv) && category.type === 'Category'
  );

  const childProps: MaterialLayoutRendererProps = {
    elements:
      activeCategory === undefined
        ? []
        : categorization.elements[activeCategory]?.elements ?? [],
    schema,
    // assume the root path if not specified
    path: path ?? '',
    direction: 'column',
    visible,
    renderers,
    cells,
  };

  const onClose = () => setActiveCategory(undefined);

  return (
    <Grid
      item
      display="flex"
      justifyContent="space-evenly"
      alignContent="space-evenly"
      flex={1}
      flexWrap="wrap"
      gap={2}
      padding={2}
    >
      {categories.map((category: Category, idx: number) => (
        <Grid item key={category.label} display="inline-flex">
          <Button
            variant="outlined"
            startIcon={<Icon className={`${category.options?.['icon']}`} />}
            key={category.label}
            onClick={() => setActiveCategory(idx)}
            sx={{
              width: '150px',
              height: '150px',
              flexDirection: 'column',
              textTransform: 'none',
              '& .MuiButton-startIcon': {
                paddingBottom: '8px',
              },
            }}
          >
            {category.label}
          </Button>
          <CategoryModal
            onClose={onClose}
            isOpen={activeCategory === idx}
            title={category.label}
            okButton={<DialogButton variant="ok" onClick={onClose} />}
            width={700}
          >
            <CategoryLayoutRenderer {...childProps} />
          </CategoryModal>
        </Grid>
      ))}
    </Grid>
  );
};

export const CategorizationTabLayout = withJsonFormsLayoutProps(
  withAjvProps(UIComponent)
);
