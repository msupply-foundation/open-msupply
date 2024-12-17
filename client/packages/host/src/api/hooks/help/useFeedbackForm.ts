import { ContactFormNodeType, InsertContactFormInput } from '@common/types';
import { useState } from 'react';
import { useFeedbackFormGraphQL } from './useFeedbackFormGraphQL';
import {
  FnUtils,
  isEmpty,
  useMutation,
} from '@openmsupply-client/common';

type ContactFormInput = Pick<InsertContactFormInput, 'replyEmail' | 'body' > & {contactFormType?: string};

export function useFeedbackForm() {
  const defaultDraft: ContactFormInput = { 
    replyEmail: '', 
    body: '',
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

  const mutationFn = async ({contactFormType, replyEmail, body}: ContactFormInput) => { 
    let contactType;
    if (contactFormType == ContactFormNodeType.Feedback) {
      contactType = ContactFormNodeType.Feedback;
    }
    if (contactFormType == ContactFormNodeType.Support) {
      contactType = ContactFormNodeType.Support;
    }
    if (contactType == undefined) {throw Error("contactType is undefined")} // this is ok as the front end will disable the send button if this is the case.
    const apiResult = await api.insertContactForm({
      storeId, 
      input: { 
        id: FnUtils.generateUUID(),
        replyEmail, 
        body,
        contactType
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