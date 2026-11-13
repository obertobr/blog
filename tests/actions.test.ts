import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    createCommentAction,
    createPostAction,
    deleteAssetAction,
    deleteCommentAction,
    deletePostAction,
    getPostForEditAction,
    listAvailableAssetsAction,
    listDraftsAction,
    loginAction,
    recordPostReadAction,
    recordPostReadProgressAction,
    restoreVisitorHashAction,
    saveAssetAction,
    saveDraftAction,
    saveTagAction,
    toggleLikeAction,
    unpublishPostAction,
} from "../app/_lib/actions";
import { CommentAuthorMode, CommentErrorCode } from "../app/_lib/comment";
import * as postsModule from "../app/_lib/posts";
import * as authModule from "../app/_lib/auth";
import * as visitorServerModule from "../app/_lib/visitor-server";
import { readdir, stat, unlink } from "fs/promises";

vi.mock("next/cache", () => ({
    revalidatePath: vi.fn(),
}));

vi.mock("../app/_lib/posts", () => ({
    createPost: vi.fn(),
    updatePost: vi.fn(),
    createTag: vi.fn(),
    updateTag: vi.fn(),
    deleteTag: vi.fn(),
    deletePost: vi.fn(),
    getPostById: vi.fn(),
    getPostBySlug: vi.fn(),
    getDrafts: vi.fn(),
    isAssetUsedInOtherPosts: vi.fn(),
    togglePostLike: vi.fn(),
    recordPostRead: vi.fn(),
    recordPostReadProgress: vi.fn(),
    createPostComment: vi.fn(),
    deletePostComment: vi.fn(),
}));

vi.mock("../app/_lib/visitor-server", () => ({
    getVisitorHash: vi.fn(),
    getOrCreateVisitorHashForAction: vi.fn(),
    restoreVisitorHashCookie: vi.fn(),
}));

vi.mock("../app/_lib/auth", () => ({
    isAuthenticated: vi.fn().mockResolvedValue(true),
    isValidPassword: vi.fn(),
    setAdminSession: vi.fn(),
    clearAdminSession: vi.fn(),
}));

vi.mock("fs/promises", () => ({
    unlink: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    readdir: vi.fn(),
    stat: vi.fn(),
}));

describe("loginAction", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.ADMIN_PASSWORD_HASH = "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918";
    });

    it("returns error on invalid password", async () => {
        vi.mocked(authModule.isValidPassword).mockReturnValue(false);

        const result = await loginAction(null, "wrong");

        expect(result.error).toBe("Senha incorreta");
        expect(authModule.setAdminSession).not.toHaveBeenCalled();
    });

    it("sets session and returns success on valid password", async () => {
        vi.mocked(authModule.isValidPassword).mockReturnValue(true);

        const result = await loginAction(null, "admin");

        expect(result.success).toBe(true);
        expect(authModule.setAdminSession).toHaveBeenCalled();
    });
});

describe("createPostAction", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(authModule.isAuthenticated).mockResolvedValue(true);
        vi.mocked(postsModule.getPostBySlug).mockResolvedValue(null);
    });

    it("creates post with slug and returns success state", async () => {
        vi.mocked(postsModule.createPost).mockResolvedValue({
            id: 1,
            title: "Post de Teste",
            slug: "post-de-teste",
            content: "Conteudo",
            published: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const initialState = { message: "", slug: null };
        const formPost = { title: "Post de Teste", content: "Conteudo", tags: ["dev"] };

        const result = await createPostAction(initialState, formPost);

        expect(result.message).toBe("Post criado com sucesso");
        expect(result.slug).toBe("post-de-teste");
        expect(result.postId).toBe(1);
        expect(postsModule.createPost).toHaveBeenCalledWith(
            "Post de Teste",
            "Conteudo",
            "post-de-teste",
            ["dev"],
            true
        );
    });

    it("publishes an existing draft post by updating it", async () => {
        vi.mocked(postsModule.updatePost).mockResolvedValue({
            id: 42,
            title: "Rascunho Pronto",
            slug: "rascunho-pronto",
            content: "Conteudo completo",
            published: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            tags: [],
        });

        const initialState = { message: "", slug: null };
        const formPost = { id: 42, title: "Rascunho Pronto", content: "Conteudo completo", tags: ["noticias"] };

        const result = await createPostAction(initialState, formPost);

        expect(result.message).toBe("Post publicado com sucesso");
        expect(result.slug).toBe("rascunho-pronto");
        expect(result.postId).toBe(42);
        expect(postsModule.updatePost).toHaveBeenCalledWith(42, {
            title: "Rascunho Pronto",
            content: "Conteudo completo",
            slug: "rascunho-pronto",
            tags: ["noticias"],
            published: true,
        });
    });

    it("blocks post creation if title is empty", async () => {
        const initialState = { message: "", slug: null };
        const formPost = { title: "   ", content: "Conteudo", tags: [] };

        const result = await createPostAction(initialState, formPost);

        expect(result.message).toBe("Título é obrigatório para publicar o post");
        expect(postsModule.createPost).not.toHaveBeenCalled();
    });

    it("blocks post creation if user is not authenticated", async () => {
        vi.mocked(authModule.isAuthenticated).mockResolvedValue(false);

        const initialState = { message: "", slug: null };
        const formPost = { title: "Post", content: "Conteudo", tags: [] };

        const result = await createPostAction(initialState, formPost);

        expect(result.message).toBe("Não autorizado");
        expect(postsModule.createPost).not.toHaveBeenCalled();
    });

    it("returns error state and preserves formPost when post creation fails", async () => {
        vi.mocked(postsModule.createPost).mockRejectedValue(new Error("Slug already exists"));

        const initialState = { message: "", slug: null };
        const formPost = { title: "Post Duplicado", content: "Conteudo", tags: [] };

        const result = await createPostAction(initialState, formPost);

        expect(result.message).toBe("Slug already exists");
        expect(result.formPost).toEqual(formPost);
    });

    it("blocks post creation if uploaded assets are not used in content", async () => {
        const initialState = { message: "", slug: null };
        const formPost = {
            title: "Post com Imagem Esquecida",
            content: "Conteúdo sem a imagem enviada",
            tags: [],
            assets: ["/assets/esquecida.png"],
        };

        const result = await createPostAction(initialState, formPost);

        expect(result.message).toContain("Não é permitido publicar: as seguintes imagens foram enviadas mas não estão no conteúdo: esquecida.png");
        expect(postsModule.createPost).not.toHaveBeenCalled();
    });

    it("allows post creation when all uploaded assets are referenced in content", async () => {
        vi.mocked(postsModule.createPost).mockResolvedValue({
            id: 1,
            title: "Post Completo",
            content: "Aqui está a imagem: ![foto](/assets/usada.png)",
            slug: "post-completo",
            published: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const initialState = { message: "", slug: null };
        const formPost = {
            title: "Post Completo",
            content: "Aqui está a imagem: ![foto](/assets/usada.png)",
            tags: [],
            assets: ["/assets/usada.png"],
        };

        const result = await createPostAction(initialState, formPost);

        expect(result.message).toBe("Post criado com sucesso");
        expect(result.slug).toBe("post-completo");
    });
});

describe("saveDraftAction", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(authModule.isAuthenticated).mockResolvedValue(true);
    });

    it("blocks draft saving if user is not authenticated", async () => {
        vi.mocked(authModule.isAuthenticated).mockResolvedValue(false);

        const result = await saveDraftAction(null, { title: "Draft", content: "Texto", tags: [] });

        expect(result.success).toBe(false);
        expect(result.error).toBe("Não autorizado");
        expect(postsModule.createPost).not.toHaveBeenCalled();
    });

    it("creates a new draft with unique slug and published=false when id is not provided", async () => {
        vi.mocked(postsModule.createPost).mockResolvedValue({
            id: 99,
            title: "Meu Rascunho",
            slug: "meu-rascunho-1234abcd",
            content: "Escrevendo...",
            published: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const result = await saveDraftAction(null, {
            title: "Meu Rascunho",
            content: "Escrevendo...",
            tags: ["dev"],
        });

        expect(result.success).toBe(true);
        expect(result.id).toBe(99);
        expect(result.message).toBe("Rascunho salvo");
        expect(postsModule.createPost).toHaveBeenCalledWith(
            "Meu Rascunho",
            "Escrevendo...",
            expect.stringMatching(/^meu-rascunho-[a-f0-9]{8}$/),
            ["dev"],
            false
        );
    });

    it("updates existing draft when id is provided", async () => {
        vi.mocked(postsModule.updatePost).mockResolvedValue({
            id: 99,
            title: "Rascunho Atualizado",
            slug: "meu-rascunho-1234abcd",
            content: "Texto novo",
            published: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            tags: [],
        });

        const result = await saveDraftAction(null, {
            id: 99,
            title: "Rascunho Atualizado",
            content: "Texto novo",
            tags: ["react"],
        });

        expect(result.success).toBe(true);
        expect(result.id).toBe(99);
        expect(result.message).toBe("Rascunho atualizado");
        expect(postsModule.updatePost).toHaveBeenCalledWith(99, {
            title: "Rascunho Atualizado",
            content: "Texto novo",
            tags: ["react"],
            published: false,
        });
    });

    it("keeps post published when keepPublished is true in saveDraftAction", async () => {
        vi.mocked(postsModule.updatePost).mockResolvedValue({
            id: 88,
            title: "Post Publicado Editado",
            slug: "post-publicado",
            content: "Edição rápida",
            published: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            tags: [],
        });

        const result = await saveDraftAction({
            id: 88,
            title: "Post Publicado Editado",
            content: "Edição rápida",
            tags: [],
            keepPublished: true,
        });

        expect(result.success).toBe(true);
        expect(result.message).toBe("Post atualizado");
        expect(postsModule.updatePost).toHaveBeenCalledWith(88, {
            title: "Post Publicado Editado",
            content: "Edição rápida",
            tags: [],
            published: true,
        });
    });

    it("allows saving draft with null/empty title and generates provisional slug from content", async () => {
        vi.mocked(postsModule.createPost).mockResolvedValue({
            id: 100,
            title: null,
            slug: "apenas-conteudo-abcd1234",
            content: "Apenas conteúdo",
            published: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const result = await saveDraftAction(null, {
            title: "",
            content: "Apenas conteúdo",
            tags: [],
        });

        expect(result.success).toBe(true);
        expect(postsModule.createPost).toHaveBeenCalledWith(
            null,
            "Apenas conteúdo",
            expect.stringMatching(/^apenas-conteudo-[a-f0-9]{8}$/),
            [],
            false
        );
    });

    it("saves draft with null title and fallback slug when title is blank and no content", async () => {
        vi.mocked(postsModule.createPost).mockResolvedValue({
            id: 101,
            title: null,
            slug: "rascunho-abcd1234",
            content: "",
            published: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const result = await saveDraftAction(null, {
            title: "",
            content: "",
            tags: ["dev"],
        });

        expect(result.success).toBe(true);
        expect(postsModule.createPost).toHaveBeenCalledWith(
            null,
            "",
            expect.stringMatching(/^rascunho-[a-f0-9]{8}$/),
            ["dev"],
            false
        );
    });
});

describe("listDraftsAction and getPostForEditAction", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(authModule.isAuthenticated).mockResolvedValue(true);
    });

    it("listDraftsAction returns list of unpublished posts", async () => {
        vi.mocked(postsModule.getDrafts).mockResolvedValue([
            {
                id: 10,
                title: "Rascunho 1",
                slug: "rascunho-1",
                content: "Texto 1",
                published: false,
                createdAt: new Date(),
                updatedAt: new Date(),
                tags: [{ id: 1, name: "tech", color: null }],
            },
        ]);

        const result = await listDraftsAction();

        expect(result.drafts).toHaveLength(1);
        expect(result.drafts[0].title).toBe("Rascunho 1");
        expect(result.drafts[0].tags).toEqual(["tech"]);
    });

    it("getPostForEditAction returns post data with extracted assets", async () => {
        vi.mocked(postsModule.getPostById).mockResolvedValue({
            id: 10,
            title: "Post com Imagem",
            slug: "post-imagem",
            content: "Veja a foto: ![alt](/assets/foto-legal.png)",
            published: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            tags: [{ id: 1, name: "tag1", color: null }],
        });

        const result = await getPostForEditAction(10);

        expect(result.post).not.toBeNull();
        expect(result.post?.title).toBe("Post com Imagem");
        expect(result.post?.published).toBe(true);
        expect(result.post?.assets).toEqual(["/assets/foto-legal.png"]);
    });
});

describe("unpublishPostAction", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(authModule.isAuthenticated).mockResolvedValue(true);
    });

    it("blocks unpublishing if not authenticated", async () => {
        vi.mocked(authModule.isAuthenticated).mockResolvedValue(false);

        const result = await unpublishPostAction(10);

        expect(result.success).toBe(false);
        expect(result.error).toBe("Não autorizado");
        expect(postsModule.updatePost).not.toHaveBeenCalled();
    });

    it("unpublishes post and sets published=false", async () => {
        vi.mocked(postsModule.updatePost).mockResolvedValue({
            id: 10,
            title: "Post Despublicado",
            slug: "post-despublicado",
            content: "Texto",
            published: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            tags: [],
        });

        const result = await unpublishPostAction(10);

        expect(result.success).toBe(true);
        expect(result.message).toContain("despublicado");
        expect(postsModule.updatePost).toHaveBeenCalledWith(10, { published: false });
    });
});

describe("saveAssetAction", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(authModule.isAuthenticated).mockResolvedValue(true);
    });

    it("blocks upload if user is not authenticated", async () => {
        vi.mocked(authModule.isAuthenticated).mockResolvedValue(false);

        const fakeFile = {
            name: "test.png",
            type: "image/png",
            size: 1000,
            arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(10)),
        } as unknown as File;

        const result = await saveAssetAction(null, [fakeFile]);

        expect(result.errors).toContain("Não autorizado");
        expect(result.assets).toHaveLength(0);
    });

    it("saves image file with slugified and unique name", async () => {
        const fakeFile = {
            name: "Foto de Férias!.png",
            type: "image/png",
            size: 1000,
            arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(10)),
        } as unknown as File;

        const result = await saveAssetAction(null, [fakeFile]);

        expect(result.errors).toHaveLength(0);
        expect(result.assets).toHaveLength(1);
        expect(result.assets[0]).toMatch(/^\/assets\/foto-de-ferias-[a-f0-9]{8}\.png$/);
    });

    it("infers extension from file.type when file.name lacks extension (e.g. Paint paste)", async () => {
        const paintBlob = {
            name: "blob",
            type: "image/jpeg",
            size: 2048,
            arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(10)),
        } as unknown as File;

        const result = await saveAssetAction(null, [paintBlob]);

        expect(result.errors).toHaveLength(0);
        expect(result.assets).toHaveLength(1);
        expect(result.assets[0]).toMatch(/^\/assets\/imagem-[a-f0-9]{8}\.jpg$/);
    });

    it("rejects unsupported extensions", async () => {
        const fakeFile = {
            name: "script.sh",
            type: "text/x-sh",
            size: 1000,
            arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(10)),
        } as unknown as File;

        const result = await saveAssetAction(null, [fakeFile]);

        expect(result.assets).toHaveLength(0);
        expect(result.errors[0]).toContain("não é uma imagem suportada");
    });
});

describe("deleteAssetAction", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(authModule.isAuthenticated).mockResolvedValue(true);
    });

    it("blocks deletion if user is not authenticated", async () => {
        vi.mocked(authModule.isAuthenticated).mockResolvedValue(false);

        const result = await deleteAssetAction(null, "/assets/test.png");

        expect(result.error).toBe("Não autorizado");
        expect(unlink).not.toHaveBeenCalled();
    });

    it("prevents directory traversal attacks by constraining deletion to public/assets via basename", async () => {
        vi.mocked(postsModule.isAssetUsedInOtherPosts).mockResolvedValue(false);
        vi.mocked(unlink).mockResolvedValue();

        const result = await deleteAssetAction(null, "../../../etc/passwd");

        expect(result.success).toBe(true);
        expect(unlink).toHaveBeenCalledWith(expect.stringMatching(/[\\/]public[\\/]assets[\\/]passwd$/));
    });

    it("deletes file safely from public/assets directory if not used in posts", async () => {
        vi.mocked(postsModule.isAssetUsedInOtherPosts).mockResolvedValue(false);
        vi.mocked(unlink).mockResolvedValue();

        const result = await deleteAssetAction(null, "/assets/foto.png");

        expect(result.success).toBe(true);
        expect(result.deletedFromDisk).toBe(true);
        expect(unlink).toHaveBeenCalledWith(expect.stringMatching(/[\\/]public[\\/]assets[\\/]foto\.png$/));
    });

    it("strips path prefixes from malicious inputs and operates only on basename", async () => {
        vi.mocked(postsModule.isAssetUsedInOtherPosts).mockResolvedValue(false);
        vi.mocked(unlink).mockResolvedValue();

        const result = await deleteAssetAction(null, "/assets/../../malicious.png");

        expect(result.success).toBe(true);
        expect(unlink).toHaveBeenCalledWith(expect.stringMatching(/[\\/]public[\\/]assets[\\/]malicious\.png$/));
    });

    it("does not unlink file from disk if used in another post, but returns success to allow removing from current assets", async () => {
        vi.mocked(postsModule.isAssetUsedInOtherPosts).mockResolvedValue(true);

        const result = await deleteAssetAction(null, "/assets/foto.png");

        expect(result.success).toBe(true);
        expect(result.deletedFromDisk).toBe(false);
        expect(result.message).toContain("removida dos assets do post");
        expect(unlink).not.toHaveBeenCalled();
    });
});

describe("saveTagAction and deleteTagAction", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(authModule.isAuthenticated).mockResolvedValue(true);
    });

    it("blocks saving tag if not authenticated", async () => {
        vi.mocked(authModule.isAuthenticated).mockResolvedValue(false);

        const result = await saveTagAction(null, { name: "javascript" });

        expect(result.error).toBe("Não autorizado");
        expect(postsModule.createTag).not.toHaveBeenCalled();
    });

    it("creates tag when no id is provided", async () => {
        vi.mocked(postsModule.createTag).mockResolvedValue({ id: 1, name: "dev", color: "#ffffff" });

        const result = await saveTagAction(null, { name: "dev", color: "#ffffff" });

        expect(result.success).toBe(true);
        expect(postsModule.createTag).toHaveBeenCalledWith("dev", "#ffffff");
    });

    it("updates tag when id is provided", async () => {
        vi.mocked(postsModule.updateTag).mockResolvedValue({ id: 1, name: "dev", color: "#000000" });

        const result = await saveTagAction(null, { id: 1, name: "dev", color: "#000000" });

        expect(result.success).toBe(true);
        expect(postsModule.updateTag).toHaveBeenCalledWith(1, { name: "dev", color: "#000000" });
    });
});

describe("deletePostAction", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(authModule.isAuthenticated).mockResolvedValue(true);
    });

    it("blocks post deletion if user is not authenticated", async () => {
        vi.mocked(authModule.isAuthenticated).mockResolvedValue(false);

        const result = await deletePostAction(null, 1);

        expect(result.error).toBe("Não autorizado");
        expect(postsModule.deletePost).not.toHaveBeenCalled();
    });

    it("deletes post and unlinks assets that are not used in other posts", async () => {
        vi.mocked(postsModule.getPostById).mockResolvedValue({
            id: 1,
            title: "Post",
            slug: "post",
            content: "Texto com ![imagem](/assets/exclusiva.png)",
            published: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            tags: [],
        });
        vi.mocked(postsModule.deletePost).mockResolvedValue({} as never);
        vi.mocked(postsModule.isAssetUsedInOtherPosts).mockResolvedValue(false);
        vi.mocked(unlink).mockResolvedValue();

        const result = await deletePostAction(null, 1);

        expect(result.success).toBe(true);
        expect(postsModule.deletePost).toHaveBeenCalledWith(1);
        expect(postsModule.isAssetUsedInOtherPosts).toHaveBeenCalledWith("exclusiva.png", 1);
        expect(unlink).toHaveBeenCalledWith(expect.stringMatching(/[\\/]public[\\/]assets[\\/]exclusiva\.png$/));
    });

    it("does not unlink asset if it is used in another post", async () => {
        vi.mocked(postsModule.getPostById).mockResolvedValue({
            id: 1,
            title: "Post",
            slug: "post",
            content: "Texto com ![imagem](/assets/compartilhada.png)",
            published: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            tags: [],
        });
        vi.mocked(postsModule.deletePost).mockResolvedValue({} as never);
        vi.mocked(postsModule.isAssetUsedInOtherPosts).mockResolvedValue(true);
        vi.mocked(unlink).mockResolvedValue();

        const result = await deletePostAction(null, 1);

        expect(result.success).toBe(true);
        expect(postsModule.deletePost).toHaveBeenCalledWith(1);
        expect(postsModule.isAssetUsedInOtherPosts).toHaveBeenCalledWith("compartilhada.png", 1);
        expect(unlink).not.toHaveBeenCalled();
    });
});

describe("listAvailableAssetsAction", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(authModule.isAuthenticated).mockResolvedValue(true);
    });

    it("blocks listing assets if user is not authenticated", async () => {
        vi.mocked(authModule.isAuthenticated).mockResolvedValue(false);

        const result = await listAvailableAssetsAction();

        expect(result.error).toBe("Não autorizado");
        expect(result.assets).toEqual([]);
    });

    it("lists only valid image files and ignores non-images and .gitkeep", async () => {
        const mockEntries = [
            { isFile: () => true, name: "foto1.png" },
            { isFile: () => true, name: ".gitkeep" },
            { isFile: () => false, name: "subpasta" },
            { isFile: () => true, name: "foto2.webp" },
            { isFile: () => true, name: "documento.pdf" },
        ];

        vi.mocked(readdir).mockResolvedValue(mockEntries as never);
        vi.mocked(stat).mockImplementation((filePath) => {
            const mtime = String(filePath).includes("foto2") ? 2000 : 1000;
            return Promise.resolve({ mtimeMs: mtime } as never);
        });

        const result = await listAvailableAssetsAction();

        expect(result.assets).toHaveLength(2);
        expect(result.assets[0]).toEqual({ url: "/assets/foto2.webp", name: "foto2.webp" });
        expect(result.assets[1]).toEqual({ url: "/assets/foto1.png", name: "foto1.png" });
    });
});

describe("toggleLikeAction", () => {
    const mockHash = "a".repeat(64);

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(visitorServerModule.getOrCreateVisitorHashForAction).mockResolvedValue(mockHash);
    });

    it("rejects invalid post IDs", async () => {
        const negative = await toggleLikeAction(-1);
        const zero = await toggleLikeAction(0);
        const float = await toggleLikeAction(1.5);

        expect("error" in negative).toBe(true);
        expect("error" in zero).toBe(true);
        expect("error" in float).toBe(true);
        expect(postsModule.togglePostLike).not.toHaveBeenCalled();
    });

    it("toggles like for the visitor and returns updated count", async () => {
        vi.mocked(postsModule.togglePostLike).mockResolvedValue({
            liked: true,
            likesCount: 4,
            slug: "meu-post",
        });

        const result = await toggleLikeAction(10);

        expect(visitorServerModule.getOrCreateVisitorHashForAction).toHaveBeenCalled();
        expect(postsModule.togglePostLike).toHaveBeenCalledWith(10, mockHash);
        expect(result).toEqual({ success: true, liked: true, likesCount: 4 });
    });

    it("returns error when togglePostLike throws", async () => {
        vi.mocked(postsModule.togglePostLike).mockRejectedValue(new Error("Post not found"));

        const result = await toggleLikeAction(999);

        expect(result).toEqual({ error: "Error toggling like" });
    });
});

describe("recordPostReadAction", () => {
    const mockHash = "b".repeat(64);

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(visitorServerModule.getOrCreateVisitorHashForAction).mockResolvedValue(mockHash);
    });

    it("rejects invalid post IDs", async () => {
        const result = await recordPostReadAction(0);
        expect(result).toEqual({ success: false });
        expect(postsModule.recordPostRead).not.toHaveBeenCalled();
    });

    it("records read for the visitor hash", async () => {
        vi.mocked(postsModule.recordPostRead).mockResolvedValue(undefined);

        const result = await recordPostReadAction(7);

        expect(postsModule.recordPostRead).toHaveBeenCalledWith(7, mockHash);
        expect(result).toEqual({ success: true });
    });
});

describe("recordPostReadProgressAction", () => {
    const mockHash = "b".repeat(64);

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(visitorServerModule.getOrCreateVisitorHashForAction).mockResolvedValue(mockHash);
    });

    it("rejects invalid progress payloads", async () => {
        const result = await recordPostReadProgressAction({
            postId: 0,
            activeTimeMs: -10,
            scrollDepth: 2,
            reachedEnd: true,
        });

        expect(result).toEqual({ success: false });
        expect(postsModule.recordPostReadProgress).not.toHaveBeenCalled();
    });

    it("records verified read progress for valid input", async () => {
        vi.mocked(postsModule.recordPostReadProgress).mockResolvedValue({ verified: true });

        const payload = {
            postId: 7,
            activeTimeMs: 18_000,
            scrollDepth: 1,
            reachedEnd: true,
            enteredAtMs: 1_000,
            completedAtMs: 19_000,
        };
        const result = await recordPostReadProgressAction(payload);

        expect(postsModule.recordPostReadProgress).toHaveBeenCalledWith(payload, mockHash);
        expect(result).toEqual({ success: true, verified: true });
    });
});

describe("restoreVisitorHashAction", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("rejects malformed visitor hashes", async () => {
        const result = await restoreVisitorHashAction("invalid-hash");

        expect(result).toEqual({ success: false });
        expect(visitorServerModule.restoreVisitorHashCookie).not.toHaveBeenCalled();
    });

    it("restores valid visitor hash cookie", async () => {
        const validHash = "c".repeat(64);
        vi.mocked(visitorServerModule.restoreVisitorHashCookie).mockResolvedValue(undefined);

        const result = await restoreVisitorHashAction(validHash);

        expect(visitorServerModule.restoreVisitorHashCookie).toHaveBeenCalledWith(validHash);
        expect(result).toEqual({ success: true });
    });
});

describe("createCommentAction", () => {
    const mockHash = "d".repeat(64);

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(visitorServerModule.getOrCreateVisitorHashForAction).mockResolvedValue(mockHash);
    });

    it("rejects empty content before touching database", async () => {
        const result = await createCommentAction({
            postId: 1,
            authorMode: CommentAuthorMode.Anonymous,
            content: " ",
        });

        expect(result).toEqual({ success: false, errorCode: CommentErrorCode.ContentTooShort });
        expect(postsModule.createPostComment).not.toHaveBeenCalled();
    });

    it("creates named comment and propagates public DTO", async () => {
        const createdComment = {
            id: 12,
            postId: 1,
            authorName: "Carlos",
            isAnonymous: false,
            content: "Ótimo post!",
            createdAt: "2026-11-12T17:00:00.000Z",
            isOwn: true,
        };
        vi.mocked(postsModule.createPostComment).mockResolvedValue({
            ok: true,
            slug: "post-teste",
            comment: createdComment,
        });

        const result = await createCommentAction({
            postId: 1,
            authorMode: CommentAuthorMode.Named,
            authorName: " Carlos ",
            content: "Ótimo post!",
        });

        expect(postsModule.createPostComment).toHaveBeenCalledWith(
            {
                postId: 1,
                isAnonymous: false,
                authorName: "Carlos",
                content: "Ótimo post!",
            },
            mockHash
        );
        expect(result).toEqual({ success: true, comment: createdComment });
    });

    it("propagates cooldown errorCode and retryAfterSeconds from database", async () => {
        vi.mocked(postsModule.createPostComment).mockResolvedValue({
            ok: false,
            errorCode: CommentErrorCode.Cooldown,
            retryAfterSeconds: 22,
        });

        const result = await createCommentAction({
            postId: 1,
            authorMode: CommentAuthorMode.Anonymous,
            content: "Outro comentário rápido",
        });

        expect(result).toEqual({
            success: false,
            errorCode: CommentErrorCode.Cooldown,
            retryAfterSeconds: 22,
        });
    });

    it("propagates duplicate and rate-limited errors from database", async () => {
        vi.mocked(postsModule.createPostComment).mockResolvedValueOnce({
            ok: false,
            errorCode: CommentErrorCode.Duplicate,
        });

        const duplicateResult = await createCommentAction({
            postId: 1,
            authorMode: CommentAuthorMode.Anonymous,
            content: "Mensagem repetida",
        });

        expect(duplicateResult).toEqual({
            success: false,
            errorCode: CommentErrorCode.Duplicate,
        });

        vi.mocked(postsModule.createPostComment).mockResolvedValueOnce({
            ok: false,
            errorCode: CommentErrorCode.RateLimited,
        });

        const rateLimitedResult = await createCommentAction({
            postId: 1,
            authorMode: CommentAuthorMode.Anonymous,
            content: "Muitos comentários",
        });

        expect(rateLimitedResult).toEqual({
            success: false,
            errorCode: CommentErrorCode.RateLimited,
        });
    });
});

describe("deleteCommentAction", () => {
    const mockHash = "e".repeat(64);

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(authModule.isAuthenticated).mockResolvedValue(false);
        vi.mocked(visitorServerModule.getVisitorHash).mockResolvedValue(mockHash);
    });

    it("rejects invalid comment IDs", async () => {
        const result = await deleteCommentAction(-5);
        expect(result).toEqual({ success: false, errorCode: CommentErrorCode.InvalidInput });
        expect(postsModule.deletePostComment).not.toHaveBeenCalled();
    });

    it("returns unauthorized when neither admin nor owner", async () => {
        vi.mocked(postsModule.deletePostComment).mockResolvedValue({
            ok: false,
            errorCode: CommentErrorCode.Unauthorized,
        });

        const result = await deleteCommentAction(15);

        expect(postsModule.deletePostComment).toHaveBeenCalledWith(15, {
            isAdmin: false,
            visitorHash: mockHash,
        });
        expect(result).toEqual({ success: false, errorCode: CommentErrorCode.Unauthorized });
    });

    it("deletes comment when authorized", async () => {
        vi.mocked(authModule.isAuthenticated).mockResolvedValue(true);
        vi.mocked(postsModule.deletePostComment).mockResolvedValue({
            ok: true,
            slug: "meu-post",
        });

        const result = await deleteCommentAction(15);

        expect(postsModule.deletePostComment).toHaveBeenCalledWith(15, {
            isAdmin: true,
            visitorHash: mockHash,
        });
        expect(result).toEqual({ success: true });
    });
});
