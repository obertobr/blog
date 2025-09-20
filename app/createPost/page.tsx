"use client"

import { redirect } from "next/navigation"
import toast from "react-hot-toast"
import { ChangeEvent, startTransition, useActionState, useEffect, useRef, useState } from "react"
import { markdown } from "@/app/_lib/markdown"
import { createPostAction, deleteAssetAction, saveAssetAction } from "../_lib/actions"
import Editor from "@monaco-editor/react";
import { markdownToHtml } from "../_lib/util"
import { editor } from "monaco-editor"
import CreatableSelect from 'react-select/creatable';
import { getTags } from "../_lib/posts"
import Asset from "@/components/Asset"

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

const initialState = { message: '', slug: null }

export default function createPostTest() {

    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

    const [state, formAction, pending] = useActionState(createPostAction, initialState);
    const [stateAsset, saveAsset, pendingAsset] = useActionState(saveAssetAction, null);
    const [stateDelete, deleteAsset] = useActionState(deleteAssetAction, null)

    const [title, setTitle] = useState(state.title || "");
    const [content, setContent] = useState(state.content || "");
    const [tags, setTags] = useState(state.tags || []);

    const [settingsOpen, settingsSetOpen] = useState(false);
    const [assetsOpen, assetsSetOpen] = useState(true);

    const [allTags, setAllTags] = useState<{ value: string; label: string }[]>([]);
    const [assets, setAssets] = useState<string[]>([]);

    const handleSendForm = () => {
        startTransition(() => {
            formAction({
                title,
                content,
                tags
            })
        });
    };

    const convert = async (markdown: string) => {
        let html = await markdownToHtml(markdown)
        document.querySelector('#output')!.innerHTML = html;
    };

    function handleEditorDidMount(editor: editor.IStandaloneCodeEditor) {
        editorRef.current = editor;
    }

    async function handleEditorChange(value: string | undefined) {
        setContent(value);
        await convert(value || "");
    }

    useEffect(() => {
        const listTags = async () => {
            const tags = await getTags()
            setAllTags(tags.map(tag => ({ value: tag.id.toString(), label: tag.name })))
        }

        listTags()

        const edit = document.getElementById("edit");
        if (edit) {
            markdown()
        }
    }, [])

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

    useEffect(() => {
        if (!stateAsset) return

        for (const error of stateAsset.errors) {
            toast.error(error)
        }
        setAssets(assets.concat(stateAsset.assets))
    }, [stateAsset])

    useEffect(() => {
        if (!stateDelete?.success) {
            if (stateDelete?.error) {
                toast.error(stateDelete?.error)
            }
        } else {
            setAssets(assets.filter(asset => asset !== stateDelete.filePath))
            toast.success(stateDelete.message)
        }
    }, [stateDelete])

    return (
        <div className="flex flex-col h-[89vh]">
            <div className="flex p-2 justify-between items-center border-b border-gray-300">
                <div className="flex gap-1">
                    <button className="bg-white border border-gray-300 p-1 rounded-lg font-medium text-gray-500 hover:cursor-pointer hover:text-gray-800 transition hover:border-gray-800" onClick={handleSendForm}>Publicar</button>
                    <button className="bg-white border border-gray-300 p-1 rounded-lg font-medium text-gray-500 hover:cursor-pointer hover:text-gray-800 transition hover:border-gray-800">Salvar Rascunho</button>
                </div>
                <div>
                    <button
                        onClick={() => { settingsSetOpen(!settingsOpen) }}
                        className="bg-white border border-gray-300 p-1 rounded-lg font-medium text-gray-500 hover:cursor-pointer hover:text-gray-800 transition hover:border-gray-800"
                    >
                        Configurações
                    </button>
                </div>
            </div>
            <div id="container" className="flex w-full h-full bg-white border-b border-gray-200">
                <div id="edit" className="w-1/2 m-0 p-0 whitespace-nowrap align-top h-full">
                    <div id="editor-wrapper" className="h-full">
                        <Editor
                            language="markdown"
                            options={optionsEditor}
                            onMount={handleEditorDidMount}
                            onChange={handleEditorChange}
                            value={content}
                        />
                    </div>
                </div>

                <div id="split-divider" className="w-[5px] bg-gray-300 cursor-col-resize z-[1] hover:bg-gray-600 transition"></div>

                <div id="preview" className="w-1/2 m-0 p-0 whitespace-normal align-top h-full overflow-y-scroll">
                    <div id="preview-wrapper" className="px-4 pt-2 pb-4">
                        <div id="output" className="content markdown-body prose max-w-none prose-hr:mt-3 prose-hr:mb-3"></div>
                    </div>
                </div>
            </div>

            <div onClick={() => { settingsSetOpen(!settingsOpen) }} className={`fixed inset-0 bg-black opacity-40 z-20 ${!settingsOpen && "hidden"}`}></div>
            <div className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-30 transform transition-transform duration-300 ease-in-out flex flex-col ${!settingsOpen && "translate-x-full"}`}>
                <div className="p-4 border-b border-gray-300 flex justify-between items-center bg-gray-50 flex-shrink-0">
                    <h2 className="text-lg font-semibold">Configurações do Post</h2>
                    <button id="close-settings-btn" className="p-2 cursor-pointer text-gray-600 hover:text-black" onClick={() => { settingsSetOpen(!settingsOpen) }}>
                        🗙︎
                    </button>
                </div>
                <div className="p-2">
                    <div>
                        <label htmlFor="post-title" className="block text-sm font-medium text-slate-600 mb-1">Título do Post</label>
                        <input type="text" id="post-title" placeholder="Título do Post" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition" value={title} onChange={(e) => { setTitle(e.target.value) }} />
                    </div>
                    <div>
                        <label htmlFor="post-tags" className="block text-sm font-medium text-slate-600 mb-1">Tags</label>
                        <CreatableSelect
                            instanceId="tag"
                            isMulti
                            options={allTags}
                            onChange={(tags) => setTags(tags.map(tag => tag.value))}
                        />
                    </div>
                </div>
            </div>
            <div className={`fixed bottom-0 right-0 h-full w-full max-h-40 border-t border-gray-300 bg-white shadow-2xl z-30 transform transition-transform duration-300 ease-in-out ${!assetsOpen && "translate-y-full"}`}>
                <button className="cursor-pointer font-medium text-gray-400 absolute left-[50%] -top-6.5 bg-white border border-gray-300 border-b-0 rounded-t-lg -translate-x-1/2 hover:text-gray-700 hover:border-gray-700 transition-all" onClick={() => { assetsSetOpen(!assetsOpen) }}> Assets </button>
                <div className="flex h-full p-2 gap-2 overflow-x-auto overflow-y-hidden">
                    <div className="bg-sky-50 text-sky-700 border-2 border-dashed border-sky-200 rounded-lg font-medium flex-shrink-0 flex flex-col justify-evenly">
                        <label htmlFor="image-upload" className="w-full cursor-pointer flex items-center justify-center h-full p-2 hover:bg-sky-100 transition">
                            <span>Upload imagem</span>
                        </label>
                        <input type="file" id="image-upload" className="hidden" multiple accept="image/*" onChange={handleImageInput}></input>
                        <hr className="border-dashed border-sky-200 border-t-2" />
                        <button className="w-full cursor-pointer flex items-center justify-center h-full p-2 hover:bg-sky-100 transition">Reutilizar imagem</button>
                    </div>
                    {assets.map((asset, index) => (
                        <Asset key={index} url={asset} onDelete={(url) => {startTransition(() => {deleteAsset(url)})}} />
                    ))}
                </div>
            </div>
        </div>
    )
}