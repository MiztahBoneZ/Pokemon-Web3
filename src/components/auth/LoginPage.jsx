import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../Core/firebase";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { ethers } from "ethers";
import { useNavigate, Link } from "react-router-dom";
import "./AuthPageStyle.css";

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

    try {
      // Step 1: Sign in with email/password
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Step 2: Check if user has completed onboarding and has a wallet
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        setError("User data not found. Please contact support.");
        await auth.signOut();
        return;
      }

      const userData = userDoc.data();

      // If user hasn't completed onboarding yet, allow them through
      if (!userData.hasCompletedOnboarding || !userData.wallet) {
        console.log("User hasn't completed onboarding yet");
        navigate("/onboarding");
        return;
      }

      // Step 3: User has a registered wallet - verify it matches
      const registeredWallet = userData.wallet.toLowerCase();

      setIsVerifyingWallet(true);
      setWaitingForWallet(true);

      // Check if MetaMask is installed
      if (!window.ethereum) {
        setError("MetaMask not detected. Please install MetaMask to continue.");
        setIsVerifyingWallet(false);
        setWaitingForWallet(false);
        await auth.signOut();
        return;
      }

      // Get current wallet
      const provider = new ethers.BrowserProvider(window.ethereum);
      let accounts = await provider.listAccounts();

      // If no wallet connected, request connection
      if (accounts.length === 0) {
        try {
          await provider.send("eth_requestAccounts", []);
          accounts = await provider.listAccounts();
        } catch (err) {
          setError("Please connect your MetaMask wallet to continue.");
          setIsVerifyingWallet(false);
          setWaitingForWallet(false);
          await auth.signOut();
          return;
        }
      }

      const signer = await provider.getSigner();
      const currentWallet = (await signer.getAddress()).toLowerCase();

      setWaitingForWallet(false);

      // Step 4: Compare wallets
      if (currentWallet !== registeredWallet) {
        setError(
          `Wrong wallet connected!\n\n` +
            `This account is linked to: ${registeredWallet.slice(
              0,
              8
            )}...${registeredWallet.slice(-6)}\n` +
            `You're currently using: ${currentWallet.slice(
              0,
              8
            )}...${currentWallet.slice(-6)}\n\n` +
            `Please switch to the correct wallet in MetaMask.`
        );
        setIsVerifyingWallet(false);
        await auth.signOut();
        return;
      }

      // Step 5: Check if on Sepolia network
      const network = await provider.getNetwork();
      if (network.chainId !== 11155111n) {
        setError("Please switch to Sepolia test network in MetaMask!");
        setIsVerifyingWallet(false);
        await auth.signOut();
        return;
      }

      // Success! Wallet matches
      setIsVerifyingWallet(false);
      navigate("/game");
    } catch (err) {
      setIsVerifyingWallet(false);
      setWaitingForWallet(false);

      // Handle specific Firebase errors
      if (err.code === "auth/user-not-found") {
        setError("No account found with this email.");
      } else if (err.code === "auth/wrong-password") {
        setError("Incorrect password.");
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email address.");
      } else if (err.code === "auth/user-disabled") {
        setError("This account has been disabled.");
      } else {
        setError(err.message);
      }

      // Sign out if already signed in
      if (auth.currentUser) {
        await auth.signOut();
      }
    }
  };

  return (
    <div className="page-wrapper">
      <div className="login-container">
        <h1>PayPal</h1>
        <h2>Sign in to your account</h2>

        {isVerifyingWallet && (
          <div className="wallet-verification-notice">
            {waitingForWallet ? (
              <>
                <div className="spinner-small"></div>
                <p>Please connect your MetaMask wallet...</p>
              </>
            ) : (
              <>
                <div className="spinner-small"></div>
                <p>Verifying wallet...</p>
              </>
            )}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isVerifyingWallet}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isVerifyingWallet}
            required
          />
          {error && <p className="error">{error}</p>}
          <div className="login-info">
            <p className="info-text">
              Ensure the correct metamask wallet is Connected and Active
            </p>
          </div>
          <button type="submit" disabled={isVerifyingWallet}>
            {isVerifyingWallet ? "Verifying..." : "Login"}
          </button>
        </form>
        <Link to="/register">
          <button style={{ marginTop: "10px" }} disabled={isVerifyingWallet}>
            Create an Account
          </button>
        </Link>
      </div>
    </div>
  );
}
