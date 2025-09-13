"use client"

import { useEffect, useState } from "react"
import { markdown } from "@/app/_lib/markdown"

export default function createPostTest() {
    const [settingsOpen, settingsSetOpen] = useState(false);
    const [assetsOpen, assetsSetOpen] = useState(true);

    useEffect(() => {
        const editor = document.getElementById("editor");
        if (editor) {
            markdown()
        }
    }, [])

    return (
        <div className="flex flex-col h-[89vh]">
            <div className="flex p-2 justify-between items-center border-b border-gray-300">
                <div className="flex gap-1">
                    <button className="bg-white border border-gray-300 p-1 rounded-lg font-medium text-gray-500 hover:cursor-pointer hover:text-gray-800 transition hover:border-gray-800">Publicar</button>
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
                        <div id="editor" className="h-full"></div>
                    </div>
                </div>

                <div id="split-divider" className="w-[5px] bg-gray-300 cursor-col-resize z-[1]"></div>

                <div id="preview" className="w-1/2 m-0 p-0 whitespace-normal align-top h-full overflow-y-scroll">
                    <div id="preview-wrapper" className="px-4 pt-2 pb-4">
                        <div id="output" className="content markdown-body prose max-w-none prose-hr:mt-3 prose-hr:mb-3"></div>
                    </div>
                </div>
            </div>

            <div id="settings-backdrop" onClick={() => { settingsSetOpen(!settingsOpen) }} className={`fixed inset-0 bg-black opacity-40 z-20 ${!settingsOpen && "hidden"}`}></div>
            <div id="settings-panel" className={`fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-30 transform transition-transform duration-300 ease-in-out flex flex-col ${!settingsOpen && "translate-x-full"}`}>
                <div className="p-4 border-b border-gray-300 flex justify-between items-center bg-gray-50 flex-shrink-0">
                    <h2 className="text-lg font-semibold">Configurações do Post</h2>
                    <button id="close-settings-btn" className="p-2 cursor-pointer text-gray-600 hover:text-black" onClick={() => { settingsSetOpen(!settingsOpen) }}>
                        🗙︎
                    </button>
                </div>
                <div className="p-2">
                    <div>
                        <label htmlFor="post-title" className="block text-sm font-medium text-slate-600 mb-1">Título do Post</label>
                        <input type="text" id="post-title" placeholder="O Guia Definitivo para..." className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition" />
                    </div>
                    <div>
                        <label htmlFor="post-tags" className="block text-sm font-medium text-slate-600 mb-1">Tags</label>
                        <input type="text" id="post-tags" placeholder="tecnologia, blog, design" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition" />
                        <p className="text-xs text-slate-400 mt-1">Separe as tags por vírgula.</p>
                    </div>
                </div>
            </div>
            <div id="settings-panel" className={`fixed bottom-0 right-0 h-full w-full max-h-40 border-t border-gray-300 bg-white shadow-2xl z-30 transform transition-transform duration-300 ease-in-out flex p-2 gap-2 ${!assetsOpen && "translate-y-full"}`}>
                <button className="cursor-pointer font-medium text-gray-400 absolute left-[50%] -top-6.5 bg-white border border-gray-300 border-b-0 rounded-t-lg -translate-x-1/2 hover:text-gray-700 hover:border-gray-700 transition-all" onClick={() => { assetsSetOpen(!assetsOpen) }}> Assets </button>
                <div className="bg-sky-50 text-sky-700 border-2 border-dashed border-sky-200 rounded-lg font-medium">
                    <label htmlFor="image-upload" className="w-full cursor-pointer flex items-center justify-center p-6 hover:bg-sky-100 transition">
                        <span>Upload imagem</span>
                    </label>
                    <input type="file" id="image-upload" className="hidden" multiple accept="image/*"></input>
                    <hr className="border-dashed border-sky-200 border-t-2"/>
                    <button className="w-full cursor-pointer flex items-center justify-center p-6 hover:bg-sky-100 transition">Reutilizar imagem</button>
                </div>
            </div>
        </div>
    )
}