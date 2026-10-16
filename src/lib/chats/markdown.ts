/**
 * Markdown renderer for assistant and user messages.
 *
 * Uses `marked` for parsing and `DOMPurify` for sanitisation rather than a
 * hand-written parser. Model output is treated as untrusted: the parsed HTML is
 * always passed through DOMPurify before it reaches the DOM, so nothing in a
 * response can inject scripts, event handlers or `javascript:` links.
 *
 * During SSR (no `window`) the source is escaped to plain text and no HTML is
 * produced, which keeps server rendering safe by construction.
 */

import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/common';

marked.setOptions({ gfm: true, breaks: true });

const renderer = new marked.Renderer();

renderer.code = ({ text, lang }) => {
	const language = (lang ?? '').trim().split(/\s+/)[0];
	let highlighted = '';
	let resolved = 'text';
	if (language && hljs.getLanguage(language)) {
		try {
			highlighted = hljs.highlight(text, { language }).value;
			resolved = language;
		} catch {
			highlighted = '';
		}
	}
	if (!highlighted) {
		// Auto-detect only when no usable language hint was provided.
		try {
			const auto = hljs.highlightAuto(text);
			highlighted = auto.value;
			resolved = auto.language ?? 'text';
		} catch {
			highlighted = escapeHtml(text);
		}
	}
	// `data-code` carries the raw source so the copy button copies exactly what is
	// shown rather than re-reading highlighted markup.
	return `<div class="code-block" data-language="${escapeAttr(resolved)}"><div class="code-head"><span class="code-lang">${escapeHtml(resolved)}</span><button type="button" class="code-copy" data-code="${escapeAttr(text)}">Copy</button></div><pre class="code-pre"><code class="hljs">${highlighted}</code></pre></div>`;
};

marked.use({ renderer });

function escapeHtml(input: string): string {
	return input
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function escapeAttr(input: string): string {
	return escapeHtml(input).replace(/\n/g, '&#10;');
}

/** Hooks added after sanitisation so external links always open safely. */
function hardenLinks(root: HTMLElement): void {
	for (const anchor of root.querySelectorAll('a[href]')) {
		const href = anchor.getAttribute('href') ?? '';
		if (/^[a-z][a-z0-9+.-]*:/i.test(href) && !/^https?:/i.test(href)) {
			anchor.removeAttribute('href');
			continue;
		}
		anchor.setAttribute('rel', 'noopener noreferrer nofollow');
		anchor.setAttribute('target', '_blank');
	}
}

/**
 * Parses and sanitises markdown into HTML safe for `{@html}`.
 *
 * Returns escaped plain text on the server, where DOMPurify cannot run.
 */
export function renderMarkdown(source: string): string {
	const text = source ?? '';
	if (typeof window === 'undefined') {
		return `<pre class="plain-fallback">${escapeHtml(text)}</pre>`;
	}
	const raw = marked.parse(text, { async: false }) as string;
	const clean = DOMPurify.sanitize(raw, {
		USE_PROFILES: { html: true },
		ADD_ATTR: ['target', 'rel', 'data-code', 'data-language'],
		ADD_TAGS: ['button']
	});
	const holder = document.createElement('div');
	holder.innerHTML = clean;
	hardenLinks(holder);
	return holder.innerHTML;
}

/** First line of text, used for conversation previews. */
export function firstLine(source: string, max = 90): string {
	const line = (source ?? '').replace(/\s+/g, ' ').trim();
	return line.length > max ? `${line.slice(0, max - 1)}…` : line;
}
