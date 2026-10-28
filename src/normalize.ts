const dataImageLinePattern =
  /^(\s*)(?:[-*]\s*)?`?(data:image\/(?:png|jpe?g|gif|webp|avif);base64,[A-Za-z0-9+/=]+)`?\s*$/i;

export function normalizeMarkdownSource(source: string): string {
  return renderInlineDataImages(stripLeadingQuoteMarkers(source));
}

function stripLeadingQuoteMarkers(source: string): string {
  let insideFence = false;
  let fenceMarker = "";

  return source
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trimStart();
      const fenceMatch = trimmed.match(/^(```+|~~~+)/);

      if (fenceMatch && (!insideFence || fenceMatch[1].startsWith(fenceMarker[0]))) {
        if (!insideFence) {
          insideFence = true;
          fenceMarker = fenceMatch[1];
        } else {
          insideFence = false;
          fenceMarker = "";
        }
        return line;
      }

      if (insideFence) {
        return line;
      }

      return line.replace(/^\s{0,3}(?:>\s?)+/, "");
    })
    .join("\n");
}

function renderInlineDataImages(source: string): string {
  let imageIndex = 0;

  return source
    .split("\n")
    .map((line) => {
      const match = line.match(dataImageLinePattern);
      if (!match) {
        return line;
      }

      imageIndex += 1;
      const src = match[2];
      return `<figure class="embedded-image"><img src="${src}" alt="Embedded image ${imageIndex}" loading="lazy" decoding="async"><figcaption>Image ${imageIndex}</figcaption></figure>`;
    })
    .join("\n");
}
