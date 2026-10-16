import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * RegisterPage is unified with Google 1-Click SSO.
 * Any visit to /register automatically routes to /login to ensure a single,
 * frictionless sign-in/up experience without forms or passwords.
 */
export function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    navigate('/login', { replace: true, state: location.state });
  }, [navigate, location.state]);

  return null;
}
