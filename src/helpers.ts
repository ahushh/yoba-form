import { FormFields, FormValues, FormErrors, runAllValidators, SyncValidator } from './form-group'

const reduce = require('lodash/reduce')
/**
 * Replaces all object values with given value
 * @param data Object to handle
 * @param value Value to all object values will be replaced with
 */
export const fillObject = <T = Object, V = any>(data: T, value: V): { [K in keyof T]: V } =>
  Object.keys(data).reduce((a, k: string) => ({ ...a, [k]: value }), {} as any)

export const validateFormValues = <T extends Object>(
  fields: FormFields<T>,
  values: FormValues<T>
): FormErrors<T> => {
  const errors = {} as FormErrors<T>
  Object.keys(values).forEach((key: string) => {
    if (fields[key as keyof T] && fields[key as keyof T].validators) {
      const errorsList = runAllValidators(
        fields[key as keyof T].validators as SyncValidator,
        values[key as keyof T],
        values
      )
      errors[key as keyof T] = errorsList
    }
  })
  return errors
}

export const isFormValid = <T extends Object>(
  fields: FormFields<T>,
  values: FormValues<T>
): boolean => {
  let formValidationErrors = Object.keys(values).reduce((messages: string[], key) => {
    // console.error('messages', messages, 'key', key);
    if (fields[key as keyof T] && fields[key as keyof T].validators) {
      const newErrors = runAllValidators(
        fields[key as keyof T].validators as SyncValidator,
        values[key as keyof T],
        values
      )
      // console.error('newErrors', newErrors);
      return [...messages, ...newErrors]
    }
    return messages
  }, [])
  // console.warn('Validation check: ', formValidationErrors);
  return !Boolean(formValidationErrors.length)
}
