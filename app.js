import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, getDoc, addDoc, setDoc, updateDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Composant principal de l'application
export default function App() {
  // États pour les formulaires et les données
  const [username, setUsername] = useState('');
  const [userId, setUserId] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('');
  const [date, setDate] = useState('');
  const [logUserId, setLogUserId] = useState('');
  const [logFrom, setLogFrom] = useState('');
  const [logTo, setLogTo] = useState('');
  const [logLimit, setLogLimit] = useState('');
  
  // États pour les résultats et les messages
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [userResult, setUserResult] = useState(null);
  const [exerciseResult, setExerciseResult] = useState(null);
  const [logResult, setLogResult] = useState(null);

  // États pour Firebase
  const [auth, setAuth] = useState(null);
  const [db, setDb] = useState(null);
  const [authenticatedUserId, setAuthenticatedUserId] = useState(null);

  // Initialisation de Firebase et authentification
  useEffect(() => {
    const initFirebase = async () => {
      try {
        const app = initializeApp(firebaseConfig);
        const firestore = getFirestore(app);
        const authInstance = getAuth(app);
        setDb(firestore);
        setAuth(authInstance);

        const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
          if (user) {
            setAuthenticatedUserId(user.uid);
            console.log('Authentifié avec l\'UID:', user.uid);
          } else {
            console.log('Utilisateur non authentifié, connexion anonyme...');
            await signInAnonymously(authInstance);
          }
          setLoading(false);
        });

        // Nettoyage de l'abonnement
        return () => unsubscribe();
      } catch (e) {
        console.error('Erreur lors de l\'initialisation de Firebase:', e);
        setMessage('Erreur lors de l\'initialisation de l\'application.');
        setLoading(false);
      }
    };
    initFirebase();
  }, []);

  // Fonction pour gérer les erreurs avec un backoff exponentiel
  const withExponentialBackoff = async (fn) => {
    let delay = 1000;
    for (let i = 0; i < 5; i++) {
      try {
        return await fn();
      } catch (error) {
        if (error.code === 'unavailable' && i < 4) {
          console.log(`Échec de la connexion, nouvelle tentative dans ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          throw error;
        }
      }
    }
  };

  // Création d'un nouvel utilisateur
  const createUser = async (e) => {
    e.preventDefault();
    if (!username) {
      setMessage('Veuillez entrer un nom d\'utilisateur.');
      return;
    }

    try {
      setLoading(true);
      setMessage('');
      const usersRef = collection(db, `artifacts/${appId}/public/data/users`);

      // Vérifier si l'utilisateur existe déjà
      const q = query(usersRef, where('username', '==', username));
      const querySnapshot = await withExponentialBackoff(() => getDocs(q));

      if (!querySnapshot.empty) {
        setMessage('Ce nom d\'utilisateur existe déjà.');
        setLoading(false);
        return;
      }

      // Ajouter le nouvel utilisateur
      const docRef = await withExponentialBackoff(() => addDoc(usersRef, { username }));
      const newUser = {
        username: username,
        _id: docRef.id,
      };
      setUserResult(newUser);
      setMessage('Utilisateur créé avec succès !');
    } catch (error) {
      console.error('Erreur lors de la création de l\'utilisateur:', error);
      setMessage('Erreur lors de la création de l\'utilisateur.');
    } finally {
      setLoading(false);
    }
  };

  // Ajout d'un nouvel exercice
  const addExercise = async (e) => {
    e.preventDefault();
    if (!userId || !description || !duration) {
      setMessage('Veuillez remplir tous les champs obligatoires (ID utilisateur, description, durée).');
      return;
    }
    
    const durationInt = parseInt(duration, 10);
    if (isNaN(durationInt) || durationInt <= 0) {
      setMessage('La durée doit être un nombre positif.');
      return;
    }

    try {
      setLoading(true);
      setMessage('');
      const userRef = doc(db, `artifacts/${appId}/public/data/users`, userId);
      const userSnap = await withExponentialBackoff(() => getDoc(userRef));
      
      if (!userSnap.exists()) {
        setMessage('Utilisateur non trouvé avec cet ID.');
        setLoading(false);
        return;
      }
      
      const user = userSnap.data();
      const exerciseDate = date ? new Date(date) : new Date();
      
      const newExercise = {
        description: description,
        duration: durationInt,
        date: exerciseDate.toDateString(),
      };
      
      const exerciseRef = collection(db, `artifacts/${appId}/public/data/users/${userId}/logs`);
      await withExponentialBackoff(() => addDoc(exerciseRef, newExercise));
      
      setExerciseResult({
        ...newExercise,
        username: user.username,
        _id: userId,
      });
      setMessage('Exercice ajouté avec succès !');
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'exercice:', error);
      setMessage('Erreur lors de l\'ajout de l\'exercice.');
    } finally {
      setLoading(false);
    }
  };

  // Récupération du journal d'exercices
  const getExerciseLog = async (e) => {
    e.preventDefault();
    if (!logUserId) {
      setMessage('Veuillez fournir un ID utilisateur pour récupérer le journal.');
      return;
    }

    try {
      setLoading(true);
      setMessage('');
      const userRef = doc(db, `artifacts/${appId}/public/data/users`, logUserId);
      const userSnap = await withExponentialBackoff(() => getDoc(userRef));
      
      if (!userSnap.exists()) {
        setMessage('Utilisateur non trouvé avec cet ID.');
        setLoading(false);
        return;
      }
      
      const user = userSnap.data();
      
      let exercisesQuery = collection(db, `artifacts/${appId}/public/data/users/${logUserId}/logs`);
      
      // Filtrer par date si des dates 'de' et 'à' sont fournies
      if (logFrom) {
        const fromDate = new Date(logFrom);
        exercisesQuery = query(exercisesQuery, where('date', '>=', fromDate.toDateString()));
      }
      if (logTo) {
        const toDate = new Date(logTo);
        exercisesQuery = query(exercisesQuery, where('date', '<=', toDate.toDateString()));
      }

      // Limiter les résultats si une limite est spécifiée
      if (logLimit && parseInt(logLimit, 10) > 0) {
        exercisesQuery = query(exercisesQuery, limit(parseInt(logLimit, 10)));
      }

      const querySnapshot = await withExponentialBackoff(() => getDocs(exercisesQuery));
      
      const log = [];
      querySnapshot.forEach(doc => {
        const data = doc.data();
        log.push({
          description: data.description,
          duration: data.duration,
          date: data.date,
        });
      });
      
      setLogResult({
        username: user.username,
        count: log.length,
        _id: logUserId,
        log: log,
      });
      setMessage('Journal d\'exercices récupéré avec succès !');
    } catch (error) {
      console.error('Erreur lors de la récupération du journal:', error);
      setMessage('Erreur lors de la récupération du journal d\'exercices.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-lg">Chargement...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl p-8 space-y-8">
        <h1 className="text-4xl font-bold text-center text-gray-800">Suivi d'exercices</h1>
        
        <p className="text-center text-gray-600">
          Bonjour ! Votre UID est : <code className="bg-gray-200 p-1 rounded font-mono break-all">{authenticatedUserId}</code>. Cette application utilise votre UID pour stocker des données. Vous pouvez copier cet ID pour l'utiliser si nécessaire.
        </p>

        {message && (
          <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded" role="alert">
            <p>{message}</p>
          </div>
        )}

        {/* Section pour la création d'un utilisateur */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-700 border-b pb-2">Créer un nouvel utilisateur</h2>
          <form onSubmit={createUser} className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              className="flex-grow p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nom d'utilisateur"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-md shadow-md transition duration-300 ease-in-out transform hover:scale-105"
            >
              Soumettre
            </button>
          </form>
          {userResult && (
            <pre className="bg-gray-800 text-green-400 p-4 rounded-md overflow-x-auto">
              <code>{JSON.stringify(userResult, null, 2)}</code>
            </pre>
          )}
        </div>

        {/* Section pour l'ajout d'un exercice */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-700 border-b pb-2">Ajouter un exercice</h2>
          <form onSubmit={addExercise} className="space-y-4">
            <input
              type="text"
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ID de l'utilisateur*"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
            />
            <input
              type="text"
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Description*"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
            <input
              type="number"
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Durée (min.)*"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              required
            />
            <input
              type="date"
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-md shadow-md transition duration-300 ease-in-out transform hover:scale-105"
            >
              Soumettre
            </button>
          </form>
          {exerciseResult && (
            <pre className="bg-gray-800 text-green-400 p-4 rounded-md overflow-x-auto">
              <code>{JSON.stringify(exerciseResult, null, 2)}</code>
            </pre>
          )}
        </div>
        
        {/* Section pour la récupération du journal d'exercices */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-700 border-b pb-2">Obtenir le journal d'exercices</h2>
          <form onSubmit={getExerciseLog} className="space-y-4">
            <input
              type="text"
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ID de l'utilisateur*"
              value={logUserId}
              onChange={(e) => setLogUserId(e.target.value)}
              required
            />
            <div className="flex flex-col md:flex-row gap-4">
              <input
                type="date"
                className="flex-grow p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="De (AAAA-MM-JJ)"
                value={logFrom}
                onChange={(e) => setLogFrom(e.target.value)}
              />
              <input
                type="date"
                className="flex-grow p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="À (AAAA-MM-JJ)"
                value={logTo}
                onChange={(e) => setLogTo(e.target.value)}
              />
              <input
                type="number"
                className="w-24 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Limite"
                value={logLimit}
                onChange={(e) => setLogLimit(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-md shadow-md transition duration-300 ease-in-out transform hover:scale-105"
            >
              Obtenir le journal
            </button>
          </form>
          {logResult && (
            <pre className="bg-gray-800 text-green-400 p-4 rounded-md overflow-x-auto">
              <code>{JSON.stringify(logResult, null, 2)}</code>
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
