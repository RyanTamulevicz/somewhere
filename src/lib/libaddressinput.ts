import type { AddressField, GoogleAddressMetadata, FieldConfig, AddressValue } from '../types/address.js';

/**
 * Parse Google's fmt string to extract visible fields
 * Example: "%N%n%O%n%A%n%C, %S %Z" -> ['N', 'O', 'A', 'C', 'S', 'Z']
 */
export function parseFmtString(fmt: string): AddressField[] {
  const fields: AddressField[] = [];
  const fieldPattern = /%([NOACSZXD])/g;
  let match;
  
  while ((match = fieldPattern.exec(fmt)) !== null) {
    const field = match[1] as AddressField;
    if (!fields.includes(field)) {
      fields.push(field);
    }
  }
  
  return fields;
}

/**
 * Get field width based on field type and typical content length
 */
function getFieldWidth(field: AddressField): 'full' | 'half' | 'third' | 'quarter' {
  switch (field) {
    case 'A': // Address lines
      return 'full';
    case 'C': // City
      return 'half';
    case 'S': // State
      return 'quarter';
    case 'Z': // ZIP
      return 'quarter';
    case 'N': // Name
    case 'O': // Organization
      return 'full';
    case 'D': // Dependent locality
      return 'half';
    case 'X': // Sorting code
      return 'quarter';
    default:
      return 'full';
  }
}

/**
 * Get label for a field based on country metadata
 */
function getFieldLabel(
  field: AddressField,
  metadata: GoogleAddressMetadata,
  isNameField: boolean = false
): string {
  switch (field) {
    case 'N':
      return isNameField ? 'Full Name' : 'Name';
    case 'O':
      return 'Organization';
    case 'A':
      return 'Street Address';
    case 'C':
      return 'City';
    case 'S':
      return getStateLabel(metadata);
    case 'Z':
      return getPostalLabel(metadata);
    case 'D':
      return getSublocalityLabel(metadata);
    case 'X':
      return 'Sorting Code';
    default:
      return field;
  }
}

/**
 * Get the appropriate label for the state/province field
 */
function getStateLabel(metadata: GoogleAddressMetadata): string {
  const type = metadata.state_name_type?.toLowerCase() || 'province';
  
  const labelMap: Record<string, string> = {
    'state': 'State',
    'province': 'Province',
    'county': 'County',
    'island': 'Island',
    'prefecture': 'Prefecture',
    'region': 'Region',
    'department': 'Department',
    'district': 'District',
    'do_si': 'Do/Si',
    'emirate': 'Emirate',
    'oblast': 'Oblast',
    'parish': 'Parish',
    'governorate': 'Governorate',
    'area': 'Area',
    'territory': 'Territory'
  };
  
  return labelMap[type] || 'State/Province';
}

/**
 * Get the appropriate label for the sublocality field (district/neighborhood/suburb)
 */
function getSublocalityLabel(metadata: GoogleAddressMetadata): string {
  const type = metadata.sublocality_name_type?.toLowerCase();
  const countryCode = metadata.id?.replace('data/', '');

  // Country-specific overrides where Google's label isn't the best English translation
  const countryOverrides: Record<string, string> = {
    'IR': 'District',  // Iran - "neighborhood" in data, but "District" is more accurate in English
  };

  // Check for country override first
  if (countryCode && countryOverrides[countryCode]) {
    return countryOverrides[countryCode];
  }

  const labelMap: Record<string, string> = {
    'neighborhood': 'Neighborhood',
    'district': 'District',
    'suburb': 'Suburb',
    'village_township': 'Village/Township',
    'ward': 'Ward'
  };

  return (type && labelMap[type]) || 'District';
}

/**
 * Get the appropriate label for postal code field
 */
function getPostalLabel(metadata: GoogleAddressMetadata): string {
  const type = metadata.zip_name_type?.toLowerCase();
  
  if (type === 'pin') return 'PIN Code';
  if (type === 'postal') return 'Postal Code';
  if (type === 'zip') return 'ZIP Code';
  if (type === 'eircode') return 'Eircode';
  
  // Default based on country
  const id = metadata.id?.toUpperCase();
  if (id === 'US') return 'ZIP Code';
  if (id === 'IE') return 'Eircode';
  if (id === 'IN') return 'PIN Code';
  
  return 'Postal Code';
}

/**
 * Parse subdivisions from metadata
 * Uses Latin names (sub_lnames) when available for non-Latin scripts
 */
function parseSubdivisions(metadata: GoogleAddressMetadata): Array<{ value: string; label: string }> | undefined {
  if (!metadata.sub_keys || !metadata.sub_names) {
    return undefined;
  }
  
  const keys = metadata.sub_keys.split('~');
  // Prefer Latin names (sub_lnames) for countries with non-Latin scripts (China, Japan, etc.)
  const hasLatinNames = metadata.sub_lnames;
  const names = hasLatinNames?.split('~') || metadata.sub_names.split('~');
  
  return keys.map((key, index) => ({
    // For non-Latin scripts, use the English name as the value too
    // For Latin scripts, use the key (abbreviation) as the value
    value: hasLatinNames ? (names[index] || key) : key,
    label: names[index] || key
  }));
}

/**
 * Build field configuration from Google address metadata
 */
export function buildFieldConfig(
  metadata: GoogleAddressMetadata,
  options: {
    showName?: boolean;
    showOrganization?: boolean;
  } = {}
): FieldConfig[] {
  const fields: FieldConfig[] = [];
  
  // Parse required fields
  const requiredFields = (metadata.require || '').split('') as AddressField[];
  
  // Parse visible fields from fmt string
  // Use a default format if none is provided (e.g., for countries like Central African Republic)
  const fmtString = metadata.fmt || '%N%n%O%n%A%n%C %Z';
  const visibleFields = parseFmtString(fmtString);
  
  // Track which address fields we've already added
  const addressLinesAdded: (keyof AddressValue)[] = [];
  
  // Countries that typically need 3 address lines due to complex addressing
  const countryCode = metadata.id?.replace('data/', '');
  const needsAddressLine3 = ['JP', 'CN', 'TW', 'KR', 'VN', 'ID', 'TH', 'PH', 'MY', 'SG'].includes(countryCode || '');
  
  // Build field configs in order of appearance in fmt string
  for (const field of visibleFields) {
    // Handle multiple address lines
    if (field === 'A') {
      // Add address lines - only add line 3 for countries that typically need it
      const addressFields: (keyof AddressValue)[] = needsAddressLine3 
        ? ['addressLine1', 'addressLine2', 'addressLine3']
        : ['addressLine1', 'addressLine2'];
      
      for (const addressField of addressFields) {
        if (!addressLinesAdded.includes(addressField)) {
          fields.push({
            key: addressField,
            label: addressField === 'addressLine1' ? 'Street Address' : 'Apartment, suite, etc.',
            required: addressField === 'addressLine1' && requiredFields.includes('A'),
            visible: true,
            type: 'text',
            width: 'full',
            placeholder: addressField === 'addressLine1' ? '123 Main St' : 'Apt 4B'
          });
          addressLinesAdded.push(addressField);
        }
      }
      continue;
    }
    
    // Skip name/organization if not requested
    if (field === 'N' && !options.showName) continue;
    if (field === 'O' && !options.showOrganization) continue;
    
    // Map field to config
    const fieldKey = mapFieldToKey(field);
    if (!fieldKey) continue;
    
    const isRequired = requiredFields.includes(field);
    const subdivisions = field === 'S' ? parseSubdivisions(metadata) : undefined;
    
    fields.push({
      key: fieldKey,
      label: getFieldLabel(field, metadata, options.showName),
      required: isRequired,
      visible: true,
      type: subdivisions ? 'select' : 'text',
      options: subdivisions,
      pattern: field === 'Z' ? metadata.zip : undefined,
      width: getFieldWidth(field)
    });
  }
  
  return fields;
}

/**
 * Map Google field abbreviation to AddressValue key
 */
function mapFieldToKey(field: AddressField): keyof AddressValue | undefined {
  const mapping: Record<AddressField, keyof AddressValue | undefined> = {
    'N': 'name',
    'O': 'organization',
    'A': undefined, // Handled separately for multiple lines
    'C': 'city',
    'S': 'administrativeArea',
    'Z': 'postalCode',
    'X': 'sortingCode',
    'D': 'dependentLocality'
  };
  
  return mapping[field];
}

/**
 * Validate postal code against pattern
 */
export function validatePostalCode(postalCode: string, pattern?: string): boolean {
  if (!pattern) return true;
  if (!postalCode) return false;
  
  // Convert Java regex to JavaScript regex
  const jsPattern = pattern
    .replace(/\\d/g, '\\d')
    .replace(/\\s/g, '\\s');
  
  try {
    const regex = new RegExp(`^${jsPattern}$`, 'i');
    return regex.test(postalCode);
  } catch {
    // If regex is invalid, accept any non-empty value
    return postalCode.length > 0;
  }
}

/**
 * Validate address value against field configuration
 */
export function validateAddress(
  value: Partial<AddressValue>,
  fields: FieldConfig[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (const field of fields) {
    if (!field.visible) continue;
    
    const fieldValue = value[field.key];
    
    // Check required fields
    if (field.required) {
      if (!fieldValue || (typeof fieldValue === 'string' && fieldValue.trim() === '')) {
        errors.push(`${field.label} is required`);
        continue;
      }
    }
    
    // Validate postal code pattern
    if (field.key === 'postalCode' && field.pattern && fieldValue) {
      if (!validatePostalCode(String(fieldValue), field.pattern)) {
        errors.push(`Invalid ${field.label.toLowerCase()} format`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}