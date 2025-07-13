import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new destination for a trip
export const create = mutation({
  args: {
    tripId: v.id("trips"),
    name: v.string(),
    location: v.string(),
    arrivalDate: v.string(),
    departureDate: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const destinationId = await ctx.db.insert("destinations", {
      tripId: args.tripId,
      name: args.name,
      location: args.location,
      arrivalDate: args.arrivalDate,
      departureDate: args.departureDate,
      notes: args.notes,
    });
    return destinationId;
  },
});

// Get all destinations for a trip
export const listByTrip = query({
  args: {
    tripId: v.id("trips"),
  },
  handler: async (ctx, args) => {
    const destinations = await ctx.db
      .query("destinations")
      .filter((q) => q.eq(q.field("tripId"), args.tripId))
      .order("asc")
      .collect();
    return destinations;
  },
});

// Get a specific destination by ID
export const get = query({
  args: {
    destinationId: v.id("destinations"),
  },
  handler: async (ctx, args) => {
    const destination = await ctx.db.get(args.destinationId);
    return destination;
  },
});

// Update a destination
export const update = mutation({
  args: {
    destinationId: v.id("destinations"),
    name: v.optional(v.string()),
    location: v.optional(v.string()),
    arrivalDate: v.optional(v.string()),
    departureDate: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { destinationId, ...updates } = args;
    await ctx.db.patch(destinationId, updates);
  },
});

// Delete a destination
export const remove = mutation({
  args: {
    destinationId: v.id("destinations"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.destinationId);
  },
}); 