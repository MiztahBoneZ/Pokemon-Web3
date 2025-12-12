import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../Core/firebase";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { ethers } from "ethers";
import { useNavigate, Link } from "react-router-dom";
import "./AuthPageStyle.css";

/* ---------- helpers ---------- */
const strongPassword = (pw) => {
  if (pw.length < 8) return { ok: false, msg: "≥ 8 chars" };
  if (!/[A-Z]/.test(pw)) return { ok: false, msg: "uppercase letter" };
  if (!/[a-z]/.test(pw)) return { ok: false, msg: "lowercase letter" };
  if (!/[0-9]/.test(pw)) return { ok: false, msg: "number" };
  if (!/[^A-Za-z0-9]/.test(pw)) return { ok: false, msg: "symbol" };
  return { ok: true };
};

const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isVerifyingWallet, setIsVerifyingWallet] = useState(false);
  const [waitingForWallet, setWaitingForWallet] = useState(false);

  const navigate = useNavigate();
  const db = getFirestore();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    /* ---------- stronger client-side checks ---------- */
    const em = email.trim();
    if (!em) return setError("Email required.");
    if (!validEmail(em)) return setError("Invalid email format.");
    const pwCheck = strongPassword(password);
    if (!pwCheck.ok) return setError("Password needs " + pwCheck.msg + ".");

    setIsVerifyingWallet(true);
    setWaitingForWallet(true);

    try {
      /* 1. Firebase auth */
      const { user } = await signInWithEmailAndPassword(auth, em, password);

      /* 2. User doc exists? */
      const userSnap = await getDoc(doc(db, "users", user.uid));
      if (!userSnap.exists()) throw { code: "custom/no-user-doc" };

      const { hasCompletedOnboarding, wallet: registeredWallet } =
        userSnap.data();
      if (!hasCompletedOnboarding || !registeredWallet) {
        navigate("/onboarding"); // short-circuit ok
        return;
      }

      /* 3. MetaMask checks */
      if (!window.ethereum) throw { code: "custom/no-mm" };

      const provider = new ethers.BrowserProvider(window.ethereum);
      let accounts = await provider.listAccounts();
      if (!accounts.length) {
        accounts = await provider.send("eth_requestAccounts", []);
      }
      const signer = await provider.getSigner();
      const currentWallet = (await signer.getAddress()).toLowerCase();

      setWaitingForWallet(false);

      if (currentWallet !== registeredWallet.toLowerCase())
        throw { code: "custom/wrong-wallet", registeredWallet, currentWallet };

      const { chainId } = await provider.getNetwork();
      if (chainId !== 11155111n) throw { code: "custom/wrong-network" };

      /* 4. success */
      navigate("/game");
    } catch (err) {
      setIsVerifyingWallet(false);
      setWaitingForWallet(false);

      const map = {
        "auth/user-not-found": "No account with that email.",
        "auth/wrong-password": "Wrong password.",
        "auth/invalid-email": "Invalid email address.",
        "auth/user-disabled": "Account disabled.",
        "auth/too-many-requests": "Too many attempts. Try again later.",
        "custom/no-mm": "MetaMask not detected.",
        "custom/no-user-doc": "User data missing. Contact support.",
        "custom/wrong-wallet": "Connected wallet does not match account.",
        "custom/wrong-network": "Switch to Sepolia test network.",
      };
      setError(map[err.code] || err.message || "Login failed.");
      if (auth.currentUser) await auth.signOut();
    }
  };

  return (
    <div className="page-wrapper">
      <div className="login-container">
        <h1>PayPal</h1>
        <h2>Sign in</h2>

        {isVerifyingWallet && (
          <div className="wallet-verification-notice">
            <div className="spinner-small"></div>
            <p>{waitingForWallet ? "Connect MetaMask…" : "Verifying…"}</p>
          </div>
        )}
        {error && <p className="error">{error}</p>}

        <form onSubmit={handleLogin} noValidate>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isVerifyingWallet}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isVerifyingWallet}
          />
          <div className="login-info">
            <p className="info-text">
              Ensure the correct MetaMask wallet is connected and active.
            </p>
          </div>

          <button type="submit" disabled={isVerifyingWallet}>
            {isVerifyingWallet ? "Verifying…" : "Login"}
          </button>
        </form>

        <Link to="/register">
          <button
            style={{
              marginTop: "10px",
              backgroundColor: "#4221ff",
              color: "white",
            }}
            disabled={isVerifyingWallet}
          >
            Create an Account
          </button>
        </Link>
      </div>
    </div>
  );
}
