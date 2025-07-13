import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
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


// Create a new expense for a trip
export const create = mutation({
  args: {
    tripId: v.id("trips"),
    amount: v.number(),
    description: v.string(),
    paidBy: v.string(), // Clerk user ID
    splitWith: v.array(v.string()), // Array of Clerk user IDs
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const clerkPaidById = args.paidBy;
    const clerkSplitWithIds = args.splitWith;

    const convexPaidBy = await getConvexUserId(ctx, clerkPaidById);
    const convexSplitWith = await Promise.all(clerkSplitWithIds.map(id => getConvexUserId(ctx, id)));

    const expenseId = await ctx.db.insert("expenses", {
      tripId: args.tripId,
      amount: args.amount,
      description: args.description,
      paidBy: convexPaidBy, // ✅ Id<"users">
      splitWith: convexSplitWith, // ✅ Id<"users">[]
      date: args.date,
    });
    return expenseId;
  },
});

// Get all expenses for a trip
export const listByTrip = query({
  args: {
    tripId: v.id("trips"),
  },
  handler: async (ctx, args) => {
    const expenses = await ctx.db
      .query("expenses")
      .filter((q) => q.eq(q.field("tripId"), args.tripId))
      .order("desc")
      .collect();
    return expenses;
  },
});

// Get expenses for a specific user in a trip
export const listByUser = query({
  args: {
    tripId: v.id("trips"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const expenses = await ctx.db
      .query("expenses")
      .filter((q) => q.eq(q.field("tripId"), args.tripId))
      .order("desc")
      .collect();
    return expenses.filter(
      (expense) =>
        expense.paidBy === args.userId ||
        expense.splitWith.includes(args.userId)
    );
  },
});

// Get a specific expense by ID
export const get = query({
  args: {
    expenseId: v.id("expenses"),
  },
  handler: async (ctx, args) => {
    const expense = await ctx.db.get(args.expenseId);
    return expense;
  },
});

// Update an expense
export const update = mutation({
  args: {
    expenseId: v.id("expenses"),
    amount: v.optional(v.number()),
    description: v.optional(v.string()),
    paidBy: v.optional(v.string()), // Clerk user ID
    splitWith: v.optional(v.array(v.string())), // Array of Clerk user IDs
    date: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { expenseId, paidBy, splitWith, ...otherUpdates } = args;
    const updates: any = { ...otherUpdates };

    if (paidBy !== undefined) {
      updates.paidBy = await getConvexUserId(ctx, paidBy);
    }
    if (splitWith !== undefined) {
      updates.splitWith = await Promise.all(splitWith.map(id => getConvexUserId(ctx, id)));
    }

    await ctx.db.patch(expenseId, updates);
  },
});

// Delete an expense
export const remove = mutation({
  args: {
    expenseId: v.id("expenses"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.expenseId);
  },
});

// Get expense summary for a trip
export const getSummary = query({
  args: {
    tripId: v.id("trips"),
  },
  handler: async (ctx, args) => {
    const expenses = await ctx.db
      .query("expenses")
      .filter((q) => q.eq(q.field("tripId"), args.tripId))
      .collect();
    
    const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    // Group by user who paid
    const paidByUser = expenses.reduce((acc, expense) => {
      const userId = expense.paidBy;
      acc[userId] = (acc[userId] || 0) + expense.amount;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalAmount,
      paidByUser,
      expenseCount: expenses.length,
    };
  },
}); 