import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { AddressValue, FieldConfig } from './types/address.js';
import { buildFieldConfig, validateAddress } from './lib/libaddressinput.js';
import { getCountryData, countryCodes } from './data/address-data.js';

@customElement('address-input')
export class AddressInput extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: system-ui, -apple-system, sans-serif;
    }
    
    .address-form {
      display: flex;
      flex-direction: column;
      gap: var(--address-gap, 1rem);
    }
    
    .field-row {
      display: flex;
      gap: var(--address-gap, 1rem);
      flex-wrap: wrap;
    }
    
    .field {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    
    .field-width-full { flex: 1 1 100%; }
    .field-width-half { flex: 1 1 calc(50% - 0.5rem); min-width: 200px; }
    .field-width-third { flex: 1 1 calc(33.333% - 0.667rem); min-width: 150px; }
    .field-width-quarter { flex: 1 1 calc(25% - 0.75rem); min-width: 120px; }
    
    label {
      font-size: var(--address-label-size, 0.875rem);
      font-weight: 500;
      color: #374151;
    }
    
    label.required::after {
      content: ' *';
      color: #EF4444;
    }
    
    input, select {
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--address-border-color, #D1D5DB);
      border-radius: 0.375rem;
      font-size: 0.875rem;
      height: var(--address-input-height, 2.5rem);
      background: white;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    
    input:focus, select:focus {
      outline: none;
      border-color: var(--address-focus-ring, #3B82F6);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    
    input.error, select.error {
      border-color: var(--address-error-color, #EF4444);
    }
    
    input::placeholder {
      color: #9CA3AF;
    }
    
    .error-message {
      font-size: 0.75rem;
      color: var(--address-error-color, #EF4444);
      margin-top: 0.25rem;
    }
    
    .country-select {
      margin-bottom: 1rem;
    }
    
    .country-select label {
      font-weight: 600;
    }
    
    select optgroup {
      font-weight: 600;
    }
  `;

  @property({ type: String })
  country = 'US';

  @property({ type: Object })
  value: Partial<AddressValue> = {};

  @property({ type: Boolean })
  required = true;

  @property({ type: Boolean, attribute: 'show-organization' })
  showOrganization = false;

  @property({ type: Boolean, attribute: 'show-name' })
  showName = false;

  @state()
  private _fieldErrors: Record<string, string> = {};

  @state()
  private _touchedFields: Set<string> = new Set();

  private _fieldConfigs: FieldConfig[] = [];

  connectedCallback() {
    super.connectedCallback();
    this._updateFieldConfigs();
  }

  willUpdate(changedProperties: Map<string, any>) {
    if (changedProperties.has('country')) {
      this._updateFieldConfigs();
      // Reset values that don't apply to new country
      this._resetInapplicableFields();
    }
  }

  private _updateFieldConfigs() {
    const metadata = getCountryData(this.country);
    this._fieldConfigs = buildFieldConfig(metadata, {
      showName: this.showName,
      showOrganization: this.showOrganization
    });
  }

  private _resetInapplicableFields() {
    // Keep only the fields that are valid for the new country
    const validKeys = new Set(this._fieldConfigs.map(f => f.key));
    const newValue: Partial<AddressValue> = { country: this.country };
    
    for (const [key, val] of Object.entries(this.value)) {
      if (key === 'country' || validKeys.has(key as keyof AddressValue)) {
        (newValue as any)[key] = val;
      }
    }
    
    this.value = newValue;
  }

  private _handleCountryChange(e: Event) {
    const select = e.target as HTMLSelectElement;
    this.country = select.value;
    this._emitChange();
  }

  private _handleFieldChange(field: keyof AddressValue, e: Event) {
    const target = e.target as HTMLInputElement | HTMLSelectElement;
    this.value = { ...this.value, [field]: target.value };
    this._touchedFields.add(field as string);
    
    // Validate this field
    this._validateField(field);
    this._emitChange();
  }

  private _validateField(field: keyof AddressValue) {
    const fieldConfig = this._fieldConfigs.find(f => f.key === field);
    if (!fieldConfig) return;

    const value = this.value[field];
    const errors: string[] = [];

    // Check required
    if (fieldConfig.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
      errors.push(`${fieldConfig.label} is required`);
    }

    // Check pattern (for postal codes)
    if (fieldConfig.pattern && value && typeof value === 'string') {
      const regex = new RegExp(`^${fieldConfig.pattern}$`, 'i');
      if (!regex.test(value)) {
        errors.push(`Invalid ${fieldConfig.label.toLowerCase()} format`);
      }
    }

    if (errors.length > 0) {
      this._fieldErrors[field as string] = errors[0];
    } else {
      delete this._fieldErrors[field as string];
    }

    this.requestUpdate();
  }

  private _validateAll(): boolean {
    const validation = validateAddress(this.value, this._fieldConfigs);
    
    // Update error display
    this._fieldErrors = {};
    for (const error of validation.errors) {
      // Parse error to find field
      const field = this._fieldConfigs.find(f => error.includes(f.label));
      if (field) {
        this._fieldErrors[field.key as string] = error;
      }
    }

    this.requestUpdate();
    return validation.valid;
  }

  private _emitChange() {
    const addressValue: AddressValue = {
      ...this.value,
      country: this.country,
      addressLine1: this.value.addressLine1 || '',
      city: this.value.city || ''
    };

    this.dispatchEvent(new CustomEvent('change', {
      detail: addressValue,
      bubbles: true,
      composed: true
    }));

    // Also emit validation status
    const isValid = this._validateAll();
    this.dispatchEvent(new CustomEvent('valid', {
      detail: { valid: isValid, errors: Object.values(this._fieldErrors) },
      bubbles: true,
      composed: true
    }));
  }

  private _getCountryOption(code: string) {
    const data = getCountryData(code);
    return { code, name: data.name || code };
  }

  private _getGroupedCountries() {
    const groups: Record<string, Array<{ code: string; name: string }>> = {
      'Frequently Used': [],
      'A-M': [],
      'N-Z': []
    };

    const frequent = ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'JP', 'CN', 'IN', 'BR', 'MX'];

    for (const code of countryCodes) {
      if (code === 'ZZ') continue;
      
      const option = this._getCountryOption(code);
      
      if (frequent.includes(code)) {
        groups['Frequently Used'].push(option);
      } else if (option.name.charAt(0).toUpperCase() <= 'M') {
        groups['A-M'].push(option);
      } else {
        groups['N-Z'].push(option);
      }
    }

    // Sort each group alphabetically
    for (const group of Object.values(groups)) {
      group.sort((a, b) => a.name.localeCompare(b.name));
    }

    return groups;
  }

  private _renderCountrySelect() {
    const groups = this._getGroupedCountries();

    return html`
      <div class="field country-select field-width-full">
        <label class="required">Country</label>
        <select 
          .value="${this.country}"
          @change="${this._handleCountryChange}"
        >
          ${Object.entries(groups).map(([groupName, countries]) => html`
            <optgroup label="${groupName}">
              ${countries.map(c => html`
                <option value="${c.code}" ?selected="${c.code === this.country}">
                  ${c.name}
                </option>
              `)}
            </optgroup>
          `)}
        </select>
      </div>
    `;
  }

  private _renderField(field: FieldConfig) {
    if (!field.visible) return null;

    const value = this.value[field.key] || '';
    const error = this._fieldErrors[field.key as string];
    const isTouched = this._touchedFields.has(field.key as string);
    const showError = error && (isTouched || this._touchedFields.size > 0);

    const widthClass = {
      full: 'field-width-full',
      half: 'field-width-half',
      third: 'field-width-third',
      quarter: 'field-width-quarter'
    }[field.width];

    return html`
      <div class="field ${widthClass}">
        <label class="${field.required ? 'required' : ''}">${field.label}</label>
        ${field.type === 'select' && field.options
          ? html`
              <select
                class="${showError ? 'error' : ''}"
                .value="${value}"
                @change="${(e: Event) => this._handleFieldChange(field.key, e)}"
                ?required="${field.required}"
              >
                <option value="">Select ${field.label}</option>
                ${field.options.map(opt => html`
                  <option value="${opt.value}">${opt.label}</option>
                `)}
              </select>
            `
          : html`
              <input
                type="text"
                class="${showError ? 'error' : ''}"
                .value="${value}"
                .placeholder="${field.placeholder || ''}"
                @input="${(e: Event) => this._handleFieldChange(field.key, e)}"
                @blur="${() => this._touchedFields.add(field.key as string)}"
                ?required="${field.required}"
                pattern="${field.pattern || ''}"
              />
            `
        }
        ${showError ? html`<span class="error-message">${error}</span>` : null}
      </div>
    `;
  }

  private _renderFieldsByRow() {
    const rows: FieldConfig[][] = [];
    let currentRow: FieldConfig[] = [];
    let currentRowWidth = 0;

    for (const field of this._fieldConfigs) {
      const fieldWidth = {
        full: 100,
        half: 50,
        third: 33.33,
        quarter: 25
      }[field.width];

      // Start new row if this field won't fit
      if (currentRowWidth + fieldWidth > 100 && currentRow.length > 0) {
        rows.push([...currentRow]);
        currentRow = [];
        currentRowWidth = 0;
      }

      currentRow.push(field);
      currentRowWidth += fieldWidth;

      // Start new row after full-width fields
      if (fieldWidth === 100) {
        rows.push([...currentRow]);
        currentRow = [];
        currentRowWidth = 0;
      }
    }

    // Add remaining fields
    if (currentRow.length > 0) {
      rows.push(currentRow);
    }

    return rows.map(row => html`
      <div class="field-row">
        ${row.map(field => this._renderField(field))}
      </div>
    `);
  }

  render() {
    return html`
      <div class="address-form">
        ${this._renderCountrySelect()}
        ${this._renderFieldsByRow()}
      </div>
    `;
  }

  /**
   * Public API: Validate the current address
   */
  validate(): boolean {
    return this._validateAll();
  }

  /**
   * Public API: Get current address value
   */
  getValue(): AddressValue {
    return {
      country: this.country,
      addressLine1: this.value.addressLine1 || '',
      city: this.value.city || '',
      ...this.value
    };
  }

  /**
   * Public API: Set address value
   */
  setValue(value: Partial<AddressValue>) {
    if (value.country && value.country !== this.country) {
      this.country = value.country;
    }
    this.value = { ...this.value, ...value };
    this.requestUpdate();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'address-input': AddressInput;
  }
}