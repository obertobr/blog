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

export async function markdownToHtml(markdown: string) {
  const result = await remark()
    .use(remarkGfm)
    .use(remarkBreaks)
    .use(remarkRehype)
    .use(rehypeShiki, { themes: { light: "github-dark", dark: "github-dark" } })
    .use(rehypeFormat)
    .use(rehypeStringify)
    .process(markdown);
    
  return result.toString();
}