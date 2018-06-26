import * as React from 'react';
import { FormValues, FormErrors } from './form-group';
const isEmpty = require('lodash/isEmpty');

export interface FormItemProps<T extends Object> {
  value: T;
  onChange: (value: FormValues<T>, errors: FormErrors<T>) => void;
  onRemove: () => void;
  onAdd: () => void;
  index: number;
  formLength: number;
}

export type FormItemComponent<T extends Object> = React.SFC<FormItemProps<T>>;

export interface Props<T> {
  values: T[];
  errors: string[];
  onChangeArray: (event: any, value: T[]) => void;
}

export const arrayFormCreator = <T extends any>(
  defaults: T,
  form: FormItemComponent<T>,
  addButton?: (add: () => void) => Element | JSX.Element
) => {

  const onChange = (values: T[], onChangeArray: any, index: number) => (u: FormValues<T>, e: FormErrors<T>): void =>
    onChangeArray(null, [
      ...values.map((v: T, i) => i === index ? u : v)
    ]);

  const addElement = (values: T[], onChangeArray: any) => () => onChangeArray(null, [
    ...values,
    defaults
  ]);
  const removeElement = (values: T[], onChangeArray: any, index: number) => () => onChangeArray(null, [
    ...values.slice(0, index),
    ...values.slice(index + 1)
  ]);

  return (props: Props<T>) => {
    let newValues = !isEmpty(props.values) ? [...props.values] : [defaults];
    const add = () => addElement(newValues, props.onChangeArray)();
    return (<>
      {newValues.map((u: T, i: number) =>
        React.createElement(
          form,
          {
            key: `${i}-${newValues.length}`,
            value: u,
            onChange: onChange(newValues, props.onChangeArray, i),
            onRemove: removeElement(newValues, props.onChangeArray, i),
            onAdd: add,
            index: i + 1,
            formLength: newValues.length
          }
        ))}
    </>);
  };
};

export const generateFormsArray = <T extends any>(defaultProps: T, formName: string, length?: number) =>
  (
    FormComponent: React.ComponentClass<FormItemProps<T>>,
    addButton?: (add: () => void) => Element | JSX.Element
  ) => {
    const renderFormsArray = arrayFormCreator<T>(
      defaultProps,
      (props: FormItemProps<T>) => <FormComponent {...props} />,
      addButton
    );
    return ({ onChange, errors, values }: any) => {
      const arrayProps = {
        values: values[formName],
        errors: errors[formName],
        onChangeArray: onChange(formName)
      };
      return (<>
        {renderFormsArray(arrayProps)}
      </>);
    };
  };
