"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { selectPluralForm } from "@/app/_lib/i18n";
import {
    buildHomeFilterQueryString,
    extractAvailableTags,
    FilterableTag,
    filterPosts,
    HOME_SEARCH_MAX_LENGTH,
    normalizeSearchText,
} from "@/app/_lib/post-filter";
import { useLanguage } from "./LanguageProvider";
import PostCard, { PostWithTags } from "./PostCard";

interface HomeFeedProps {
    initialPosts: PostWithTags[];
    initialQuery: string;
    initialTag: string;
}

interface TagFilterDropdownProps {
    tags: FilterableTag[];
    selectedTag: string;
    tagsLabel: string;
    allTagsLabel: string;
    onSelectTag: (tagName: string) => void;
    onClearTag: () => void;
}

function TagFilterDropdown({
    tags,
    selectedTag,
    tagsLabel,
    allTagsLabel,
    onSelectTag,
    onClearTag,
}: TagFilterDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const normalizedSelected = normalizeSearchText(selectedTag);
    const activeTag = useMemo(
        () => tags.find((tag) => normalizeSearchText(tag.name) === normalizedSelected) ?? null,
        [tags, normalizedSelected]
    );

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen]);

    return (
        <div className="relative shrink-0" ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                className={`h-9 px-3 text-xs font-medium rounded-md border flex items-center gap-2 transition shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500/40 dark:focus:ring-gh-blue/40 ${
                    activeTag
                        ? "border-sky-500/70 dark:border-gh-blue/70 bg-white dark:bg-gh-surface text-gray-900 dark:text-gh-text"
                        : "border-gray-300 dark:border-gh-border bg-white dark:bg-gh-surface text-gray-700 dark:text-gh-text hover:bg-gray-50 dark:hover:bg-[#1c2128]"
                }`}
            >
                {activeTag ? (
                    <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/15"
                        style={{ backgroundColor: activeTag.color || "#d1d5dc" }}
                    />
                ) : (
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        className="w-3.5 h-3.5 text-gray-500 dark:text-gh-muted"
                    >
                        <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
                        <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
                    </svg>
                )}
                <span className="max-w-28 truncate">{activeTag ? activeTag.name : tagsLabel}</span>
                <svg
                    className={`w-3 h-3 text-gray-400 dark:text-gh-muted transition-transform duration-150 ${
                        isOpen ? "rotate-180" : ""
                    }`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                >
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {isOpen && (
                <div
                    role="menu"
                    className="absolute right-0 mt-1.5 w-48 max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-gh-border bg-white dark:bg-gh-surface shadow-lg py-1 z-20"
                >
                    <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                            onClearTag();
                            setIsOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-1.5 text-xs transition cursor-pointer ${
                            !activeTag
                                ? "bg-gray-100 dark:bg-gh-subtle font-semibold text-gray-900 dark:text-gh-text"
                                : "text-gray-700 dark:text-gh-muted hover:bg-gray-50 dark:hover:bg-gh-subtle/60 hover:text-gray-900 dark:hover:text-gh-text"
                        }`}
                    >
                        <span>{allTagsLabel}</span>
                        {!activeTag && (
                            <svg
                                className="w-3.5 h-3.5 text-sky-600 dark:text-gh-blue"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                            >
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        )}
                    </button>

                    <div className="my-1 border-t border-gray-200 dark:border-gh-border" />

                    {tags.map((tag) => {
                        const isSelected = activeTag?.id === tag.id;
                        return (
                            <button
                                key={tag.id}
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                    onSelectTag(tag.name);
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-xs transition cursor-pointer ${
                                    isSelected
                                        ? "bg-gray-100 dark:bg-gh-subtle font-semibold text-gray-900 dark:text-gh-text"
                                        : "text-gray-700 dark:text-gh-muted hover:bg-gray-50 dark:hover:bg-gh-subtle/60 hover:text-gray-900 dark:hover:text-gh-text"
                                }`}
                            >
                                <span className="flex items-center gap-2 min-w-0">
                                    <span
                                        className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/15"
                                        style={{ backgroundColor: tag.color || "#d1d5dc" }}
                                    />
                                    <span className="truncate">{tag.name}</span>
                                </span>
                                {isSelected && (
                                    <svg
                                        className="w-3.5 h-3.5 shrink-0 text-sky-600 dark:text-gh-blue"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                    >
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default function HomeFeed({
    initialPosts,
    initialQuery,
    initialTag,
}: HomeFeedProps) {
    const { t } = useLanguage();
    const [query, setQuery] = useState(initialQuery);
    const [selectedTag, setSelectedTag] = useState(initialTag);

    useEffect(() => {
        setQuery(initialQuery);
        setSelectedTag(initialTag);
    }, [initialQuery, initialTag]);

    const availableTags = useMemo(
        () => extractAvailableTags(initialPosts),
        [initialPosts]
    );

    const filteredPosts = useMemo(
        () => filterPosts(initialPosts, { query, tag: selectedTag }),
        [initialPosts, query, selectedTag]
    );

    const normalizedSelectedTag = normalizeSearchText(selectedTag);
    const hasActiveFilters = query.trim() !== "" || normalizedSelectedTag !== "";

    const syncUrl = (nextQuery: string, nextTag: string) => {
        const qs = buildHomeFilterQueryString({ query: nextQuery, tag: nextTag });
        const nextUrl = qs ? `/?${qs}` : "/";
        window.history.replaceState(null, "", nextUrl);
    };

    const handleQueryChange = (nextQuery: string) => {
        setQuery(nextQuery);
        syncUrl(nextQuery, selectedTag);
    };

    const handleTagToggle = (tagName: string) => {
        const isSameTag = normalizeSearchText(tagName) === normalizedSelectedTag;
        const nextTag = isSameTag ? "" : tagName;
        setSelectedTag(nextTag);
        syncUrl(query, nextTag);
    };

    const handleClearTag = () => {
        setSelectedTag("");
        syncUrl(query, "");
    };

    const handleClearAllFilters = () => {
        setQuery("");
        setSelectedTag("");
        syncUrl("", "");
    };

    return (
        <div
            className="max-w-4xl
                       mx-auto
                       p-4
                       pl-10
                       flex
                       flex-col
                       gap-3
                       relative
                       before:content-['']
                       before:absolute
                       before:top-0
                       before:bottom-0
                       before:left-5
                       before:border-l-2
                       before:border-dotted
                       before:border-gray-300
                       dark:before:border-gh-border"
        >
            <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                    <div className="relative flex-1 flex items-center">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                            className="w-4 h-4 text-gray-400 dark:text-gh-muted absolute left-3 pointer-events-none"
                        >
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.3-4.3" />
                        </svg>
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => handleQueryChange(e.target.value)}
                            maxLength={HOME_SEARCH_MAX_LENGTH}
                            placeholder={t.home.searchPlaceholder}
                            aria-label={t.home.searchAriaLabel}
                            className="w-full h-9 pl-9 pr-8 text-sm rounded-md border border-gray-300 dark:border-gh-border bg-white dark:bg-gh-surface text-gray-900 dark:text-gh-text placeholder:text-gray-400 dark:placeholder:text-gh-muted shadow-xs focus:outline-none focus:border-sky-500 dark:focus:border-gh-blue transition-colors"
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={() => handleQueryChange("")}
                                aria-label={t.home.clearSearchAriaLabel}
                                className="absolute right-2.5 text-gray-400 hover:text-gray-700 dark:text-gh-muted dark:hover:text-gh-text cursor-pointer p-0.5 rounded transition-colors"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="w-3.5 h-3.5"
                                >
                                    <path d="M18 6 6 18" />
                                    <path d="m6 6 12 12" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {availableTags.length > 0 && (
                        <TagFilterDropdown
                            tags={availableTags}
                            selectedTag={selectedTag}
                            tagsLabel={t.home.tagsLabel}
                            allTagsLabel={t.home.allTags}
                            onSelectTag={handleTagToggle}
                            onClearTag={handleClearTag}
                        />
                    )}
                </div>

                {hasActiveFilters && (
                    <div className="flex items-center justify-between px-0.5 text-xs text-gray-500 dark:text-gh-muted">
                        <span className="tabular-nums">
                            {filteredPosts.length}{" "}
                            {selectPluralForm(
                                filteredPosts.length,
                                t.home.resultSingular,
                                t.home.resultPlural
                            )}
                        </span>
                        <button
                            type="button"
                            onClick={handleClearAllFilters}
                            className="text-sky-600 hover:text-sky-800 dark:text-gh-blue dark:hover:text-gh-blue-hover font-medium cursor-pointer transition-colors"
                        >
                            {t.home.clearFilters}
                        </button>
                    </div>
                )}
            </div>

            {filteredPosts.length === 0 ? (
                <div className="bg-white dark:bg-gh-surface border border-gray-300 dark:border-gh-border rounded-md p-6 text-center shadow-xs flex flex-col items-center gap-2">
                    <p className="text-sm text-gray-600 dark:text-gh-muted">
                        {hasActiveFilters ? t.home.emptyFiltered : t.home.emptyNoPosts}
                    </p>
                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={handleClearAllFilters}
                            className="text-xs font-medium px-3 py-1 rounded border border-gray-300 dark:border-gh-border text-gray-700 dark:text-gh-text hover:bg-gray-100 dark:hover:bg-gh-subtle cursor-pointer transition-colors"
                        >
                            {t.home.clearFilters}
                        </button>
                    )}
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {filteredPosts.map((post) => (
                        <PostCard
                            key={post.slug}
                            post={post}
                            untitledLabel={t.postCard.untitled}
                            activeTagName={selectedTag}
                            onTagClick={handleTagToggle}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
