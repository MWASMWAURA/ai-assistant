export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          Mental Health AI Assistant
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Supporting mental health through AI-powered conversations and mood
          tracking.
        </p>
        <div className="space-x-4">
          <a
            href="/mood"
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600"
          >
            Track Your Mood
          </a>
          <a
            href="/dashboard"
            className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600"
          >
            Counselor Dashboard
          </a>
        </div>
        <p className="mt-8 text-sm text-gray-500">
          Call our hotline for immediate support.
        </p>
      </div>
    </div>
  );
}
