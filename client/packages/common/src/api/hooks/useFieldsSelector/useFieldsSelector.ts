import { useCallback } from 'react';
import { useDebounceCallback } from '@common/hooks';
import { MutateOptions, useMutation, useQueryClient } from 'react-query';
import { useQuerySelector } from '../useQuerySelector';

export type FieldUpdateMutation<T> = (
  variables: Partial<T>,
  options?:
    | MutateOptions<
        unknown,
        unknown,
        Partial<T>,
        {
          previous: T | undefined;
          patch: Partial<T>;
        }
      >
    | undefined
) => Promise<void>;

export type FieldSelectorControl<
  Entity,
  KeyOfEntity extends keyof Entity
> = Pick<Entity, KeyOfEntity> & {
  update: FieldUpdateMutation<Entity>;
};

export const useFieldsSelector = <Entity, KeyOfEntity extends keyof Entity>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<Entity>,
  mutateFn: (patch: Partial<Entity>) => Promise<unknown>,
  keyOrKeys: KeyOfEntity | KeyOfEntity[],
  timeout = 1000
): FieldSelectorControl<Entity, KeyOfEntity> => {
  const queryClient = useQueryClient();
  const select = useCallback((entity: Entity) => {
    if (Array.isArray(keyOrKeys)) {
      const mapped = keyOrKeys.reduce((acc, val) => {
        acc[val] = entity[val];
        return acc;
      }, {} as Pick<Entity, KeyOfEntity>);

      return mapped;
    } else {
      return { [keyOrKeys]: entity[keyOrKeys] } as Pick<Entity, KeyOfEntity>;
    }
  }, []);

  const { data } = useQuerySelector(queryKey, queryFn, select);

  const { mutate } = useMutation((patch: Partial<Entity>) => mutateFn(patch), {
    onMutate: async (patch: Partial<Entity>) => {
      await queryClient.cancelQueries(queryKey);

      const previous = queryClient.getQueryData<Entity>(queryKey);

      if (previous) {
        queryClient.setQueryData<Entity>(queryKey, {
          ...previous,
          ...patch,
        });
      }

      return { previous, patch };
    },
    onSettled: () => queryClient.invalidateQueries(queryKey),
    onError: (_, __, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
    },
  });

  const update = useDebounceCallback(mutate, [], timeout);

  // When data is undefined, just return an empty object instead of undefined.
  // This allows the caller to use, for example, const { comment } = useInboundFields('comment')
  // and the comment is undefined when the invoice has not been fetched yet.
  const returnVal = data ?? ({} as Pick<Entity, KeyOfEntity>);

  return { ...returnVal, update };
};
