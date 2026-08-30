export function normalizeFilterText(value = '') {
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function filterStateFromEntries(entries = []) {
  return Object.fromEntries(
    [...entries]
      .map(([key, value]) => [String(key), String(value ?? '').trim()])
      .filter(([key, value]) => key && value),
  );
}

export function itemMatchesFilters(item = {}, state = {}) {
  const queryTokens = normalizeFilterText(state.q).split(' ').filter(Boolean);
  const searchable = normalizeFilterText(item.search);
  if (queryTokens.some((token) => !searchable.includes(token))) return false;
  return Object.entries(state).every(([key, value]) => {
    if (!value || key === 'q') return true;
    return normalizeFilterText(item[key]) === normalizeFilterText(value);
  });
}

export function filterCollection(items = [], state = {}) {
  return items.filter((item) => itemMatchesFilters(item, state));
}

function stateFromForm(form) {
  return filterStateFromEntries(new FormData(form).entries());
}

function stateFromUrl(form) {
  const params = new URLSearchParams(window.location.search);
  return filterStateFromEntries(
    [...form.elements]
      .filter((field) => field.name && params.has(field.name))
      .map((field) => [field.name, params.get(field.name)]),
  );
}

function applyStateToForm(form, state) {
  [...form.elements].forEach((field) => {
    if (!field.name || !('value' in field)) return;
    field.value = state[field.name] ?? '';
  });
}

function updateUrl(state) {
  const url = new URL(window.location.href);
  [...url.searchParams.keys()].forEach((key) => url.searchParams.delete(key));
  Object.entries(state).forEach(([key, value]) => url.searchParams.set(key, value));
  window.history.replaceState({ collectionFilters: state }, '', `${url.pathname}${url.search}${url.hash}`);
}

function recordFor(element) {
  return {
    search: element.dataset.search ?? element.textContent,
    ...Object.fromEntries(Object.entries(element.dataset).filter(([key]) => key !== 'search' && key !== 'filterItem')),
  };
}

export function initCollectionFilters(root) {
  if (!root || root.dataset.filterReady === 'true') return null;
  root.dataset.filterReady = 'true';
  const form = root.querySelector('[data-filter-form]');
  const items = [...root.querySelectorAll('[data-filter-item]')];
  const count = root.querySelector('[data-filter-count]');
  const empty = root.querySelector('[data-filter-empty]');
  const results = root.querySelector('[data-filter-results]');
  const reset = root.querySelector('[data-filter-reset]');
  const singular = root.dataset.filterSingular || 'result';
  const plural = root.dataset.filterPlural || `${singular}s`;
  if (!form) return null;

  const render = ({ writeUrl = true } = {}) => {
    const state = stateFromForm(form);
    let shown = 0;
    items.forEach((element) => {
      const visible = itemMatchesFilters(recordFor(element), state);
      element.hidden = !visible;
      if (visible) shown += 1;
    });
    root.querySelectorAll('[data-filter-group]').forEach((group) => {
      group.hidden = !group.querySelector('[data-filter-item]:not([hidden])');
    });
    if (count) count.textContent = `${shown} ${shown === 1 ? singular : plural}`;
    if (empty) empty.hidden = shown !== 0;
    if (results) results.hidden = shown === 0;
    if (reset) reset.disabled = Object.keys(state).length === 0;
    form.querySelectorAll('select[name]').forEach((select) => {
      [...select.options].forEach((option) => {
        if (!option.value) return;
        const label = option.dataset.label || option.textContent.replace(/\s+\(\d+\)$/, '');
        option.dataset.label = label;
        const candidate = { ...state, [select.name]: option.value };
        const available = items.filter((item) => itemMatchesFilters(recordFor(item), candidate)).length;
        option.textContent = `${label} (${available})`;
        option.disabled = available === 0 && option.value !== select.value;
      });
    });
    if (writeUrl) updateUrl(state);
    root.dispatchEvent(new CustomEvent('collection-filtered', { detail: { shown, state } }));
    return { shown, state };
  };

  const restore = () => {
    applyStateToForm(form, stateFromUrl(form));
    render({ writeUrl: false });
  };
  form.addEventListener('input', () => render());
  form.addEventListener('change', () => render());
  reset?.addEventListener('click', () => {
    form.reset();
    render();
    form.querySelector('input, select')?.focus();
  });
  window.addEventListener('popstate', restore);
  restore();
  return { render, restore };
}
