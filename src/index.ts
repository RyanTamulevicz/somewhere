export { AddressInput } from './address-input.js';
export type { AddressValue, FieldConfig, AddressInputProps } from './types/address.js';
export { buildFieldConfig, validateAddress, validatePostalCode } from './lib/libaddressinput.js';
export { getCountryData, addressData, countryCodes, hasPostalCode } from './data/address-data.js';