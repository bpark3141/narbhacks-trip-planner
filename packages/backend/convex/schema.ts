import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(), // <-- Add this line
    name: v.string(),
    email: v.string(),
    // Add more fields as needed
  }),
  trips: defineTable({
    name: v.string(),
    ownerId: v.id("users"),
    collaborators: v.array(v.id("users")),
    startDate: v.string(), // ISO date
    endDate: v.string(),   // ISO date
    description: v.optional(v.string()),
    createdAt: v.string(), // ISO date
    keywords: v.optional(v.string()), // Add this line for special interests/keywords
  }),
  destinations: defineTable({
    tripId: v.id("trips"),
    name: v.string(),
    location: v.string(),
    arrivalDate: v.string(), // ISO date
    departureDate: v.string(), // ISO date
    notes: v.optional(v.string()),
  }),
  itinerary_items: defineTable({
    tripId: v.id("trips"),
    date: v.string(), // ISO date
    time: v.optional(v.string()), // e.g., '14:00'
    title: v.string(),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
    order: v.optional(v.number()), // Add this line for drag-and-drop ordering
  }),
  expenses: defineTable({
    tripId: v.id("trips"),
    amount: v.number(),
    description: v.string(),
    paidBy: v.id("users"),
    splitWith: v.array(v.id("users")),
    date: v.string(), // ISO date
  }),
  notes: defineTable({
    tripId: v.optional(v.id("trips")), // Make tripId optional for standalone notes
    date: v.string(),
    content: v.string(),
    createdBy: v.id("users"),
    title: v.string(), // <-- add this
    summary: v.optional(v.string()), // <-- add this if you want AI summaries
  }),
  reminders: defineTable({
    tripId: v.id("trips"),
    content: v.string(),
    remindAt: v.string(), // ISO date
    createdBy: v.id("users"),
  }),
});
