const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: 'http://127.0.0.1:5500', // Match your frontend's origin
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type'],
        credentials: true,
    },
});


const lobbies = {}; // Store lobbies with game state

app.use(cors({
    origin: 'http://127.0.0.1:5500',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
}));

app.use(express.json());

// API to create a lobby
app.post('/create-lobby', (req, res) => {
    const gameCode = generateGameCode(); // Generate a unique code
    lobbies[gameCode] = { players: [], gameState: {} }; // Store the lobby
    res.status(200).json({ gameCode }); // Respond with the game code
    console.log('New game code created:', gameCode);

});


// WebSocket connection handler
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Join a lobby
    socket.on('joinLobby', ({ gameCode, playerName }) => {
        if (!lobbies[gameCode]) {
            socket.emit('error', 'Lobby not found');
            return;
        }
    
        const playerExists = lobbies[gameCode].players.some(player => player.id === socket.id);
        if (!playerExists) {
            lobbies[gameCode].players.push({ id: socket.id, name: playerName, lives: 3 });
        }
    
        socket.join(gameCode);
        io.to(gameCode).emit('playerJoined', lobbies[gameCode].players); // Notify all players
    });
    

    // Start game
    socket.on('startGame', (gameCode) => {
        if (!lobbies[gameCode]) {
            console.error('Game code not found:', gameCode);
            return;
        }
    
        // Ensure the game state is initialized
        if (!lobbies[gameCode].gameState.started) {
            const wordPairs = generateWordPairs();
            lobbies[gameCode].gameState = {
                started: true,
                players: lobbies[gameCode].players,
                currentPair: wordPairs.pop(),
                wordPairs,
                currentPlayer: 0,
            };
    
            io.to(gameCode).emit('gameStarted', lobbies[gameCode].gameState);
            console.log(`Game started for lobby ${gameCode}`);
        }
    });
    

    // Submit word
    socket.on('submitWord', ({ gameCode, word }) => {
        if (!lobbies[gameCode]) return;
        const gameState = lobbies[gameCode].gameState;
    
        const currentPlayer = gameState.players[gameState.currentPlayer];
    
        if (socket.id !== currentPlayer.id) {
            socket.emit('error', { message: "It's not your turn!" });
            return;
        }
    
        if (word.includes(gameState.currentPair)) {
            io.to(gameCode).emit('validWord', { word });
    
            gameState.currentPair = gameState.wordPairs.pop();
            gameState.currentPlayer = (gameState.currentPlayer + 1) % gameState.players.length;
    
            broadcastGameState(gameCode);
        } else {
            socket.emit('invalidWord', { word });
        }
    });
    

    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);

        // Remove the disconnected player from all lobbies
        Object.keys(lobbies).forEach(gameCode => {
            lobbies[gameCode].players = lobbies[gameCode].players.filter(player => player.id !== socket.id);

            // Notify remaining players
            io.to(gameCode).emit('playerJoined', lobbies[gameCode].players);
        });
    });

    socket.on('leaveLobby', ({ gameCode, playerId }) => {
        if (!lobbies[gameCode]) return;

        // Remove the player from the lobby
        lobbies[gameCode].players = lobbies[gameCode].players.filter(player => player.id !== playerId);

        // Notify the remaining players
        io.to(gameCode).emit('playerJoined', lobbies[gameCode].players);
    });

    socket.on('checkHost', ({ gameCode }) => {
        if (!lobbies[gameCode]) return;
        const isHost = lobbies[gameCode].players[0]?.id === socket.id;
        socket.emit('isHost', isHost); // Let the client know if they are the host
    });
});




// Utility: Generate a random 6-character game code
function generateGameCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function broadcastGameState(gameCode) {
    if (lobbies[gameCode]) {
        io.to(gameCode).emit('updateGameState', lobbies[gameCode].gameState);
    }
}

function initializeGameState(gameCode) {
    const wordPairs = generateWordPairs();
    lobbies[gameCode].gameState = {
        players: lobbies[gameCode].players,
        currentPair: wordPairs.pop(),
        wordPairs,
        currentPlayer: 0,
        started: true,
    };
}

// Utility: Generate word pairs
function generateWordPairs() {
    return [
        "sh", "oc", "so", "tr", "ex", "un", "al", "in", "th", "he", "an", "re", "er", "on", "at", "en",
        "nd", "ti", "es", "or", "te", "of", "ed", "is", "it", "ar", "st", "to", "nt", "ng", "se", "ha",
    ];
}

const PORT = 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
