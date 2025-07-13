import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new itinerary item for a trip
export const create = mutation({
  args: {
    tripId: v.id("trips"),
    date: v.string(),
    time: v.optional(v.string()),
    title: v.string(),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const itemId = await ctx.db.insert("itinerary_items", {
      tripId: args.tripId,
      date: args.date,
      time: args.time,
      title: args.title,
      description: args.description,
      location: args.location,
    });
    return itemId;
  },
});

// Get all itinerary items for a trip
export const listByTrip = query({
  args: {
    tripId: v.id("trips"),
  },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("itinerary_items")
      .filter((q) => q.eq(q.field("tripId"), args.tripId))
      .order("asc")
      .collect();
    return items;
  },
});

// Get itinerary items for a specific date
export const listByDate = query({
  args: {
    tripId: v.id("trips"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("itinerary_items")
      .filter((q) => 
        q.and(
          q.eq(q.field("tripId"), args.tripId),
          q.eq(q.field("date"), args.date)
        )
      )
      .order("asc")
      .collect();
    return items;
  },
});

// Get a specific itinerary item by ID
export const get = query({
  args: {
    itemId: v.id("itinerary_items"),
  },
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    return item;
  },
});

// Update an itinerary item
export const update = mutation({
  args: {
    itemId: v.id("itinerary_items"),
    date: v.optional(v.string()),
    time: v.optional(v.string()),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { itemId, ...updates } = args;
    await ctx.db.patch(itemId, updates);
  },
});

// Delete an itinerary item
export const remove = mutation({
  args: {
    itemId: v.id("itinerary_items"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.itemId);
  },
}); 