import React, { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthProvider'
import { protectedApi } from '@/api/client'

interface Resource {
  id: number
  name: string
  content: string
  owner_id: number
  created_at: string
}

const Home: React.FC = () => {
  const { user, logout } = useAuth()
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [newName, setNewName] = useState('')
  const [newContent, setNewContent] = useState('')

  const fetchResources = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await protectedApi.getResources()
      setResources(response.data)
    } catch (err) {
      setError('Failed to fetch resources')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchResources()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await protectedApi.createResource(newName, newContent)
      setNewName('')
      setNewContent('')
      await fetchResources()
    } catch (err) {
      setError('Failed to create resource')
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">Protected Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">Welcome, {user?.username}</span>
            <button
              onClick={logout}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Note:</strong> Access tokens expire after 1 minute for testing purposes.
                Keep this page open and wait to see the token refresh in action.
                Check the Network tab in DevTools to see the refresh flow.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Create Resource</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Resource name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content
                </label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Resource content"
                  rows={3}
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
              >
                Create
              </button>
            </form>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Resources</h2>
              <button
                onClick={fetchResources}
                className="text-sm text-blue-500 hover:text-blue-700"
              >
                Refresh
              </button>
            </div>

            {error && (
              <div className="text-red-500 text-sm mb-4">{error}</div>
            )}

            {loading ? (
              <div className="text-gray-500">Loading...</div>
            ) : resources.length === 0 ? (
              <div className="text-gray-500">No resources yet. Create one!</div>
            ) : (
              <ul className="space-y-3">
                {resources.map((resource) => (
                  <li key={resource.id} className="border-b pb-2">
                    <div className="font-medium">{resource.name}</div>
                    <div className="text-sm text-gray-600">{resource.content}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(resource.created_at).toLocaleString()}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default Home
