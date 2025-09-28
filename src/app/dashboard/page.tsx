"use client";

import { useEffect, useState } from "react";

interface CallWithUser {
  id: string;
  user: { phone: string };
  status: string;
  startedAt: string;
}

interface EscalationWithCall {
  id: string;
  call: { user: { phone: string } };
  counselor: { name?: string };
  counselorId: string;
  notes?: string;
  escalatedAt: string;
}

interface DashboardData {
  recentCalls: CallWithUser[];
  moodTrends: { date: string; averageMood: number }[];
  escalations: EscalationWithCall[];
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then(setData);
  }, []);

  if (!data) return <div>Loading...</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-8">Counselor Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Recent Calls</h2>
          <ul className="space-y-2">
            {data.recentCalls.map((call) => (
              <li key={call.id} className="p-4 border rounded">
                <p>User: {call.user.phone}</p>
                <p>Status: {call.status}</p>
                <p>Started: {new Date(call.startedAt).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Mood Trends</h2>
          <div className="space-y-2">
            {data.moodTrends.map((trend) => (
              <div key={trend.date} className="flex items-center">
                <span className="w-20">{trend.date}</span>
                <div className="flex-1 bg-gray-200 rounded h-4">
                  <div
                    className="bg-blue-500 h-4 rounded"
                    style={{ width: `${(trend.averageMood / 10) * 100}%` }}
                  ></div>
                </div>
                <span className="ml-2">{trend.averageMood.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Recent Escalations</h2>
          <ul className="space-y-2">
            {data.escalations.map((esc) => (
              <li key={esc.id} className="p-4 border rounded">
                <p>User: {esc.call.user.phone}</p>
                <p>Counselor: {esc.counselor.name || esc.counselorId}</p>
                <p>Notes: {esc.notes}</p>
                <p>Escalated: {new Date(esc.escalatedAt).toLocaleString()}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
