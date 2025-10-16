// src/components/auth/AuthService.js
import { auth } from "../../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

export const AuthService = {
  async register(email, password) {
    return await createUserWithEmailAndPassword(auth, email, password);
  },

  async login(email, password) {
    return await signInWithEmailAndPassword(auth, email, password);
  },

  async logout() {
    return await signOut(auth);
  },
};
