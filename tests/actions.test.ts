import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPostAction, deleteAssetAction, loginAction, saveTagAction } from "../app/_lib/actions";
import * as postsModule from "../app/_lib/posts";
import * as authModule from "../app/_lib/auth";
import { unlink } from "fs/promises";

vi.mock("../app/_lib/posts", () => ({
    createPost: vi.fn(),
    createTag: vi.fn(),
    updateTag: vi.fn(),
    deleteTag: vi.fn(),
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
