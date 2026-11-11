import { remark } from "remark";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import rehypeShiki from "@shikijs/rehype";
import rehypeFormat from "rehype-format";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function extractAssetUrls(content: string): string[] {
  const regex = /\/assets\/([^\s"')]+)/g;
  const assets = new Set<string>();
  let match;
  while ((match = regex.exec(content)) !== null) {
    try {
      const rawFileName = match[1];
      const decoded = decodeURIComponent(rawFileName);
      assets.add(decoded);
    } catch {
      assets.add(match[1]);
    }
  }
  return Array.from(assets);
}

function normalizeMarkdownUrls(markdown: string) {
  return markdown.replace(/(!?\[[^\]]*\])\(([^)<>]+)\)/g, (match, prefix, url) => {
    const trimmedUrl = url.trim();
    if (trimmedUrl.includes(" ")) {
      return `${prefix}(<${trimmedUrl}>)`;
    }
    return match;
  });
}

export async function markdownToHtml(markdown: string) {
  const normalized = normalizeMarkdownUrls(markdown);
  const result = await remark()
    .use(remarkGfm)
    .use(remarkBreaks)
    .use(remarkRehype)
    .use(rehypeShiki, { themes: { light: "github-dark", dark: "github-dark" } })
    .use(rehypeFormat)
    .use(rehypeStringify)
    .process(normalized);
    
  return result.toString();
}