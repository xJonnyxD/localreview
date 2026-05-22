import { useEffect } from 'react';

const APP_NAME = 'LocalReview';

/**
 * Actualiza el <title> del documento.
 * Si no se pasa titulo, muestra solo el nombre de la app.
 */
export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} — ${APP_NAME}` : APP_NAME;
    return () => {
      document.title = APP_NAME;
    };
  }, [title]);
}
