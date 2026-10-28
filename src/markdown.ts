import MarkdownIt from "markdown-it";
import sanitizeHtml from "sanitize-html";
import { normalizeMarkdownSource } from "./normalize.js";
import type { DocumentMetadata } from "./storage.js";

const markdown = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  breaks: false
});

const defaultLinkOpen = markdown.renderer.rules.link_open;

markdown.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const href = token.attrGet("href") ?? "";

  if (/^https?:\/\//i.test(href)) {
    token.attrSet("target", "_blank");
    token.attrSet("rel", "noopener noreferrer");
  }

  return defaultLinkOpen
    ? defaultLinkOpen(tokens, idx, options, env, self)
    : self.renderToken(tokens, idx, options);
};

const defaultImage = markdown.renderer.rules.image;

markdown.renderer.rules.image = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  token.attrSet("loading", "lazy");
  token.attrSet("decoding", "async");
  return defaultImage ? defaultImage(tokens, idx, options, env, self) : self.renderToken(tokens, idx, options);
};

const allowedTags = sanitizeHtml.defaults.allowedTags.concat([
  "article",
  "aside",
  "audio",
  "caption",
  "col",
  "colgroup",
  "details",
  "figcaption",
  "figure",
  "footer",
  "header",
  "hgroup",
  "img",
  "main",
  "mark",
  "picture",
  "section",
  "source",
  "summary",
  "sup",
  "sub",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "video"
]);

export function renderMarkdown(source: string, metadata: DocumentMetadata): string {
  const normalizedSource = normalizeMarkdownSource(source);
  const rendered = markdown.render(normalizedSource, metadata);

  return sanitizeHtml(rendered, {
    allowedTags,
    allowedAttributes: {
      "*": ["id", "aria-label", "aria-hidden", "title"],
      a: ["href", "name", "target", "rel"],
      audio: ["controls", "src"],
      code: ["class"],
      col: ["span", "width"],
      colgroup: ["span", "width"],
      details: ["open"],
      figure: ["class"],
      img: ["src", "alt", "title", "width", "height", "loading", "decoding"],
      source: ["src", "srcset", "type", "media", "sizes"],
      table: ["align"],
      td: ["align", "colspan", "rowspan"],
      th: ["align", "colspan", "rowspan", "scope"],
      video: ["controls", "src", "poster", "width", "height"]
    },
    allowedClasses: {
      "*": [/^language-[a-z0-9_-]+$/i],
      figure: ["embedded-image"]
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    allowedSchemesByTag: {
      audio: ["http", "https"],
      img: ["http", "https", "data"],
      source: ["http", "https"],
      video: ["http", "https"]
    },
    transformTags: {
      img: (tagName, attribs) => {
        const src = attribs.src ?? "";
        if (src.startsWith("data:") && !/^data:image\/(?:png|jpe?g|gif|webp|avif);base64,/i.test(src)) {
          delete attribs.src;
        }

        return {
          tagName,
          attribs: {
            ...attribs,
            loading: attribs.loading ?? "lazy",
            decoding: attribs.decoding ?? "async"
          }
        };
      }
    }
  });
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
