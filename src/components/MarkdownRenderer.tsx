"use client";

/**
 * Lightweight markdown-to-HTML renderer for local-only content.
 * Content source: Ryan's own markdown files from ~/.claude/ (trusted, local filesystem).
 * All raw text is HTML-escaped before rendering to prevent injection.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderInline(line: string): string {
  let result = escapeHtml(line);
  // Bold
  result = result.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Inline code
  result = result.replace(/`([^`]+)`/g, "<code>$1</code>");
  // Italic
  result = result.replace(/\*(.+?)\*/g, "<em>$1</em>");
  return result;
}

function markdownToHtml(content: string): string {
  const lines = content.split("\n");
  const htmlParts: string[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let inTable = false;
  let tableRows: string[] = [];

  function flushTable() {
    if (tableRows.length > 0) {
      const rows = tableRows.filter(
        (r) => !r.match(/^\s*\|[\s\-:|]+\|\s*$/)
      );
      let html = "<table>";
      rows.forEach((row, i) => {
        const cells = row.split("|").filter((c) => c.trim() !== "");
        const tag = i === 0 ? "th" : "td";
        html += "<tr>";
        cells.forEach((cell) => {
          html += `<${tag}>${renderInline(cell.trim())}</${tag}>`;
        });
        html += "</tr>";
      });
      html += "</table>";
      htmlParts.push(html);
      tableRows = [];
    }
    inTable = false;
  }

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        htmlParts.push(
          `<pre><code>${codeBuffer.map(escapeHtml).join("\n")}</code></pre>`
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        if (inTable) flushTable();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    if (line.trim().startsWith("|")) {
      inTable = true;
      tableRows.push(line.trim());
      continue;
    } else if (inTable) {
      flushTable();
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      htmlParts.push(`<h${level}>${renderInline(headingMatch[2])}</h${level}>`);
      continue;
    }

    if (line.trim().match(/^[-*_]{3,}$/)) {
      htmlParts.push("<hr />");
      continue;
    }

    if (line.trim().startsWith(">")) {
      htmlParts.push(
        `<blockquote>${renderInline(line.trim().slice(1).trim())}</blockquote>`
      );
      continue;
    }

    if (line.trim().match(/^[-*]\s/)) {
      htmlParts.push(
        `<ul><li>${renderInline(line.trim().slice(2))}</li></ul>`
      );
      continue;
    }

    const numMatch = line.trim().match(/^(\d+)\.\s+(.+)/);
    if (numMatch) {
      htmlParts.push(`<ol><li>${renderInline(numMatch[2])}</li></ol>`);
      continue;
    }

    if (line.trim() === "") continue;

    htmlParts.push(`<p>${renderInline(line)}</p>`);
  }

  if (inTable) flushTable();

  return htmlParts.join("\n");
}

/**
 * Renders markdown content from trusted local files.
 * All text is escaped via escapeHtml() before insertion.
 * Source: only ~/.claude/ filesystem files owned by the user.
 */
export default function MarkdownRenderer({ content }: { content: string }) {
  // Security note: content comes exclusively from local filesystem files
  // that Ryan owns. All raw text is HTML-escaped in renderInline/escapeHtml
  // before being assembled into HTML strings.
  const html = markdownToHtml(content);

  return (
    <div
      className="prose-dark"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
