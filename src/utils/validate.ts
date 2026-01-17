/**
 * 判断是否为空
 */
export function isNull(val: any): boolean {
  if (['boolean', 'number'].includes(typeof val)) {
    return false;
  } else if (val instanceof Array) {
    return val.length === 0;
  } else if (val instanceof Object) {
    return JSON.stringify(val) === '{}';
  } else {
    return ['null', null, undefined, 'undefined', ''].includes(val);
  }
}
