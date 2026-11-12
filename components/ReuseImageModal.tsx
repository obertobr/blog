"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { listAvailableAssetsAction } from "@/app/_lib/actions";

type AssetItem = {
    url: string;
    name: string;
};

type ReuseImageModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onImport: (urls: string[]) => void;
    currentAssets: string[];
};

export default function ReuseImageModal({
    isOpen,
    onClose,
    onImport,
    currentAssets,
}: ReuseImageModalProps) {
    const [images, setImages] = useState<AssetItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [selectedUrls, setSelectedUrls] = useState<string[]>([]);

    useEffect(() => {
        if (!isOpen) {
            setSearch("");
            setSelectedUrls([]);
            return;
        }

        setIsLoading(true);
        listAvailableAssetsAction()
            .then((res) => {
                if (res.error) {
                    toast.error(res.error);
                } else {
                    setImages(res.assets);
                }
            })
            .catch(() => {
                toast.error("Erro ao carregar imagens");
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [isOpen]);

    const filteredImages = useMemo(() => {
        if (!search.trim()) return images;
        const q = search.toLowerCase();
        return images.filter((img) => img.name.toLowerCase().includes(q));
    }, [images, search]);

    const toggleSelect = (url: string) => {
        setSelectedUrls((prev) =>
            prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]
        );
    };

    const handleImportSelected = () => {
        if (selectedUrls.length === 0) return;
        const toAdd = selectedUrls.filter((url) => !currentAssets.includes(url));
        if (toAdd.length === 0) {
            toast("As imagens selecionadas já estão na gaveta de assets.");
        } else {
            onImport(toAdd);
            toast.success(`${toAdd.length} imagem(ns) importada(s)!`);
        }
        onClose();
    };

    const handleQuickAdd = (url: string) => {
        if (currentAssets.includes(url)) {
            toast("Esta imagem já está nos assets.");
            return;
        }
        onImport([url]);
        toast.success("Imagem adicionada aos assets!");
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-[2px]">
            <div className="bg-white dark:bg-gh-surface rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col border border-gray-200 dark:border-gh-border">
                <div className="p-4 border-b border-gray-200 dark:border-gh-border flex justify-between items-center bg-gray-50 dark:bg-gh-subtle rounded-t-xl">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 dark:text-gh-text">Reutilizar Imagens</h2>
                        <p className="text-xs text-gray-500 dark:text-gh-muted">Selecione imagens já salvas no site para adicionar a este post</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-700 dark:hover:text-gh-text text-xl font-bold cursor-pointer p-1"
                    >
                        🗙
                    </button>
                </div>

                <div className="p-3 border-b border-gray-200 dark:border-gh-border bg-white dark:bg-gh-surface">
                    <input
                        type="text"
                        placeholder="Pesquisar por nome da imagem..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gh-border bg-white dark:bg-gh-canvas text-gray-900 dark:text-gh-text placeholder-gray-400 dark:placeholder-gh-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {isLoading ? (
                        <div className="py-12 text-center text-gray-400 dark:text-gh-muted text-sm">Carregando imagens...</div>
                    ) : filteredImages.length === 0 ? (
                        <div className="py-12 text-center text-gray-400 dark:text-gh-muted text-sm">
                            {images.length === 0
                                ? "Nenhuma imagem salva no servidor ainda."
                                : "Nenhuma imagem encontrada com esse termo de busca."}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {filteredImages.map((img) => {
                                const isSelected = selectedUrls.includes(img.url);
                                const isAlreadyInAssets = currentAssets.includes(img.url);

                                return (
                                    <div
                                        key={img.url}
                                        onClick={() => handleQuickAdd(img.url)}
                                        className={`group relative aspect-square rounded-lg border-2 overflow-hidden cursor-pointer transition flex flex-col justify-between ${
                                            isSelected
                                                ? "border-blue-600 ring-2 ring-blue-400"
                                                : isAlreadyInAssets
                                                ? "border-emerald-500 opacity-80"
                                                : "border-gray-200 dark:border-gh-border hover:border-blue-400 dark:hover:border-gh-blue"
                                        }`}
                                        title={isAlreadyInAssets ? "Já adicionada aos assets" : "Clique na imagem para adicionar aos assets"}
                                    >
                                        <img
                                            src={img.url}
                                            alt={img.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                                        />

                                        <div className="absolute top-1.5 left-1.5 flex gap-1 z-10 pointer-events-none">
                                            {isAlreadyInAssets && (
                                                <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded font-medium shadow">
                                                    Já no post
                                                </span>
                                            )}
                                        </div>

                                        <div
                                            className="absolute top-1.5 right-1.5 z-10 p-1 bg-black/40 hover:bg-black/60 rounded-md transition cursor-pointer"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleSelect(img.url);
                                            }}
                                            title="Selecionar para importar em lote"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => {}}
                                                className="w-4 h-4 rounded text-blue-600 cursor-pointer pointer-events-none block"
                                            />
                                        </div>

                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 pt-4 flex items-end">
                                            <span className="text-white text-[11px] truncate w-full" title={img.name}>
                                                {img.name}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="p-3 border-t border-gray-200 dark:border-gh-border bg-gray-50 dark:bg-gh-subtle rounded-b-xl flex justify-between items-center">
                    <span className="text-xs text-gray-500 dark:text-gh-muted">
                        {filteredImages.length} imagem(ns) | {selectedUrls.length} selecionada(s)
                    </span>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gh-muted hover:bg-gray-200 dark:hover:bg-[#30363d] rounded-lg transition cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleImportSelected}
                            disabled={selectedUrls.length === 0}
                            className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Importar ({selectedUrls.length})
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

