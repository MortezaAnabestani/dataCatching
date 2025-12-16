import React from 'react';

export default function HomePage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-4">Media Intelligence Platform</h1>
      <p className="text-lg text-gray-600 mb-8">
        Monitoring news agencies and social media, detecting viral trends, and analyzing topic coverage.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Placeholder for trending topics */}
        <div className="md:col-span-1 p-4 border rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">Trending Topics</h2>
          <ul className="space-y-2">
            <li className="text-gray-700">Topic 1</li>
            <li className="text-gray-700">Topic 2</li>
            <li className="text-gray-700">Topic 3</li>
          </ul>
        </div>

        {/* Placeholder for recent articles */}
        <div className="md:col-span-2 p-4 border rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">Recent Articles</h2>
          <div className="space-y-4">
            <div className="p-4 border-b">
              <h3 className="font-bold">Article Title 1</h3>
              <p className="text-sm text-gray-500">Source - 5 minutes ago</p>
            </div>
            <div className="p-4 border-b">
              <h3 className="font-bold">Article Title 2</h3>
              <p className="text-sm text-gray-500">Source - 12 minutes ago</p>
            </div>
            <div className="p-4">
              <h3 className="font-bold">Article Title 3</h3>
              <p className="text-sm text-gray-500">Source - 20 minutes ago</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
