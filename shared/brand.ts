export const PRODUCT_NAME='Acqad';
/** Preserve real institution names; replace only old product/demo defaults. */
export function schoolDisplayName(value:unknown):string {
  const name=typeof value==='string'?value.trim():'';
  return !name||/^(ecard(?: systems)?|ecqad|exampool(?: school)?|school name|academic institution|academy \/ exampool high school)$/i.test(name)?PRODUCT_NAME:name;
}
