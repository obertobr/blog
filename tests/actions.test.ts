import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPostAction, deleteAssetAction, deletePostAction, loginAction, saveAssetAction, saveTagAction } from "../app/_lib/actions";
import * as postsModule from "../app/_lib/posts";
import * as authModule from "../app/_lib/auth";
import { unlink } from "fs/promises";

vi.mock("../app/_lib/posts", () => ({
    createPost: vi.fn(),
    createTag: vi.fn(),
    updateTag: vi.fn(),
    deleteTag: vi.fn(),
    deletePost: vi.fn(),
    getPostById: vi.fn(),
    isAssetUsedInOtherPosts: vi.fn(),
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
}));

describe("loginAction", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.ADMIN_PASSWORD_HASH = "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918";
    });

    it("logs in successfully with correct password", async () => {
        vi.mocked(authModule.isValidPassword).mockReturnValue(true);

        const result = await loginAction(null, "admin");

        expect(result.success).toBe(true);
        expect(authModule.setAdminSession).toHaveBeenCalled();
    });

    it("rejects login with incorrect password", async () => {
        vi.mocked(authModule.isValidPassword).mockReturnValue(false);

        const result = await loginAction(null, "senha-errada");

        expect(result.error).toBe("Senha incorreta");
        expect(authModule.setAdminSession).not.toHaveBeenCalled();
    });

    it("throws error when ADMIN_PASSWORD_HASH is not set", async () => {
        vi.mocked(authModule.isValidPassword).mockImplementation(() => {
            throw new Error("ADMIN_PASSWORD_HASH is not set in environment variables (.env). Run 'npm run set-password' to configure it.");
        });

        await expect(loginAction(null, "admin")).rejects.toThrow(
            "ADMIN_PASSWORD_HASH is not set in environment variables (.env)"
        );
        expect(authModule.setAdminSession).not.toHaveBeenCalled();
    });
});

describe("createPostAction", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(authModule.isAuthenticated).mockResolvedValue(true);
    });

    it("creates post with slug and returns success state", async () => {
        vi.mocked(postsModule.createPost).mockResolvedValue({
            id: 1,
            title: "Post de Teste",
            slug: "post-de-teste",
            content: "Conteudo",
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const initialState = { message: "", slug: null };
        const formPost = { title: "Post de Teste", content: "Conteudo", tags: ["dev"] };

        const result = await createPostAction(initialState, formPost);

        expect(result.message).toBe("Post created");
        expect(result.slug).toBe("post-de-teste");
        expect(postsModule.createPost).toHaveBeenCalledWith(
            "Post de Teste",
            "Conteudo",
            "post-de-teste",
            ["dev"]
        );
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

        expect(result.message).toBe("Post created");
        expect(result.slug).toBe("post-completo");
    });
});

describe("saveTagAction", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(authModule.isAuthenticated).mockResolvedValue(true);
    });

    it("updates existing tag when id is provided", async () => {
        vi.mocked(postsModule.updateTag).mockResolvedValue({
            id: 1,
            name: "react",
            color: "#61dafb",
        });

        const result = await saveTagAction(null, { id: 1, name: "react", color: "#61dafb" });

        expect(result.success).toBe(true);
        expect(result.message).toBe("Tag react saved");
        expect(postsModule.updateTag).toHaveBeenCalledWith(1, { name: "react", color: "#61dafb" });
    });

    it("creates new tag when id is not provided", async () => {
        vi.mocked(postsModule.createTag).mockResolvedValue({
            id: 2,
            name: "node",
            color: null,
        });

        const result = await saveTagAction(null, { name: "node", color: null });

        expect(result.success).toBe(true);
        expect(result.message).toBe("Tag node saved");
        expect(postsModule.createTag).toHaveBeenCalledWith("node", null);
    });

    it("handles duplicate tag name error P2002", async () => {
        vi.mocked(postsModule.createTag).mockRejectedValue({ code: "P2002" });

        const result = await saveTagAction(null, { name: "react", color: null });

        expect(result.error).toBe("Tag with this name already exists");
    });
});

describe("deleteAssetAction", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(authModule.isAuthenticated).mockResolvedValue(true);
    });

    it("sanitizes file path to prevent directory traversal", async () => {
        vi.mocked(unlink).mockResolvedValue();

        const result = await deleteAssetAction(null, "../../malicious.png");

        expect(result.success).toBe(true);
        expect(unlink).toHaveBeenCalledWith(expect.stringMatching(/[\\/]public[\\/]assets[\\/]malicious\.png$/));
    });
});

describe("saveAssetAction", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(authModule.isAuthenticated).mockResolvedValue(true);
    });

    it("generates unique filenames so files with identical names never overwrite each other", async () => {
        const mockFile1 = {
            name: "foto.png",
            size: 1024,
            arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
        } as unknown as File;

        const mockFile2 = {
            name: "foto.png",
            size: 1024,
            arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
        } as unknown as File;

        const result = await saveAssetAction(null, [mockFile1, mockFile2] as unknown as FileList);

        expect(result.assets).toHaveLength(2);
        expect(result.assets[0]).not.toBe(result.assets[1]);
        expect(result.assets[0]).toMatch(/^\/assets\/foto-[a-f0-9]{8}\.png$/);
        expect(result.assets[1]).toMatch(/^\/assets\/foto-[a-f0-9]{8}\.png$/);
        expect(result.errors).toHaveLength(0);
    });

    it("rejects non-image extensions", async () => {
        const mockBadFile = {
            name: "script.sh",
            size: 100,
            arrayBuffer: vi.fn(),
        } as unknown as File;

        const result = await saveAssetAction(null, [mockBadFile] as unknown as FileList);

        expect(result.assets).toHaveLength(0);
        expect(result.errors).toContain('Arquivo "script.sh" não é uma imagem suportada.');
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
