export const FIDUCY_KEY_STYLES = `
:host { display: block; font: inherit; color: inherit; }
:host([hidden]) { display: none; }
[part='status'] { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; margin: 0; min-height: 44px; }
[part='message'] { margin: 0; }
[part='error'] { margin: 0; padding: 8px 0; }
[part='actions'] { display: inline-flex; gap: 16px; }
button { font: inherit; color: inherit; background: none; border: 0; padding: 0; min-height: 44px; min-width: 44px; cursor: pointer; text-decoration: underline; text-underline-offset: 3px; }
button:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
button:disabled { cursor: wait; opacity: 0.64; }
[part='frame'] { display: block; }
`;
