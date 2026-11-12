import { z } from "zod";
import ptBrMessages from "@/messages/pt-BR.json";
import enMessages from "@/messages/en.json";

export const Locale = {
    PtBr: "pt-BR",
    En: "en",
} as const;

export const localeSchema = z.enum([
    Locale.PtBr,
    Locale.En,
]);

export type Locale = z.infer<typeof localeSchema>;

export const LOCALE_COOKIE_NAME = "blog_locale";
export const LOCALE_STORAGE_KEY = "locale";

export function parseLocale(value: unknown): Locale | null {
    const parsed = localeSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
}

export function detectLocaleFromAcceptLanguage(acceptLanguage: string | null | undefined): Locale {
    if (!acceptLanguage) return Locale.PtBr;
    const normalized = acceptLanguage.trim().toLowerCase();
    const firstLang = normalized.split(",")[0]?.trim() || "";
    if (firstLang.startsWith(Locale.En)) {
        return Locale.En;
    }
    return Locale.PtBr;
}

export interface Dictionary {
    nav: {
        recent: string;
        relevant: string;
        createPost: string;
        adminTags: string;
        signOut: string;
        adminAccess: string;
        adminPasswordPlaceholder: string;
        cancel: string;
        signIn: string;
        signingIn: string;
        signedInSuccess: string;
        incorrectPassword: string;
        signedOutSuccess: string;
        selectLanguageLabel: string;
    };
    theme: {
        label: string;
        light: string;
        dark: string;
        ariaLabel: string;
    };
    postCard: {
        untitled: string;
    };
    post: {
        untitledDraft: string;
        published: string;
        draft: string;
        editPost: string;
        editDraft: string;
        deleteConfirm: string;
        deleteError: string;
        deleting: string;
        deletePost: string;
    };
    relevant: {
        title: string;
        description: string;
    };
    admin: {
        tagsTitle: string;
    };
    editor: {
        saveChanges: string;
        publish: string;
        saveDraft: string;
        unpublish: string;
        newPost: string;
        savingDraft: string;
        saved: string;
        at: string;
        unsavedChanges: string;
        saveError: string;
        drafts: string;
        settings: string;
        dropImageHere: string;
        postSettings: string;
        postTitleLabel: string;
        postTitlePlaceholder: string;
        tagsLabel: string;
        tagsPlaceholder: string;
        assetsTab: string;
        uploadImage: string;
        reuseImage: string;
        fillTitleOrContent: string;
        draftSavedSuccess: string;
        draftSaveError: string;
        loadPostError: string;
        newPostConfirm: string;
        newPostStarted: string;
        unpublishConfirm: string;
        unpublishSuccess: string;
        unpublishError: string;
        uploadingImage: string;
        imageAddedSuccess: string;
        imageUploadError: string;
        defineTitleToPublish: string;
        cannotDeleteUsedImage: string;
    };
    draftsModal: {
        title: string;
        subtitle: string;
        loading: string;
        empty: string;
        untitledDraft: string;
        inEditing: string;
        noContent: string;
        lastChanged: string;
        tagsPrefix: string;
        deleteTooltip: string;
        deleteConfirm: string;
        deletedSuccess: string;
        savedDraftsSuffix: string;
        close: string;
    };
    reuseImageModal: {
        title: string;
        subtitle: string;
        searchPlaceholder: string;
        loading: string;
        emptyServer: string;
        emptySearch: string;
        alreadyInPost: string;
        alreadyAddedTitle: string;
        clickToAddTitle: string;
        batchSelectTitle: string;
        imagesLabel: string;
        selectedLabel: string;
        cancel: string;
        importLabel: string;
        loadError: string;
        alreadyInAssetsBatch: string;
        alreadyInAssetsSingle: string;
        importedSuccessSuffix: string;
        addedSuccess: string;
    };
    asset: {
        copy: string;
        copiedMarkdown: string;
    };
    likes: {
        like: string;
        liked: string;
        error: string;
        ariaLike: string;
        ariaUnlike: string;
    };
    relativeDate: {
        justNow: string;
        yearSingular: string;
        yearPlural: string;
        monthSingular: string;
        monthPlural: string;
        compositeSingleTemplate: string;
        compositeTemplate: string;
    };
}

const dictionaries = {
    [Locale.PtBr]: ptBrMessages satisfies Dictionary,
    [Locale.En]: enMessages satisfies Dictionary,
} satisfies Record<Locale, Dictionary>;

export function getDictionary(locale: Locale): Dictionary {
    return dictionaries[locale];
}
