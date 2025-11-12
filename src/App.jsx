import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./Core/firebase";
import LoginPage from "./components/auth/LoginPage";
import RegisterPage from "./components/auth/RegisterPage";
import OnboardingPage from "./components/auth/Onboardpage";
import GamePage from "./components/Main/GamePage";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <Routes>
      <Route
        path="/"
        element={user ? <Navigate to="/game" /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={user ? <Navigate to="/onboarding" /> : <RegisterPage />}
      />
      <Route
        path="/onboarding"
        element={user ? <OnboardingPage /> : <Navigate to="/" />}
      />
      <Route
        path="/game"
        element={user ? <GamePage /> : <Navigate to="/" />}
      />
    </Routes>
  );
}

export default App;
