"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { Button } from "@/components/common/button";
import { Plus, MapPin, Calendar, Users } from "lucide-react";
import Link from "next/link";
import { Doc } from "../../../convex/_generated/dataModel";
import Header from "@/components/Header";
import { SignInButton } from "@clerk/nextjs";
import ReactMarkdown from "react-markdown";

export default function TripsDashboard() {
  const { user, isLoaded, isSignedIn } = useUser();
  console.log("Clerk user:", user);
  const [isCreating, setIsCreating] = useState(false);
  const [newTripId, setNewTripId] = useState<string | null>(null);
  
  const getOrCreateUser = useMutation(api.trips.getOrCreateUser);
  const [convexUserId, setConvexUserId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      getOrCreateUser({
        clerkId: user.id,
        name: user.fullName || user.firstName || "User",
        email: user.emailAddresses?.[0]?.emailAddress || "",
      }).then(convexUser => setConvexUserId(convexUser._id));
    }
  }, [user, getOrCreateUser]);

  // Only query trips when we have a valid Convex user ID
  const trips = useQuery(
    api.trips.list,
    convexUserId ? { userId: convexUserId } : "skip"
  );

  if (!isLoaded) return <div>Loading...</div>;
  if (!isSignedIn) return <SignInButton />;
  if (!user) return <div>Sign in required</div>;
  if (!convexUserId) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Trips</h1>
            <p className="text-gray-600 mt-2">Plan and organize your adventures</p>
          </div>
          <Button 
            onClick={() => setIsCreating(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Trip
          </Button>
        </div>

        {/* Trips Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips?.map((trip: Doc<"trips">) => (
            <Link 
              key={trip._id} 
              href={`/trips/${trip._id}`}
              className="block"
            >
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">{trip.name}</h3>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {trip.ownerId === user.id ? "Owner" : "Collaborator"}
                  </span>
                </div>
                
                {trip.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {trip.description}
                  </p>
                )}
                
                <div className="space-y-2 text-sm text-gray-500">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>
                      {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-2" />
                    <span>{trip.collaborators.length + 1} people</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Empty State */}
        {trips && trips.length === 0 && (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <MapPin className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No trips yet</h3>
            <p className="text-gray-600 mb-6">Start planning your next adventure by creating your first trip.</p>
            <Button 
              onClick={() => setIsCreating(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Trip
            </Button>
          </div>
        )}

        {/* Create Trip Modal */}
        {isCreating && (
          <CreateTripModal 
            onClose={() => setIsCreating(false)}
            onCreated={(tripId: string) => setNewTripId(tripId)}
            userId={user.id}
            userName={user.fullName || user.firstName || "User"}
            userEmail={user.emailAddresses?.[0]?.emailAddress || ""}
          />
        )}
        {newTripId && (
          <AISuggestItineraryModal 
            tripId={newTripId}
            onClose={() => setNewTripId(null)}
          />
        )}
      </div>
    </div>
  );
}

// Create Trip Modal Component
function CreateTripModal({ onClose, onCreated, userId, userName, userEmail }: { onClose: () => void; onCreated: (tripId: string) => void; userId: string; userName: string; userEmail: string }) {
  const [formData, setFormData] = useState({
    name: "",
    startDate: "",
    endDate: "",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createTrip = useMutation(api.trips.create);
  const getOrCreateUser = useMutation(api.trips.getOrCreateUser);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Get or create Convex user document
      const convexUser = await getOrCreateUser({
        clerkId: userId,
        name: userName,
        email: userEmail,
      });
      // Use Convex user _id as ownerId
      const tripId = await createTrip({
        name: formData.name,
        startDate: formData.startDate,
        endDate: formData.endDate,
        description: formData.description,
        ownerId: convexUser._id,
      });
      onClose();
      onCreated(tripId); // Pass the new trip ID up
    } catch (error) {
      console.error("Error creating trip:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-semibold mb-4">Create New Trip</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trip Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Summer Vacation 2024"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Tell us about your trip..."
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? "Creating..." : "Create Trip"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 

// Add the AI Suggest Itinerary Modal
function AISuggestItineraryModal({ tripId, onClose }: { tripId: string; onClose: () => void }) {
  const [itinerary, setItinerary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const suggestItinerary = useAction(api.openai.suggestItinerary);

  const handleSuggest = async () => {
    setLoading(true);
    setItinerary(null);
    try {
      const result = await suggestItinerary({ tripId });
      setItinerary(result);
    } catch (err) {
      setItinerary("Error generating itinerary.");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
        <h2 className="text-xl font-semibold mb-4">AI Itinerary Suggestion</h2>
        <button
          onClick={handleSuggest}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          {loading ? "Generating..." : "Suggest Full Itinerary with AI"}
        </button>
        {itinerary && (
          <div className="mt-4 max-h-96 overflow-y-auto border p-2 rounded bg-gray-50">
            <ReactMarkdown>{itinerary}</ReactMarkdown>
          </div>
        )}
        <button
          onClick={onClose}
          className="mt-4 text-gray-600 hover:text-gray-900 underline"
        >
          Close
        </button>
      </div>
    </div>
  );
} 