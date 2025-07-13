import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new reminder for a trip
export const create = mutation({
  args: {
    tripId: v.id("trips"),
    content: v.string(),
    remindAt: v.string(), // ISO date
    createdBy: v.string(), // Clerk user ID
  },
  handler: async (ctx, args) => {
    const reminderId = await ctx.db.insert("reminders", {
      tripId: args.tripId,
      content: args.content,
      remindAt: args.remindAt,
      createdBy: args.createdBy as any,
    });
    return reminderId;
  },
});

// Get all reminders for a trip
export const listByTrip = query({
  args: {
    tripId: v.id("trips"),
  },
  handler: async (ctx, args) => {
    const reminders = await ctx.db
      .query("reminders")
      .filter((q) => q.eq(q.field("tripId"), args.tripId))
      .order("asc")
      .collect();
    return reminders;
  },
});

// Get upcoming reminders (reminders that haven't been triggered yet)
export const listUpcoming = query({
  args: {
    tripId: v.id("trips"),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const reminders = await ctx.db
      .query("reminders")
      .filter((q) => 
        q.and(
          q.eq(q.field("tripId"), args.tripId),
          q.gte(q.field("remindAt"), now)
        )
      )
      .order("asc")
      .collect();
    return reminders;
  },
});

// Get a specific reminder by ID
export const get = query({
  args: {
    reminderId: v.id("reminders"),
  },
  handler: async (ctx, args) => {
    const reminder = await ctx.db.get(args.reminderId);
    return reminder;
  },
});

// Update a reminder
export const update = mutation({
  args: {
    reminderId: v.id("reminders"),
    content: v.optional(v.string()),
    remindAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { reminderId, ...updates } = args;
    await ctx.db.patch(reminderId, updates);
  },
});

// Delete a reminder
export const remove = mutation({
  args: {
    reminderId: v.id("reminders"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.reminderId);
  },
}); 