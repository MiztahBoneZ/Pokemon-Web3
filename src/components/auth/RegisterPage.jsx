import React, { useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../Core/firebase";
import { useNavigate } from "react-router-dom";
import "./AuthPageStyle.css";

/* ---------- HELPER: STRONG PASSWORD CHECK ---------- */
const strongPassword = (pw) => {
  if (pw.length < 8) return { ok: false, msg: "At least 8 characters." };
  if (!/[A-Z]/.test(pw)) return { ok: false, msg: "One uppercase letter." };
  if (!/[a-z]/.test(pw)) return { ok: false, msg: "One lowercase letter." };
  if (!/[0-9]/.test(pw)) return { ok: false, msg: "One number." };
  if (!/[^A-Za-z0-9]/.test(pw))
    return { ok: false, msg: "One special character." };
  return { ok: true };
};

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState(""); // ← NEW
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    /* ---------- FRONT-END VALIDATION ---------- */
    const trimmed = email.trim();
    if (!trimmed) return setError("Email is required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed))
      return setError("Invalid e-mail format.");

    const pwCheck = strongPassword(password);
    if (!pwCheck.ok) return setError("Password: " + pwCheck.msg);

    /* ---------- CONFIRM PASSWORD CHECK ---------- */
    if (password !== confirmPassword)
      return setError("Passwords do not match.");

    setLoading(true);

    try {
      await createUserWithEmailAndPassword(auth, trimmed, password);
      navigate("/onboarding");
    } catch (err) {
      setLoading(false);
      const map = {
        "auth/email-already-in-use": "Email already registered – please login.",
        "auth/weak-password": "Password too weak.",
        "auth/invalid-email": "Invalid email address.",
      };
      setError(map[err.code] || err.message);
    }
  };

  return (
    <div className="page-wrapper">
      <div className="login-container">
        <h1>PayPal</h1>
        <h2>Create your account</h2>

        <form onSubmit={handleRegister} noValidate>
          {error && <p className="error">{error}</p>}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />

          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
          />

          <div className="login-info">
            <p className="info-text">
              A Crypto Wallet with ETH tokens is required for completing the
              registration process and minting your first legally distinct
              pocket monsters.
            </p>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Creating Account..." : "Create Account"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/")}
            style={{ backgroundColor: "#91000cff", color: "white" }}
            disabled={loading}
          >
            Back to Login
          </button>
        </form>
      </div>
    </div>
  );
}
