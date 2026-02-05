/**
 * Google's libaddressinput field abbreviations:
 * N - Name
 * O - Organisation
 * A - Street Address Line(s)
 * C - City or Locality
 * S - Administrative area (state, province, prefecture, etc.)
 * Z - Zip or postal code
 * X - Sorting code
 * D - Dependent locality (suburb/district)
 */

export type AddressField = 'N' | 'O' | 'A' | 'C' | 'S' | 'Z' | 'X' | 'D';

export interface GoogleAddressMetadata {
  /** Format string (e.g., "%N%n%O%n%A%n%C, %S %Z") */
  fmt?: string;
  /** Localized format string */
  lfmt?: string;
  /** Required fields (e.g., "ACSZ") */
  require?: string;
  /** Postal code regex pattern */
  zip?: string;
  /** Postal code examples */
  zipex?: string;
  /** Subdivision keys (e.g., "AL~AK~AZ...") */
  sub_keys?: string;
  /** Subdivision names */
  sub_names?: string;
  /** Latin subdivision names */
  sub_lnames?: string;
  /** Key for subdivision iso codes */
  sub_isoids?: string;
  /** Zip prefix regex for subdivisions */
  sub_zips?: string;
  /** Postal code examples for subdivisions */
  sub_zipexs?: string;
  /** Name of administrative area type */
  state_name_type?: string;
  /** Name of zip code type */
  zip_name_type?: string;
  /** Name of locality/city type */
  locality_name_type?: string;
  /** Name of sublocality type */
  sublocality_name_type?: string;
  /** Language code (e.g., "--fr") */
  lang?: string;
  /** List of languages */
  languages?: string;
  /** Post office URL */
  posturl?: string;
  /** Postal code prefix */
  postprefix?: string;
  /** Country/region key (e.g., "data/US") */
  key?: string;
  /** Country/region name */
  name?: string;
  /** Latinized name */
  lname?: string;
  /** ISO 3166-1 alpha-2 code */
  id?: string;
  /** Whether fields should be uppercase */
  upper?: string;
  /** Additional subdivision data */
  sub_mores?: string;
  [key: string]: any;  // Allow additional properties for future compatibility
}

export interface AddressValue {
  country: string;
  name?: string;
  organization?: string;
  addressLine1: string;
  addressLine2?: string;
  addressLine3?: string;
  dependentLocality?: string;
  city: string;
  administrativeArea?: string;
  postalCode?: string;
  sortingCode?: string;
}

export interface FieldConfig {
  key: keyof AddressValue;
  label: string;
  required: boolean;
  visible: boolean;
  type: 'text' | 'select' | 'textarea';
  options?: Array<{ value: string; label: string }>;
  pattern?: string;
  placeholder?: string;
  width: 'full' | 'half' | 'third' | 'quarter';
}

export interface CountryConfig {
  code: string;
  name: string;
  fields: FieldConfig[];
  hasPostalCode: boolean;
  hasSubdivisions: boolean;
  subdivisions?: Array<{ value: string; label: string }>;
  stateLabel: string;
  postalLabel: string;
  postalPattern?: string;
  postalExamples?: string[];
}

export interface AddressInputProps {
  country?: string;
  value?: Partial<AddressValue>;
  required?: boolean;
  showOrganization?: boolean;
  showName?: boolean;
}

export interface AddressInputChangeEvent extends CustomEvent<AddressValue> {}
export interface AddressInputValidEvent extends CustomEvent<{ valid: boolean; errors: string[] }> {}