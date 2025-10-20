import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import LoginPage from "./components/authentication/LoginPage";
import RegisterPage from "./components/authentication/RegisterPage";
import GamePage from "./components/GamePage";

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
        element={user ? <Navigate to="/game" /> : <RegisterPage />}
      />
      <Route
        path="/game"
        element={user ? <GamePage /> : <Navigate to="/" />}
      />
    </Routes>
  );
}

export default App;
