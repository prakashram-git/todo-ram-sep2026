const STORAGE_KEY = 'todo-tasks';
const THEME_KEY = 'todo-theme';
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };
const UNDO_MS = 6000;

const form = document.getElementById('add-form');
const input = document.getElementById('new-task');
const prioritySelect = document.getElementById('new-priority');
const dueInput = document.getElementById('new-due');
const list = document.getElementById('task-list');
const themeToggle = document.getElementById('theme-toggle');
const tabs = document.querySelectorAll('.tab');
const count = document.getElementById('count');
const clearDone = document.getElementById('clear-done');
const toast = document.getElementById('toast');
const toastMsg = document.getElementById('toast-msg');
const undoButton = document.getElementById('undo');

let tasks = load();
let filter = 'all';
let pendingUndo = null; // [{ task, index }] from the most recent delete
let undoTimer = null;

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    // Tasks saved before priorities or due dates existed get defaults
    return saved.map(t => ({
      ...t,
      priority: t.priority in PRIORITY_ORDER ? t.priority : 'medium',
      due: typeof t.due === 'string' ? t.due : '',
    }));
  } catch {
    return [];
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      console.error('Storage quota exceeded: cannot save tasks');
      showToast('⚠️ Storage full: changes may not be saved', []);
    } else {
      console.error('Storage error:', e);
    }
  }
}

// Local date as YYYY-MM-DD (toISOString would give the UTC date)
function today() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Earliest due date first; tasks without a date go last
function compareDue(a, b) {
  if (a.due === b.due) return 0;
  if (!a.due) return 1;
  if (!b.due) return -1;
  return a.due < b.due ? -1 : 1;
}

function matchesFilter(task) {
  if (filter === 'active') return !task.done;
  if (filter === 'done') return task.done;
  return true;
}

function render() {
  list.innerHTML = '';
  const todayStr = today();
  // Sort a copy: priority, then due date. The sort is stable, so insertion order holds on ties.
  const sorted = [...tasks].sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || compareDue(a, b)
  );
  const visible = sorted.filter(matchesFilter);

  for (const task of visible) {
    const li = document.createElement('li');
    if (task.done) li.classList.add('done');
    if (task.due && task.due < todayStr && !task.done) li.classList.add('overdue');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.done;
    checkbox.addEventListener('change', () => toggle(task.id));

    const text = document.createElement('span');
    text.className = 'text';
    text.textContent = task.text;
    text.title = 'Double-click to edit';
    text.addEventListener('dblclick', () => startEdit(task, text));

    const taskMain = document.createElement('div');
    taskMain.className = 'task-main';
    taskMain.append(checkbox, text);

    const priority = document.createElement('select');
    priority.className = `badge ${task.priority}`;
    priority.setAttribute('aria-label', 'Priority');
    for (const level of Object.keys(PRIORITY_ORDER)) {
      const option = new Option(level[0].toUpperCase() + level.slice(1), level, false, level === task.priority);
      priority.append(option);
    }
    priority.addEventListener('change', () => setPriority(task.id, priority.value));

    const due = document.createElement('input');
    due.type = 'date';
    due.className = 'due';
    due.value = task.due;
    due.setAttribute('aria-label', 'Due date');
    due.addEventListener('change', () => setDue(task.id, due.value));

    const del = document.createElement('button');
    del.className = 'delete-btn';
    del.textContent = '✕';
    del.title = 'Delete task';
    del.addEventListener('click', () => remove(task.id));

    const taskActions = document.createElement('div');
    taskActions.className = 'task-actions';
    taskActions.append(priority, due, del);

    li.append(taskMain, taskActions);
    list.append(li);
  }

  if (visible.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty';
    empty.textContent = 'Nothing here.';
    list.append(empty);
  }

  const left = tasks.filter(t => !t.done).length;
  count.textContent = `${left} left`;
  clearDone.hidden = !tasks.some(t => t.done);
  tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.filter === filter));
}

function add(text, priority, due) {
  tasks.push({ id: Date.now(), text, done: false, priority, due });
  save();
  render();
}

function toggle(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  task.done = !task.done;
  save();
  render();
}

function setPriority(id, priority) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  task.priority = priority;
  save();
  render();
}

function setDue(id, due) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  task.due = due;
  save();
  render();
}

function rename(id, text) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  task.text = text;
  save();
  render();
}

// Swap the task text for an input. Enter or blur saves; Escape or empty text cancels.
function startEdit(task, span) {
  const editor = document.createElement('input');
  editor.type = 'text';
  editor.className = 'edit';
  editor.value = task.text;
  editor.setAttribute('aria-label', 'Edit task');

  let finished = false;
  const finish = shouldSave => {
    if (finished) return;
    finished = true;
    const text = editor.value.trim();
    if (shouldSave && text && text !== task.text) rename(task.id, text);
    else render();
  };
  editor.addEventListener('keydown', event => {
    if (event.key === 'Enter') finish(true);
    else if (event.key === 'Escape') finish(false);
  });
  editor.addEventListener('blur', () => finish(true));

  span.replaceWith(editor);
  editor.focus();
  editor.select();
}

function remove(id) {
  const index = tasks.findIndex(t => t.id === id);
  if (index === -1) return;
  const [task] = tasks.splice(index, 1);
  save();
  render();
  showToast('Task deleted', [{ task, index }]);
}

function clearCompleted() {
  const removed = [];
  tasks.forEach((task, index) => {
    if (task.done) removed.push({ task, index });
  });
  if (removed.length === 0) return;
  tasks = tasks.filter(t => !t.done);
  save();
  render();
  showToast(`${removed.length} completed task${removed.length === 1 ? '' : 's'} cleared`, removed);
}

function showToast(message, removed) {
  clearTimeout(undoTimer);
  pendingUndo = removed;
  toastMsg.textContent = message;
  toast.hidden = false;
  undoTimer = setTimeout(hideToast, UNDO_MS);
}

function hideToast() {
  clearTimeout(undoTimer);
  pendingUndo = null;
  toast.hidden = true;
}

function undo() {
  if (!pendingUndo) return;
  // Indexes are ascending and refer to the original list, so inserting in order rebuilds it
  for (const { task, index } of pendingUndo) tasks.splice(index, 0, task);
  hideToast();
  save();
  render();
}

function updateThemeButton() {
  const dark = document.documentElement.dataset.theme === 'dark';
  // Show the icon of the mode you'll switch to
  themeToggle.textContent = dark ? '☀️' : '🌙';
  const label = dark ? 'Switch to light mode' : 'Switch to dark mode';
  themeToggle.setAttribute('aria-label', label);
  themeToggle.title = label;
}

function toggleTheme() {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {}
  updateThemeButton();
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  add(text, prioritySelect.value, dueInput.value);
  input.value = '';
  dueInput.value = '';
});

tabs.forEach(tab =>
  tab.addEventListener('click', () => {
    filter = tab.dataset.filter;
    render();
  })
);
clearDone.addEventListener('click', clearCompleted);
undoButton.addEventListener('click', undo);
themeToggle.addEventListener('click', toggleTheme);

updateThemeButton();
render();
