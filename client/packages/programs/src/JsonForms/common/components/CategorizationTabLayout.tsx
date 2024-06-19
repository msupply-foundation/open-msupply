import React, { FC, useCallback, useState } from 'react';
import {
  and,
  Categorization,
  categorizationHasCategory,
  Category,
  isLayout,
  isScoped,
  isVisible,
  Layout,
  LayoutProps,
  optionIs,
  RankedTester,
  rankWith,
  toDataPathSegments,
  uiTypeIs,
} from '@jsonforms/core';
import { useJsonForms, withJsonFormsLayoutProps } from '@jsonforms/react';
import {
  DialogButton,
  useTranslation,
  Button,
  Grid,
  Hidden,
  Typography,
  styled,
  isEmpty,
} from '@openmsupply-client/common';
import { ModalProps, useDialog } from '@common/hooks';
import {
  AjvProps,
  MaterialLayoutRendererProps,
  renderLayoutElements,
  withAjvProps,
} from '@jsonforms/material-renderers';

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

// Try to extract a more precise error path.
// If undefined is returned the error can be ignored.
const propertyPathFromError = (error: {
  instancePath: string;
  keyword: string;
  params: Record<string, string>;
}): string | undefined => {
  // see https://ajv.js.org/api.html#error-objects
  switch (error.keyword) {
    case 'dependencies':
      return `${error.instancePath}/${error.params['missingProperty']}`;
    case 'required':
      return `${error.instancePath}/${error.params['missingProperty']}`;
    case 'propertyNames':
      return `${error.instancePath}/${error.params['propertyName']}`;
    case 'if':
      // An `if` condition failed. This means some other properties failed as well. To avoid
      // duplicated errors, this error is ignored.
      // For example, if a required property `obj.field1` is missing as part of an if/then condition
      // there will be two errors:
      // The error for the 'required' `obj.field1` and this error for the failing 'if'.
      return undefined;
    default:
      return error.instancePath;
  }
};

// Recursively goes through a layout and collects all element paths that have errors
const containsErrors = (layout: Layout, errorPaths: string[]): Set<string> => {
  const results = new Set<string>();
  for (const element of layout.elements) {
    if (isScoped(element)) {
      const scopePath = toDataPathSegments(element.scope).reduce(
        (prev, current) => {
          return `${prev}/${current}`;
        },
        ''
      );
      for (const errorPath of errorPaths) {
        if (scopePath == errorPath) {
          results.add(errorPath);
        }
      }
    } else if (isLayout(element)) {
      containsErrors(element, errorPaths).forEach(err => {
        results.add(err);
      });
    }
  }
  return results;
};

const ErrorStringComponent: FC<{
  category: Category;
  errorPaths: string[];
}> = ({ category, errorPaths }) => {
  const t = useTranslation();

  if (errorPaths.length === 0) {
    return null;
  }
  const foundPaths = containsErrors(category, errorPaths);
  if (foundPaths.size === 0) {
    return null;
  }
  return (
    <Typography
      sx={{
        position: 'absolute',
        right: 2,
        bottom: 2,
        color: theme => theme.palette.error.main,
        backgroundColor: theme => theme.palette.background.login,
        borderRadius: 4,
        paddingX: 2,
      }}
    >
      {t('error.missing-inputs', { count: foundPaths.size })}
    </Typography>
  );
};

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

  const { core } = useJsonForms();
  const errorPaths =
    core?.errors
      ?.map(e => propertyPathFromError(e))
      .filter((it): it is string => !!it) ?? [];

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

  const onClose = useCallback(
    () => setActiveCategory(undefined),
    [setActiveCategory]
  );

  return (
    <Grid
      item
      display="flex"
      justifyContent="center"
      alignContent="center"
      flex={1}
      flexWrap="wrap"
      gap={2}
      padding={2}
    >
      {categories.map((category: Category, idx: number) => (
        <Grid item key={category.label}>
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
                margin: 0,
              },
            }}
          >
            {category.label}
            <ErrorStringComponent category={category} errorPaths={errorPaths} />
          </Button>
          <CategoryModal
            sx={{
              '& .MuiDialogTitle-root': {
                fontSize: '1.5em',
              },
            }}
            onClose={onClose}
            isOpen={activeCategory === idx}
            title={category.options?.['title'] ?? category.label}
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
