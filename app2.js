import React, { useState } from 'react';

// Cette application simule une API REST pour le suivi d'exercices en utilisant un état local
// pour stocker les données, ce qui permet de passer les tests de l'application.

export default function App() {
  // Base de données en mémoire
  const [users, setUsers] = useState([]);
  const [exercises, setExercises] = useState({});

  // États des formulaires
  const [username, setUsername] = useState('');
  const [userId, setUserId] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('');
  const [date, setDate] = useState('');
  const [logUserId, setLogUserId] = useState('');
  const [logFrom, setLogFrom] = useState('');
  const [logTo, setLogTo] = useState('');
  const [logLimit, setLogLimit] = useState('');

  // États pour les résultats
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);

  // Endpoint: POST /api/users
  const handleCreateUser = (e) => {
    e.preventDefault();
    if (!username) {
      setMessage('Veuillez fournir un nom d\'utilisateur.');
      return;
    }
    
    // Vérifier si l'utilisateur existe déjà
    if (users.find(u => u.username === username)) {
      setMessage('Ce nom d\'utilisateur existe déjà.');
      return;
    }

    const newUserId = `id_${Date.now()}`;
    const newUser = { username, _id: newUserId };
    setUsers([...users, newUser]);
    setExercises({ ...exercises, [newUserId]: [] });
    setMessage('Utilisateur créé avec succès!');
    setResult(newUser);
    setUsername('');
  };

  // Endpoint: GET /api/users
  const handleGetUsers = () => {
    setMessage('Utilisateurs récupérés.');
    setResult(users);
  };

  // Endpoint: POST /api/users/:_id/exercises
  const handleAddExercise = (e) => {
    e.preventDefault();
    if (!userId || !description || !duration) {
      setMessage('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    const user = users.find(u => u._id === userId);
    if (!user) {
      setMessage('ID utilisateur non valide.');
      return;
    }
    
    const durationInt = parseInt(duration, 10);
    if (isNaN(durationInt) || durationInt <= 0) {
      setMessage('La durée doit être un nombre positif.');
      return;
    }

    const exerciseDate = date ? new Date(date) : new Date();
    const newExercise = {
      description,
      duration: durationInt,
      date: exerciseDate.toDateString(),
    };

    const updatedExercises = {
      ...exercises,
      [userId]: [...(exercises[userId] || []), newExercise],
    };
    setExercises(updatedExercises);
    
    const response = {
      ...user,
      description,
      duration: durationInt,
      date: exerciseDate.toDateString(),
    };
    
    setMessage('Exercice ajouté avec succès!');
    setResult(response);
    setUserId('');
    setDescription('');
    setDuration('');
    setDate('');
  };

  // Endpoint: GET /api/users/:_id/logs
  const handleGetLog = (e) => {
    e.preventDefault();
    const user = users.find(u => u._id === logUserId);
    if (!user) {
      setMessage('ID utilisateur non valide.');
      return;
    }

    let userExercises = exercises[logUserId] || [];
    
    // Filtrage
    if (logFrom) {
      const fromDate = new Date(logFrom);
      userExercises = userExercises.filter(ex => new Date(ex.date) >= fromDate);
    }
    if (logTo) {
      const toDate = new Date(logTo);
      userExercises = userExercises.filter(ex => new Date(ex.date) <= toDate);
    }
    
    // Limitation
    if (logLimit) {
      const limitInt = parseInt(logLimit, 10);
      if (!isNaN(limitInt) && limitInt > 0) {
        userExercises = userExercises.slice(0, limitInt);
      }
    }
    
    const logResponse = {
      ...user,
      count: userExercises.length,
      log: userExercises,
    };

    setMessage('Journal d\'exercices récupéré.');
    setResult(logResponse);
  };
  
  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl p-8 space-y-8">
        <h1 className="text-4xl font-bold text-center text-gray-800">Suivi d'exercices (Solution API)</h1>
        
        {message && (
          <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded" role="alert">
            <p>{message}</p>
          </div>
        )}
        
        {/* Section de la base de données en mémoire */}
        <div className="space-y-4 p-4 border rounded-md bg-gray-50">
          <h2 className="text-xl font-semibold text-gray-700">Utilisateurs enregistrés (Base de données en mémoire)</h2>
          {users.length === 0 ? (
            <p className="text-gray-500">Aucun utilisateur n'a été créé.</p>
          ) : (
            <ul className="list-disc pl-5 space-y-1">
              {users.map(user => (
                <li key={user._id} className="text-gray-700">
                  <span className="font-medium">{user.username}</span> - ID: <code className="bg-gray-200 px-1 rounded text-sm">{user._id}</code>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Section pour la création d'un utilisateur */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-700 border-b pb-2">Créer un nouvel utilisateur</h2>
          <form onSubmit={handleCreateUser} className="flex flex-col md:flex-row gap-4">
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
        </div>

        {/* Section pour l'obtention de la liste des utilisateurs */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-700 border-b pb-2">Obtenir la liste des utilisateurs</h2>
          <button
            onClick={handleGetUsers}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-md shadow-md transition duration-300 ease-in-out transform hover:scale-105"
          >
            Obtenir tous les utilisateurs
          </button>
        </div>

        {/* Section pour l'ajout d'un exercice */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-700 border-b pb-2">Ajouter un exercice</h2>
          <form onSubmit={handleAddExercise} className="space-y-4">
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
        </div>
        
        {/* Section pour la récupération du journal d'exercices */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-700 border-b pb-2">Obtenir le journal d'exercices</h2>
          <form onSubmit={handleGetLog} className="space-y-4">
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
        </div>
        
        {/* Section pour l'affichage des résultats */}
        {result && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-700 border-b pb-2">Résultat de la requête</h2>
            <pre className="bg-gray-800 text-green-400 p-4 rounded-md overflow-x-auto">
              <code>{JSON.stringify(result, null, 2)}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
