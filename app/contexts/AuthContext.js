'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('Auth state listener başlatıldı');

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        console.log('Firebase user bulundu:', firebaseUser.email);

        try {
          const usersQuery = query(
            collection(db, 'users'),
            where('uid', '==', firebaseUser.uid)
          );
          const querySnapshot = await getDocs(usersQuery);

          if (!querySnapshot.empty) {
            const userDoc = querySnapshot.docs[0];
            const userData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              ...userDoc.data()
            };
            console.log('User data yüklendi:', userData);
            setUser(userData);
          } else {
            console.log('Firestore\'da user bulunamadı');
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              role: 'applicant'
            });
          }
        } catch (error) {
          console.error('Firestore user fetch error:', error);
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            role: 'applicant'
          });
        }
      } else {
        console.log('Firebase user yok (logout)');
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}