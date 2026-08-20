import { beforeEach, describe, expect, it, vi } from "vitest";

const userModelMocks = vi.hoisted(() => ({
  findById: vi.fn(),
  find: vi.fn(),
  findByIdAndUpdate: vi.fn(),
}));

vi.mock("../models/shared/User", () => ({
  UserModel: userModelMocks,
}));

import type { IdentityLinkDeps } from "./identityLinking";
import { linkPlatformIdentity } from "./identityLinking";

function createDeps(): IdentityLinkDeps {
  return {
    lookupMahjongSoul: vi.fn(),
    lookupRiichiCity: vi.fn(),
    transferUserReferences: vi.fn(),
  };
}

describe("linkPlatformIdentity Tenhou ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userModelMocks.findById.mockReturnValue({
      exec: vi.fn().mockResolvedValue({ _id: "current", name: "Current" }),
    });
    userModelMocks.findByIdAndUpdate.mockResolvedValue({
      tenhouIdentity: { name: "TenhouName" },
    });
  });

  it("transfers every standalone duplicate before linking", async () => {
    const duplicates = [{ _id: "first" }, { _id: "second" }];
    userModelMocks.find.mockReturnValue({
      exec: vi.fn().mockResolvedValue(duplicates),
    });
    const deps = createDeps();

    const result = await linkPlatformIdentity(
      "current",
      "tenhouId",
      " TenhouName ",
      deps
    );

    expect(result.status).toBe(200);
    expect(deps.transferUserReferences).toHaveBeenCalledTimes(2);
    expect(deps.transferUserReferences).toHaveBeenNthCalledWith(
      1,
      "current",
      "first"
    );
    expect(deps.transferUserReferences).toHaveBeenNthCalledWith(
      2,
      "current",
      "second"
    );
    expect(userModelMocks.findByIdAndUpdate).toHaveBeenCalledWith(
      "current",
      { tenhouIdentity: { name: "TenhouName" } },
      { new: true }
    );
  });

  it("rejects the link when any registered account owns the username", async () => {
    userModelMocks.find.mockReturnValue({
      exec: vi
        .fn()
        .mockResolvedValue([
          { _id: "placeholder" },
          { _id: "registered", discordIdentity: { id: "discord" } },
        ]),
    });
    const deps = createDeps();

    const result = await linkPlatformIdentity(
      "current",
      "tenhouId",
      "TenhouName",
      deps
    );

    expect(result).toEqual({
      status: 409,
      body: {
        error: "This Tenhou username is already linked to another account.",
      },
    });
    expect(deps.transferUserReferences).not.toHaveBeenCalled();
    expect(userModelMocks.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it("returns a conflict when another link wins the unique-index race", async () => {
    userModelMocks.find.mockReturnValue({
      exec: vi.fn().mockResolvedValue([]),
    });
    userModelMocks.findByIdAndUpdate.mockRejectedValue({ code: 11000 });

    const result = await linkPlatformIdentity(
      "current",
      "tenhouId",
      "TenhouName",
      createDeps()
    );

    expect(result).toEqual({
      status: 409,
      body: { error: "This platform account is already linked." },
    });
  });
});
