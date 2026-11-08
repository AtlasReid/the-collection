// Local Music sheets and alerts. Contents are DOM nodes, never supplied HTML.
export function createDialogs(root, {onHelp = () => {}} = {}) {
  const doc = root.ownerDocument;
  const make = (tag, className, text) => {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const layer = make('div', 'it-detail-layer');
  const panel = make('section', 'it-detail-dialog');
  const iconBox = make('div', 'it-detail-icon', '♫');
  iconBox.setAttribute('aria-hidden', 'true');
  const heading = make('h2', 'it-detail-title');
  const description = make('p', 'it-detail-description');
  const bodyBox = make('div', 'it-detail-body');
  const choice = make('label', 'it-detail-choice');
  const checkbox = make('input');
  checkbox.type = 'checkbox';
  const choiceText = make('span');
  choice.append(checkbox, choiceText);
  const footer = make('footer', 'it-detail-footer');
  const helpButton = make('button', 'it-detail-help', '?');
  helpButton.type = 'button';
  helpButton.setAttribute('aria-label', 'Help');
  const actions = make('div', 'it-detail-actions');
  footer.append(helpButton, actions);
  panel.append(iconBox, heading, description, bodyBox, choice, footer);
  panel.tabIndex = -1;
  panel.setAttribute('aria-modal', 'true');
  layer.append(panel);
  layer.hidden = true;
  root.append(layer);

  let pending = null;
  let previousFocus = null;
  let previousInert = false;
  let workspace = null;
  let destroyed = false;

  function finish(value = 'cancel', restore = true) {
    if (!pending) return;
    const resolve = pending;
    const result = {value, checked: !choice.hidden && checkbox.checked};
    pending = null;
    layer.hidden = true;
    if (workspace?.isConnected) workspace.inert = previousInert;
    workspace = null;
    const focusTarget = previousFocus;
    previousFocus = null;
    if (restore && focusTarget?.isConnected && !focusTarget.closest('[inert]')) {
      focusTarget.focus({preventScroll: true});
    }
    resolve(result);
  }

  function open({title = 'Music', description: text = '', body = null,
    buttons = [{label: 'OK', value: 'ok', primary: true}], checkbox: choiceOptions = null,
    help = false, wide = false, icon = true} = {}) {
    if (destroyed) return Promise.resolve({value: 'cancel', checked: false});
    // A new alert resolves the previous one rather than leaving its promise alive.
    finish('cancel');
    previousFocus = doc.activeElement;
    workspace = root.querySelector('.it-workspace');
    previousInert = Boolean(workspace?.inert);
    if (workspace) workspace.inert = true;
    panel.classList.toggle('is-wide', Boolean(wide));
    panel.setAttribute('role', wide ? 'dialog' : 'alertdialog');
    panel.setAttribute('aria-label', String(title));
    heading.textContent = String(title);
    description.textContent = String(text);
    description.hidden = !text;
    iconBox.hidden = !icon;
    bodyBox.replaceChildren();
    if (body && typeof body.nodeType === 'number') bodyBox.append(body);
    bodyBox.hidden = !bodyBox.childNodes.length;
    choice.hidden = !choiceOptions;
    checkbox.checked = choiceOptions?.checked === true;
    choiceText.textContent = choiceOptions?.label || '';
    helpButton.hidden = !help;
    actions.replaceChildren();
    const entries = Array.isArray(buttons) && buttons.length ? buttons : [{label: 'OK', value: 'ok', primary: true}];
    actions.classList.toggle('is-stacked', entries.length > 2);
    for (const entry of entries) {
      const control = make('button', entry.primary ? 'is-primary' : '', String(entry.label || 'OK'));
      control.type = 'button';
      control.dataset.dialogValue = String(entry.value ?? 'ok');
      control.disabled = entry.disabled === true;
      control.addEventListener('click', () => finish(entry.value ?? 'ok'));
      actions.append(control);
    }
    layer.hidden = false;
    const result = new Promise(resolve => { pending = resolve; });
    const request = pending;
    queueMicrotask(() => {
      if (pending !== request || destroyed) return;
      (actions.querySelector('.is-primary:not(:disabled)') || actions.querySelector('button:not(:disabled)') || panel).focus({preventScroll: true});
    });
    return result;
  }

  function keydown(event) {
    if (!pending) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      finish('cancel');
      return;
    }
    if (event.key !== 'Tab') return;
    const controls = [...panel.querySelectorAll('button,input,select,textarea,a[href],[tabindex]')]
      .filter(node => !node.disabled && node.tabIndex >= 0 && node.getClientRects().length);
    if (!controls.length) { event.preventDefault(); panel.focus(); return; }
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && (doc.activeElement === first || doc.activeElement === panel)) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && (doc.activeElement === last || doc.activeElement === panel)) {
      event.preventDefault(); first.focus();
    }
  }

  const help = () => onHelp();
  const submit = event => {
    event.preventDefault();
    actions.querySelector('.is-primary:not(:disabled)')?.click();
  };
  layer.addEventListener('keydown', keydown);
  panel.addEventListener('submit', submit);
  helpButton.addEventListener('click', help);

  return {
    open,
    close(value = 'cancel') { finish(value); },
    get isOpen() { return pending !== null; },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      finish('cancel');
      layer.removeEventListener('keydown', keydown);
      panel.removeEventListener('submit', submit);
      helpButton.removeEventListener('click', help);
      layer.remove();
    },
  };
}
