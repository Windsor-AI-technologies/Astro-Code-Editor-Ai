import { registerAction, executeAction } from "./actionRegistry";

//* ────────────────────────── Astro API ──────────────────────────────────
            //? API pública para extensiones y desarrolladores.
            //? Uso: astro.command.show({ label: 'Hola', message: 'Mundo' })
//* ────────────────────────────────────────────────────────────────────────

type NotificationHandler = (msg: string) => void;
let _showNotification: NotificationHandler = () => {};

/** Conecta el handler de notificaciones (se llama una vez al iniciar la app) */
export function connectNotificationHandler(handler: NotificationHandler) {
  _showNotification = handler;
}

export const astro: AstroAPI = {
  command: {
    /** Muestra una notificación */
    show(options: { label?: string; message: string }) {
      _showNotification(options.message);
    },
    
    /** Registra un comando nuevo */

    register(
      id: string,
      options: {
        label: string;
        category?: string;
        shortcut?: string;
        run: () => void;
      },
    ) {
      return registerAction({
        id,
        title: options.label,
        category: options.category ?? "Extension",
        shortcut: options.shortcut,
        run: options.run,
      });
    },

    /** Ejecuta un comando por ID */
    execute(id: string) {
      executeAction(id);
    },
  },

  notification: {
    /** Muestra una notificación info */
    info(message: string) {
      _showNotification(message);
    },

    /** Muestra un warning */
    warn(message: string) {
      _showNotification(`⚠️ ${message}`);
    },

    /** Muestra un error */
    error(message: string) {
      _showNotification(`❌ ${message}`);
    },
    succes(message: string){
      _showNotification(`${message}`)
    }
  },
};

// Exponer globalmente para extensiones
(window as any).astro = astro;
