/** Screen registry.
 *
 * Its own file, loaded before any screen, because screens register themselves
 * into it at parse time. Declaring it inside the orchestrator made the load
 * order a hidden dependency: the orchestrator loads last, so every screen
 * threw ReferenceError before it ever ran.
 *
 * Keys are destination ids ('setup', 'teams', 'tournament', 'results') and
 * overlay ids ('scoring', 'history', 'import', ...). Both resolve through
 * workspace-view-machine.js, so the shell never has to know which is which.
 */
/* exported UIScreens */
var UIScreens = {};
