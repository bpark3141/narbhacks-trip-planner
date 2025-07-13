import { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new trip
export const create = mutation({
  args: {
    name: v.string(),
    startDate: v.string(),
    endDate: v.string(),
    description: v.optional(v.string()),
    ownerId: v.id("users"), // Convex user ID
  },
  handler: async (ctx, args) => {
    const tripId = await ctx.db.insert("trips", {
      name: args.name,
      ownerId: args.ownerId,
      collaborators: [],
      startDate: args.startDate,
      endDate: args.endDate,
      description: args.description,
      createdAt: new Date().toISOString(),
    });
    return tripId;
  },
});

// Get all trips for a user (as owner or collaborator)
export const list = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const trips = await ctx.db.query("trips").collect();
    return trips.filter(
      (trip) =>
        trip.ownerId === args.userId ||
        trip.collaborators.includes(args.userId)
    );
  },
});

// Get a specific trip by ID
export const get = query({
  args: {
    tripId: v.id("trips"),
  },
  handler: async (ctx, args) => {
    const trip = await ctx.db.get(args.tripId);
    return trip;
  },
});

// Update a trip
export const update = mutation({
  args: {
    tripId: v.id("trips"),
    name: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { tripId, ...updates } = args;
    await ctx.db.patch(tripId, updates);
  },
});

// Delete a trip
export const remove = mutation({
  args: {
    tripId: v.id("trips"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.tripId);
  },
});

// Add a collaborator to a trip
export const addCollaborator = mutation({
  args: {
    tripId: v.id("trips"),
    userId: v.id("users"),
  },
  handler: async (
    ctx: any,
    args: { tripId: Id<"trips">; userId: Id<"users"> }
  ): Promise<void> => {
    const trip = await ctx.db.get(args.tripId);
    if (!trip) throw new Error("Trip not found");
    const updatedCollaborators = [...trip.collaborators, args.userId];
    await ctx.db.patch(args.tripId, { collaborators: updatedCollaborators });
  },
});

// Remove a collaborator from a trip
export const removeCollaborator = mutation({
  args: {
    tripId: v.id("trips"),
    userId: v.id("users"),
  },
  handler: async (
    ctx: any,
    args: { tripId: Id<"trips">; userId: Id<"users"> }
  ): Promise<void> => {
    const trip = await ctx.db.get(args.tripId);
    if (!trip) throw new Error("Trip not found");
    const updatedCollaborators = trip.collaborators.filter(
      (id: Id<"users">) => id !== args.userId
    );
    await ctx.db.patch(args.tripId, {
      collaborators: updatedCollaborators,
    });
  },
}); 

export const getOrCreateUser = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
  },
  handler: async (
    ctx: any,
    { clerkId, name, email }: { clerkId: string; name: string; email: string }
  ): Promise<Doc<"users">> => {
    const users = await ctx.db
      .query("users")
      .filter((q: { eq: Function; field: Function }) => q.eq(q.field("clerkId"), clerkId))
      .collect();
    if (users.length > 0) {
      return users[0];
    }
    const userId = await ctx.db.insert("users", {
      clerkId,
      name,
      email,
    });
    const user = await ctx.db.get(userId);
    return user!;
  },
}); 