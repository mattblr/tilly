import { captureTagSchema } from "./capture-tag-schema.ts";
import { followGrants, ownAudienceGrants } from "./audience-grants.ts";

/** Shared contracts: the root owns ordinary operations; the installed manifest
 * owns provider-using operations until config-owned credential reads work. */
export function appOperationDefinitions(OPERATION_URL: string) {
  /** What an operation needs to keep one of the user's own models. */
  const keeps = (model: string, { remove = false } = {}) => [
    `records:read:${model}`,
    `records:create:${model}`,
    `records:attribute:${model}`,
    `records:write:${model}`,
    ...(remove ? [`records:delete:${model}`] : []),
  ];

  // A social operation: signed in only, served by the same endpoint as save_catch.
  const socialResult = {
    type: "object",
    properties: {
      ok: { type: "boolean" },
      id: { type: "string" },
      active: { type: "boolean" },
      error: { type: "string" },
    },
  };
  const socialOperation = (
    key: string,
    name: string,
    description: string,
    grants: string[],
    inputSchema: Record<string, unknown>,
    perDay = 300,
  ) => ({
    key,
    name,
    description,
    endpoint: `${OPERATION_URL}/operations/${key}`,
    ...(key === "save_profile" ||
    key === "post_my_catches" ||
    key === "share_capture" ||
    key === "tidy_followers"
      ? { mode: "async" as const, callbackTtlSeconds: 3600 }
      : { mode: "sync" as const }),
    grants: ["project:stand", ...grants],
    quotas: {
      rules: [
        {
          points: perDay,
          duration: 86400,
          scope: "user" as const,
          message: "That’s plenty for today. Back tomorrow.",
        },
      ],
    },
    outputSchema:
      // A follow is accepted, or requested until a private user accepts.
      key === "follow_user"
        ? { type: "object", properties: { ...socialResult.properties, status: { type: "string" } } }
        : key === "profile_counts"
        ? { type: "object", properties: { ok: { type: "boolean" }, followers: { type: "integer" }, following: { type: "integer" }, cats: { type: "integer" }, catches: { type: "integer" }, error: { type: "string" } } }
        : key === "update_capture_tags"
        ? {
            type: "object",
            properties: {
              ...socialResult.properties,
              captureId: { type: "string" },
              revision: { type: "string" },
              photo: { type: "object" },
              post: { type: "string" },
              catId: { type: "string" },
              cats: { type: "array", items: { type: "object" } },
            },
          }
        : socialResult,
    inputSchema,
  });

  const socialOperations = [
    socialOperation(
      "update_capture_tags",
      "Edit my capture’s cats",
      "Corrects cat tags on the signed-in creator’s capture without another upload, post, like or streak event.",
      [
        "records:read:cat",
        "records:create:cat",
        "records:write:cat",
        ...keeps("capture-photo"),
        ...keeps("capture-cat-tag", { remove: true }),
        "records:read:capture-post",
        "records:write:capture-post",
        "records:read:field-note",
        "records:write:field-note",
        "records:read:catch-art",
        "records:write:catch-art",
        "files:read",
        "files:write",
        "records:read:profile",
        ...ownAudienceGrants,
      ],
      {
        type: "object",
        required: ["photoKey", "expectedRevision", "revision", "cats"],
        properties: {
          photoKey: { type: "string" },
          expectedRevision: { type: "string" },
          revision: { type: "string" },
          cats: captureTagSchema,
        },
      },
      100,
    ),
    socialOperation(
      "save_profile",
      "Save my profile",
      "Sets the name, username, bio and photo other users see beside what this user shares, and whether their catches are public or for the followers they accept.",
      [
        "files:read",
        "files:write",
        "records:read:capture-photo",
        "records:read:capture-cat-tag",
        "records:read:catch-art",
        "records:read:follow-request",
        ...keeps("profile"),
        ...keeps("capture-post"),
        ...keeps("field-note"),
        "records:write:capture-photo",
        "records:write:capture-cat-tag",
        "records:write:catch-art",
        // Going private keeps the followers this user approved.
        "records:read:follow-approval",
        ...ownAudienceGrants,
      ],
      {
        type: "object",
        required: ["displayName", "username"],
        properties: {
          displayName: { type: "string" },
          username: { type: "string" },
          bio: { type: "string" },
          // A newly uploaded photo. Leaving it out keeps the photo already set.
          photoFileId: { type: "string" },
          removePhoto: { type: "boolean" },
          // Who sees every catch, and whether following needs approval.
          privacy: { type: "string", enum: ["public", "private"] },
        },
      },
      50,
    ),
    socialOperation(
      "like_capture",
      "Like a capture",
      "Likes or unlikes one capture for this user, once per capture.",
      [
        "records:read:capture-photo",
        "records:read:capture-cat-tag",
        ...keeps("capture-like", { remove: true }),
      ],
      {
        type: "object",
        required: ["photoKey", "liked"],
        properties: {
          photoKey: { type: "string" },
          liked: { type: "boolean" },
        },
      },
    ),
    socialOperation(
      "follow_cat",
      "Follow a cat",
      "Follows or unfollows a cat for this user, privately.",
      ["records:read:cat", ...keeps("cat-follow", { remove: true })],
      {
        type: "object",
        required: ["catId", "following"],
        properties: {
          catId: { type: "string" },
          following: { type: "boolean" },
        },
      },
    ),
    socialOperation(
      "follow_user",
      "Follow a user",
      "Follows or unfollows another user: at once for a public user, as a request for a private one. Also accepts, declines or removes this user's followers.",
      ["records:read:profile", ...followGrants],
      {
        type: "object",
        required: ["userId"],
        properties: {
          userId: { type: "string" },
          following: { type: "boolean" },
          // Answers userId's request to follow this user, or removes them.
          follower: { type: "string", enum: ["accept", "decline", "remove"] },
        },
      },
    ),
    socialOperation(
      "tidy_followers",
      "Tidy my followers",
      "Takes back access to this user's catches from people who stopped following them. Only a user's own account can.",
      ["records:read:profile", ...followGrants],
      { type: "object", properties: {} },
      50,
    ),
    socialOperation(
      "profile_counts",
      "A user's counts",
      "Counts a user's followers, following, cats met and catches, for whoever may see their catches. Numbers only.",
      [
        "records:read:profile",
        // Counts are for whoever may read the user's audience record.
        "records:read:audience",
        "records:read:follow-approval", "records:read.all:follow-approval",
        "records:read:capture-photo", "records:read.all:capture-photo",
        "records:read:capture-cat-tag", "records:read.all:capture-cat-tag",
      ],
      { type: "object", required: ["userId"], properties: { userId: { type: "string" } } },
      1000,
    ),
    socialOperation(
      "add_field_note",
      "Add a field note",
      "Adds what this user noticed to one of their own catches.",
      [
        "records:read:capture-photo",
        "records:read:capture-cat-tag",
        "records:read:note-tag",
        "records:read:capture-post",
        "records:read:profile",
        ...keeps("field-note"),
        ...ownAudienceGrants,
      ],
      {
        type: "object",
        required: ["photoKey"],
        properties: {
          photoKey: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          text: { type: "string" },
        },
      },
      100,
    ),
    socialOperation(
      "post_my_catches",
      "Repair who sees my catches",
      "Points this user’s profile, followers, catches and reposts back at who they let see their catches, and brings photo visibility in line. A repair for operators; the apps don’t run it.",
      [
        "records:read:capture-photo",
        "records:read:capture-cat-tag",
        "records:read:catch-art",
        "files:read",
        "files:write",
        "records:read:profile",
        "records:read:follow-request",
        ...keeps("capture-post"),
        "records:write:capture-photo",
        "records:write:capture-cat-tag",
        ...keeps("field-note"),
        "records:write:catch-art",
        "records:read:follow-approval",
        ...ownAudienceGrants,
      ],
      { type: "object", properties: {} },
      20,
    ),
    socialOperation(
      "share_capture",
      "Share a capture",
      "Captions one of this user’s catches, or reshares a public post with a comment, to whoever sees their catches.",
      [
        "records:read:profile",
        "records:read:capture-photo",
        "records:read:capture-cat-tag",
        "files:read",
        ...keeps("capture-post", { remove: true }),
        ...ownAudienceGrants,
      ],
      {
        type: "object",
        properties: {
          photoKey: { type: "string" },
          note: { type: "string" },
          reshareOf: { type: "string" },
          comment: { type: "string" },
          reposted: { type: "boolean" },
        },
      },
      100,
    ),
  ];

  return [
    ...socialOperations,
    {
      key: "save_catch",
      name: "Save a catch",
      description:
        "Saves a catch: one photo and the cats tagged in it, creating a cat on its first catch, and posts it to whoever the user lets see their catches.",
      endpoint: `${OPERATION_URL}/operations/save-catch`,
      mode: "async" as const,
      callbackTtlSeconds: 3600,
      grants: [
        "records:create:capture-check",
        "records:attribute:capture-check",
        "project:stand",
        "records:read:cat",
        "records:create:cat",
        "records:write:cat",
        ...keeps("capture-photo"),
        ...keeps("capture-cat-tag"),
        "records:read:capture-photo",
        "records:read:capture-cat-tag",
        "records:read:catch-art",
        "files:read",
        "files:write",
        // Every catch is posted, named, to whoever the user lets see it.
        "records:read:profile",
        "records:read:field-note",
        ...keeps("capture-post"),
        ...ownAudienceGrants,
      ],
      quotas: {
        rules: [
          {
            points: 10,
            duration: 86400,
            scope: "user" as const,
            message:
              "Are you at the cat zoo? Leave some for the rest of us, and come back tomorrow to catch more.",
          },
        ],
      },
      outputSchema: {
        type: "object",
        properties: {
          ok: { type: "boolean" },
          catId: { type: "string" },
          captureId: { type: "string" },
          revision: { type: "string" },
          cats: { type: "array", items: { type: "object" } },
          cat: { type: "object" },
          photo: { type: "object" },
          post: { type: "string" },
          sent: { type: "array", items: { type: "object" } },
          error: { type: "string" },
          detail: { type: "array", items: { type: "object" } },
        },
      },
      inputSchema: {
        type: "object",
        required: ["photoFileId", "captureKey", "cats", "lat", "lng"],
        properties: {
          photoFileId: { type: "string" },
          captureKey: { type: "string", minLength: 1, maxLength: 80 },
          cats: captureTagSchema,
          lat: { type: "number" },
          lng: { type: "number" },
        },
      },
    },
  ];
}
