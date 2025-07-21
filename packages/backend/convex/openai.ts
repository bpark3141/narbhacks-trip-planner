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

export const categorizeExpense = action({
  args: {
    description: v.string(),
    amount: v.number(),
  },
  handler: async (
    ctx: any,
    { description, amount }: { description: string; amount: number }
  ): Promise<string> => {
    // Token-efficient categorization using keyword matching
    const desc = description.toLowerCase();
    
    // Food & Dining
    if (desc.includes('restaurant') || desc.includes('cafe') || desc.includes('food') || 
        desc.includes('meal') || desc.includes('dinner') || desc.includes('lunch') || 
        desc.includes('breakfast') || desc.includes('pizza') || desc.includes('burger') ||
        desc.includes('coffee') || desc.includes('bar') || desc.includes('pub')) {
      return 'Food & Dining';
    }
    
    // Transportation
    if (desc.includes('taxi') || desc.includes('uber') || desc.includes('lyft') || 
        desc.includes('bus') || desc.includes('train') || desc.includes('metro') || 
        desc.includes('subway') || desc.includes('airport') || desc.includes('flight') ||
        desc.includes('car') || desc.includes('gas') || desc.includes('fuel') ||
        desc.includes('parking') || desc.includes('rental')) {
      return 'Transportation';
    }
    
    // Accommodation
    if (desc.includes('hotel') || desc.includes('hostel') || desc.includes('bnb') || 
        desc.includes('airbnb') || desc.includes('resort') || desc.includes('lodge') ||
        desc.includes('room') || desc.includes('accommodation') || desc.includes('stay')) {
      return 'Accommodation';
    }
    
    // Activities & Entertainment
    if (desc.includes('museum') || desc.includes('tour') || desc.includes('ticket') || 
        desc.includes('show') || desc.includes('concert') || desc.includes('movie') ||
        desc.includes('activity') || desc.includes('adventure') || desc.includes('sport') ||
        desc.includes('gym') || desc.includes('spa') || desc.includes('massage')) {
      return 'Activities & Entertainment';
    }
    
    // Shopping
    if (desc.includes('shop') || desc.includes('store') || desc.includes('mall') || 
        desc.includes('market') || desc.includes('souvenir') || desc.includes('gift') ||
        desc.includes('clothing') || desc.includes('shoes') || desc.includes('bag')) {
      return 'Shopping';
    }
    
    // Health & Medical
    if (desc.includes('pharmacy') || desc.includes('medicine') || desc.includes('doctor') ||
        desc.includes('hospital') || desc.includes('medical') || desc.includes('health')) {
      return 'Health & Medical';
    }
    
    // Default category
    return 'Other';
  },
});

export const detectTripType = action({
  args: {
    tripId: v.id("trips"),
  },
  handler: async (
    ctx: any,
    { tripId }: { tripId: Id<"trips"> }
  ): Promise<{ type: string; confidence: number; suggestions: string[] }> => {
    // Fetch trip details
    const trip: Doc<"trips"> | null = await ctx.runQuery((internal as any).trips.get, { tripId });
    if (!trip) {
      throw new Error("Trip not found");
    }
    
    // Fetch destinations
    const destinations: Doc<"destinations">[] = await ctx.runQuery((internal as any).destinations.listByTrip, { tripId });
    
    // Analyze trip characteristics
    const name = trip.name.toLowerCase();
    const description = (trip.description || '').toLowerCase();
    const locations = destinations.map(d => d.location.toLowerCase()).join(' ');
    const allText = `${name} ${description} ${locations}`;
    
    // Business trip indicators
    const businessKeywords = ['business', 'meeting', 'conference', 'work', 'client', 'office', 'corporate'];
    const businessScore = businessKeywords.filter(keyword => allText.includes(keyword)).length;
    
    // Adventure trip indicators
    const adventureKeywords = ['hiking', 'climbing', 'adventure', 'trek', 'mountain', 'camping', 'outdoor', 'wilderness'];
    const adventureScore = adventureKeywords.filter(keyword => allText.includes(keyword)).length;
    
    // Beach/Relaxation trip indicators
    const beachKeywords = ['beach', 'island', 'coast', 'ocean', 'sea', 'resort', 'relax', 'vacation', 'tropical'];
    const beachScore = beachKeywords.filter(keyword => allText.includes(keyword)).length;
    
    // Cultural trip indicators
    const culturalKeywords = ['museum', 'temple', 'historic', 'cultural', 'heritage', 'ancient', 'traditional'];
    const culturalScore = culturalKeywords.filter(keyword => allText.includes(keyword)).length;
    
    // Determine trip type
    const scores = [
      { type: 'Business', score: businessScore },
      { type: 'Adventure', score: adventureScore },
      { type: 'Beach/Relaxation', score: beachScore },
      { type: 'Cultural', score: culturalScore }
    ];
    
    scores.sort((a, b) => b.score - a.score);
    const primaryType = scores[0];
    const secondaryType = scores[1];
    
    // Calculate confidence
    const totalScore = scores.reduce((sum, s) => sum + s.score, 0);
    const confidence = totalScore > 0 ? primaryType.score / totalScore : 0.25;
    
    // Generate suggestions based on trip type
    const suggestions = getTripTypeSuggestions(primaryType.type, destinations);
    
    return {
      type: primaryType.score > 0 ? primaryType.type : 'General',
      confidence: Math.round(confidence * 100),
      suggestions
    };
  },
});

function getTripTypeSuggestions(tripType: string, destinations: Doc<"destinations">[]): string[] {
  const suggestions: { [key: string]: string[] } = {
    'Business': [
      'Pack professional attire',
      'Bring business cards',
      'Research local business customs',
      'Book meeting rooms in advance',
      'Plan networking opportunities'
    ],
    'Adventure': [
      'Pack appropriate gear and clothing',
      'Check weather conditions',
      'Research local safety guidelines',
      'Book guided tours for safety',
      'Bring first aid supplies'
    ],
    'Beach/Relaxation': [
      'Pack beach essentials (sunscreen, towel)',
      'Book beachfront accommodations',
      'Research water activities',
      'Plan for sunset viewing',
      'Pack light, comfortable clothing'
    ],
    'Cultural': [
      'Research local customs and etiquette',
      'Book guided cultural tours',
      'Learn basic local phrases',
      'Respect dress codes for religious sites',
      'Plan visits to museums and historical sites'
    ],
    'General': [
      'Check local weather forecast',
      'Research local transportation',
      'Learn about local customs',
      'Plan for flexible itinerary',
      'Pack according to activities'
    ]
  };
  
  return suggestions[tripType] || suggestions['General'];
}

export const generateTripSummary = action({
  args: {
    tripId: v.id("trips"),
  },
  handler: async (
    ctx: any,
    { tripId }: { tripId: Id<"trips"> }
  ): Promise<string> => {
    // Fetch trip data
    const trip: Doc<"trips"> | null = await ctx.runQuery((internal as any).trips.get, { tripId });
    if (!trip) {
      throw new Error("Trip not found");
    }
    
    const destinations: Doc<"destinations">[] = await ctx.runQuery((internal as any).destinations.listByTrip, { tripId });
    const itinerary: Doc<"itinerary_items">[] = await ctx.runQuery((internal as any).itinerary.listByTrip, { tripId });
    const expenses: Doc<"expenses">[] = await ctx.runQuery((internal as any).expenses.listByTrip, { tripId });
    const notes: Doc<"notes">[] = await ctx.runQuery((internal as any).notes.listByTrip, { tripId });
    
    // Calculate trip duration
    const startDate = new Date(trip.startDate);
    const endDate = new Date(trip.endDate);
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate total expenses
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    // Generate summary
    let summary = `# ${trip.name} - Trip Summary\n\n`;
    
    summary += `## Trip Overview\n`;
    summary += `- **Duration:** ${daysDiff} days\n`;
    summary += `- **Start Date:** ${trip.startDate}\n`;
    summary += `- **End Date:** ${trip.endDate}\n`;
    summary += `- **Total Expenses:** $${totalExpenses.toFixed(2)}\n\n`;
    
    if (trip.description) {
      summary += `**Description:** ${trip.description}\n\n`;
    }
    
    if (destinations.length > 0) {
      summary += `## Destinations (${destinations.length})\n`;
      destinations.forEach((dest, index) => {
        summary += `${index + 1}. **${dest.name}** - ${dest.location}\n`;
        summary += `   - Arrival: ${dest.arrivalDate}\n`;
        summary += `   - Departure: ${dest.departureDate}\n`;
      });
      summary += `\n`;
    }
    
    if (itinerary.length > 0) {
      summary += `## Planned Activities (${itinerary.length})\n`;
      const uniqueActivities = Array.from(new Set(itinerary.map(item => item.title)));
      uniqueActivities.slice(0, 5).forEach(activity => {
        summary += `- ${activity}\n`;
      });
      if (uniqueActivities.length > 5) {
        summary += `- ... and ${uniqueActivities.length - 5} more activities\n`;
      }
      summary += `\n`;
    }
    
    if (expenses.length > 0) {
      summary += `## Expenses\n`;
      summary += `- **Total Expenses:** $${totalExpenses.toFixed(2)}\n`;
      summary += `- **Number of Expenses:** ${expenses.length}\n`;
      summary += `- **Average per Expense:** $${(totalExpenses / expenses.length).toFixed(2)}\n\n`;
    }
    
    if (notes.length > 0) {
      summary += `## Notes & Reminders (${notes.length})\n`;
      notes.slice(0, 3).forEach(note => {
        summary += `- **${note.title}:** ${note.content.substring(0, 100)}${note.content.length > 100 ? '...' : ''}\n`;
      });
      if (notes.length > 3) {
        summary += `- ... and ${notes.length - 3} more notes\n`;
      }
      summary += `\n`;
    }
    
    summary += `## Key Highlights\n`;
    summary += `- Trip spans ${daysDiff} days across ${destinations.length} destinations\n`;
    summary += `- ${itinerary.length} planned activities and experiences\n`;
    summary += `- Total budget of $${totalExpenses.toFixed(2)} for the trip\n`;
    summary += `- ${notes.length} important notes and reminders captured\n\n`;
    
    summary += `*This summary was generated automatically based on your trip data.*`;
    
    return summary;
  },
});

export const getWeatherSuggestions = action({
  args: {
    location: v.string(),
    date: v.string(),
  },
  handler: async (
    ctx: any,
    { location, date }: { location: string; date: string }
  ): Promise<string[]> => {
    // Simple weather-based suggestions without API calls
    // This is a token-efficient approach using location and date patterns
    
    const month = new Date(date).getMonth() + 1; // 1-12
    const locationLower = location.toLowerCase();
    
    const suggestions: string[] = [];
    
    // Seasonal suggestions
    if (month >= 12 || month <= 2) {
      suggestions.push('Pack warm clothing and layers');
      suggestions.push('Check for winter weather advisories');
      suggestions.push('Consider indoor activity alternatives');
    } else if (month >= 3 && month <= 5) {
      suggestions.push('Pack light layers for spring weather');
      suggestions.push('Bring rain gear for spring showers');
      suggestions.push('Plan for blooming season activities');
    } else if (month >= 6 && month <= 8) {
      suggestions.push('Pack summer clothing and sun protection');
      suggestions.push('Stay hydrated during outdoor activities');
      suggestions.push('Plan for peak tourist season');
    } else if (month >= 9 && month <= 11) {
      suggestions.push('Pack comfortable layers for fall weather');
      suggestions.push('Enjoy fall foliage and seasonal activities');
      suggestions.push('Plan for cooler evenings');
    }
    
    // Location-based suggestions
    if (locationLower.includes('beach') || locationLower.includes('coast') || locationLower.includes('island')) {
      suggestions.push('Check tide schedules for beach activities');
      suggestions.push('Pack beach essentials and water protection');
      suggestions.push('Research local marine weather conditions');
    } else if (locationLower.includes('mountain') || locationLower.includes('alps')) {
      suggestions.push('Check mountain weather and trail conditions');
      suggestions.push('Pack appropriate hiking gear');
      suggestions.push('Be prepared for altitude changes');
    } else if (locationLower.includes('desert')) {
      suggestions.push('Pack extra water and sun protection');
      suggestions.push('Plan activities for cooler morning/evening hours');
      suggestions.push('Check for extreme temperature warnings');
    }
    
    // General weather tips
    suggestions.push('Check local weather forecast before departure');
    suggestions.push('Pack versatile clothing for changing conditions');
    suggestions.push('Have backup plans for outdoor activities');
    
    return suggestions.slice(0, 5); // Limit to 5 suggestions
  },
});

// Rule-based itinerary suggestion engine
export const ruleBasedItinerary = action({
  args: { tripId: v.id("trips") },
  handler: async (ctx, { tripId }) => {
    // Fetch trip and related data
    const trip = await ctx.runQuery((internal as any).trips.get, { tripId });
    if (!trip) throw new Error("Trip not found");
    const destinations = await ctx.runQuery((internal as any).destinations.listByTrip, { tripId });
    const startDate = new Date(trip.startDate);
    const endDate = new Date(trip.endDate);
    const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    const month = startDate.getMonth() + 1;
    const tripType = trip.type || "General";

    // Example rules for destinations
    const destinationRules: Record<string, string[]> = {
      "Paris": [
        "Visit the Eiffel Tower and stroll along the Seine.",
        "Explore the Louvre and try French pastries in Le Marais.",
        "Take a day trip to Versailles.",
      ],
      "Tokyo": [
        "Explore Shibuya and visit Senso-ji Temple.",
        "Try sushi at Tsukiji Market and see the Meiji Shrine.",
        "Take a day trip to Mt. Fuji or Nikko.",
      ],
      "New York": [
        "See Times Square and Central Park.",
        "Visit the Metropolitan Museum of Art and walk the High Line.",
        "Take a ferry to the Statue of Liberty.",
      ],
    };

    // Example rules for seasons
    const seasonRules: Record<string, string[]> = {
      "summer": ["Enjoy outdoor cafes and festivals.", "Pack sunscreen and light clothing.", "Look for open-air concerts.",],
      "winter": ["Visit indoor attractions and museums.", "Pack warm clothes and check for holiday events.", "Try local winter foods.",],
      "spring": ["See local gardens and parks in bloom.", "Enjoy mild weather for walking tours.",],
      "fall": ["Experience fall foliage in parks.", "Try seasonal foods and drinks.",],
    };

    // Example rules for trip types
    const typeRules: Record<string, string[]> = {
      "Adventure": ["Book a local hiking or biking tour.", "Try a water sport or outdoor activity."],
      "Cultural": ["Visit museums and attend a local performance.", "Explore historic neighborhoods."],
      "Relaxation": ["Schedule a spa day or beach afternoon.", "Enjoy slow meals at local restaurants."],
      "General": ["Mix sightseeing with local food experiences.", "Leave time for spontaneous exploring."]
    };

    // Helper to get season
    function getSeason(month: number) {
      if ([12,1,2].includes(month)) return "winter";
      if ([3,4,5].includes(month)) return "spring";
      if ([6,7,8].includes(month)) return "summer";
      return "fall";
    }

    // Build itinerary
    let suggestions: string[] = [];
    for (let i = 0; i < days; i++) {
      const dest = destinations[i % destinations.length]?.name || destinations[0]?.name || "your destination";
      // Destination-based
      let daySuggestions = destinationRules[dest] || [
        `Explore top sights in ${dest}.`,
        "Try local cuisine and visit a museum.",
        "Take a walking tour or visit a park.",
      ];
      // Season-based
      const season = getSeason(month);
      const seasonSuggestion = seasonRules[season][i % seasonRules[season].length];
      // Type-based
      const typeSuggestion = typeRules[tripType] ? typeRules[tripType][i % typeRules[tripType].length] : typeRules["General"][i % typeRules["General"].length];
      // Compose
      suggestions.push(`Day ${i+1}: ${daySuggestions[i % daySuggestions.length]} ${seasonSuggestion} ${typeSuggestion}`);
    }
    return suggestions;
  }
});
