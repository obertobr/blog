import { getServerDictionary } from "../_lib/i18n-server";

export default async function RelevantPage() {
    const { t } = await getServerDictionary();

    return (
        <div className="max-w-4xl mx-auto p-10 text-center flex flex-col items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gh-text">{t.relevant.title}</h1>
            <p className="text-gray-500 dark:text-gh-muted">{t.relevant.description}</p>
        </div>
    );
}
