import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "../convex/_generated/api";
import { Auth } from "convex/server";
import { Doc, Id } from "./_generated/dataModel";

async function getConvexUserId(ctx: any, clerkUserId: string, name?: string, email?: string) {
  const users = await ctx.db
    .query("users")
    .filter((q: { eq: Function; field: Function }) => q.eq(q.field("clerkId"), clerkUserId))
    .collect();
  if (users.length > 0) {
    return users[0]._id;
  }
  // If not found, create a new user
  const newUserId = await ctx.db.insert("users", {
    clerkId: clerkUserId,
    name: name ?? "",
    email: email ?? "",
  });
  return newUserId;
}

export const getUserId = async (ctx: { auth: Auth }) => {
  return (await ctx.auth.getUserIdentity())?.subject;
};

// Get all standalone notes for a specific user
export const getNotes = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) return null;

    const notes = await ctx.db
      .query("notes")
      .filter((q) => q.eq(q.field("createdBy"), userId))
      .collect();

    // Only return standalone notes (notes without tripId)
    const standaloneNotes = notes.filter(note => !note.tripId);

    return standaloneNotes;
  },
});

// Get note for a specific note
export const getNote = query({
  args: {
    id: v.optional(v.id("notes")),
  },
  handler: async (ctx, args) => {
    const { id } = args;
    if (!id) return null;
    const note = await ctx.db.get(id);
    return note;
  },
});

// Create a new note (can be for a trip or standalone)
export const createNote = mutation({
  args: {
    tripId: v.optional(v.id("trips")),
    title: v.string(),
    content: v.string(),
    isSummary: v.boolean(),
  },
  handler: async (ctx, { tripId, title, content, isSummary }) => {
    const clerkUserId = await getUserId(ctx);
    if (!clerkUserId) throw new Error("User not found");
    const convexUserId = await getConvexUserId(ctx, clerkUserId);
    const noteId = await ctx.db.insert("notes", {
      tripId,
      createdBy: convexUserId,
      title,
      content,
      date: new Date().toISOString(),
      summary: undefined, // optional, but explicit
    });

    if (isSummary) {
      await ctx.scheduler.runAfter(0, internal.openai.summary, {
        id: noteId,
        title,
        content,
      });
    }

    return noteId;
  },
});

export const deleteNote = mutation({
  args: {
    noteId: v.id("notes"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.noteId);
  },
});

// Create a new note for a trip
export const create = mutation({
  args: {
    tripId: v.id("trips"),
    content: v.string(),
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const convexUserId = await getConvexUserId(ctx, args.clerkUserId);
    const noteId = await ctx.db.insert("notes", {
      tripId: args.tripId,
      content: args.content,
      createdBy: convexUserId,
      date: new Date().toISOString(),
      title: "", // or a default title, or add to args if you want to require it
      summary: undefined,
    });
    return noteId;
  },
});

// Get all notes for a trip
export const listByTrip = query({
  args: {
    tripId: v.id("trips"),
  },
  handler: async (ctx, args) => {
    const notes = await ctx.db
      .query("notes")
      .filter((q) => q.eq(q.field("tripId"), args.tripId))
      .order("desc")
      .collect();
    return notes;
  },
});

// Get a specific note by ID
export const get = query({
  args: {
    noteId: v.id("notes"),
  },
  handler: async (ctx, args) => {
    const note = await ctx.db.get(args.noteId);
    return note;
  },
});

// Update a note
export const update = mutation({
  args: {
    noteId: v.id("notes"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.noteId, {
      content: args.content,
    });
  },
});

// Delete a note
export const remove = mutation({
  args: {
    noteId: v.id("notes"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.noteId);
  },
});
