"use client";

export default function DebugPage() {
  return (
    <div className="container p-4">
      <h1 className="text-2xl font-bold mb-4">Debug Tools</h1>
      <div className="space-y-4">
        <div className="p-4 border rounded">
          <h2 className="text-xl font-semibold mb-2">API Status</h2>
          <p>Status monitoring tools for debugging purposes.</p>
          <div className="mt-2 space-x-2">
            <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              Reset API Error Count
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 