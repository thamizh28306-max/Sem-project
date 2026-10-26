import { describe, it, expect } from 'vitest';
import { escapeHtml } from '../utils/escapeHtml';

describe('XSS Prevention for Titles and Popups', () => {
  it('escapes malicious HTML payloads to plain text entities', () => {
    const maliciousPayload = '<img src=x onerror=alert(1)>';
    const escaped = escapeHtml(maliciousPayload);

    expect(escaped).toBe('&lt;img src=x onerror=alert(1)&gt;');
    expect(escaped).not.toContain('<img');
    expect(escaped).not.toContain('>');

    // Create a real DOM element and verify it parses as text rather than an image element
    const container = document.createElement('div');
    container.innerHTML = escaped;
    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toBe('<img src=x onerror=alert(1)>');
  });

  it('escapes script tags and quotes in place popups', () => {
    const maliciousPlaceName = 'Supermarket "><script>alert(document.cookie)</script>';
    const escaped = escapeHtml(maliciousPlaceName);

    const div = document.createElement('div');
    div.innerHTML = escaped;
    expect(div.querySelector('script')).toBeNull();
    expect(div.textContent).toBe('Supermarket "><script>alert(document.cookie)</script>');
  });
});
