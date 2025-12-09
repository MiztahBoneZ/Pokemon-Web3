import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, frdb } from "./Core/firebase";
import LoginPage from "./components/auth/LoginPage";
import RegisterPage from "./components/auth/RegisterPage";
import OnboardingPage from "./components/auth/Onboardpage";
import GamePage from "./components/Main/GamePage";
import AllPokemon from "./components/Inventory/AllPokemon";
import TeamSelect from "./components/TeamSelect/TeamSelect";

// Protected route for authenticated users
function ProtectedRoute({ user, children, redirectTo = "/" }) {
  if (!user) return <Navigate to={redirectTo} />;
  return children;
}

// Route for login/register pages
function AuthRedirectRoute({ user, children, redirectTo = "/game" }) {
  if (user) return <Navigate to={redirectTo} />;
  return children;
}

// Fully protected onboarding route
function OnboardingRoute({ user, onboarded, children }) {
  if (!user) return <Navigate to="/" />; // not logged in
  if (onboarded) return <Navigate to="/game" />; // already onboarded
  return children; // allowed
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const docRef = doc(frdb, "users", currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setOnboarded(data.hasCompletedOnboarding || false);
        }
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <Routes>
      <Route
        path="/"
        element={
          <AuthRedirectRoute user={user}>
            <LoginPage />
          </AuthRedirectRoute>
        }
      />
      <Route
        path="/register"
        element={
          <AuthRedirectRoute user={user} redirectTo="/onboarding">
            <RegisterPage />
          </AuthRedirectRoute>
        }
      />
      <Route
        path="/onboarding"
        element={
          <OnboardingRoute user={user} onboarded={onboarded}>
            <OnboardingPage />
          </OnboardingRoute>
        }
      />
      <Route
        path="/game"
        element={
          <ProtectedRoute user={user}>
            <GamePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/game/pokemon"
        element={
          <ProtectedRoute user={user}>
            <AllPokemon />
          </ProtectedRoute>
        }
      />
      <Route
        path="/game/teamselect"
        element={
          <ProtectedRoute user={user}>
            <TeamSelect />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
