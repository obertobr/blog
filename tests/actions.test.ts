import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPostAction, deleteAssetAction, saveTagAction } from "../app/_lib/actions";
import * as postsModule from "../app/_lib/posts";
import { unlink } from "fs/promises";

vi.mock("../app/_lib/posts", () => ({
    createPost: vi.fn(),
    createTag: vi.fn(),
    updateTag: vi.fn(),
    deleteTag: vi.fn(),
}));

vi.mock("fs/promises", () => ({
    unlink: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
}));

describe("createPostAction", () => {
    beforeEach(() => {
        vi.clearAllMocks();
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
    });

    it("sanitizes file path to prevent directory traversal", async () => {
        vi.mocked(unlink).mockResolvedValue();

        const result = await deleteAssetAction(null, "../../malicious.png");

        expect(result.success).toBe(true);
        expect(unlink).toHaveBeenCalledWith(expect.stringMatching(/[\\/]public[\\/]assets[\\/]malicious\.png$/));
    });
});
