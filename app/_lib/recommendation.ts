import { z } from "zod";
import { extractSearchableContent, normalizeSearchText } from "./post-filter";

export const SHORT_POST_WORD_THRESHOLD = 80;
export const SHORT_POST_MIN_READ_TIME_MS = 1_500;
export const STANDARD_MIN_READ_TIME_FLOOR_MS = 4_000;
export const STANDARD_MIN_READ_TIME_CAP_MS = 120_000;
export const AVERAGE_READING_WPM = 230;
export const VERIFIED_READ_TIME_RATIO = 0.35;
export const VERIFIED_SCROLL_DEPTH_THRESHOLD = 0.85;
export const PARTIAL_READ_SCROLL_THRESHOLD = 0.4;
export const PARTIAL_READ_MIN_TIME_MS = 5_000;
export const MAX_TRACKED_ACTIVE_TIME_MS = 3_600_000;

export const ReadEngagementLevel = {
    None: "none",
    Bounced: "bounced",
    Skimmed: "skimmed",
    Completed: "completed",
} as const;

export const readEngagementLevelSchema = z.enum(ReadEngagementLevel);
export type ReadEngagementLevel = z.infer<typeof readEngagementLevelSchema>;

export const RecommendationReason = {
    Personalized: "personalized",
    Trending: "trending",
} as const;

export const recommendationReasonSchema = z.enum(RecommendationReason);
export type RecommendationReason = z.infer<typeof recommendationReasonSchema>;

export const readProgressInputSchema = z.object({
    postId: z.number().int().positive(),
    activeTimeMs: z.number().int().min(0).max(MAX_TRACKED_ACTIVE_TIME_MS),
    scrollDepth: z.number().min(0).max(1),
    reachedEnd: z.boolean(),
    enteredAtMs: z.number().int().positive().optional(),
    completedAtMs: z.number().int().positive().optional(),
});

export type ReadProgressInput = z.infer<typeof readProgressInputSchema>;

export interface ReadVerificationMetrics {
    wordCount: number;
    isShortPost: boolean;
    minReadTimeMs: number;
    effectiveDurationMs: number;
    scrollDepth: number;
    reachedEnd: boolean;
    isVerifiedRead: boolean;
    engagementLevel: ReadEngagementLevel;
}

export interface VisitorPostInteraction {
    postId: number;
    liked: boolean;
    likedAt?: Date | null;
    readCount: number;
    completedCount: number;
    maxScrollDepth: number;
    activeTimeMs: number;
    lastReadAt?: Date | null;
}

export interface RecommendablePost {
    id: number;
    slug: string;
    title: string | null;
    content: string;
    createdAt: Date;
    tags?: { id: number; name: string; color: string | null }[];
    _count?: {
        likes?: number;
        reads?: number;
    };
    completedReadsCount?: number;
}

export interface ScoredPost<T extends RecommendablePost> {
    post: T;
    score: number;
    isReadCompleted: boolean;
    isLiked: boolean;
}

export interface RecommendationResult<T extends RecommendablePost> {
    posts: T[];
    scoredPosts: ScoredPost<T>[];
    reason: RecommendationReason;
    verifiedReadsCount: number;
    likedPostsCount: number;
}

const STOPWORDS = new Set([
    "de", "da", "do", "das", "dos", "em", "no", "na", "nos", "nas",
    "um", "uma", "uns", "umas", "para", "por", "com", "sem", "sob",
    "sobre", "entre", "ate", "após", "apos", "como", "mais", "menos",
    "muito", "muita", "muitos", "muitas", "pouco", "pouca", "ja",
    "nao", "sim", "ou", "mas", " porem", "todavia", "contudo", "que",
    "quem", "qual", "quais", "quando", "onde", "porque", "porquê",
    "isso", "isto", "aquilo", "este", "esta", "estes", "estas",
    "esse", "essa", "esses", "essas", "aquele", "aquela", "seu",
    "sua", "seus", "suas", "meu", "minha", "nosso", "nossa", "ele",
    "ela", "eles", "elas", "voce", "voces", "ser", "estar", "ter",
    "haver", "fazer", "foi", "era", "sao", "está", "esta", "estao",
    "tem", "tinha", "pode", "podem", "deve", "the", "and", "for",
    "that", "this", "with", "from", "your", "have", "has", "had",
    "are", "was", "were", "been", "being", "will", "would", "could",
    "should", "into", "about", "than", "then", "them", "they", "their",
    "what", "when", "where", "which", "while", "who", "whom", "whose",
    "why", "how", "all", "any", "both", "each", "few", "more", "most",
    "other", "some", "such", "only", "own", "same", "too", "very",
    "can", "just", "don", "now", "not", "but", "you", "our", "out",
]);

const ENGAGEMENT_BASE_WEIGHT_REGISTRY: Record<ReadEngagementLevel, number> = {
    [ReadEngagementLevel.None]: 0,
    [ReadEngagementLevel.Bounced]: 0.08,
    [ReadEngagementLevel.Skimmed]: 0.45,
    [ReadEngagementLevel.Completed]: 2.0,
};

export function countReadableWords(markdown: string): number {
    const cleaned = extractSearchableContent(markdown)
        .replace(/[`#*~_>\-[\]()!|]/g, " ")
        .trim();

    if (!cleaned) {
        return 0;
    }

    return cleaned.split(/\s+/).filter(Boolean).length;
}

export function calculateMinimumReadTimeMs(markdown: string): {
    wordCount: number;
    isShortPost: boolean;
    minReadTimeMs: number;
} {
    const wordCount = countReadableWords(markdown);
    const isShortPost = wordCount < SHORT_POST_WORD_THRESHOLD;

    if (isShortPost) {
        return {
            wordCount,
            isShortPost: true,
            minReadTimeMs: SHORT_POST_MIN_READ_TIME_MS,
        };
    }

    const fullReadMs = (wordCount / AVERAGE_READING_WPM) * 60_000;
    const targetMs = Math.round(fullReadMs * VERIFIED_READ_TIME_RATIO);
    const minReadTimeMs = Math.min(
        STANDARD_MIN_READ_TIME_CAP_MS,
        Math.max(STANDARD_MIN_READ_TIME_FLOOR_MS, targetMs)
    );

    return {
        wordCount,
        isShortPost: false,
        minReadTimeMs,
    };
}

export function classifyReadEngagement(params: {
    completedCount: number;
    maxScrollDepth: number;
    activeTimeMs: number;
    readCount: number;
}): ReadEngagementLevel {
    if (params.completedCount > 0) {
        return ReadEngagementLevel.Completed;
    }

    if (
        params.maxScrollDepth >= PARTIAL_READ_SCROLL_THRESHOLD ||
        params.activeTimeMs >= PARTIAL_READ_MIN_TIME_MS
    ) {
        return ReadEngagementLevel.Skimmed;
    }

    if (params.readCount > 0) {
        return ReadEngagementLevel.Bounced;
    }

    return ReadEngagementLevel.None;
}

export function evaluateReadProgress(params: {
    markdown: string;
    activeTimeMs: number;
    scrollDepth: number;
    reachedEnd: boolean;
    enteredAtMs?: number;
    completedAtMs?: number;
    serverStartedAtMs?: number | null;
    nowMs?: number;
}): ReadVerificationMetrics {
    const { wordCount, isShortPost, minReadTimeMs } = calculateMinimumReadTimeMs(params.markdown);
    const clampedScroll = Math.min(1, Math.max(0, params.scrollDepth));
    const clampedActiveMs = Math.min(MAX_TRACKED_ACTIVE_TIME_MS, Math.max(0, params.activeTimeMs));

    const candidates: number[] = [clampedActiveMs];

    if (
        params.enteredAtMs !== undefined &&
        params.completedAtMs !== undefined &&
        params.completedAtMs >= params.enteredAtMs
    ) {
        candidates.push(params.completedAtMs - params.enteredAtMs);
    }

    if (
        params.serverStartedAtMs !== undefined &&
        params.serverStartedAtMs !== null &&
        params.nowMs !== undefined &&
        params.nowMs >= params.serverStartedAtMs
    ) {
        candidates.push(params.nowMs - params.serverStartedAtMs);
    }

    const effectiveDurationMs = Math.min(...candidates);
    const hasReachedBottom =
        params.reachedEnd || clampedScroll >= VERIFIED_SCROLL_DEPTH_THRESHOLD;
    const hasEnoughTime = effectiveDurationMs >= minReadTimeMs;
    const isVerifiedRead = hasReachedBottom && hasEnoughTime;

    const engagementLevel = classifyReadEngagement({
        completedCount: isVerifiedRead ? 1 : 0,
        maxScrollDepth: hasReachedBottom
            ? Math.max(clampedScroll, VERIFIED_SCROLL_DEPTH_THRESHOLD)
            : clampedScroll,
        activeTimeMs: effectiveDurationMs,
        readCount: 1,
    });

    return {
        wordCount,
        isShortPost,
        minReadTimeMs,
        effectiveDurationMs,
        scrollDepth: hasReachedBottom
            ? Math.max(clampedScroll, VERIFIED_SCROLL_DEPTH_THRESHOLD)
            : clampedScroll,
        reachedEnd: hasReachedBottom,
        isVerifiedRead,
        engagementLevel,
    };
}

export function extractKeywords(title: string | null, content: string): Map<string, number> {
    const combined = `${title ?? ""} ${title ?? ""} ${extractSearchableContent(content)}`;
    const normalized = normalizeSearchText(combined).replace(/[^a-z0-9\s]/g, " ");
    const tokens = normalized.split(/\s+/).filter((token) => token.length >= 3 && !STOPWORDS.has(token));

    const frequencies = new Map<string, number>();
    for (const token of tokens) {
        frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
    }

    return frequencies;
}

function computeInteractionRecencyFactor(interactionDate: Date | null | undefined, nowMs: number): number {
    if (!interactionDate) {
        return 0.9;
    }
    const ageDays = Math.max(0, (nowMs - interactionDate.getTime()) / 86_400_000);
    return 0.7 + 0.45 * Math.exp(-ageDays / 30);
}

function computeInteractionAffinityWeight(
    interaction: VisitorPostInteraction,
    nowMs: number
): number {
    const engagementLevel = classifyReadEngagement({
        completedCount: interaction.completedCount,
        maxScrollDepth: interaction.maxScrollDepth,
        activeTimeMs: interaction.activeTimeMs,
        readCount: interaction.readCount,
    });

    const readBaseWeight = ENGAGEMENT_BASE_WEIGHT_REGISTRY[engagementLevel];
    const repeatReadBonus =
        interaction.completedCount > 1
            ? Math.min(0.6, (interaction.completedCount - 1) * 0.2)
            : 0;
    const likeWeight = interaction.liked ? 3.0 : 0;

    const rawWeight = likeWeight + readBaseWeight + repeatReadBonus;
    if (rawWeight <= 0) {
        return 0;
    }

    const latestInteractionDate =
        interaction.likedAt && interaction.lastReadAt
            ? interaction.likedAt > interaction.lastReadAt
                ? interaction.likedAt
                : interaction.lastReadAt
            : interaction.likedAt ?? interaction.lastReadAt;

    return rawWeight * computeInteractionRecencyFactor(latestInteractionDate, nowMs);
}

export function rankRelevantPosts<T extends RecommendablePost>(
    posts: T[],
    interactions: VisitorPostInteraction[],
    now: Date = new Date()
): RecommendationResult<T> {
    const nowMs = now.getTime();
    if (posts.length === 0) {
        return {
            posts: [],
            scoredPosts: [],
            reason: RecommendationReason.Trending,
            verifiedReadsCount: 0,
            likedPostsCount: 0,
        };
    }

    const interactionByPostId = new Map<number, VisitorPostInteraction>();
    let verifiedReadsCount = 0;
    let likedPostsCount = 0;

    for (const item of interactions) {
        interactionByPostId.set(item.postId, item);
        if (item.completedCount > 0) {
            verifiedReadsCount += 1;
        }
        if (item.liked) {
            likedPostsCount += 1;
        }
    }

    const postTagDocumentFreq = new Map<string, number>();
    const postKeywordMaps = new Map<number, Map<string, number>>();
    const keywordDocumentFreq = new Map<string, number>();

    for (const post of posts) {
        const seenTags = new Set<string>();
        for (const tag of post.tags ?? []) {
            const normTag = normalizeSearchText(tag.name);
            if (normTag && !seenTags.has(normTag)) {
                seenTags.add(normTag);
                postTagDocumentFreq.set(normTag, (postTagDocumentFreq.get(normTag) ?? 0) + 1);
            }
        }

        const keywords = extractKeywords(post.title, post.content);
        postKeywordMaps.set(post.id, keywords);
        for (const token of keywords.keys()) {
            keywordDocumentFreq.set(token, (keywordDocumentFreq.get(token) ?? 0) + 1);
        }
    }

    const totalDocs = posts.length;
    const tagAffinity = new Map<string, number>();
    const keywordAffinity = new Map<string, number>();
    let totalMeaningfulSignal = 0;

    for (const post of posts) {
        const interaction = interactionByPostId.get(post.id);
        if (!interaction) continue;

        const weight = computeInteractionAffinityWeight(interaction, nowMs);
        if (weight <= 0.15) continue;

        totalMeaningfulSignal += weight;

        for (const tag of post.tags ?? []) {
            const normTag = normalizeSearchText(tag.name);
            if (!normTag) continue;
            const docFreq = postTagDocumentFreq.get(normTag) ?? 1;
            const idf = 1 + Math.log((totalDocs + 1) / (docFreq + 1));
            tagAffinity.set(normTag, (tagAffinity.get(normTag) ?? 0) + weight * idf);
        }

        const keywords = postKeywordMaps.get(post.id);
        if (keywords) {
            for (const [token, tf] of keywords.entries()) {
                const docFreq = keywordDocumentFreq.get(token) ?? 1;
                const idf = 1 + Math.log((totalDocs + 1) / (docFreq + 1));
                const tokenScore = Math.min(3, tf) * idf * weight;
                keywordAffinity.set(token, (keywordAffinity.get(token) ?? 0) + tokenScore);
            }
        }
    }

    const hasPersonalProfile = totalMeaningfulSignal >= 0.4;
    const maxTagAffinity = Math.max(0, ...tagAffinity.values());

    let keywordProfileNormSq = 0;
    for (const val of keywordAffinity.values()) {
        keywordProfileNormSq += val * val;
    }
    const keywordProfileNorm = Math.sqrt(keywordProfileNormSq);

    const maxPopularitySignal = Math.max(
        1,
        ...posts.map((post) => {
            const likes = post._count?.likes ?? 0;
            const completed = post.completedReadsCount ?? post._count?.reads ?? 0;
            return Math.log1p(likes * 2.5 + completed * 1.5);
        })
    );

    const scoredPosts: ScoredPost<T>[] = posts.map((post) => {
        const interaction = interactionByPostId.get(post.id);
        const isReadCompleted = (interaction?.completedCount ?? 0) > 0;
        const isLiked = Boolean(interaction?.liked);

        const likes = post._count?.likes ?? 0;
        const completed = post.completedReadsCount ?? post._count?.reads ?? 0;
        const popularityScore =
            Math.log1p(likes * 2.5 + completed * 1.5) / maxPopularitySignal;

        const ageDays = Math.max(0, (nowMs - post.createdAt.getTime()) / 86_400_000);
        const freshnessScore = Math.exp(-ageDays / 45);

        if (!hasPersonalProfile) {
            const coldStartScore = popularityScore * 0.7 + freshnessScore * 0.3;
            return {
                post,
                score: coldStartScore,
                isReadCompleted,
                isLiked,
            };
        }

        let tagMatchScore = 0;
        const postTags = post.tags ?? [];
        if (postTags.length > 0 && maxTagAffinity > 0) {
            let sumTagScore = 0;
            let matchedCount = 0;
            for (const tag of postTags) {
                const normTag = normalizeSearchText(tag.name);
                const affinity = tagAffinity.get(normTag) ?? 0;
                if (affinity > 0) {
                    matchedCount += 1;
                    sumTagScore += affinity / maxTagAffinity;
                }
            }
            if (matchedCount > 0) {
                const avgMatched = sumTagScore / postTags.length;
                const bonus = Math.min(0.25, (matchedCount - 1) * 0.12);
                tagMatchScore = Math.min(1, avgMatched + bonus);
            }
        }

        let contentMatchScore = 0;
        const keywords = postKeywordMaps.get(post.id);
        if (keywords && keywords.size > 0 && keywordProfileNorm > 0) {
            let dotProduct = 0;
            let docNormSq = 0;
            for (const [token, tf] of keywords.entries()) {
                const docFreq = keywordDocumentFreq.get(token) ?? 1;
                const idf = 1 + Math.log((totalDocs + 1) / (docFreq + 1));
                const docWeight = Math.min(3, tf) * idf;
                docNormSq += docWeight * docWeight;
                const profileWeight = keywordAffinity.get(token) ?? 0;
                if (profileWeight > 0) {
                    dotProduct += docWeight * profileWeight;
                }
            }
            const docNorm = Math.sqrt(docNormSq);
            if (docNorm > 0) {
                contentMatchScore = Math.min(1, dotProduct / (docNorm * keywordProfileNorm));
            }
        }

        const baseRelevance =
            tagMatchScore * 0.55 +
            contentMatchScore * 0.28 +
            popularityScore * 0.10 +
            freshnessScore * 0.07;

        const skimmingPenalty =
            !isReadCompleted && (interaction?.readCount ?? 0) > 0 ? 0.9 : 1.0;

        return {
            post,
            score: baseRelevance * skimmingPenalty,
            isReadCompleted,
            isLiked,
        };
    });

    scoredPosts.sort((a, b) => {
        if (hasPersonalProfile && a.isReadCompleted !== b.isReadCompleted) {
            return a.isReadCompleted ? 1 : -1;
        }
        if (Math.abs(b.score - a.score) > 1e-6) {
            return b.score - a.score;
        }
        return b.post.createdAt.getTime() - a.post.createdAt.getTime();
    });

    return {
        posts: scoredPosts.map((item) => item.post),
        scoredPosts,
        reason: hasPersonalProfile
            ? RecommendationReason.Personalized
            : RecommendationReason.Trending,
        verifiedReadsCount,
        likedPostsCount,
    };
}

