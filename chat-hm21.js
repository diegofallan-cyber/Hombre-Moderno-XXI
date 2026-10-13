/**
 * Chat "Asesor virtual" de Hombre Moderno XXI (n8n Chat)
 *
 * Instalación: sube este archivo al repositorio y agrega antes de </body>:
 *   <script type="module" src="chat-hm21.js"></script>
 *
 * Pega en CHAT_URL la "Chat URL" del nodo "Chat del sitio" (flujo activo).
 */
import { createChat } from 'https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js';

const CHAT_URL = 'https://TU-INSTANCIA-N8N/webhook/XXXXXXXX/chat';

// Estilos base del widget
const css = document.createElement('link');
css.rel = 'stylesheet';
css.href = 'https://cdn.jsdelivr.net/npm/@n8n/chat/dist/style.css';
document.head.appendChild(css);

// Colores y tipografías del sitio (--ink, --gold, --paper)
const tema = document.createElement('style');
tema.textContent = `
  :root {
    --chat--color-primary: #c8a465;
    --chat--color-primary-shade-50: #a8854a;
    --chat--color-primary-shade-100: #8f7140;
    --chat--color-secondary: #121418;
    --chat--color-secondary-shade-50: #2a2e35;
    --chat--color-white: #ffffff;
    --chat--color-light: #f5f1ea;
    --chat--color-light-shade-50: #ece6dc;
    --chat--color-light-shade-100: #c9c3b8;
    --chat--color-medium: #d7d1c6;
    --chat--color-dark: #121418;
    --chat--color-typing: #8a8f98;
    --chat--font-family: 'Inter', system-ui, sans-serif;

    --chat--window--width: 380px;
    --chat--window--height: 560px;
    --chat--window--border-radius: 4px;
    --chat--window--right: 20px;
    --chat--window--bottom: 96px;       /* queda sobre el botón flotante de WhatsApp */
    --chat--window--z-index: 70;

    --chat--header--background: #121418;
    --chat--header--color: #ffffff;
    --chat--header--padding: 18px 20px;

    --chat--message--font-size: 0.92rem;
    --chat--message--border-radius: 4px;
    --chat--message--bot--background: #ffffff;
    --chat--message--bot--color: #121418;
    --chat--message--user--background: #121418;
    --chat--message--user--color: #ffffff;

    --chat--toggle--size: 62px;
    --chat--toggle--background: #121418;
    --chat--toggle--hover--background: #2a2e35;
    --chat--toggle--active--background: #2a2e35;
    --chat--toggle--color: #c8a465;
  }
  .chat-header h1 { font-family: 'Cormorant Garamond', serif; font-weight: 600; font-size: 1.5rem; letter-spacing: .02em; }
  .chat-header p { color: rgba(255,255,255,.65); font-size: .82rem; }
  .chat-window-toggle { border: 1px solid #c8a465; box-shadow: 0 8px 24px rgba(18,20,24,.35); }
  .chat-message-markdown a { color: #a8854a; font-weight: 600; word-break: break-all; }
  @media (max-width: 520px) {
    :root { --chat--window--width: calc(100vw - 32px); --chat--window--right: 16px; --chat--window--height: 70vh; }
  }
`;
document.head.appendChild(tema);

// Vincula el chat con el visitante que registra tracker-hm21.js
let visitorId = '';
try { visitorId = localStorage.getItem('hm21_vid') || ''; } catch (e) {}

createChat({
  webhookUrl: CHAT_URL,
  mode: 'window',
  showWelcomeScreen: false,
  loadPreviousSession: false,
  defaultLanguage: 'en',
  metadata: { visitor_id: visitorId, seccion: location.hash || '#inicio' },
  initialMessages: [
    '¡Hola! 👋 Soy Max, el asesor virtual de Hombre Moderno XXI.',
    '¿Buscas algo para la oficina, una reunión o el día a día? Cuéntame y te recomiendo prendas del catálogo.'
  ],
  i18n: {
    en: {
      title: 'Asesor Hombre Moderno XXI',
      subtitle: 'Te ayudo a elegir prenda, talla y combinación.',
      footer: '',
      getStarted: 'Nueva conversación',
      inputPlaceholder: 'Escribe tu consulta…',
      closeButtonTooltip: 'Cerrar chat'
    }
  }
});
