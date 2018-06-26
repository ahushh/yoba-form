import validate from 'validate.js'
const reduce = require('lodash/reduce')

const PRICE_PATTERN = `^\\d{0,6}\.?\\d{1,2}?$`
const PRICE_MESSAGE =
  'Price must be an integer or float with no greater than two digits after decimal'

export class ValidationRules {
  static price = {
    presence: true,
    numericality: {
      greaterThanOrEqualTo: 0
    },
    format: {
      pattern: PRICE_PATTERN,
      message: PRICE_MESSAGE
    }
  }
  static positive = {
    presence: true,
    numericality: {
      onlyInteger: true
    }
  }
}

export class Validator {
  static single = (constraints: Object) => (value: string) =>
    validate.single(value || null, constraints) || []

  // tslint:disable-next-line:member-ordering
  static url = Validator.single({ url: true })
  // tslint:disable-next-line:member-ordering
  static email = Validator.single({ email: true })
  // tslint:disable-next-line:member-ordering
  static required = Validator.single({ presence: true })
  // tslint:disable-next-line:member-ordering
  static price = Validator.single(ValidationRules.price)
  // tslint:disable-next-line:member-ordering
  static positive = Validator.single(ValidationRules.positive)
  // tslint:disable-next-line:member-ordering
  static password = Validator.single({ presence: true, length: { minimum: 6 } })
  static nested = (constraints: Object) => (value: Object) =>
    reduce(validate(value, constraints), (a: any, v: any, k: any) => [...a, ...v], [])

  // tslint:disable-next-line:variable-name
  static passwordConfirmation = (password_confirmation: string, { password }: any) =>
    ((
      x = validate(
        { password, password_confirmation },
        {
          password_confirmation: {
            equality: 'password'
          }
          // tslint:disable-next-line:variable-name
        }
      )
    ) => (x ? x.password_confirmation : []))()

  static or = (...args: any[]) => (x: any) =>
    args
      .map(f => f(x))
      .reduce(
        (a, x) =>
          x.length === 0 || (Array.isArray(a) && a.length === 0) ? [] : [...(a || []), ...x],
        null
      )
}
