import { InsertContactFormInput } from '@common/types';
import { useState } from 'react';
import { useFeedbackFormGraphQL } from './useFeedbackFormGraphQL';
import {
  FnUtils,
  isEmpty,
  useMutation,
} from '@openmsupply-client/common';

type ContactFormInput = Pick<InsertContactFormInput, 'replyEmail' | 'body'>

export function useFeedbackForm() {
  const defaultDraft: ContactFormInput = { 
    replyEmail: '', 
    body: ''
  }
  const [draft, setDraft] = useState<ContactFormInput>(defaultDraft);

  const { mutateAsync: insert } = useInsert()

  const updateDraft = (newData: Partial<ContactFormInput>) => {
    const newDraft: ContactFormInput = { ...draft, ...newData };
    setDraft(newDraft);
  };

  const resetDraft = () => {
    setDraft(defaultDraft);
  };

  return {
    updateDraft,
    resetDraft,
    saveFeedback: insert,
    draft,
  };
}

const useInsert = () => {
  const { api, storeId } = useFeedbackFormGraphQL();

  const mutationFn = async ({replyEmail, body}: ContactFormInput) => { 
    const apiResult = await api.insertContactForm({
      storeId, 
      input: { 
        id: FnUtils.generateUUID(),
        replyEmail, 
        body
      }
    })

    if(!isEmpty(apiResult)) { 
      const result = apiResult.insertContactForm;

      if (result.__typename === 'InsertResponse') { 
        return result;
      }
    }
  }

  return useMutation({
    mutationFn
  })
}