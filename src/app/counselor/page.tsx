"use client";

import { useState, useEffect } from "react";

interface Call {
  id: string;
  status: string;
  startedAt: string;
  user: {
    phone: string;
    name?: string;
  };
  conversation?: {
    messages: Array<{
      role: string;
      content: string;
      timestamp: string;
    }>;
  };
}

export default function CounselorDashboard() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    loadCounselorData();
    loadCalls();
  }, []);

  const loadCounselorData = async () => {
    // In a real app, get counselor from auth
    const response = await fetch("/api/counselor/profile");
    if (response.ok) {
      const data = await response.json();
      setIsAvailable(data.status === "available");
    }
  };

  const loadCalls = async () => {
    const response = await fetch("/api/counselor/calls");
    if (response.ok) {
      const data = await response.json();
      setCalls(data);
    }
  };

  const toggleAvailability = async () => {
    const response = await fetch("/api/counselor/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ available: !isAvailable }),
    });
    if (response.ok) {
      setIsAvailable(!isAvailable);
    }
  };

  const takeOverCall = async (callId: string) => {
    const response = await fetch("/api/counselor/takeover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callId }),
    });
    if (response.ok) {
      loadCalls(); // Refresh calls
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Counselor Dashboard
        </h1>

        {/* Availability Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Availability Status</h2>
              <p className="text-gray-600">
                Set your availability for incoming escalations
              </p>
            </div>
            <button
              onClick={toggleAvailability}
              className={`px-6 py-2 rounded-lg font-medium ${
                isAvailable
                  ? "bg-green-500 text-white hover:bg-green-600"
                  : "bg-gray-300 text-gray-700 hover:bg-gray-400"
              }`}
            >
              {isAvailable ? "Available" : "Unavailable"}
            </button>
          </div>
        </div>

        {/* Active Calls */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Active Calls</h2>
          <div className="space-y-4">
            {calls
              .filter((call) => call.status === "ai_handling")
              .map((call) => (
                <div key={call.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">Call from {call.user.phone}</p>
                      <p className="text-sm text-gray-600">
                        Started: {new Date(call.startedAt).toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        Last message:{" "}
                        {call.conversation?.messages
                          .slice(-1)[0]
                          ?.content.substring(0, 100)}
                        ...
                      </p>
                    </div>
                    <button
                      onClick={() => takeOverCall(call.id)}
                      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    >
                      Take Over Call
                    </button>
                  </div>
                </div>
              ))}
            {calls.filter((call) => call.status === "ai_handling").length ===
              0 && (
              <p className="text-gray-500 text-center py-8">
                No active AI-handled calls
              </p>
            )}
          </div>
        </div>

        {/* My Assigned Calls */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">My Assigned Calls</h2>
          <div className="space-y-4">
            {calls
              .filter((call) => call.status === "counselor_assigned")
              .map((call) => (
                <div key={call.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">Call from {call.user.phone}</p>
                      <p className="text-sm text-gray-600">
                        Started: {new Date(call.startedAt).toLocaleString()}
                      </p>
                    </div>
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                      Assigned to you
                    </span>
                  </div>
                </div>
              ))}
            {calls.filter((call) => call.status === "counselor_assigned")
              .length === 0 && (
              <p className="text-gray-500 text-center py-8">
                No calls assigned to you
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
