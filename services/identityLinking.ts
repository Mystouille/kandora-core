import type { Types } from "mongoose";
import { UserModel } from "../User";

/**
 * Result of resolving a platform id to its canonical in-game username.
 *
 * The host app supplies the lookups (they wrap platform-specific connectors,
 * which differ between deployments), so this module stays connector-agnostic.
 */
export type PlatformLookupResult =
  | { ok: true; name: string; accountId: string }
  | { ok: false; status: number; error: string };

/**
 * Platform-specific side effects the shared linking logic delegates back to
 * the host app: connector lookups, reference transfers and placeholder merges.
 */
export interface IdentityLinkDeps {
  /** Resolve a Mahjong Soul friend id to its canonical account + nickname. */
  lookupMahjongSoul: (friendId: string) => Promise<PlatformLookupResult>;
  /** Resolve a Riichi City id to its canonical account + nickname. */
  lookupRiichiCity: (id: string) => Promise<PlatformLookupResult>;
  /** Migrate all references from a claimed dummy user to the current user. */
  transferUserReferences: (
    targetUserId: Types.ObjectId,
    sourceUserId: Types.ObjectId
  ) => Promise<unknown>;
  /**
   * Called once, after a user's first Riichi City link, to merge any CSV
   * placeholder participant into the now-confirmed user. Optional.
   */
  onFirstRiichiCityLink?: (
    userId: Types.ObjectId,
    userName: string
  ) => Promise<unknown>;
}

/** A JSON body + HTTP status the route serialises verbatim. */
export interface IdentityLinkOutcome {
  status: number;
  body: Record<string, unknown>;
}

/**
 * A "dummy" user is a placeholder with no real owner: no Discord identity
 * linked and no email registered. When a logged-in user claims a platform ID
 * currently held by a dummy, we transfer the dummy's references to them.
 */
function isDummyUser(user: {
  discordIdentity?: { id?: string } | null;
  email?: string | null;
}): boolean {
  return !user.discordIdentity?.id && !user.email;
}

/**
 * Link a platform identity (Mahjong Soul / Riichi City / Tenhou) to a user.
 *
 * Persists ONLY the canonical platform username in `<identity>.name` — never
 * the user's own profile name — by resolving it through the injected lookups.
 * Shared by kandora-portal and kandora-tournaments so the behaviour cannot
 * drift between the two deployments.
 */
export async function linkPlatformIdentity(
  userObjectId: string,
  type: unknown,
  id: unknown,
  deps: IdentityLinkDeps
): Promise<IdentityLinkOutcome> {
  if (!type || !id || typeof id !== "string" || !id.trim()) {
    return { status: 400, body: { error: "type and id are required" } };
  }

  const currentUser = await UserModel.findById(userObjectId).exec();
  if (!currentUser) {
    return { status: 404, body: { error: "User not found" } };
  }

  const trimmedId = id.trim();
  const updateData: Record<string, unknown> = {};

  if (type === "mahjongsoulId") {
    if (!/^\d+$/.test(trimmedId)) {
      return {
        status: 400,
        body: { error: "Mahjong Soul ID must be a number" },
      };
    }

    const lookup = await deps.lookupMahjongSoul(trimmedId);
    if (!lookup.ok) {
      return { status: lookup.status, body: { error: lookup.error } };
    }

    const existing = await UserModel.findOne({
      "majsoulIdentity.friendId": trimmedId,
      _id: { $ne: currentUser._id },
    });
    if (existing) {
      if (!isDummyUser(existing)) {
        return {
          status: 409,
          body: {
            error: "This Mahjong Soul ID is already linked to another account.",
          },
        };
      }
      await deps.transferUserReferences(currentUser._id, existing._id);
    }

    updateData.majsoulIdentity = {
      friendId: trimmedId,
      name: lookup.name,
      userId: lookup.accountId,
    };
  } else if (type === "riichiCityId") {
    if (!/^\d+$/.test(trimmedId)) {
      return {
        status: 400,
        body: { error: "Riichi City ID must be a number" },
      };
    }

    const lookup = await deps.lookupRiichiCity(trimmedId);
    if (!lookup.ok) {
      return { status: lookup.status, body: { error: lookup.error } };
    }

    const existingRC = await UserModel.findOne({
      "riichiCityIdentity.id": trimmedId,
      _id: { $ne: currentUser._id },
    });
    if (existingRC) {
      if (!isDummyUser(existingRC)) {
        return {
          status: 409,
          body: {
            error: "This Riichi City ID is already linked to another account.",
          },
        };
      }
      await deps.transferUserReferences(currentUser._id, existingRC._id);
    }

    updateData.riichiCityIdentity = {
      id: trimmedId,
      name: lookup.name,
    };

    if (!currentUser.riichiCityIdentity && deps.onFirstRiichiCityLink) {
      try {
        await deps.onFirstRiichiCityLink(currentUser._id, currentUser.name);
      } catch (mergeError) {
        console.warn("Placeholder merge failed (non-critical):", mergeError);
      }
    }
  } else if (type === "tenhouId") {
    // Tenhou usernames are plain strings — the id IS the username.
    const existingTenhou = await UserModel.findOne({
      "tenhouIdentity.name": trimmedId,
      _id: { $ne: currentUser._id },
    });
    if (existingTenhou) {
      if (!isDummyUser(existingTenhou)) {
        return {
          status: 409,
          body: {
            error: "This Tenhou username is already linked to another account.",
          },
        };
      }
      await deps.transferUserReferences(currentUser._id, existingTenhou._id);
    }

    updateData.tenhouIdentity = { name: trimmedId };
  } else {
    return {
      status: 400,
      body: { error: `Unknown identity type: ${type}` },
    };
  }

  const updatedUser = await UserModel.findByIdAndUpdate(
    userObjectId,
    updateData,
    { new: true }
  );

  return {
    status: 200,
    body: {
      success: true,
      mahjongsoulId: updatedUser?.majsoulIdentity?.friendId,
      riichiCityId: updatedUser?.riichiCityIdentity?.id,
      riichiCityName: updatedUser?.riichiCityIdentity?.name,
      tenhouId: updatedUser?.tenhouIdentity?.name,
    },
  };
}

/**
 * Validate a platform id and fetch its public info WITHOUT persisting anything.
 * Backs the `POST /api/auth/validate-identity` endpoint; reuses the same
 * injected connector lookups as {@link linkPlatformIdentity} so validation and
 * linking can never disagree about what a platform id resolves to.
 */
export async function validatePlatformIdentity(
  type: unknown,
  id: unknown,
  deps: Pick<IdentityLinkDeps, "lookupMahjongSoul" | "lookupRiichiCity">
): Promise<IdentityLinkOutcome> {
  if (type === "majsoulfId") {
    if (!id || typeof id !== "string" || !id.trim()) {
      return { status: 400, body: { error: "Mahjong Soul ID is required" } };
    }
    const trimmedId = id.trim();
    if (!/^\d+$/.test(trimmedId)) {
      return {
        status: 400,
        body: { error: "Mahjong Soul ID must be a number" },
      };
    }

    const lookup = await deps.lookupMahjongSoul(trimmedId);
    if (!lookup.ok) {
      return { status: lookup.status, body: { error: lookup.error } };
    }

    return {
      status: 200,
      body: {
        success: true,
        type: "majsoulfId",
        id: trimmedId,
        accountId: lookup.accountId,
        nickname: lookup.name,
      },
    };
  }

  if (type === "riichiCityId") {
    if (!id || typeof id !== "string" || !id.trim()) {
      return { status: 400, body: { error: "Riichi City ID is required" } };
    }
    const trimmedId = id.trim();
    if (!/^\d+$/.test(trimmedId)) {
      return {
        status: 400,
        body: { error: "Riichi City ID must be a number" },
      };
    }

    const lookup = await deps.lookupRiichiCity(trimmedId);
    if (!lookup.ok) {
      return { status: lookup.status, body: { error: lookup.error } };
    }

    return {
      status: 200,
      body: {
        success: true,
        type: "riichiCityId",
        id: lookup.accountId,
        accountId: lookup.accountId,
        nickname: lookup.name,
      },
    };
  }

  return { status: 400, body: { error: "Unknown identity type" } };
}
