* Plan for a To Do app
Specifications
1. simple to do app. No frills. basic.
2. It should run in a browser
3. Each task has a priority (High, Medium or Low), changeable at any time. Tasks are listed by priority, highest first.
4. Dark mode option, switched with an icon button. The choice is remembered; the first visit follows the system setting.
5. Filter tabs (All / Active / Done) and an "N left" counter.
6. Edit a task's text by double-clicking it (Enter saves, Escape cancels).
7. "Clear completed" button removes all done tasks.
8. Optional due date per task, changeable at any time. Overdue tasks that are not done are shown in red. Within a priority, tasks are listed earliest due date first, tasks without a date last.
9. Undo after deleting a task or clearing completed tasks (available for a few seconds).

Technology
- Plain HTML + CSS + vanilla JavaScript. No framework, no build step, no server.
- Tasks and the theme choice are stored in the browser's localStorage so they survive a reload. Tasks saved by older versions (without priority or due date) are given defaults on load.
- Theme is a data-theme attribute on the html element, with colours defined as CSS variables.
- Run by opening index.html in a browser.
