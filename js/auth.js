// js/auth.js
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js';

let currentUser = null;

export function login(email, password) {
  const auth = getAuth();
  return signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      currentUser = userCredential.user;
      return userCredential.user;
    });
}

export function logout() {
  const auth = getAuth();
  return signOut(auth).then(() => {
    currentUser = null;
  });
}

export function getCurrentUser() {
  return currentUser;
}

export function subscribeToAuthChanges(callback) {
  const auth = getAuth();
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    callback({ user, loading: false, error: null });
  });
}