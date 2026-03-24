import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

export type SearchableSelectOption = {
  value: string;
  label: string;
  group?: string;
};

@customElement('searchable-select')
export class SearchableSelect extends LitElement {
  private static readonly PANEL_GAP = 6;

  private static readonly VIEWPORT_MARGIN = 12;

  private static readonly IDEAL_PANEL_HEIGHT = 320;

  static styles = css`
    :host {
      display: block;
      position: relative;
    }

    .trigger,
    .search {
      box-sizing: border-box;
      width: 100%;
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--address-border-color, #D1D5DB);
      border-radius: 0.375rem;
      font: inherit;
      font-size: 0.875rem;
      line-height: 1.25;
      min-height: var(--address-input-height, 2.5rem);
      background: white;
    }

    .trigger {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      text-align: left;
      cursor: pointer;
    }

    .trigger:focus,
    .search:focus {
      outline: none;
      border-color: var(--address-focus-ring, #3B82F6);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .trigger.error {
      border-color: var(--address-error-color, #EF4444);
    }

    .panel {
      position: absolute;
      top: calc(100% + 0.375rem);
      left: 0;
      right: 0;
      z-index: 20;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 0.5rem;
      border: 1px solid var(--address-border-color, #D1D5DB);
      border-radius: 0.5rem;
      background: white;
      box-shadow: 0 12px 30px rgba(15, 23, 42, 0.14);
    }

    .panel.upward {
      top: auto;
      bottom: calc(100% + 0.375rem);
    }

    .options {
      flex: 1;
      overflow: auto;
      min-height: 0;
    }

    .group {
      margin-top: 0.5rem;
    }

    .group:first-child {
      margin-top: 0;
    }

    .group-label {
      padding: 0.25rem 0.5rem;
      color: #6B7280;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .option {
      width: 100%;
      padding: 0.625rem 0.75rem;
      border: 0;
      border-radius: 0.375rem;
      background: transparent;
      color: inherit;
      font: inherit;
      font-size: 0.875rem;
      text-align: left;
      cursor: pointer;
    }

    .option:hover,
    .option.active {
      background: #F3F4F6;
    }

    .option.selected {
      background: #EFF6FF;
      color: #1D4ED8;
      font-weight: 600;
    }

    .empty {
      padding: 0.75rem;
      color: #6B7280;
      font-size: 0.875rem;
      text-align: center;
    }

    .chevron {
      color: #6B7280;
      font-size: 0.75rem;
      pointer-events: none;
    }
  `;

  @property({ type: Array })
  options: SearchableSelectOption[] = [];

  @property({ type: String })
  value = '';

  @property({ type: String })
  placeholder = 'Select an option';

  @property({ type: Boolean })
  required = false;

  @property({ type: Boolean, reflect: true })
  disabled = false;

  @property({ type: Boolean })
  error = false;

  @property({ type: Number, attribute: 'search-threshold' })
  searchThreshold = 8;

  @state()
  private _open = false;

  @state()
  private _query = '';

  @state()
  private _panelDirection: 'up' | 'down' = 'down';

  @state()
  private _panelMaxHeight = 256;

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('pointerdown', this._handleDocumentPointerDown);
    window.addEventListener('resize', this._handleViewportChange);
    document.addEventListener('scroll', this._handleViewportChange, true);
  }

  disconnectedCallback() {
    document.removeEventListener('pointerdown', this._handleDocumentPointerDown);
    window.removeEventListener('resize', this._handleViewportChange);
    document.removeEventListener('scroll', this._handleViewportChange, true);
    super.disconnectedCallback();
  }

  private get _selectedOption() {
    return this.options.find((option) => option.value === this.value);
  }

  private get _showSearch() {
    return this.options.length >= this.searchThreshold;
  }

  private get _filteredOptions() {
    const query = this._query.trim().toLowerCase();

    if (!query) {
      return this.options;
    }

    return this.options.filter((option) => {
      return option.label.toLowerCase().includes(query) || option.value.toLowerCase().includes(query);
    });
  }

  private get _groupedOptions() {
    const groups = new Map<string, SearchableSelectOption[]>();

    for (const option of this._filteredOptions) {
      const key = option.group || '';
      const current = groups.get(key) || [];
      current.push(option);
      groups.set(key, current);
    }

    return [...groups.entries()];
  }

  private _toggleOpen() {
    if (this.disabled) return;
    if (this._open) {
      this._closePanel();
      return;
    }

    this._openPanel();
  }

  private _openPanel() {
    if (this.disabled || this._open) return;
    this._open = true;
    this.updateComplete.then(() => {
      this._updatePanelPlacement();
      const input = this.shadowRoot?.querySelector<HTMLInputElement>('.search');
      input?.focus();
      input?.select();
    });
  }

  private _closePanel() {
    this._open = false;
    this._query = '';
  }

  private _handleDocumentPointerDown = (event: Event) => {
    const path = event.composedPath();
    if (!path.includes(this)) {
      this._closePanel();
    }
  };

  private _handleViewportChange = () => {
    if (!this._open) return;
    this._updatePanelPlacement();
  };

  private _updatePanelPlacement() {
    const rect = this.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceAbove = rect.top - SearchableSelect.VIEWPORT_MARGIN;
    const spaceBelow = viewportHeight - rect.bottom - SearchableSelect.VIEWPORT_MARGIN;
    const downFitsIdeal = spaceBelow >= SearchableSelect.IDEAL_PANEL_HEIGHT;
    const upFitsIdeal = spaceAbove >= SearchableSelect.IDEAL_PANEL_HEIGHT;
    const prefersDown = downFitsIdeal || (!upFitsIdeal && spaceBelow >= spaceAbove);
    const availableSpace = prefersDown ? spaceBelow : spaceAbove;

    this._panelDirection = prefersDown ? 'down' : 'up';
    this._panelMaxHeight = Math.max(
      140,
      Math.min(
        SearchableSelect.IDEAL_PANEL_HEIGHT,
        availableSpace - SearchableSelect.PANEL_GAP
      )
    );
  }

  private _handleTriggerKeyDown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this._openPanel();
    }
  }

  private _handlePanelKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      this._closePanel();
      const trigger = this.shadowRoot?.querySelector<HTMLButtonElement>('.trigger');
      trigger?.focus();
    }
  }

  private _handleQueryInput(event: Event) {
    this._query = (event.target as HTMLInputElement).value;
  }

  private _selectOption(option: SearchableSelectOption) {
    if (option.value !== this.value) {
      this.value = option.value;
      this.dispatchEvent(new CustomEvent('change', {
        detail: { value: option.value },
        bubbles: true,
        composed: true
      }));
    }

    this._closePanel();
  }

  render() {
    return html`
      <button
        type="button"
        class="trigger ${this.error ? 'error' : ''}"
        aria-haspopup="listbox"
        aria-expanded="${this._open ? 'true' : 'false'}"
        ?disabled="${this.disabled}"
        @click="${this._toggleOpen}"
        @keydown="${this._handleTriggerKeyDown}"
      >
        <span>${this._selectedOption?.label || this.placeholder}</span>
        <span class="chevron">${this._open ? '▲' : '▼'}</span>
      </button>

      ${this._open ? html`
        <div
          class="panel ${this._panelDirection === 'up' ? 'upward' : ''}"
          style="max-height: ${this._panelMaxHeight}px;"
          @keydown="${this._handlePanelKeyDown}"
        >
          ${this._showSearch ? html`
            <input
              class="search"
              type="search"
              .value="${this._query}"
              placeholder="Search"
              autocomplete="off"
              spellcheck="false"
              @input="${this._handleQueryInput}"
            />
          ` : null}

          <div class="options" role="listbox" aria-required="${this.required ? 'true' : 'false'}">
            ${this._filteredOptions.length === 0
              ? html`<div class="empty">No matches found.</div>`
              : this._groupedOptions.map(([group, options]) => html`
                  <div class="group">
                    ${group ? html`<div class="group-label">${group}</div>` : null}
                    ${options.map((option) => html`
                      <button
                        type="button"
                        class="option ${option.value === this.value ? 'selected' : ''}"
                        role="option"
                        aria-selected="${option.value === this.value ? 'true' : 'false'}"
                        @click="${() => this._selectOption(option)}"
                      >
                        ${option.label}
                      </button>
                    `)}
                  </div>
                `)}
          </div>
        </div>
      ` : null}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'searchable-select': SearchableSelect;
  }
}
