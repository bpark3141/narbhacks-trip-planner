"use client";

import React, { Fragment, useRef, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Button } from "@/components/common/button";
import { api } from "@packages/backend/convex/_generated/api";
import { useAction, useMutation } from "convex/react";
import { Wand2, Save, Plus, X } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface AIItineraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
}

export default function AIItineraryModal({ isOpen, onClose, tripId }: AIItineraryModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [itinerary, setItinerary] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Reset itinerary when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setItinerary("");
    }
  }, [isOpen]);
  
  const suggestItinerary = useAction(api.openai.ruleBasedItinerary);
  const createItineraryItem = useMutation(api.itinerary.create);
  const updateItineraryItem = useMutation(api.itinerary.update);

  const cancelButtonRef = useRef(null);

  const generateItinerary = async () => {
    setIsGenerating(true);
    try {
      console.log("Generating itinerary for tripId:", tripId);
      const result = await suggestItinerary({ tripId: tripId as any });
      console.log("Generated itinerary result:", result);
      setItinerary(Array.isArray(result) ? result.join('\n') : result);
      console.log("AIItineraryModal itinerary:", Array.isArray(result) ? result.join('\n') : result);
    } catch (error) {
      console.error("Error generating itinerary:", error);
      setItinerary("Error generating itinerary. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const saveAsNote = async () => {
    setIsSaving(true);
    try {
      // Create a note with the itinerary content
      await createItineraryItem({
        tripId: tripId as any,
        title: "AI Generated Itinerary",
        description: itinerary,
        date: new Date().toISOString().split('T')[0], // Today's date
        time: "",
        location: "",
      });
      onClose();
    } catch (error) {
      console.error("Error saving itinerary:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const addToItinerary = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      // Parse the rule-based AI output: lines like 'Day 1: ...'
      const lines = itinerary.split('\n');
      for (const line of lines) {
        const match = line.match(/^Day (\d+): (.+)$/);
        if (match) {
          const dayNum = match[1];
          const activity = match[2];
          await createItineraryItem({
            tripId: tripId as any,
            title: `Day ${dayNum}`,
            description: activity,
            date: "", // Optionally parse/assign a date
            time: "",
            location: "",
          });
        }
      }
      setSaveSuccess(true);
    } catch (error) {
      console.error("Error saving itinerary:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        initialFocus={cancelButtonRef}
        onClose={onClose}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl">
                <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <Dialog.Title as="h3" className="text-lg font-semibold text-gray-900">
                      AI Itinerary Generator
                    </Dialog.Title>
                    <button
                      onClick={onClose}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {!itinerary ? (
                    <div className="text-center py-8">
                      <Wand2 className="w-12 h-12 mx-auto mb-4 text-blue-600" />
                      <h4 className="text-lg font-medium text-gray-900 mb-2">
                        Generate AI-Powered Itinerary
                      </h4>
                      <p className="text-gray-600 mb-6">
                        Get a detailed, destination-specific itinerary based on your trip details.
                      </p>
                      <Button
                        onClick={generateItinerary}
                        disabled={isGenerating}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {isGenerating ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Generating...
                          </>
                        ) : (
                          <>
                            <Wand2 className="w-4 h-4 mr-2" />
                            Generate Itinerary
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto prose prose-sm max-w-none">
                        <ReactMarkdown>
                          {itinerary}
                        </ReactMarkdown>
                      </div>
                      <div className="flex justify-end space-x-3">
                        <Button
                          variant="outline"
                          onClick={onClose}
                        >
                          Close
                        </Button>
                        <Button
                          onClick={addToItinerary}
                          disabled={isSaving}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {isSaving ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Adding...
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4 mr-2" />
                              Add to Itinerary
                            </>
                          )}
                        </Button>
                        {saveSuccess && (
                          <span className="text-green-700 font-semibold self-center">Saved!</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
} 