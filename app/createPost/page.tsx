"use client"

import { redirect } from "next/navigation"
import toast from "react-hot-toast"
import { ChangeEvent, startTransition, useActionState, useCallback, useEffect, useRef, useState } from "react"
import { markdown } from "@/app/_lib/markdown"
import { createPostAction, deleteAssetAction, FormPostState, getPostForEditAction, saveAssetAction, saveDraftAction, unpublishPostAction } from "../_lib/actions"
import Editor from "@monaco-editor/react";
import { markdownToHtml } from "../_lib/util"
import { editor } from "monaco-editor"
import CreatableSelect from 'react-select/creatable';
import { getTags } from "../_lib/posts"
import Asset from "@/components/Asset"
import ReuseImageModal from "@/components/ReuseImageModal"
import DraftsModal from "@/components/DraftsModal"
import { useTheme } from "@/components/ThemeProvider"
import { ThemeMode } from "../_lib/theme"
import { useLanguage } from "@/components/LanguageProvider"

export const AutoSaveStatus = {
    Idle: "idle",
    Dirty: "dirty",
    Saving: "saving",
    Saved: "saved",
    Error: "error",
} as const;

export type AutoSaveStatus = (typeof AutoSaveStatus)[keyof typeof AutoSaveStatus];

const optionsEditor: editor.IStandaloneEditorConstructionOptions = {
    fontSize: 14,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    scrollbar: {
        vertical: 'visible',
        horizontal: 'visible'
    },
    wordWrap: 'on',
    hover: { enabled: false },
    quickSuggestions: false,
    suggestOnTriggerCharacters: false,
    folding: false
}

const initialState: FormPostState = { message: '', slug: null }

function isImageFile(file: File): boolean {
    if (file.type && file.type.startsWith("image/")) return true;
    return /\.(png|jpe?g|gif|webp|svg|avif|bmp)$/i.test(file.name);
}

function getImagesFromDataTransfer(data: DataTransfer | null): File[] {
    if (!data) return [];
    const files: File[] = [];
    if (data.items && data.items.length > 0) {
        for (let i = 0; i < data.items.length; i++) {
            const item = data.items[i];
            if (item.kind === "file") {
                const file = item.getAsFile();
                if (file && isImageFile(file)) {
                    files.push(file);
                }
            }
        }
    }
    if (files.length === 0 && data.files && data.files.length > 0) {
        for (let i = 0; i < data.files.length; i++) {
            const file = data.files[i];
            if (isImageFile(file)) {
                files.push(file);
            }
        }
    }
    return files;
}

export default function CreatePost() {
    const { resolvedTheme } = useTheme();
    const { locale, t } = useLanguage();
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

    const [state, formAction] = useActionState(createPostAction, initialState);
    const [stateAsset, saveAsset] = useActionState(saveAssetAction, null);
    const [stateDelete, deleteAsset] = useActionState(deleteAssetAction, null);

    const [postId, setPostId] = useState<number | null>(null);
    const postIdRef = useRef<number | null>(null);
    const [isPublishedPost, setIsPublishedPost] = useState<boolean>(false);
    const isPublishedRef = useRef<boolean>(false);

    const [title, setTitle] = useState(state.formPost?.title || "");
    const [content, setContent] = useState(state.formPost?.content || "");
    const [tags, setTags] = useState(state.formPost?.tags || []);
    const [previewHtml, setPreviewHtml] = useState("");

    const [saveStatus, setSaveStatus] = useState<AutoSaveStatus>(AutoSaveStatus.Idle);
    const [lastSavedTime, setLastSavedTime] = useState<string>("");

    const [settingsOpen, settingsSetOpen] = useState(false);
    const [assetsOpen, assetsSetOpen] = useState(true);

    const [allTags, setAllTags] = useState<{ value: string; label: string }[]>([]);
    const [assets, setAssets] = useState<string[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [reuseModalOpen, setReuseModalOpen] = useState(false);
    const [draftsModalOpen, setDraftsModalOpen] = useState(false);

    const lastSavedRef = useRef<{ title: string; content: string; tags: string[] }>({
        title: "",
        content: "",
        tags: [],
    });
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const maxWaitTimerRef = useRef<NodeJS.Timeout | null>(null);
    const isSavingRef = useRef<boolean>(false);
    const isMountedRef = useRef<boolean>(false);
    const loadedUrlIdRef = useRef<number | null>(null);

    const handleImportAssets = (importedUrls: string[]) => {
        setAssets(prev => {
            const existing = new Set(prev);
            const toAdd = importedUrls.filter(u => !existing.has(u));
            return prev.concat(toAdd);
        });
    };

    const convert = useCallback(async (markdown: string) => {
        const html = await markdownToHtml(markdown)
        setPreviewHtml(html);
    }, []);

    const saveDraft = useCallback(async (isManual: boolean = false) => {
        if (isSavingRef.current) return;

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }
        if (maxWaitTimerRef.current) {
            clearTimeout(maxWaitTimerRef.current);
            maxWaitTimerRef.current = null;
        }

        const currentTitle = title;
        const currentContent = content;
        const currentTags = tags;

        const hasContent = currentTitle.trim().length > 0 || currentContent.trim().length > 0;
        if (!hasContent) {
            if (isManual) {
                toast.error(t.editor.fillTitleOrContent);
            }
            return;
        }

        const isDifferent =
            currentTitle !== lastSavedRef.current.title ||
            currentContent !== lastSavedRef.current.content ||
            JSON.stringify(currentTags) !== JSON.stringify(lastSavedRef.current.tags);

        if (!isDifferent && !isManual) {
            setSaveStatus(AutoSaveStatus.Saved);
            return;
        }

        isSavingRef.current = true;
        setSaveStatus(AutoSaveStatus.Saving);

        try {
            const result = await saveDraftAction({
                id: postIdRef.current ?? undefined,
                title: currentTitle,
                content: currentContent,
                tags: currentTags,
                keepPublished: isPublishedRef.current,
            });

            if (result.success && result.id) {
                postIdRef.current = result.id;
                setPostId(result.id);
                lastSavedRef.current = {
                    title: currentTitle,
                    content: currentContent,
                    tags: [...currentTags],
                };
                setSaveStatus(AutoSaveStatus.Saved);
                const timeString = new Date().toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
                setLastSavedTime(timeString);
                if (isManual) {
                    toast.success(result.message || t.editor.draftSavedSuccess);
                }
            } else {
                setSaveStatus(AutoSaveStatus.Error);
                if (isManual) {
                    toast.error(result.error || t.editor.draftSaveError);
                }
            }
        } catch {
            setSaveStatus(AutoSaveStatus.Error);
            if (isManual) {
                toast.error(t.editor.draftSaveError);
            }
        } finally {
            isSavingRef.current = false;
        }
    }, [title, content, tags, locale, t.editor]);

    const loadPost = useCallback(async (selectedId: number) => {
        const res = await getPostForEditAction(selectedId);
        if (res.error || !res.post) {
            toast.error(res.error || t.editor.loadPostError);
            return;
        }

        const post = res.post;
        postIdRef.current = post.id;
        setPostId(post.id);
        setIsPublishedPost(Boolean(post.published));
        isPublishedRef.current = Boolean(post.published);

        setTitle(post.title || "");
        setContent(post.content || "");
        setTags(post.tags || []);
        if (post.assets && post.assets.length > 0) {
            setAssets(prev => {
                const existing = new Set(prev);
                const toAdd = post.assets.filter(a => !existing.has(a));
                return prev.concat(toAdd);
            });
        }

        lastSavedRef.current = {
            title: post.title || "",
            content: post.content || "",
            tags: [...post.tags],
        };

        if (editorRef.current) {
            editorRef.current.setValue(post.content || "");
        }
        await convert(post.content || "");
        setSaveStatus(AutoSaveStatus.Saved);
    }, [convert, t.editor]);

    const handleNewPost = () => {
        if (title.trim() || content.trim()) {
            if (!confirm(t.editor.newPostConfirm)) return;
        }

        postIdRef.current = null;
        setPostId(null);
        setIsPublishedPost(false);
        isPublishedRef.current = false;
        loadedUrlIdRef.current = null;

        setTitle("");
        setContent("");
        setTags([]);
        setAssets([]);

        lastSavedRef.current = {
            title: "",
            content: "",
            tags: [],
        };

        if (editorRef.current) {
            editorRef.current.setValue("");
        }
        setPreviewHtml("");
        setSaveStatus(AutoSaveStatus.Idle);
        toast.success(t.editor.newPostStarted);
    };

    const handleUnpublish = async () => {
        if (!postIdRef.current) return;
        if (!confirm(t.editor.unpublishConfirm)) return;

        const res = await unpublishPostAction(postIdRef.current);
        if (res.success) {
            setIsPublishedPost(false);
            isPublishedRef.current = false;
            toast.success(t.editor.unpublishSuccess);
        } else {
            toast.error(res.error || t.editor.unpublishError);
        }
    };

    const uploadAndInsertImages = useCallback(async (files: File[]) => {
        const imageFiles = files.filter(f => f.type.startsWith("image/"));
        if (imageFiles.length === 0) return;

        const toastId = toast.loading(t.editor.uploadingImage);
        try {
            const result = await saveAssetAction(null, imageFiles);

            if (result.errors && result.errors.length > 0) {
                for (const err of result.errors) {
                    toast.error(err);
                }
            }

            if (result.assets && result.assets.length > 0) {
                setAssets(prev => prev.concat(result.assets));

                const markdownLines = result.assets.map(assetUrl => {
                    const rawName = decodeURIComponent(assetUrl.split('/').pop() || '');
                    const baseName = rawName.replace(/\.[^/.]+$/, "");
                    const cleanAlt = baseName.replace(/-[a-f0-9]{8}$/i, "").replace(/-/g, " ");
                    return `![${cleanAlt || "imagem"}](${encodeURI(assetUrl)})\n`;
                }).join("\n");

                if (editorRef.current) {
                    const editor = editorRef.current;
                    const selection = editor.getSelection();
                    if (selection) {
                        editor.executeEdits("insert-image", [{
                            range: selection,
                            text: markdownLines,
                            forceMoveMarkers: true,
                        }]);
                    } else {
                        const model = editor.getModel();
                        if (model) {
                            const lineCount = model.getLineCount();
                            const lastLineLength = model.getLineMaxColumn(lineCount);
                            editor.executeEdits("insert-image", [{
                                range: {
                                    startLineNumber: lineCount,
                                    startColumn: lastLineLength,
                                    endLineNumber: lineCount,
                                    endColumn: lastLineLength,
                                },
                                text: `\n${markdownLines}`,
                                forceMoveMarkers: true,
                            }]);
                        }
                    }
                    editor.focus();
                    const updated = editor.getValue();
                    setContent(updated);
                    await convert(updated);
                } else {
                    setContent(prev => {
                        const updated = prev ? `${prev}\n\n${markdownLines}` : markdownLines;
                        convert(updated);
                        return updated;
                    });
                }

                toast.success(t.editor.imageAddedSuccess, { id: toastId });
            } else {
                toast.dismiss(toastId);
            }
        } catch {
            toast.error(t.editor.imageUploadError, { id: toastId });
        }
    }, [convert, t.editor]);

    const handleSendForm = () => {
        if (!title.trim()) {
            toast.error(t.editor.defineTitleToPublish);
            settingsSetOpen(true);
            return;
        }

        startTransition(() => {
            formAction({
                id: postIdRef.current ?? undefined,
                title,
                content,
                tags,
                assets
            });
        });
    };

    function handleEditorDidMount(editor: editor.IStandaloneCodeEditor) {
        editorRef.current = editor;

        const domNode = editor.getDomNode();
        if (domNode) {
            const handlePaste = (e: ClipboardEvent) => {
                const imageFiles = getImagesFromDataTransfer(e.clipboardData);
                if (imageFiles.length > 0) {
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    uploadAndInsertImages(imageFiles);
                }
            };

            domNode.addEventListener("paste", handlePaste, true);
            const textarea = domNode.querySelector("textarea");
            if (textarea) {
                textarea.addEventListener("paste", handlePaste, true);
            }

            domNode.addEventListener("dragover", (e: DragEvent) => {
                if (e.dataTransfer?.types?.includes("Files")) {
                    e.preventDefault();
                    setIsDragging(true);
                }
            });

            domNode.addEventListener("dragleave", (e: DragEvent) => {
                e.preventDefault();
                setIsDragging(false);
            });

            domNode.addEventListener("drop", (e: DragEvent) => {
                setIsDragging(false);
                const imageFiles = getImagesFromDataTransfer(e.dataTransfer);
                if (imageFiles.length > 0) {
                    e.preventDefault();
                    e.stopPropagation();
                    uploadAndInsertImages(imageFiles);
                }
            });
        }
    }

    async function handleEditorChange(value: string | undefined) {
        setContent(value || "");
        await convert(value || "");
    }

    useEffect(() => {
        const listTags = async () => {
            const tags = await getTags()
            setAllTags(tags.map(tag => ({ value: tag.name, label: tag.name })))
        }

        listTags()

        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const urlId = params.get("id") || params.get("draftId");
            if (urlId) {
                const num = parseInt(urlId, 10);
                if (!isNaN(num) && loadedUrlIdRef.current !== num) {
                    loadedUrlIdRef.current = num;
                    loadPost(num);
                }
            }
        }

        const edit = document.getElementById("edit");
        if (edit) {
            return markdown()
        }
    }, [loadPost])

    useEffect(() => {
        if (!isMountedRef.current) {
            isMountedRef.current = true;
            return;
        }

        const hasContent = title.trim().length > 0 || content.trim().length > 0;
        if (!hasContent) return;

        const isDifferent =
            title !== lastSavedRef.current.title ||
            content !== lastSavedRef.current.content ||
            JSON.stringify(tags) !== JSON.stringify(lastSavedRef.current.tags);

        if (!isDifferent) return;

        setSaveStatus(AutoSaveStatus.Dirty);

        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            saveDraft(false);
        }, 3000);

        if (!maxWaitTimerRef.current) {
            maxWaitTimerRef.current = setTimeout(() => {
                saveDraft(false);
            }, 30000);
        }
    }, [title, content, tags, saveDraft]);

    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            if (maxWaitTimerRef.current) clearTimeout(maxWaitTimerRef.current);
        };
    }, []);

    useEffect(() => {
        const handleGlobalPaste = (e: ClipboardEvent) => {
            const target = e.target as HTMLElement | null;
            if (target && target.tagName === "INPUT" && target.id === "post-title") {
                return;
            }

            const imageFiles = getImagesFromDataTransfer(e.clipboardData);
            if (imageFiles.length > 0) {
                e.preventDefault();
                e.stopImmediatePropagation();
                uploadAndInsertImages(imageFiles);
            }
        };

        window.addEventListener("paste", handleGlobalPaste, true);
        return () => window.removeEventListener("paste", handleGlobalPaste, true);
    }, [uploadAndInsertImages]);

    useEffect(() => {
        if (!state) return

        if (state.slug) {
            toast.success(state.message)
            redirect(`post/${state.slug}`)
        } else if (state.message) {
            toast.error(state.message)
        }
    }, [state])

    function handleImageInput(event: ChangeEvent<HTMLInputElement>) {
        startTransition(() => {
            const files = event.target.files;
            if (files) {
                saveAsset(files)
            }
        });
    }

    const handleDeleteAsset = (url: string) => {
        const fileName = url.split('/').pop() || '';
        const decoded = decodeURIComponent(fileName);
        const encoded = encodeURI(fileName);

        if (
            content.includes(fileName) ||
            content.includes(decoded) ||
            content.includes(encoded) ||
            content.includes(url)
        ) {
            toast.error(t.editor.cannotDeleteUsedImage);
            return;
        }

        startTransition(() => {
            deleteAsset(url);
        });
    };

    useEffect(() => {
        if (!stateAsset) return

        for (const error of stateAsset.errors) {
            toast.error(error)
        }
        setAssets(prev => prev.concat(stateAsset.assets))
    }, [stateAsset])

    useEffect(() => {
        if (!stateDelete?.success) {
            if (stateDelete?.error) {
                toast.error(stateDelete?.error)
            }
        } else {
            setAssets(prev => prev.filter(asset => asset !== stateDelete.filePath))
            toast.success(stateDelete.message)
        }
    }, [stateDelete])

    return (
        <div className="flex flex-col h-[89vh]">
            <div className="flex p-2 justify-between items-center border-b border-gray-300 dark:border-gh-border bg-white dark:bg-gh-surface transition-colors">
                <div className="flex gap-2 items-center flex-wrap">
                    <button
                        type="button"
                        className="bg-sky-600 text-white font-medium p-1.5 px-3 rounded-lg hover:bg-sky-700 transition cursor-pointer shadow-sm text-sm"
                        onClick={handleSendForm}
                    >
                        {isPublishedPost ? t.editor.saveChanges : t.editor.publish}
                    </button>
                    {!isPublishedPost ? (
                        <button
                            type="button"
                            className="bg-white dark:bg-gh-subtle border border-gray-300 dark:border-gh-border p-1.5 px-3 rounded-lg font-medium text-gray-700 dark:text-gh-text hover:text-gray-900 dark:hover:text-white transition hover:border-gray-500 dark:hover:border-gh-muted cursor-pointer text-sm"
                            onClick={() => saveDraft(true)}
                        >
                            {t.editor.saveDraft}
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="bg-white dark:bg-gh-subtle border border-amber-300 dark:border-amber-700 p-1.5 px-3 rounded-lg font-medium text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition cursor-pointer text-sm"
                            onClick={handleUnpublish}
                        >
                            {t.editor.unpublish}
                        </button>
                    )}
                    {postId !== null && (
                        <button
                            type="button"
                            className="bg-white dark:bg-gh-subtle border border-gray-300 dark:border-gh-border p-1.5 px-3 rounded-lg font-medium text-gray-600 dark:text-gh-muted hover:text-gray-900 dark:hover:text-white transition hover:border-gray-500 dark:hover:border-gh-muted cursor-pointer text-sm"
                            onClick={handleNewPost}
                        >
                            {t.editor.newPost}
                        </button>
                    )}
                    <div className="ml-2 flex items-center min-h-[20px]">
                        {saveStatus === AutoSaveStatus.Saving && (
                            <span className="text-xs text-sky-600 dark:text-gh-blue flex items-center gap-1.5 font-medium animate-pulse">
                                <span className="inline-block w-2 h-2 rounded-full bg-sky-500"></span>
                                {t.editor.savingDraft}
                            </span>
                        )}
                        {saveStatus === AutoSaveStatus.Saved && (
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
                                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                                {t.editor.saved} {lastSavedTime ? `${t.editor.at} ${lastSavedTime}` : ""}
                            </span>
                        )}
                        {saveStatus === AutoSaveStatus.Dirty && (
                            <span className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-medium">
                                <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
                                {t.editor.unsavedChanges}
                            </span>
                        )}
                        {saveStatus === AutoSaveStatus.Error && (
                            <span className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5 font-medium">
                                <span className="inline-block w-2 h-2 rounded-full bg-red-500"></span>
                                {t.editor.saveError}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex gap-2 items-center">
                    <button
                        type="button"
                        onClick={() => setDraftsModalOpen(true)}
                        className="bg-white dark:bg-gh-subtle border border-gray-300 dark:border-gh-border p-1.5 px-3 rounded-lg font-medium text-gray-700 dark:text-gh-text hover:text-gray-900 dark:hover:text-white transition hover:border-gray-500 dark:hover:border-gh-muted cursor-pointer text-sm"
                    >
                        {t.editor.drafts}
                    </button>
                    <button
                        type="button"
                        onClick={() => { settingsSetOpen(!settingsOpen) }}
                        className="bg-white dark:bg-gh-subtle border border-gray-300 dark:border-gh-border p-1.5 px-3 rounded-lg font-medium text-gray-700 dark:text-gh-text hover:text-gray-900 dark:hover:text-white transition hover:border-gray-500 dark:hover:border-gh-muted cursor-pointer text-sm"
                    >
                        {t.editor.settings}
                    </button>
                </div>
            </div>
            <div
                id="container"
                onDragOver={(e) => {
                    if (e.dataTransfer?.types?.includes("Files")) {
                        e.preventDefault();
                        setIsDragging(true);
                    }
                }}
                onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                        setIsDragging(false);
                    }
                }}
                onDrop={(e) => {
                    setIsDragging(false);
                    const imageFiles = getImagesFromDataTransfer(e.dataTransfer);
                    if (imageFiles.length > 0) {
                        e.preventDefault();
                        uploadAndInsertImages(imageFiles);
                    }
                }}
                className="flex w-full h-full bg-white dark:bg-gh-canvas border-b border-gray-200 dark:border-gh-border relative"
            >
                {isDragging && (
                    <div className="absolute inset-0 bg-sky-500/10 border-2 border-dashed border-sky-500 z-40 flex items-center justify-center pointer-events-none backdrop-blur-[1px]">
                        <span className="bg-white dark:bg-gh-surface px-4 py-2 rounded-lg shadow-md text-sky-700 dark:text-gh-blue font-semibold text-base border border-sky-200 dark:border-gh-border">
                            {t.editor.dropImageHere}
                        </span>
                    </div>
                )}
                <div id="edit" className="w-1/2 m-0 p-0 whitespace-nowrap align-top h-full">
                    <div id="editor-wrapper" className="h-full">
                        <Editor
                            language="markdown"
                            theme={resolvedTheme === ThemeMode.Dark ? "vs-dark" : "vs"}
                            options={optionsEditor}
                            onMount={handleEditorDidMount}
                            onChange={handleEditorChange}
                            value={content}
                        />
                    </div>
                </div>

                <div id="split-divider" className="w-[5px] bg-gray-300 dark:bg-gh-border cursor-col-resize z-[1] hover:bg-gray-600 dark:hover:bg-gh-muted transition"></div>

                <div id="preview" className="w-1/2 m-0 p-0 whitespace-normal align-top h-full overflow-y-scroll bg-white dark:bg-gh-canvas">
                    <div id="preview-wrapper" className="px-4 pt-2 pb-4">
                        <div id="output" className="content markdown-body prose dark:prose-invert max-w-none prose-hr:mt-3 prose-hr:mb-3" dangerouslySetInnerHTML={{ __html: previewHtml }}></div>
                    </div>
                </div>
            </div>

            <div onClick={() => { settingsSetOpen(!settingsOpen) }} className={`fixed inset-0 bg-black opacity-40 z-20 ${!settingsOpen && "hidden"}`}></div>
            <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-gh-surface border-l border-gray-200 dark:border-gh-border shadow-2xl z-30 transform transition-transform duration-300 ease-in-out flex flex-col ${!settingsOpen && "translate-x-full"}`}>
                <div className="p-4 border-b border-gray-300 dark:border-gh-border flex justify-between items-center bg-gray-50 dark:bg-gh-subtle flex-shrink-0">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gh-text">{t.editor.postSettings}</h2>
                    <button id="close-settings-btn" className="p-2 cursor-pointer text-gray-600 dark:text-gh-muted hover:text-black dark:hover:text-white" onClick={() => { settingsSetOpen(!settingsOpen) }}>
                        🗙︎
                    </button>
                </div>
                <div className="p-4 flex flex-col gap-4">
                    <div>
                        <label htmlFor="post-title" className="block text-sm font-medium text-slate-600 dark:text-gh-muted mb-1">{t.editor.postTitleLabel}</label>
                        <input
                            type="text"
                            id="post-title"
                            placeholder={t.editor.postTitlePlaceholder}
                            className="w-full px-4 py-2 border border-slate-300 dark:border-gh-border bg-white dark:bg-gh-canvas text-gray-900 dark:text-gh-text placeholder-gray-400 dark:placeholder-gh-muted rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
                            value={title}
                            onChange={(e) => { setTitle(e.target.value) }}
                        />
                    </div>
                    <div>
                        <label htmlFor="post-tags" className="block text-sm font-medium text-slate-600 dark:text-gh-muted mb-1">{t.editor.tagsLabel}</label>
                        <CreatableSelect
                            instanceId="tag"
                            isMulti
                            placeholder={t.editor.tagsPlaceholder}
                            options={allTags}
                            value={tags.map(t => ({ value: t, label: t }))}
                            onChange={(selected) => setTags(selected.map(item => item.value))}
                            styles={{
                                control: (base, state) => ({
                                    ...base,
                                    backgroundColor: resolvedTheme === ThemeMode.Dark ? "#0d1117" : "#ffffff",
                                    borderColor: resolvedTheme === ThemeMode.Dark ? "#30363d" : "#cbd5e1",
                                    boxShadow: state.isFocused ? "0 0 0 2px rgba(88, 166, 255, 0.4)" : "none",
                                }),
                                menu: (base) => ({
                                    ...base,
                                    backgroundColor: resolvedTheme === ThemeMode.Dark ? "#161b22" : "#ffffff",
                                    borderColor: resolvedTheme === ThemeMode.Dark ? "#30363d" : "#e5e7eb",
                                }),
                                option: (base, state) => ({
                                    ...base,
                                    backgroundColor: state.isFocused
                                        ? (resolvedTheme === ThemeMode.Dark ? "#21262d" : "#f1f5f9")
                                        : "transparent",
                                    color: resolvedTheme === ThemeMode.Dark ? "#e6edf3" : "#1f2328",
                                }),
                                multiValue: (base) => ({
                                    ...base,
                                    backgroundColor: resolvedTheme === ThemeMode.Dark ? "#21262d" : "#e2e8f0",
                                }),
                                multiValueLabel: (base) => ({
                                    ...base,
                                    color: resolvedTheme === ThemeMode.Dark ? "#e6edf3" : "#1e293b",
                                }),
                                input: (base) => ({
                                    ...base,
                                    color: resolvedTheme === ThemeMode.Dark ? "#e6edf3" : "#1f2328",
                                }),
                            }}
                        />
                    </div>
                </div>
            </div>
            <div className={`fixed bottom-0 right-0 h-full w-full max-h-40 border-t border-gray-300 dark:border-gh-border bg-white dark:bg-gh-surface shadow-2xl z-30 transform transition-transform duration-300 ease-in-out ${!assetsOpen && "translate-y-full"}`}>
                <button className="cursor-pointer font-medium text-gray-400 dark:text-gh-muted absolute left-[50%] -top-6.5 bg-white dark:bg-gh-surface border border-gray-300 dark:border-gh-border border-b-0 rounded-t-lg -translate-x-1/2 hover:text-gray-700 dark:hover:text-white hover:border-gray-700 dark:hover:border-gh-muted transition-all" onClick={() => { assetsSetOpen(!assetsOpen) }}>&nbsp;{t.editor.assetsTab}&nbsp;</button>
                <div className="flex h-full p-2 gap-2 overflow-x-auto overflow-y-hidden">
                    <div className="bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-gh-blue border-2 border-dashed border-sky-200 dark:border-sky-800/60 rounded-lg font-medium flex-shrink-0 flex flex-col justify-evenly">
                        <label htmlFor="image-upload" className="w-full cursor-pointer flex items-center justify-center h-full p-2 hover:bg-sky-100 dark:hover:bg-sky-900/40 transition">
                            <span>{t.editor.uploadImage}</span>
                        </label>
                        <input type="file" id="image-upload" className="hidden" multiple accept="image/*" onChange={handleImageInput}></input>
                        <hr className="border-dashed border-sky-200 dark:border-sky-800/60 border-t-2" />
                        <button
                            type="button"
                            onClick={() => setReuseModalOpen(true)}
                            className="w-full cursor-pointer flex items-center justify-center h-full p-2 hover:bg-sky-100 dark:hover:bg-sky-900/40 transition"
                        >
                            {t.editor.reuseImage}
                        </button>
                    </div>
                    {assets.map((asset, index) => (
                        <Asset key={index} url={asset} onDelete={handleDeleteAsset} />
                    ))}
                </div>
            </div>

            <ReuseImageModal
                isOpen={reuseModalOpen}
                onClose={() => setReuseModalOpen(false)}
                onImport={handleImportAssets}
                currentAssets={assets}
            />

            <DraftsModal
                isOpen={draftsModalOpen}
                onClose={() => setDraftsModalOpen(false)}
                onSelectDraft={loadPost}
                currentDraftId={postId}
            />
        </div>
    )
}
