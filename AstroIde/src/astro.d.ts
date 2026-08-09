// ── Global Astro API Type Declaration ─────────────────────────────────────────
// Allows using window.astro or just `astro` from any file without imports.
// This is the public API that extensions and developers interact with.

interface AstroCommandAPI {
  /**
   * Displays a notification toast message to the user.
   * The notification appears at the bottom-right corner of the IDE
   * and automatically disappears after a few seconds.
   * Use this for quick feedback messages like "File saved" or "Operation complete".
   *
   * @param options - Configuration object for the notification.
   * @param options.label - Optional title/label displayed above the message.
   * @param options.message - The main text content of the notification.
   *
   * @example
   * // Simple notification
   * astro.command.show({ message: 'File saved successfully!' });
   *
   * // With label
   * astro.command.show({ label: 'Git', message: 'Changes committed' });
   */
  show: (options: { label?: string; message: string }) => void;

  /**
   * Registers a new command in the global Action Registry.
   * Once registered, the command will automatically appear in the
   * Command Palette (F1) and can be executed programmatically.
   * Returns an unregister function that removes the command when called.
   * Extensions should call unregister() when they are deactivated.
   *
   * @param id - Unique identifier for the command (e.g. 'myExtension.doSomething').
   *             Convention: use dot notation with your extension name as prefix.
   * @param options - Configuration for the command.
   * @param options.label - Human-readable name shown in the Command Palette.
   * @param options.category - Optional grouping category (e.g. 'Editor', 'Git', 'Terminal').
   * @param options.shortcut - Optional keyboard shortcut display text (e.g. 'Ctrl+Shift+K').
   * @param options.run - The function that executes when the command is triggered.
   * @returns A function that unregisters the command when called.
   *
   * @example
   * // Register a command
   * const unregister = astro.command.register('prettier.format', {
   *   label: 'Format Document with Prettier',
   *   category: 'Formatting',
   *   shortcut: 'Ctrl+Shift+F',
   *   run: () => {
   *     // formatting logic here
   *     astro.notification.info('Document formatted!');
   *   }
   * });
   *
   * // Later, when extension is deactivated:
   * unregister();
   */
  register: (id: string, options: { label: string; category?: string; shortcut?: string; run: () => void }) => () => void;

  /**
   * Executes a previously registered command by its unique ID.
   * If the command does not exist or its `when` condition is false,
   * nothing happens (fails silently).
   * Use this to trigger built-in IDE actions or other extension commands.
   *
   * @param id - The unique identifier of the command to execute.
   *
   * @example
   * // Execute built-in commands
   * astro.command.execute('file.save');
   * astro.command.execute('edit.undo');
   * astro.command.execute('view.toggleTerminal');
   *
   * // Execute an extension command
   * astro.command.execute('prettier.format');
   */
  execute: (id: string) => void;
}

interface AstroNotificationAPI {
  /**
   * Shows an informational notification to the user.
   * Use for success messages, status updates, or general information
   * that doesn't require immediate attention.
   * The notification auto-dismisses after 3 seconds.
   *
   * @param message - The text to display in the notification.
   *
   * @example
   * astro.notification.info('Extension installed successfully');
   * astro.notification.info('Build completed in 2.3s');
   */
  info: (message: string) => void;

  /**
   * Shows a warning notification to the user.
   * Use for non-critical issues that the user should be aware of,
   * such as deprecated features, performance concerns, or missing optional config.
   * Displayed with a warning icon (⚠️). Auto-dismisses after 3 seconds.
   *
   * @param message - The warning text to display.
   *
   * @example
   * astro.notification.warn('Node modules out of date');
   * astro.notification.warn('Large file detected — IntelliSense may be slow');
   */
  warn: (message: string) => void;

  /**
   * Shows an error notification to the user.
   * Use for critical failures, unrecoverable errors, or operations that failed.
   * Displayed with an error icon (❌). Auto-dismisses after 3 seconds.
   *
   * @param message - The error text to display.
   *
   * @example
   * astro.notification.error('Build failed: syntax error in main.ts');
   * astro.notification.error('Could not connect to language server');
   */
  error: (message: string) => void;

  succes:(message: string) => void

}

interface AstroAPI {
  /**
   * Command system — the core of the IDE's extensibility.
   * Allows registering, executing, and displaying commands.
   * All commands registered here appear in the Command Palette (F1).
   * This is the primary way extensions add functionality to the IDE.
   */
  command: AstroCommandAPI;

  /**
   * Notification system — displays toast messages to the user.
   * Supports three levels: info (success/neutral), warn (caution), error (failure).
   * Notifications appear at the bottom-right and auto-dismiss.
   * Use this for user feedback that doesn't interrupt workflow.
   */
  notification: AstroNotificationAPI;
}

declare global {
  var astro: AstroAPI;
  interface Window {
    astro: AstroAPI;
  }
}
