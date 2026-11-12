import { z } from "zod";

export const HOME_SEARCH_MAX_LENGTH = 100;
export const HOME_TAG_FILTER_MAX_LENGTH = 50;

export const HomeFilterParam = {
    Query: "q",
    Tag: "tag",
} as const;

export const homeQuerySchema = z.string().trim().max(HOME_SEARCH_MAX_LENGTH);
export const homeTagSchema = z.string().trim().max(HOME_TAG_FILTER_MAX_LENGTH);

export interface HomeFilterCriteria {
    query: string;
    tag: string;
}

export interface FilterableTag {
    id: number;
    name: string;
    color: string | null;
}

export interface FilterablePost {
    title: string | null;
    content: string;
    tags?: FilterableTag[];
}

export function normalizeSearchText(text: string): string {
    return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

export function extractSearchableContent(markdown: string): string {
    return markdown
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
}

export function parseHomeFilterParams(raw: {
    q?: unknown;
    tag?: unknown;
}): HomeFilterCriteria {
    const rawQuery = Array.isArray(raw.q) ? raw.q[0] : raw.q;
    const rawTag = Array.isArray(raw.tag) ? raw.tag[0] : raw.tag;

    const parsedQuery = homeQuerySchema.safeParse(rawQuery);
    const parsedTag = homeTagSchema.safeParse(rawTag);

    return {
        query: parsedQuery.success ? parsedQuery.data : "",
        tag: parsedTag.success ? parsedTag.data : "",
    };
}

export function buildHomeFilterQueryString(criteria: HomeFilterCriteria): string {
    const params = new URLSearchParams();
    const trimmedQuery = criteria.query.trim();
    const trimmedTag = criteria.tag.trim();

    if (trimmedQuery) {
        params.set(HomeFilterParam.Query, trimmedQuery);
    }
    if (trimmedTag) {
        params.set(HomeFilterParam.Tag, trimmedTag);
    }

    return params.toString();
}

export function buildTagFilterHref(tagName: string): string {
    const queryString = buildHomeFilterQueryString({ query: "", tag: tagName });
    return queryString ? `/?${queryString}` : "/";
}

export function extractAvailableTags<T extends FilterablePost>(posts: T[]): FilterableTag[] {
    const seen = new Map<string, FilterableTag>();

    for (const post of posts) {
        for (const tag of post.tags ?? []) {
            const key = normalizeSearchText(tag.name);
            if (key && !seen.has(key)) {
                seen.set(key, tag);
            }
        }
    }

    return Array.from(seen.values()).sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );
}

export function filterPosts<T extends FilterablePost>(
    posts: T[],
    criteria: HomeFilterCriteria
): T[] {
    const normalizedTag = normalizeSearchText(criteria.tag);
    const normalizedQuery = normalizeSearchText(criteria.query);
    const tokens = normalizedQuery ? normalizedQuery.split(/\s+/).filter(Boolean) : [];

    if (!normalizedTag && tokens.length === 0) {
        return posts;
    }

    return posts.filter((post) => {
        if (normalizedTag) {
            const matchesTag = (post.tags ?? []).some(
                (tag) => normalizeSearchText(tag.name) === normalizedTag
            );
            if (!matchesTag) {
                return false;
            }
        }

        if (tokens.length > 0) {
            const haystack = `${normalizeSearchText(post.title ?? "")} ${normalizeSearchText(
                extractSearchableContent(post.content)
            )}`;
            return tokens.every((token) => haystack.includes(token));
        }

        return true;
    });
}

