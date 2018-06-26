const reduce = require('lodash/reduce')
/**
 * Replaces all object values with given value
 * @param data Object to handle
 * @param value Value to all object values will be replaced with
 */
export const fillObject = <T = Object, V = any>(data: T, value: V): { [K in keyof T]: V } =>
  Object.keys(data).reduce((a, k: string) => ({ ...a, [k]: value }), {} as any)
