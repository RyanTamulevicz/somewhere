#!/usr/bin/env node

/**
 * Fetch address metadata from Google's libaddressinput service
 * and generate bundled data files for the component
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://chromium-i18n.appspot.com/ssl-address';
const DATA_DIR = path.join(__dirname, '..', 'src', 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// List of ISO 3166-1 alpha-2 country codes
// This is a comprehensive list of all countries
const COUNTRY_CODES = [
  'AC', 'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AR', 'AS', 'AT', 'AU', 'AW', 'AX', 'AZ',
  'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BW', 'BY', 'BZ',
  'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN', 'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ',
  'DE', 'DJ', 'DK', 'DM', 'DO', 'DZ', 'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK', 'FM', 'FO', 'FR',
  'GA', 'GB', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL', 'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GW', 'GY',
  'HK', 'HN', 'HR', 'HT', 'HU', 'IC', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR', 'IS', 'IT', 'JE', 'JM', 'JO', 'JP',
  'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY',
  'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ',
  'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NU', 'NZ', 'OM',
  'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM', 'PN', 'PR', 'PS', 'PT', 'PW', 'PY',
  'QA', 'RE', 'RO', 'RS', 'RU', 'RW', 'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM', 'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SY', 'SZ',
  'TA', 'TC', 'TD', 'TF', 'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW', 'TZ',
  'UA', 'UG', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI', 'VN', 'VU', 'WF', 'WS', 'XK', 'YE', 'YT', 'ZA', 'ZM', 'ZW'
];

async function fetchCountryData(code) {
  try {
    const response = await fetch(`${BASE_URL}/data/${code}`);
    if (!response.ok) {
      console.warn(`Failed to fetch ${code}: ${response.status}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.warn(`Error fetching ${code}:`, error.message);
    return null;
  }
}

async function fetchSubdivisionData(code, subdivision) {
  try {
    const response = await fetch(`${BASE_URL}/data/${code}/${encodeURIComponent(subdivision)}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    return null;
  }
}

async function main() {
  console.log('Fetching address metadata from Google...\n');
  
  const allData = {};
  let successCount = 0;
  let failCount = 0;
  
  // Fetch data for all countries
  for (const code of COUNTRY_CODES) {
    process.stdout.write(`Fetching ${code}... `);
    const data = await fetchCountryData(code);
    
    if (data) {
      allData[code] = data;
      successCount++;
      process.stdout.write('✓\n');
      
      // Small delay to be nice to the API
      await new Promise(resolve => setTimeout(resolve, 50));
    } else {
      failCount++;
      process.stdout.write('✗\n');
    }
  }
  
  console.log(`\n✓ Fetched ${successCount} countries, ${failCount} failed`);
  
  // Generate TypeScript file
  console.log('\nGenerating TypeScript data file...');
  
  const tsContent = generateTypeScript(allData);
  fs.writeFileSync(path.join(DATA_DIR, 'address-data.ts'), tsContent);
  
  // Generate country list
  const countryList = Object.entries(allData).map(([code, data]) => ({
    code,
    name: data.name || code,
    hasPostalCode: !!data.zip,
    hasSubdivisions: !!data.sub_keys
  }));
  
  fs.writeFileSync(
    path.join(DATA_DIR, 'countries.json'),
    JSON.stringify(countryList, null, 2)
  );
  
  // Calculate bundle size
  const rawSize = Buffer.byteLength(tsContent, 'utf8');
  console.log(`\n✓ Generated address-data.ts (${(rawSize / 1024).toFixed(1)} KB raw)`);
  console.log(`✓ Generated countries.json (${countryList.length} countries)`);
  
  // Summary
  const withSubdivisions = countryList.filter(c => c.hasSubdivisions).length;
  const withPostal = countryList.filter(c => c.hasPostalCode).length;
  
  console.log(`\n📊 Summary:`);
  console.log(`  • ${countryList.length} total countries`);
  console.log(`  • ${withSubdivisions} with subdivisions`);
  console.log(`  • ${withPostal} with postal code patterns`);
}

function generateTypeScript(allData) {
  const entries = Object.entries(allData)
    .map(([code, data]) => {
      // Clean up the data
      const cleaned = { ...data };
      delete cleaned.key; // Not needed
      
      return `  '${code}': ${JSON.stringify(cleaned, null, 2)}`;
    })
    .join(',\n');
  
  return `/**
 * Address metadata from Google's libaddressinput
 * Auto-generated on ${new Date().toISOString()}
 * Source: https://chromium-i18n.appspot.com/ssl-address
 */

import type { GoogleAddressMetadata } from '../types/address.js';

export const addressData: Record<string, GoogleAddressMetadata> = {
${entries}
};

export const countryCodes = Object.keys(addressData);

// List of countries that don't use postal codes
export const noPostalCodeCountries = [
  'HK', 'IE', 'JM', 'PA', 'BS', 'BZ', 'BW', 'AO', 'AG', 'AW', 'BB', 
  'BJ', 'BO', 'VG', 'KH', 'CM', 'CV', 'KY', 'CF', 'TD', 'KM', 'CG',
  'CK', 'CU', 'DJ', 'DM', 'GQ', 'ER', 'FJ', 'GA', 'GM', 'GH', 'GD',
  'GN', 'GW', 'GY', 'KI', 'LS', 'LR', 'LY', 'MO', 'MG', 'MW', 'MV',
  'ML', 'MH', 'MR', 'MU', 'FM', 'MC', 'MN', 'MS', 'NR', 'NP', 'NE',
  'NG', 'NU', 'OM', 'PW', 'PG', 'KN', 'LC', 'VC', 'WS', 'ST', 'SC',
  'SL', 'SB', 'SO', 'SR', 'SY', 'TZ', 'TL', 'TK', 'TO', 'TV', 'UG',
  'AE', 'VU', 'YE', 'ZM', 'ZW'
];

// Helper to get country data with fallback to generic
export function getCountryData(code: string): GoogleAddressMetadata {
  return addressData[code] || addressData['ZZ'] || {};
}

// Helper to check if country uses postal codes
export function hasPostalCode(code: string): boolean {
  const data = getCountryData(code);
  return !!data.zip && !noPostalCodeCountries.includes(code);
}
`;
}

main().catch(console.error);