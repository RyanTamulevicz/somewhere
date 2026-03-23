import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import type { AddressValue, FieldConfig } from './types/address.js';
import './searchable-select.js';
import type { SearchableSelectOption } from './searchable-select.js';
import { buildFieldConfig, validateAddress, validateFieldValue } from './lib/libaddressinput.js';
import { getCountryData, countryCodes } from './data/address-data.js';

type CountryOption = SearchableSelectOption & { group: string };

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
      box-sizing: border-box;
      width: 100%;
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--address-border-color, #D1D5DB);
      border-radius: 0.375rem;
      font-family: inherit;
      font-size: 0.875rem;
      line-height: 1.25;
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
    const value = (e as CustomEvent<{ value: string }>).detail.value;
    this.country = value;
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

  private _handleFieldSelectChange(field: keyof AddressValue, value: string) {
    this.value = { ...this.value, [field]: value };
    this._touchedFields.add(field as string);
    this._validateField(field);
    this._emitChange();
  }

  private _handleFieldBlur(field: keyof AddressValue) {
    this._touchedFields = new Set([...this._touchedFields, field as string]);
    this._validateField(field);
  }

  private _validateField(field: keyof AddressValue) {
    const fieldConfig = this._fieldConfigs.find(f => f.key === field);
    if (!fieldConfig) return;

    const errors = validateFieldValue(fieldConfig, this.value[field]);

    if (errors.length > 0) {
      this._fieldErrors[field as string] = errors[0];
    } else {
      delete this._fieldErrors[field as string];
    }

    this.requestUpdate();
  }

  private _markVisibleFieldsTouched() {
    this._touchedFields = new Set([
      ...this._touchedFields,
      ...this._fieldConfigs.filter((field) => field.visible).map((field) => field.key as string)
    ]);
  }

  private _applyValidation(validation: ReturnType<typeof validateAddress>) {
    this._fieldErrors = Object.fromEntries(
      Object.entries(validation.fieldErrors)
        .map(([field, errors]) => [field, errors?.[0]])
        .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    );

    this.requestUpdate();
    return validation;
  }

  private _validateAll(options: { markVisibleFieldsTouched?: boolean } = {}) {
    if (options.markVisibleFieldsTouched) {
      this._markVisibleFieldsTouched();
    }

    const validation = validateAddress(this.value, this._fieldConfigs);
    return this._applyValidation(validation);
  }

  private _emitValidation(validation: ReturnType<typeof validateAddress>) {
    this.dispatchEvent(new CustomEvent('valid', {
      detail: { valid: validation.valid, errors: validation.errors },
      bubbles: true,
      composed: true
    }));
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
    const validation = this._validateAll();
    this._emitValidation(validation);
  }

  private _getCountryOption(code: string) {
    const data = getCountryData(code);
    return { value: code, label: data.name || code, group: '' };
  }

  private _getCountryOptions() {
    const groups: Record<string, CountryOption[]> = {
      'Frequently Used': [],
      'A-M': [],
      'N-Z': []
    };

    const frequent = ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'JP', 'CN', 'IN', 'BR', 'MX'];

    for (const code of countryCodes) {
      if (code === 'ZZ') continue;
      
      const option = this._getCountryOption(code);
      let group = 'N-Z';
      
      if (frequent.includes(code)) {
        group = 'Frequently Used';
      } else if (option.label.charAt(0).toUpperCase() <= 'M') {
        group = 'A-M';
      }

      groups[group].push({ ...option, group });
    }

    return Object.values(groups).flatMap((options) => options.sort((a, b) => a.label.localeCompare(b.label)));
  }

  private _renderSelectOptions(field: FieldConfig, value: string, showError: boolean) {
    const options = field.options || [];

    return html`
      <searchable-select
        .options="${options}"
        .value="${value}"
        .placeholder="${`Select ${field.label}`}"
        .required="${field.required}"
        .error="${showError}"
        @change="${(e: Event) => {
          const nextValue = (e as CustomEvent<{ value: string }>).detail.value;
          this._handleFieldSelectChange(field.key, nextValue);
        }}"
      ></searchable-select>
    `;
  }

  private _renderCountrySelect() {
    const options = this._getCountryOptions();

    return html`
      <div class="field country-select field-width-full">
        <label class="required">Country</label>
        <searchable-select
          .options="${options}"
          .value="${this.country}"
          .placeholder="Select Country"
          .required="${true}"
          @change="${this._handleCountryChange}"
        ></searchable-select>
      </div>
    `;
  }

  private _renderField(field: FieldConfig) {
    if (!field.visible) return null;

    const value = this.value[field.key] || '';
    const error = this._fieldErrors[field.key as string];
    const isTouched = this._touchedFields.has(field.key as string);
    const showError = Boolean(error && (isTouched || this._touchedFields.size > 0));

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
          ? this._renderSelectOptions(field, value, showError)
          : html`
              <input
                type="text"
                class="${showError ? 'error' : ''}"
                .value="${value}"
                .placeholder="${field.placeholder || ''}"
                @input="${(e: Event) => this._handleFieldChange(field.key, e)}"
                @blur="${() => this._handleFieldBlur(field.key)}"
                ?required="${field.required}"
                pattern="${field.pattern || ''}"
                inputmode="${ifDefined(field.inputMode)}"
                minlength="${ifDefined(field.minLength?.toString())}"
                maxlength="${ifDefined(field.maxLength?.toString())}"
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
    const validation = this._validateAll({ markVisibleFieldsTouched: true });
    this._emitValidation(validation);
    return validation.valid;
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
