# Address Input Component

A modern, internationalized address input web component built with Lit and based on Google's libaddressinput data.

## Features

- ✅ **250+ countries supported** - Complete international address coverage
- ✅ **Dynamic field visibility** - Only shows fields required for each country
- ✅ **State/Province dropdowns** - For countries with subdivisions (US, CA, AU, JP, etc.)
- ✅ **Postal code validation** - Pattern matching per country
- ✅ **No postal code countries** - Properly handles Hong Kong, Ireland, Jamaica, etc.
- ✅ **Localized terminology** - State/Province/Prefecture/County based on country
- ✅ **Real-time validation** - Emits validation status on every change
- ✅ **TypeScript support** - Full type definitions included
- ✅ **Web Components standard** - Works with any framework or vanilla HTML

## Installation

### NPM

```bash
npm install @ryantamulevicz/address-input
```

### CDN (No Build Required)

Via **jsdelivr** (recommended):
```html
<script type="module">
  import 'https://cdn.jsdelivr.net/gh/RyanTamulevicz/address-input/dist/address-input.js';
</script>
<address-input country="US"></address-input>
```

Or pin to a specific version:
```html
<script type="module">
  import 'https://cdn.jsdelivr.net/gh/RyanTamulevicz/address-input@1.0.0/dist/address-input.js';
</script>
```

## Usage

### Basic Usage (ES Modules)

```javascript
import '@ryantamulevicz/address-input';
```

```html
<address-input country="US"></address-input>
```

### With Initial Value

```html
<address-input 
  country="CA"
  value='{
    "addressLine1": "100 Queen St", 
    "city": "Ottawa", 
    "administrativeArea": "ON", 
    "postalCode": "K1P 1J9"
  }'>
</address-input>
```

### With Organization Field

```html
<address-input country="US" show-organization></address-input>
```

### Listening for Changes

```javascript
const addressInput = document.querySelector('address-input');

// Listen for value changes
addressInput.addEventListener('change', (e) => {
  console.log('Address:', e.detail);
  // { country: "US", addressLine1: "123 Main St", city: "NYC", ... }
});

// Listen for validation status
addressInput.addEventListener('valid', (e) => {
  console.log('Valid:', e.detail.valid);
  console.log('Errors:', e.detail.errors);
});
```

### Programmatic API

```javascript
const addressInput = document.querySelector('address-input');

// Get current value
const value = addressInput.getValue();

// Set value
addressInput.setValue({
  country: 'US',
  addressLine1: '1600 Pennsylvania Avenue',
  city: 'Washington',
  administrativeArea: 'DC',
  postalCode: '20500'
});

// Validate manually
const isValid = addressInput.validate();
```

## Country Examples

### United States
```html
<address-input country="US"></address-input>
<!-- Shows: Address, City, State (dropdown), ZIP -->
```

### Japan
```html
<address-input country="JP"></address-input>
<!-- Shows: Address, City, Prefecture (dropdown), Postal Code -->
```

### United Kingdom
```html
<address-input country="GB"></address-input>
<!-- Shows: Address, City, County (optional), Postcode -->
```

### Hong Kong (no postal code!)
```html
<address-input country="HK"></address-input>
<!-- Shows: Address, City, District (dropdown) -->
```

### Germany
```html
<address-input country="DE"></address-input>
<!-- Shows: Address, City, Postal Code -->
```

## API Reference

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `country` | `string` | `'US'` | ISO 3166-1 alpha-2 country code |
| `value` | `Partial<AddressValue>` | `{}` | Initial address value |
| `required` | `boolean` | `true` | Whether fields are required |
| `show-organization` | `boolean` | `false` | Show organization/company field |
| `show-name` | `boolean` | `false` | Show name field |

### Events

| Event | Detail | Description |
|-------|--------|-------------|
| `change` | `AddressValue` | Fired when any field changes |
| `valid` | `{ valid: boolean, errors: string[] }` | Fired with validation status |

### AddressValue Interface

```typescript
interface AddressValue {
  country: string;
  name?: string;
  organization?: string;
  addressLine1: string;
  addressLine2?: string;
  addressLine3?: string;
  dependentLocality?: string;
  city: string;
  administrativeArea?: string;  // State/Province
  postalCode?: string;
  sortingCode?: string;
}
```

## Data Source

This component uses address metadata from Google's [libaddressinput](https://github.com/google/libaddressinput) project, which is used by Android and Chrome. The data includes:

- Field format strings for 249 countries
- Required field specifications
- Postal code validation patterns
- State/province subdivisions for 48 countries
- Proper terminology for each region

## Bundle Size

- **Core component**: ~13KB
- **Address data**: ~106KB (249 countries)
- **Total**: ~119KB uncompressed

## Browser Support

Works in all modern browsers that support:
- Web Components (Custom Elements, Shadow DOM)
- ES2020 JavaScript

## Development

```bash
# Install dependencies
npm install
# or
pnpm install

# Build
npm run build

# Fetch fresh address data from Google
npm run fetch-data

# Development mode (starts Vite dev server at http://localhost:3000/)
npm run dev
```

The dev command will:
- Start TypeScript compiler in watch mode
- Start Tailwind CSS compiler in watch mode  
- Start Vite dev server at http://localhost:3000/
- Open http://localhost:3000/demo/ in your browser

## License

MIT