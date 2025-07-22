"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";
import { Button } from "@/components/common/button";
import { 
  MapPin, 
  Calendar, 
  Users, 
  Plus, 
  ArrowLeft,
  DollarSign,
  FileText,
  Bell,
  Clock,
  Wand2,
  X,
  Trash2,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import AIItineraryModal from "@/components/trips/AIItineraryModal";
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

type TabType = "overview" | "destinations" | "itinerary" | "expenses" | "notes" | "reminders";

export default function TripDetail() {
  const { id } = useParams();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [isAIItineraryModalOpen, setIsAIItineraryModalOpen] = useState(false);
  
  // Modal states for different add functions
  const [isAddDestinationOpen, setIsAddDestinationOpen] = useState(false);
  const [isAddItineraryOpen, setIsAddItineraryOpen] = useState(false);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [isDeleteTripOpen, setIsDeleteTripOpen] = useState(false);
  
  // AI state
  const [tripType, setTripType] = useState<{ type: string; confidence: number; suggestions: string[] } | null>(null);
  const [weatherSuggestions, setWeatherSuggestions] = useState<string[]>([]);
  const [tripSummary, setTripSummary] = useState<string>("");
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  
  // AI Actions
  const detectTripTypeAction = useAction(api.openai.detectTripType);
  const getWeatherSuggestionsAction = useAction(api.openai.getWeatherSuggestions);
  const generateTripSummaryAction = useAction(api.openai.generateTripSummary);
  
  const trip = useQuery(api.trips.get, { tripId: id as any });
  const destinations = useQuery(api.destinations.listByTrip, { tripId: id as any });
  const itinerary = useQuery(api.itinerary.listByTrip, { tripId: id as any });
  const expenses = useQuery(api.expenses.listByTrip, { tripId: id as any });
  const notes = useQuery(api.notes.listByTrip, { tripId: id as any });
  const reminders = useQuery(api.reminders.listByTrip, { tripId: id as any });

  // AI Functions
  const detectTripType = async () => {
    if (!trip) return;
    
    setIsLoadingAI(true);
    try {
      const result = await detectTripTypeAction({ tripId: trip._id });
      setTripType(result);
    } catch (error) {
      console.error('Error detecting trip type:', error);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const getWeatherSuggestions = async () => {
    if (!trip || !destinations || destinations.length === 0) return;
    
    setIsLoadingAI(true);
    try {
      const suggestions = await getWeatherSuggestionsAction({
        location: destinations[0].location,
        date: trip.startDate
      });
      setWeatherSuggestions(suggestions);
    } catch (error) {
      console.error('Error getting weather suggestions:', error);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const generateTripSummary = async () => {
    if (!trip) return;
    
    setIsLoadingAI(true);
    try {
      const summary = await generateTripSummaryAction({ tripId: trip._id });
      setTripSummary(summary);
      setShowAIModal(true);
    } catch (error) {
      console.error('Error generating trip summary:', error);
    } finally {
      setIsLoadingAI(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please sign in to view this trip</h1>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading trip...</h1>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: MapPin },
    { id: "destinations", label: "Destinations", icon: MapPin },
    { id: "itinerary", label: "Itinerary", icon: Calendar },
    { id: "expenses", label: "Expenses", icon: DollarSign },
    { id: "notes", label: "Notes", icon: FileText },
    { id: "reminders", label: "Reminders", icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/trips"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Trips
          </Link>
          
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{trip.name}</h1>
              {trip.description && (
                <p className="text-gray-600 mt-2">{trip.description}</p>
              )}
              <div className="flex items-center mt-4 space-x-6 text-sm text-gray-500">
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
            
            <div className="flex space-x-3">
              <Button variant="outline">
                <Users className="w-4 h-4 mr-2" />
                Invite
              </Button>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
              <Button 
                variant="outline" 
                className="text-red-600 border-red-600 hover:bg-red-50"
                onClick={() => setIsDeleteTripOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Trip
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Main Content and Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {activeTab === "overview" && (
                <TripOverview 
                  trip={trip}
                  destinations={destinations}
                  itinerary={itinerary}
                  expenses={expenses}
                  notes={notes}
                  reminders={reminders}
                />
              )}
              
              {activeTab === "destinations" && (
                <DestinationsTab 
                  destinations={destinations} 
                  tripId={id as any}
                  onAddDestination={() => setIsAddDestinationOpen(true)}
                />
              )}
              
              {activeTab === "itinerary" && (
                <ItineraryTab 
                  itinerary={itinerary} 
                  tripId={id as any} 
                  onOpenAIModal={() => setIsAIItineraryModalOpen(true)}
                  onAddItem={() => setIsAddItineraryOpen(true)}
                />
              )}
              
              {activeTab === "expenses" && (
                <ExpensesTab 
                  expenses={expenses} 
                  tripId={id as any}
                  onAddExpense={() => setIsAddExpenseOpen(true)}
                />
              )}
              
              {activeTab === "notes" && (
                <NotesTab 
                  notes={notes} 
                  tripId={id as any}
                  onAddNote={() => setIsAddNoteOpen(true)}
                />
              )}
              
              {activeTab === "reminders" && (
                <RemindersTab reminders={reminders} tripId={id as any} />
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* AI Insights Panel */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Sparkles className="w-5 h-5 mr-2 text-purple-600" />
                  AI Insights
                </h3>
              </div>
              
              <div className="space-y-4">
                {/* Trip Type Detection */}
                <div>
                  <button
                    onClick={detectTripType}
                    disabled={isLoadingAI}
                    className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Trip Type</h4>
                        <p className="text-sm text-gray-500">Detect trip category and get suggestions</p>
                      </div>
                      {isLoadingAI ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                      ) : (
                        <Sparkles className="w-4 h-4 text-purple-600" />
                      )}
                    </div>
                  </button>
                  
                  {tripType && (
                    <div className="mt-3 p-3 bg-purple-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-purple-900">{tripType.type}</span>
                        <span className="text-sm text-purple-600">{tripType.confidence}% confidence</span>
                      </div>
                      <ul className="text-sm text-purple-800 space-y-1">
                        {tripType.suggestions.slice(0, 3).map((suggestion, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-purple-500 mr-2">•</span>
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Weather Suggestions */}
                <div>
                  <button
                    onClick={getWeatherSuggestions}
                    disabled={isLoadingAI || !destinations || destinations.length === 0}
                    className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Weather Tips</h4>
                        <p className="text-sm text-gray-500">Get weather-aware packing suggestions</p>
                      </div>
                      {isLoadingAI ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      ) : (
                        <Calendar className="w-4 h-4 text-blue-600" />
                      )}
                    </div>
                  </button>
                  
                  {weatherSuggestions.length > 0 && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <h5 className="font-medium text-blue-900 mb-2">Weather Suggestions:</h5>
                      <ul className="text-sm text-blue-800 space-y-1">
                        {weatherSuggestions.map((suggestion, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-blue-500 mr-2">•</span>
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Generate Summary */}
                <div>
                  <button
                    onClick={generateTripSummary}
                    disabled={isLoadingAI}
                    className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">Trip Summary</h4>
                        <p className="text-sm text-gray-500">Generate comprehensive trip overview</p>
                      </div>
                      {isLoadingAI ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                      ) : (
                        <FileText className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* AI Itinerary Modal */}
      <AIItineraryModal
        isOpen={isAIItineraryModalOpen}
        onClose={() => setIsAIItineraryModalOpen(false)}
        tripId={id as string}
      />

      {/* Add Destination Modal */}
      <AddDestinationModal
        isOpen={isAddDestinationOpen}
        onClose={() => setIsAddDestinationOpen(false)}
        tripId={id as string}
      />

      {/* Add Itinerary Item Modal */}
      <AddItineraryModal
        isOpen={isAddItineraryOpen}
        onClose={() => setIsAddItineraryOpen(false)}
        tripId={id as string}
      />

      {/* Add Expense Modal */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        tripId={id as string}
      />

      {/* Add Note Modal */}
      <AddNoteModal
        isOpen={isAddNoteOpen}
        onClose={() => setIsAddNoteOpen(false)}
        tripId={id as string}
      />

      {/* Delete Trip Confirmation Modal */}
      <DeleteTripModal
        isOpen={isDeleteTripOpen}
        onClose={() => setIsDeleteTripOpen(false)}
        tripId={id as string}
        tripName={trip.name}
      />

      {/* AI Summary Modal */}
      {showAIModal && tripSummary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Trip Summary</h3>
              <button
                onClick={() => setShowAIModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="prose prose-sm max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700">{tripSummary}</pre>
              </div>
            </div>
            <div className="flex justify-end p-6 border-t border-gray-200">
              <button
                onClick={() => setShowAIModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Overview Tab Component
function TripOverview({ trip, destinations, itinerary, expenses, notes, reminders }: any) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center">
            <MapPin className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-blue-600">Destinations</p>
              <p className="text-2xl font-bold text-blue-900">{destinations?.length || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center">
            <Calendar className="w-8 h-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-green-600">Itinerary Items</p>
              <p className="text-2xl font-bold text-green-900">{itinerary?.length || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="flex items-center">
            <DollarSign className="w-8 h-8 text-yellow-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-yellow-600">Total Expenses</p>
              <p className="text-2xl font-bold text-yellow-900">
                ${expenses?.reduce((sum: number, exp: any) => sum + exp.amount, 0) || 0}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center">
            <FileText className="w-8 h-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-purple-600">Notes</p>
              <p className="text-2xl font-bold text-purple-900">{notes?.length || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {destinations?.slice(0, 3).map((dest: any) => (
            <div key={dest._id} className="flex items-center text-sm text-gray-600">
              <MapPin className="w-4 h-4 mr-2 text-blue-500" />
              <span>Added destination: {dest.name}</span>
            </div>
          ))}
          {itinerary?.slice(0, 3).map((item: any) => (
            <div key={item._id} className="flex items-center text-sm text-gray-600">
              <Clock className="w-4 h-4 mr-2 text-green-500" />
              <span>Added itinerary item: {item.title}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Destinations Tab Component
function DestinationsTab({ destinations, tripId, onAddDestination }: any) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">Destinations</h3>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={onAddDestination}>
          <Plus className="w-4 h-4 mr-2" />
          Add Destination
        </Button>
      </div>
      
      <div className="space-y-4">
        {destinations?.map((dest: any) => (
          <div key={dest._id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold text-lg">{dest.name}</h4>
                <p className="text-gray-600">{dest.location}</p>
                <div className="flex items-center mt-2 text-sm text-gray-500">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>
                    {new Date(dest.arrivalDate).toLocaleDateString()} - {new Date(dest.departureDate).toLocaleDateString()}
                  </span>
                </div>
                {dest.notes && (
                  <p className="text-gray-600 mt-2 text-sm">{dest.notes}</p>
                )}
              </div>
              <Button variant="outline" size="sm">
                Edit
              </Button>
            </div>
          </div>
        ))}
        
        {(!destinations || destinations.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No destinations added yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Itinerary Tab Component
function isError(err: unknown): err is Error {
  return (
    typeof err === 'object' &&
    err !== null &&
    'message' in err &&
    typeof (err as { message?: unknown }).message === 'string'
  );
}

function ItineraryTab({ itinerary, tripId, onOpenAIModal, onAddItem }: any) {
  const [items, setItems] = useState(() =>
    (itinerary || []).slice().sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
  );
  const updateItineraryItem = useMutation(api.itinerary.update);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [editFields, setEditFields] = useState<any>({});

  useEffect(() => {
    setItems((itinerary || []).slice().sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)));
  }, [itinerary]);

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const reordered: any[] = Array.from(items);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    setItems(reordered);
    for (let i = 0; i < reordered.length; i++) {
      if (reordered[i].order !== i) {
        try {
          await updateItineraryItem({
            itemId: reordered[i]._id,
            order: i,
          });
        } catch (err) {
          console.error((err as any)?.message || 'Unknown error updating itinerary item order');
        }
      }
    }
  };

  const handleEditClick = (item: any) => {
    setEditingItem(item);
    setEditFields({
      title: item.title || '',
      description: item.description || '',
      date: item.date ? item.date.split('T')[0] : '',
      time: item.time || '',
      location: item.location || '',
    });
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEditFields({ ...editFields, [e.target.name]: e.target.value });
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    await updateItineraryItem({
      itemId: editingItem._id,
      ...editFields,
    });
    setEditingItem(null);
    setEditFields({});
  };

  const handleEditCancel = () => {
    setEditingItem(null);
    setEditFields({});
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">Itinerary</h3>
        <div className="flex space-x-3">
          <Button 
            onClick={onOpenAIModal}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Wand2 className="w-4 h-4 mr-2" />
            Get AI Itinerary
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={onAddItem}>
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="itinerary-list">
          {(provided) => (
            <div className="space-y-4" ref={provided.innerRef} {...provided.droppableProps}>
              {items.map((item: any, index: number) => (
                <Draggable key={item._id} draggableId={item._id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`border border-gray-200 rounded-lg p-4 bg-white ${snapshot.isDragging ? 'shadow-lg' : ''}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          {editingItem?._id === item._id ? (
                            <form onSubmit={handleEditSave} className="space-y-2">
                              <input
                                type="text"
                                name="title"
                                value={editFields.title}
                                onChange={handleEditChange}
                                className="w-full px-2 py-1 border rounded"
                                placeholder="Title"
                              />
                              <textarea
                                name="description"
                                value={editFields.description}
                                onChange={handleEditChange}
                                className="w-full px-2 py-1 border rounded"
                                placeholder="Description"
                              />
                              <input
                                type="date"
                                name="date"
                                value={editFields.date}
                                onChange={handleEditChange}
                                className="w-full px-2 py-1 border rounded"
                              />
                              <input
                                type="text"
                                name="time"
                                value={editFields.time}
                                onChange={handleEditChange}
                                className="w-full px-2 py-1 border rounded"
                                placeholder="Time"
                              />
                              <input
                                type="text"
                                name="location"
                                value={editFields.location}
                                onChange={handleEditChange}
                                className="w-full px-2 py-1 border rounded"
                                placeholder="Location"
                              />
                              <div className="flex space-x-2 mt-2">
                                <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white">Save</Button>
                                <Button type="button" variant="outline" onClick={handleEditCancel}>Cancel</Button>
                              </div>
                            </form>
                          ) : (
                            <>
                              <h4 className="font-semibold text-lg">{item.title}</h4>
                              <div className="flex items-center mt-1 text-sm text-gray-500">
                                <Calendar className="w-4 h-4 mr-2" />
                                <span>{new Date(item.date).toLocaleDateString()}</span>
                                {item.time && (
                                  <>
                                    <Clock className="w-4 h-4 ml-4 mr-2" />
                                    <span>{item.time}</span>
                                  </>
                                )}
                              </div>
                              {item.location && (
                                <div className="flex items-center mt-1 text-sm text-gray-500">
                                  <MapPin className="w-4 h-4 mr-2" />
                                  <span>{item.location}</span>
                                </div>
                              )}
                              {item.description && (
                                <p className="text-gray-600 mt-2 text-sm">{item.description}</p>
                              )}
                            </>
                          )}
                        </div>
                        {editingItem?._id === item._id ? null : (
                          <Button variant="outline" size="sm" onClick={() => handleEditClick(item)}>
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
              {(!items || items.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No itinerary items added yet</p>
                </div>
              )}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}

// Expenses Tab Component
function ExpensesTab({ expenses, tripId, onAddExpense }: any) {
  const total = expenses?.reduce((sum: number, exp: any) => sum + exp.amount, 0) || 0;
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold">Expenses</h3>
          <p className="text-gray-600">Total: ${total}</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={onAddExpense}>
          <Plus className="w-4 h-4 mr-2" />
          Add Expense
        </Button>
      </div>
      
      <div className="space-y-4">
        {expenses?.map((expense: any) => (
          <div key={expense._id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold text-lg">{expense.description}</h4>
                <p className="text-2xl font-bold text-green-600">${expense.amount}</p>
                <div className="flex items-center mt-1 text-sm text-gray-500">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>{new Date(expense.date).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Paid by: {expense.paidBy} • Split with: {expense.splitWith.length} people
                </p>
              </div>
              <Button variant="outline" size="sm">
                Edit
              </Button>
            </div>
          </div>
        ))}
        
        {(!expenses || expenses.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No expenses added yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Notes Tab Component
function NotesTab({ notes, tripId, onAddNote }: any) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">Notes</h3>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={onAddNote}>
          <Plus className="w-4 h-4 mr-2" />
          Add Note
        </Button>
      </div>
      
      <div className="space-y-4">
        {notes?.map((note: any) => (
          <div key={note._id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="text-gray-900">{note.content}</p>
                <div className="flex items-center mt-2 text-sm text-gray-500">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>{new Date(note.date).toLocaleDateString()}</span>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Edit
              </Button>
            </div>
          </div>
        ))}
        
        {(!notes || notes.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No notes added yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Reminders Tab Component
function RemindersTab({ reminders, tripId }: any) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">Reminders</h3>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Add Reminder
        </Button>
      </div>
      
      <div className="space-y-4">
        {reminders?.map((reminder: any) => (
          <div key={reminder._id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold text-lg">{reminder.content}</h4>
                <div className="flex items-center mt-1 text-sm text-gray-500">
                  <Bell className="w-4 h-4 mr-2" />
                  <span>{new Date(reminder.remindAt).toLocaleString()}</span>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Edit
              </Button>
            </div>
          </div>
        ))}
        
        {(!reminders || reminders.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No reminders added yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Add Destination Modal
function AddDestinationModal({ isOpen, onClose, tripId }: { isOpen: boolean; onClose: () => void; tripId: string }) {
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    arrivalDate: "",
    departureDate: "",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const createDestination = useMutation(api.destinations.create);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await createDestination({
        tripId: tripId as any,
        name: formData.name,
        location: formData.location,
        arrivalDate: formData.arrivalDate,
        departureDate: formData.departureDate,
        notes: formData.notes || undefined,
      });
      setFormData({ name: "", location: "", arrivalDate: "", departureDate: "", notes: "" });
      onClose();
    } catch (error) {
      console.error("Error creating destination:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Add Destination</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Paris"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input
              type="text"
              required
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., France"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Arrival Date</label>
              <input
                type="date"
                required
                value={formData.arrivalDate}
                onChange={(e) => setFormData({ ...formData, arrivalDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Departure Date</label>
              <input
                type="date"
                required
                value={formData.departureDate}
                onChange={(e) => setFormData({ ...formData, departureDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Any additional notes..."
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isSubmitting ? "Adding..." : "Add Destination"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Add Itinerary Item Modal
function AddItineraryModal({ isOpen, onClose, tripId }: { isOpen: boolean; onClose: () => void; tripId: string }) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const createItineraryItem = useMutation(api.itinerary.create);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await createItineraryItem({
        tripId: tripId as any,
        title: formData.title,
        description: formData.description || undefined,
        date: formData.date,
        time: formData.time || undefined,
        location: formData.location || undefined,
      });
      setFormData({ title: "", description: "", date: "", time: "", location: "" });
      onClose();
    } catch (error) {
      console.error("Error creating itinerary item:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Add Itinerary Item</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Visit Eiffel Tower"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time (Optional)</label>
            <input
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location (Optional)</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Champ de Mars, Paris"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Details about this activity..."
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isSubmitting ? "Adding..." : "Add Item"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Add Expense Modal
function AddExpenseModal({ isOpen, onClose, tripId }: { isOpen: boolean; onClose: () => void; tripId: string }) {
  const { user } = useUser();
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    date: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const createExpense = useMutation(api.expenses.create);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSubmitting(true);
    
    try {
      await createExpense({
        tripId: tripId as any,
        description: formData.description,
        amount: parseFloat(formData.amount),
        date: formData.date,
        paidBy: user.id, // Use the current user's Clerk ID
        splitWith: [], // Empty array for now - can be enhanced later
      });
      setFormData({ description: "", amount: "", date: "" });
      onClose();
    } catch (error) {
      console.error("Error creating expense:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Add Expense</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Hotel booking"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isSubmitting ? "Adding..." : "Add Expense"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Add Note Modal
function AddNoteModal({ isOpen, onClose, tripId }: { isOpen: boolean; onClose: () => void; tripId: string }) {
  const [formData, setFormData] = useState({
    title: "",
    content: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const createNote = useMutation(api.notes.create);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await createNote({
        tripId: tripId as any,
        title: formData.title,
        content: formData.content,
        isSummary: false,
      });
      setFormData({ title: "", content: "" });
      onClose();
    } catch (error) {
      console.error("Error creating note:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Add Note</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Important reminder"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
            <textarea
              required
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="Write your note here..."
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
              {isSubmitting ? "Adding..." : "Add Note"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Delete Trip Confirmation Modal
function DeleteTripModal({ isOpen, onClose, tripId, tripName }: { 
  isOpen: boolean; 
  onClose: () => void; 
  tripId: string; 
  tripName: string; 
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  
  const deleteTrip = useMutation(api.trips.remove);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteTrip({ tripId: tripId as any });
      // Redirect to trips list after successful deletion
      router.push('/trips');
    } catch (error) {
      console.error("Error deleting trip:", error);
      // You could add a toast notification here
    } finally {
      setIsDeleting(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-red-600">Delete Trip</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mb-6">
          <p className="text-gray-700 mb-4">
            Are you sure you want to delete <strong>"{tripName}"</strong>?
          </p>
          <p className="text-sm text-gray-500">
            This action cannot be undone. All trip data including destinations, itinerary items, expenses, notes, and reminders will be permanently deleted.
          </p>
        </div>
        
        <div className="flex justify-end space-x-3">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button 
            type="button" 
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isDeleting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Trip
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

