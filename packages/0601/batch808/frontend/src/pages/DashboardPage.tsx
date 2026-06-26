import React from 'react';
import { useAuth } from '../contexts/AuthProvider';
import { client } from '../api/client';

export function DashboardPage() {
  const { user, logout } = useAuth();

  const fetchProtected = async () => {
    try {
      const data = await client<{ message: string; user: string }>('/protected');
      alert(JSON.stringify(data));
    } catch (err) {
      alert('Request failed: ' + (err as Error).message);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '100px auto', padding: 20 }}>
      <h2>Dashboard</h2>
      <p>Welcome, {user?.username}</p>
      <button onClick={fetchProtected} style={{ padding: '8px 16px', marginRight: 8 }}>Fetch Protected Data</button>
      <button onClick={logout} style={{ padding: '8px 16px' }}>Logout</button>
    </div>
  );
}
