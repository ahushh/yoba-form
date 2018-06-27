import React from 'react';
const union = require('lodash/union');

export type FieldCallback<K = any, V = any> = (newValue: V, errors: string[], fieldName: K) => void;
export type FieldCallbackPatch<K = any, V = any, T = any>
  = (newValue: V, fieldName: K, prevValues: FormValues<T>, event?: any) => FormValues<T>;

export type FormFields<T = any> = {
  [K in keyof T]: {
    /* tslint:disable: prefer-array-literal */
    validators?: Array<SyncValidator> | SyncValidator;
    asyncValidators?: Array<AsyncValidator> | AsyncValidator;
    /**
     * Callback which runs when field value is changed
     */
    onChange?: FieldCallback<K, T[K]> | null;
    /**
     * Callback which runs when value of the field is changed AND
     * returns next values.
     *
     * Good to use if you need to reflect changes of some fields in the others
     */
    patchValues?: FieldCallbackPatch<K, T[K], T> | null;
  };
};

export type FormFieldComponentProps<T = any> = {
  onChange: (event: any, value: T) => void;
  errors: string[];
  value: T;
}

export type FormArray<T> = FormValues<T>[];

export type FormValues<T = any> = {
  [K in keyof T]: T[K] & any;
};

export type FormErrors<T = any> = {
  [K in keyof T]: string[]
};

export type FormOnChange<T = any, P = any> = <V = any>(field: keyof T) => (event: any, value?: V & P) => void;

/**
 * TODO: rename FormComponentProps to RenderFormComponentProps
 */
export interface FormComponentProps<T = any, P = any> {
  onChange: FormOnChange<T, P>;
  values: { [K in keyof T]: T[K] & P };
  errors: FormErrors<T>;
}
export type RenderFormComponent<T = any> = React.SFC<FormComponentProps<T>>;


export type SyncValidator = (value: any, allValues: any) => string[];
export type AsyncValidator = [
  (value: any) => Promise<string[]>, // validator function
  string // pending message
];
export type FormCallback<T = any> = (v: FormValues<T>, e: FormErrors<T>) => void;

export interface FormConfig {
  debounceTime?: number;
}

const defaultConfig: FormConfig = {
  debounceTime: 350
};

export const replaceInArray = <T extends any>(array: T[], index: number, replaceWith: T): T[] =>
  array.length
    ? array.map((x: T, i: number) => i === index ? replaceWith : x)
    : [replaceWith];

export const runAllValidators = (validators: SyncValidator[] | SyncValidator, value: any, allValues: any): string[] => {
  return Array.isArray(validators) ?
    validators.reduce((a: string[], v) => [...a, ...v(value, allValues)], []) :
    validators(value, allValues);
};

export const withFormCreator = <T extends any = any>(
  /***
   * Triggered on every form value's change
   */
  callback: FormCallback<T>,
  /***
   * Triggered when all async validators are done and input is ended
   */
  asyncCallback: FormCallback<T> | null,
  /**
   * Fields schema
   */
  fields: FormFields<T>,
  config: FormConfig = {}
) => {
  // one validator to array of validators

  // Comment(D.U.): Okay, wouldn't it be better to change type of asyncValidators to 'Array<AsyncValidator>'
  // instead of 'Array<AsyncValidator> | AsyncValidator' and treat it like an array everywhere?
  // The field is called validatorS - in plural, so you would anyway expect it to be an array.
  Object.keys(fields).filter(k =>
    fields[k].asyncValidators
    && (fields[k as keyof T].asyncValidators as AsyncValidator).length
    && typeof (fields[k].asyncValidators as AsyncValidator)[1] === 'string'
  ).forEach(k => fields[k].asyncValidators = [fields[k].asyncValidators as AsyncValidator]);

  // Comment(D.U.): Same here (see above)
  Object.keys(fields).filter(k =>
    fields[k].validators && !Array.isArray(fields[k].validators)
  ).forEach(k => fields[k].validators = [fields[k].validators as SyncValidator]);

  // TODO: make `fields1` changeable for dynamic form creation (?)
  const CNF = { ...defaultConfig, ...config };


  const runAllAsyncValidators = async (validators: AsyncValidator[], value: any): Promise<string[]> => {
    const results = await Promise.all(validators.map(([v, _]) => v(value)));
    return results.reduce((a, x) => [...a, ...x]);
  };

  let debounce: any;

  return (v: FormValues<T>, e: FormErrors<T>) => (FormComponent: RenderFormComponent<T>) => {
    let values: any = v || {};
    let errors: any = e || {};

    // Comment(D.U.): Inconsistent naming of parameters in two functions below (av vs validators)

    const getPendingMessages = (av: AsyncValidator[]): string[] => {
      return av ? av.map(([_, pending]) => pending).filter(x => Boolean(x)) : [];
    };

    const filterPendingMessages = (validators: AsyncValidator[], allErrors: string[]) => {
      const pending = getPendingMessages(validators);
      return allErrors.filter(m => !pending.includes(m));
    };

    /***
     * Validates a field value using sync validators and returns new errors object
     * @param {string} field
     * @param value
     * @returns {FormErrors}
     */
    const updateErrors = (field: keyof T, value: T[keyof T]): FormErrors => {
      if (fields[field] === undefined) {
        throw new Error(`Field '${field}' does not exist in fields schema: ${JSON.stringify(fields)}`);
      }
      // Set pending status for all async validators
      const asyncValidators = fields[field].asyncValidators;
      const pendingMessages = getPendingMessages(asyncValidators as AsyncValidator[]);
      // sync validators
      const validators = fields[field].validators as SyncValidator[];
      if (!validators) {
        // append error messages to errors list
        return pendingMessages && pendingMessages.length
          ? { ...errors, [field]: union((errors[field] || []), pendingMessages) }
          : errors;
      }
      const fieldErrors = runAllValidators(validators, value, values);
      return { ...errors, [field]: fieldErrors.concat(pendingMessages) };
    };

    /***
     * Validates a form value using async validators and updates new errors object when all validators have finished
     * @param {string} field
     * @param value
     * @returns {Promise<any>}
     */
    const updateErrorsAsync = async (field: string, value: any): Promise<any> => {
      const validators = fields[field].asyncValidators as AsyncValidator[];
      if (!validators) {
        return;
      }
      const fieldErrors = runAllAsyncValidators(validators as AsyncValidator[], value);
      const allErrors = [...await fieldErrors];
      return {
        ...errors,
        [field]: [
          ...errors[field],
          ...filterPendingMessages(validators, allErrors)
        ]
      };
    };

    /***
     * Runs async validators and invoke callbackAsync
     * @param {string} field
     * @param value
     * @param {FormValues} lastValues
     * @returns {Promise<void>}
     */
    const onChangeEnd = async (field: keyof T, value: T[keyof T], lastValues: FormValues<T>) => {
      if (fields[field].asyncValidators) {
        errors = await updateErrorsAsync(field as string, value);
      }
      asyncCallback && asyncCallback(lastValues, errors);
    };

    const updateValues = (field: keyof T, value: T[keyof T]) => ({ ...values, [field]: value });

    /**
     * Runs patchValues from fields schema, updates values and errors, runs callback and onChange
     * @param field field name
     * @returns (event: any, value: any) => void
     */
    const onChange: FormOnChange<T> = field => (event, value) => {
      if (fields[field].patchValues) {
        values = (fields[field].patchValues as Function)(value, field, values, event);
      }
      values = updateValues(field, value);
      errors = updateErrors(field, value);
      callback(values, errors);
      fields[field].onChange && (fields[field].onChange as Function)(values[field], errors[field], field);
      // Run async validators on changing end and invoke callbackAsync
      debounce && clearTimeout(debounce);
      debounce = setTimeout(() => onChangeEnd(field, value, values), CNF.debounceTime);
    };

    const props: FormComponentProps<T> = {
      onChange,
      values,
      errors
    };
    return (<FormComponent {...props} />);
  };
};
