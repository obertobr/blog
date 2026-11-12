"use client";

import toast from "react-hot-toast";
import { useLanguage } from "./LanguageProvider";

type AssetProps = {
    url: string;
    onDelete: (url: string) => void;
};

function getAltFromUrl(url: string): string {
    const rawName = decodeURIComponent(url.split('/').pop() || '');
    const baseName = rawName.replace(/\.[^/.]+$/, "");
    const cleanAlt = baseName.replace(/-[a-f0-9]{8}$/i, "").replace(/-\d{6}$/, "").replace(/-/g, " ");
    return cleanAlt || "image";
}

export default function Asset({ url, onDelete }: AssetProps) {
    const { t } = useLanguage();
    const altText = getAltFromUrl(url);

    const handleCopy = () => {
        navigator.clipboard.writeText(`![${altText}](${encodeURI(url)})`);
        toast.success(t.asset.copiedMarkdown);
    };

    return (
        <div className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-400 dark:border-gh-border flex-shrink-0">
            <img className="w-full h-full object-cover object-center" src={url} alt={altText} />
            <button
                type="button"
                onClick={handleCopy}
                className="absolute bottom-1 left-[50%] -translate-x-1/2 p-1 pl-3 pr-3 text-sm bg-white dark:bg-gh-subtle text-gray-800 dark:text-gh-text border border-gray-200 dark:border-gh-border rounded-md shadow-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-[#30363d] transition"
            >
                {t.asset.copy}
            </button>
            <button
                type="button"
                onClick={() => { onDelete(url); }}
                className="absolute top-2 right-2 bg-red-600 w-7 h-7 text-white rounded-md opacity-40 shadow-md/50 cursor-pointer hover:opacity-100 transition duration-75"
            >
                🗙︎
            </button>
        </div>
    );
}
