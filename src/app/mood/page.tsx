"use client";

import { useState } from "react";

export default function MoodTracker() {
  const [mood, setMood] = useState(5);
  const [note, setNote] = useState("");
  const userId = "user-1"; // TODO: get from auth

  const submitMood = async () => {
    const res = await fetch("/api/mood", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, mood, note }),
    });
    if (res.ok) {
      alert("Mood saved!");
      setNote("");
    }
  };

  return (
    <div className="p-8 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-8">Mood Tracker</h1>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          How are you feeling? (1-10)
        </label>
        <input
          type="range"
          min="1"
          max="10"
          value={mood}
          onChange={(e) => setMood(Number(e.target.value))}
          className="w-full"
        />
        <span className="text-center block">{mood}</span>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Note (optional)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full p-2 border rounded"
          rows={3}
        />
      </div>

      <button
        onClick={submitMood}
        className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
      >
        Save Mood
      </button>
    </div>
  );
}
