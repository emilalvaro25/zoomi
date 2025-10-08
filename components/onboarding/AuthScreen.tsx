import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import './AuthScreen.css';

const AuthScreen: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    if (isSignUp) {
      // Handle Sign Up
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        setError(error.message);
      } else {
        setMessage('Check your email for the confirmation link!');
      }
    } else {
      // Handle Sign In
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      }
      // onAuthStateChange will handle successful login
    }
    setLoading(false);
  };

  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
    setMessage('');
    setEmail('');
    setPassword('');
  };

  return (
    <div className="auth-screen-overlay">
      <div className="auth-screen-container">
        <h2>{isSignUp ? 'Create an Account' : 'Welcome to Zoomi'}</h2>
        <p>
          {isSignUp
            ? 'Sign up to join the meeting'
            : 'Sign in to your account'}
        </p>
        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="email"
            placeholder="Your email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            aria-label="Your email"
          />
          <input
            type="password"
            placeholder="Your password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            aria-label="Your password"
          />
          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? '...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>
        {message && <p className="message-text">{message}</p>}
        {error && <p className="error-text">{error}</p>}

        <div className="auth-toggle">
          <span>
            {isSignUp
              ? 'Already have an account?'
              : "Don't have an account?"}
            <button onClick={toggleAuthMode}>
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
