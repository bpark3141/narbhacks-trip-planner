import { action, internalAction, internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { missingEnvVariableUrl } from "./utils";
import { Doc, Id } from "./_generated/dataModel";

export const openaiKeySet = query({
  args: {},
  handler: async () => {
    return !!(process.env.HUGGINGFACE_API_KEY || process.env.COHERE_API_KEY);
  },
});

export const summary = internalAction({
  args: {
    id: v.id("notes"),
    title: v.string(),
    content: v.string(),
  },
  handler: async (
    ctx: any,
    { id, title, content }: { id: Id<"notes">; title: string; content: string }
  ): Promise<void> => {
    const prompt = `Take in the following note and return a summary: Title: ${title}, Note content: ${content}`;

    const huggingfaceKey = process.env.HUGGINGFACE_API_KEY;
    const cohereKey = process.env.COHERE_API_KEY;
    
    if (!huggingfaceKey && !cohereKey) {
      const error = missingEnvVariableUrl(
        "HUGGINGFACE_API_KEY or COHERE_API_KEY",
        "https://huggingface.co/settings/tokens or https://cohere.ai/",
      );
      console.error(error);
      await ctx.runMutation(internal.openai.saveSummary, {
        id: id,
        summary: error,
      });
      return;
    }

    try {
      // Try Cohere first, then Hugging Face
      if (cohereKey) {
        console.log("Trying Cohere API...");
        const response = await fetch(
          "https://api.cohere.ai/v1/generate",
          {
            headers: {
              Authorization: `Bearer ${cohereKey}`,
              "Content-Type": "application/json",
            },
            method: "POST",
            body: JSON.stringify({
              model: "command",
              prompt: prompt,
              max_tokens: 500,
              temperature: 0.7,
              k: 0,
              stop_sequences: [],
              return_likelihoods: "NONE",
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const messageContent = data.generations?.[0]?.text || "No summary generated.";
          await ctx.runMutation(internal.openai.saveSummary, {
            id: id,
            summary: messageContent,
          });
          return;
        }
      }

      // Fallback to Hugging Face
      if (huggingfaceKey) {
        console.log("Trying Hugging Face API...");
        const response = await fetch(
          "https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium",
          {
            headers: {
              Authorization: `Bearer ${huggingfaceKey}`,
              "Content-Type": "application/json",
            },
            method: "POST",
            body: JSON.stringify({
              inputs: prompt,
              parameters: {
                max_length: 500,
                temperature: 0.7,
              },
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Hugging Face API error: ${response.status}`);
        }

        const data = await response.json();
        const messageContent = data[0]?.generated_text || "No summary generated.";

        await ctx.runMutation(internal.openai.saveSummary, {
          id: id,
          summary: messageContent,
        });
      }
    } catch (error) {
      console.error("AI API error:", error);
      await ctx.runMutation(internal.openai.saveSummary, {
        id: id,
        summary: "Error generating summary.",
      });
    }
  },
});

export const saveSummary = internalMutation({
  args: {
    id: v.id("notes"),
    summary: v.string(),
  },
  handler: async (
    ctx: any,
    { id, summary }: { id: Id<"notes">; summary: string }
  ): Promise<void> => {
    await ctx.db.patch(id, {
      summary: summary,
    });
  },
});

export const suggestItinerary = action({
  args: {
    tripId: v.id("trips"),
  },
  handler: async (
    ctx: any,
    { tripId }: { tripId: Id<"trips"> }
  ): Promise<string> => {
    // Fetch trip details
    const trip: Doc<"trips"> | null = await ctx.runQuery((internal as any).trips.get, { tripId });
    if (!trip) {
      throw new Error("Trip not found");
    }
    // Fetch destinations for the trip
    const destinations: Doc<"destinations">[] = await ctx.runQuery((internal as any).destinations.listByTrip, { tripId });
    
    // Calculate trip duration
    const startDate = new Date(trip.startDate);
    const endDate = new Date(trip.endDate);
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Generate itinerary using templates
    let itinerary = `# ${trip.name} - Suggested Itinerary\n\n`;
    itinerary += `**Trip Duration:** ${daysDiff} days\n`;
    itinerary += `**Start Date:** ${trip.startDate}\n`;
    itinerary += `**End Date:** ${trip.endDate}\n\n`;
    
    if (trip.description) {
      itinerary += `**Trip Description:** ${trip.description}\n\n`;
    }
    
    if (destinations.length > 0) {
      itinerary += `## Destinations\n\n`;
      destinations.forEach((dest, index) => {
        itinerary += `${index + 1}. **${dest.name}** (${dest.location})\n`;
        itinerary += `   - Arrival: ${dest.arrivalDate}\n`;
        itinerary += `   - Departure: ${dest.departureDate}\n\n`;
      });
    }
    
    // Generate day-by-day itinerary
    itinerary += `## Day-by-Day Itinerary\n\n`;
    
    // Research-based activity templates by destination type
    const destinationActivities = {
      city: {
        morning: [
          "Breakfast at a local café or bakery",
          "Visit the main square or downtown area",
          "Explore the historic district",
          "Take a morning walking tour"
        ],
        afternoon: [
          "Visit museums and cultural sites",
          "Shop at local markets or boutiques",
          "Try local cuisine at popular restaurants",
          "Explore parks and public spaces"
        ],
        evening: [
          "Dinner at a recommended local restaurant",
          "Attend cultural events or performances",
          "Explore the nightlife scene",
          "Take evening photos of landmarks"
        ]
      },
      beach: {
        morning: [
          "Sunrise beach walk",
          "Breakfast with ocean views",
          "Morning swim or water activities",
          "Beach yoga or meditation"
        ],
        afternoon: [
          "Beach relaxation and sunbathing",
          "Water sports (snorkeling, kayaking)",
          "Beachside lunch",
          "Explore coastal trails"
        ],
        evening: [
          "Sunset viewing",
          "Beachside dinner",
          "Stargazing on the beach",
          "Evening beach bonfire (if available)"
        ]
      },
      mountain: {
        morning: [
          "Early morning hike",
          "Breakfast with mountain views",
          "Wildlife watching",
          "Photography of scenic landscapes"
        ],
        afternoon: [
          "Mountain biking or hiking",
          "Visit mountain villages",
          "Local mountain cuisine",
          "Adventure activities"
        ],
        evening: [
          "Mountain sunset viewing",
          "Cozy mountain lodge dinner",
          "Stargazing in clear mountain air",
          "Relaxation by the fireplace"
        ]
      },
      cultural: {
        morning: [
          "Visit historical sites and monuments",
          "Guided cultural tour",
          "Traditional breakfast experience",
          "Explore ancient architecture"
        ],
        afternoon: [
          "Museum visits",
          "Cultural workshops or classes",
          "Traditional lunch experience",
          "Local artisan visits"
        ],
        evening: [
          "Traditional dinner experience",
          "Cultural performances",
          "Local storytelling sessions",
          "Evening cultural walks"
        ]
      }
    };

    // Special activities by destination type
    const specialActivitiesByType = {
      city: [
        "Take a guided walking tour of historic sites",
        "Visit the top-rated museums and galleries",
        "Experience the local food scene with a food tour",
        "Attend a local festival or event",
        "Explore hidden neighborhoods and local spots",
        "Take a photography tour of iconic landmarks"
      ],
      beach: [
        "Go snorkeling or scuba diving",
        "Take a boat tour or fishing trip",
        "Try water sports like surfing or paddleboarding",
        "Visit nearby islands or coastal attractions",
        "Experience local beach culture and traditions",
        "Take a sunset cruise"
      ],
      mountain: [
        "Go on a guided mountain trek",
        "Try rock climbing or rappelling",
        "Visit mountain villages and meet locals",
        "Experience local mountain cuisine",
        "Take a scenic cable car or gondola ride",
        "Go wildlife spotting with a guide"
      ],
      cultural: [
        "Participate in traditional ceremonies",
        "Learn local crafts or skills",
        "Attend cultural workshops",
        "Visit sacred sites and temples",
        "Experience traditional music and dance",
        "Learn about local history and legends"
      ]
    };
    
    for (let day = 1; day <= Math.min(daysDiff, 14); day++) { // Limit to 14 days for readability
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + day - 1);
      const dateStr = currentDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      itinerary += `### Day ${day}: ${dateStr}\n\n`;
      
      // Determine destination type and get appropriate activities
      let destType = 'city'; // default
      if (destinations.length > 0) {
        const destIndex = Math.min(day - 1, destinations.length - 1);
        const destination = destinations[destIndex];
        const location = destination.location.toLowerCase();
        
        // Simple logic to determine destination type
        if (location.includes('beach') || location.includes('coast') || location.includes('island')) {
          destType = 'beach';
        } else if (location.includes('mountain') || location.includes('alps') || location.includes('peak')) {
          destType = 'mountain';
        } else if (location.includes('temple') || location.includes('ancient') || location.includes('historic')) {
          destType = 'cultural';
        }
      }
      
      const dayActivities = destinationActivities[destType as keyof typeof destinationActivities];
      const specialActivities = specialActivitiesByType[destType as keyof typeof specialActivitiesByType];
      
      // Add morning activities
      itinerary += `**Morning:**\n`;
      const morningActivity = dayActivities.morning[Math.floor(Math.random() * dayActivities.morning.length)];
      itinerary += `- ${morningActivity}\n\n`;
      
      // Add afternoon activities
      itinerary += `**Afternoon:**\n`;
      const afternoonActivity = dayActivities.afternoon[Math.floor(Math.random() * dayActivities.afternoon.length)];
      itinerary += `- ${afternoonActivity}\n\n`;
      
      // Add evening activities
      itinerary += `**Evening:**\n`;
      const eveningActivity = dayActivities.evening[Math.floor(Math.random() * dayActivities.evening.length)];
      itinerary += `- ${eveningActivity}\n\n`;
      
      // Add a special activity
      const specialActivity = specialActivities[Math.floor(Math.random() * specialActivities.length)];
      itinerary += `**Special Experience:**\n`;
      itinerary += `- ${specialActivity}\n\n`;
      
      // Add destination-specific suggestions if available
      if (destinations.length > 0) {
        const destIndex = Math.min(day - 1, destinations.length - 1);
        const destination = destinations[destIndex];
        itinerary += `**${destination.name} Highlights:**\n`;
        itinerary += `- Explore the unique culture of ${destination.location}\n`;
        itinerary += `- Discover local hidden gems and authentic experiences\n`;
        itinerary += `- Immerse yourself in the local atmosphere and traditions\n\n`;
      }
    }
    
    if (daysDiff > 14) {
      itinerary += `### Remaining Days\n\n`;
      itinerary += `For the remaining ${daysDiff - 14} days, consider:\n`;
      itinerary += `- Taking day trips to nearby attractions\n`;
      itinerary += `- Relaxing and enjoying the local pace of life\n`;
      itinerary += `- Exploring off-the-beaten-path locations\n`;
      itinerary += `- Trying new activities and experiences\n\n`;
    }
    
    itinerary += `## Travel Tips\n\n`;
    itinerary += `- **Packing:** Pack according to the weather and activities planned\n`;
    itinerary += `- **Transportation:** Research local transportation options\n`;
    itinerary += `- **Budget:** Set aside extra funds for unexpected expenses\n`;
    itinerary += `- **Safety:** Keep important documents and emergency contacts handy\n`;
    itinerary += `- **Flexibility:** Be open to changing plans based on local recommendations\n\n`;
    
    itinerary += `*This itinerary is a starting point. Feel free to customize it based on your interests and local recommendations!*`;
    
    return itinerary;
  },
});
