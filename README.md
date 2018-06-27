# YOBA is here


# Example: form with one required field

```
import {
  FormValues,
  FormErrors,
  RenderFormComponent,
  FormFields,
  Validators,
  FormCallback,
  withFormCreator
} from 'yoba-form';

interface Model {
  name: string;
}
interface Props {
  values: Model;
}
interface State {
  values: FormValues<Model>;
  errors: FormErrors<Model>;
}

export class FormTest extends React.Component<Props, State> {
  // default input values
  state = {
    values: {
      name: '' // or supply from props: this.props.values.name
    },
    errors: {
      name: [],
    }
  };
  renderForm: RenderFormComponent<Model> = ({ onChange, errors, values }) => {
    return (<>
      <TextField
        onChange={onChange('name')}
        errors={errors.name}
        value={values.name}
      />
    </>);
  }
  // fields schema
  // all fields from Model must be specified at least having {} value
  schema: FormFields<Model> = {
    name: {
      validators: Validator.required,
      // or array of validators
      //validators: [
      //  Validator.required
      //  Validator.email
      //],
    },
  };

  // callback triggered on every change
  formCallback: FormCallback<Model> = (values: FormValues<Model>, errors: FormErrors<Model>) => {
    this.setState({ values, errors });
  }

  // callback triggered when changing and async validation end
  // good place to put submit logic, e.g. 
  formAsyncCallback: FormCallback<Model> = (lastValues, errors) => {
    this.setState({ ...this.state, errors });
  }

  formGroup = withFormCreator(this.formCallback, this.formAsyncCallback, this.schema);

  constructor(props, context) {
    super(props, context);
  }

  render() {
    return this.formGroup(this.state.values, this.state.errors)(this.renderForm);
  }
}
```

Example of TextField:

```
const TextField = ({ value, onChange, errors }: FormFieldComponentProps) =>
  <div>
    <input value={p} onChange={onChange} />
    <span>Errors: {errors.join(', )}</span>
  </div>
```

It could be an input component of any type that implements `FormFieldComponentProps` interface.


# Validators

There are some predefined validators, but they are just wrapper over single validate.js validator.

```
name: {
  validators: [
    // simple validate.js wrapper
    Validator.single({ presence: true}),
    // result depends on field value named 'enabled'
    // if it's true, value must be a positive integer
    // if not, returns [] 
   (value, all) => all.enabled ? Validator.positive(value) : []
    validators: Validator.nested({
    lead_text: { presence: true, length: { minimum: 1 } },
      intro_text: { presence: true, length: { minimum: 1 } },
      body_text: { presence: true, length: { minimum: 1 } },
    })
  ],
  enabled: {}
}


