import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Camera, Check, UserRound } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

export function AccountPage() {
  const { user, setUser } = useAuthStore();
  const [username, setUsername] = useState(user?.username || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    setMessage('');
    try {
      const response = await api.put('/users/me', { username: username.trim(), avatar_url: avatarUrl.trim() || null });
      setUser(response.data);
      setMessage('Profile saved');
    } catch (error: any) {
      setMessage(error?.response?.data?.detail || 'Could not save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return <main className="mini-settings-page"><Link to="/login" className="mini-back"><ArrowLeft /> Sign in</Link><h1>Personal Data</h1><p>Sign in to manage your profile.</p></main>;

  return (
    <main className="mini-settings-page">
      <div className="mini-page-title"><Link to="/profile" aria-label="Back"><ArrowLeft /></Link><h1>Personal Data</h1></div>
      <form onSubmit={save} className="mini-account-form">
        <label className="mini-account-avatar"><span>Profile image</span><div>{avatarUrl ? <img src={avatarUrl} alt="Profile" /> : <UserRound />}<Camera /></div></label>
        <label>Name<input value={username} maxLength={40} onChange={(event) => setUsername(event.target.value)} required /></label>
        <label>Profile image URL<input value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="https://…" inputMode="url" /></label>
        <label>Email<input value={user.email || ''} readOnly /></label>
        <button type="submit" disabled={saving || !username.trim()}>{saving ? 'Saving…' : <><Check /> Save changes</>}</button>
        {message && <p role="status" className="mini-form-message">{message}</p>}
      </form>
      <p className="mini-account-id">Account ID: {user.id}</p>
    </main>
  );
}
