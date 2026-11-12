"use client"

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { getTags } from "../_lib/posts";
import { Tag } from "@prisma/client";
import { deleteTagAction, saveTagAction } from "../_lib/actions";
import toast from "react-hot-toast"

export default function AdminPanel() {
    const [tags, setTags] = useState<Tag[]>([])
    const debounceTimers = useRef<{ [key: number]: NodeJS.Timeout }>({})

    const [stateSaveTag, saveTag] = useActionState(saveTagAction, null);
    const [stateDeleteTag, deleteTag] = useActionState(deleteTagAction, null);

    const handleSaveTag = (tag: { id?: number; name: string; color?: string | null }) => {
        startTransition(() => {
            saveTag(tag)
        });
    };

    const handleDeleteTag = (tag: Tag) => {
        startTransition(() => {
            deleteTag(tag)
        });
    };

    const uiChangeColor = (id: number, newColor: string) => {
        setTags(prev =>
            prev.map(tag =>
                tag.id === id
                    ? { ...tag, color: newColor }
                    : tag
            )
        );
    };

    const handleColorChange = (tag: Tag, newColor: string) => {
        uiChangeColor(tag.id, newColor);

        if (debounceTimers.current[tag.id]) {
            clearTimeout(debounceTimers.current[tag.id]);
        }

        debounceTimers.current[tag.id] = setTimeout(() => {
            handleSaveTag({ ...tag, color: newColor });
        }, 400);
    };

    const handleColorBlur = (tag: Tag, color: string) => {
        if (debounceTimers.current[tag.id]) {
            clearTimeout(debounceTimers.current[tag.id]);
            handleSaveTag({ ...tag, color });
        }
    };

    useEffect(() => {
        const timers = debounceTimers.current;
        return () => {
            Object.values(timers).forEach(clearTimeout);
        };
    }, []);

    useEffect(() => {
        if (!stateDeleteTag?.success) {
            if (stateDeleteTag?.error) {
                toast.error(stateDeleteTag?.error)
            }
        } else {
            toast.success(stateDeleteTag.message)
            if (stateDeleteTag.tagId) {
                setTags(prev => prev.filter(t => t.id !== stateDeleteTag.tagId))
            }
        }
    }, [stateDeleteTag])

    useEffect(() => {
        if (!stateSaveTag?.success) {
            if (stateSaveTag?.error) {
                toast.error(stateSaveTag?.error)
            }
        } else {
            toast.success(stateSaveTag.message)
            if (stateSaveTag.tag) {
                setTags(prev => {
                    const exists = prev.some(t => t.id === stateSaveTag.tag.id);
                    if (exists) {
                        return prev.map(t => t.id === stateSaveTag.tag.id ? stateSaveTag.tag : t);
                    }
                    return [...prev, stateSaveTag.tag];
                });
            }
        }
    }, [stateSaveTag])

    useEffect(() => {
        const listTags = async () => {
            const tags = await getTags()
            setTags(tags)
        }

        listTags()
    }, [])

    return (
        <div className="flex flex-col items-center">
            <h1 className="text-4xl font-bold m-3 text-gray-900 dark:text-gh-text">Tags</h1>

            <div className="border border-gray-300 dark:border-gh-border bg-white dark:bg-gh-surface rounded-lg p-2 flex flex-col gap-2 min-w-[300px] shadow-xs">
                {tags.map(tag => (
                    <div className="border border-gray-200 dark:border-gh-border bg-gray-50 dark:bg-gh-subtle rounded-md p-3 flex items-center justify-between gap-5" key={tag.id}>

                        <div className="flex gap-2 items-center">
                            <div
                                className="w-6 h-6 rounded cursor-pointer border border-gray-300 dark:border-gh-border"
                                style={{ backgroundColor: tag.color || '#d1d5dc' }}
                                onClick={() => document.getElementById(`color-${tag.id}`)?.click()}
                            >
                                <input
                                    id={`color-${tag.id}`}
                                    type="color"
                                    value={tag.color || '#d1d5dc'}
                                    className="opacity-0 w-0 h-0"
                                    onChange={(e) => {
                                        handleColorChange(tag, e.target.value);
                                    }}
                                    onBlur={(e) => {
                                        handleColorBlur(tag, e.target.value);
                                    }}
                                />
                            </div>
                            <span className="font-bold text-gray-900 dark:text-gh-text">{tag.name}</span>
                        </div>
                        <button className="cursor-pointer text-gray-400 dark:text-gh-muted hover:text-red-600 dark:hover:text-red-400 transition" onClick={() => handleDeleteTag(tag)} >🗙︎</button>
                    </div>
                ))}
            </div>
        </div>
    );
}

