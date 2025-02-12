const socket = io('http://159.89.9.120:3000', {
    transports: ['websocket', 'polling'],
});
console.log('Socket initialized:', socket);

let players = [];
let currentTurn = 0;
let lives = {};
let usedWords = new Set();
let wordPairs = [
    "sh", "oc", "so", "tr", "ex", "un", "al", "in", "th", "he", "an", "re", "er", "on", "at", "en", "nd", "ti", "es", "or", "te", "of", "ed", "is", "it", "ar", "st", "to", "nt", "ng", "se", "ha", "as", "ou", "io", "le", "ve", "co", "me", "de", "hi", "ri", "ro", "ic", "ne", "ea", "ra", "ce", "li", "ch", "ll", "be", "ma", "si", "om", "ur", "ca", "el", "ta", "la", 
    "no", "di", "pe", "mo", "lo", "us", "mi", "na", "pa", "pr", "po", "do", "fo", "wi", "ho", "we", "wh", "fr", "pl", "gr", "cl", "fl", "bl", "cr", "dr", "br", "gl", "sl", "sp", "sc", "sk", "sm", "sn", "sw", "tw", "qu", "ph", "gh", "kn", "wr", "ck", "ng", "nk", "th", "wh", "sh", "ch", "ph", "gh", "ck", "ng", "nk"
];
let currentPair;
let timer;
let validWords = new Set();
let gameCode;

fetch('http://159.89.9.120:3000/code/bombdle-backend/words.txt')
    .then(response => response.text())
    .then(text => {
        validWords = new Set(text.split('\n').map(word => word.trim().toLowerCase()));
    })
    .catch(error => console.error('Failed to load words:', error));

function createLobby() {
    fetch('http://159.89.9.120:3000/create-lobby', { method: 'POST' })
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            gameCode = data.gameCode;
            const playerName = prompt('Enter your name:');
            socket.emit('joinLobby', { gameCode, playerName });
            showLobby(gameCode);
        })
        .catch(error => {
            console.error('Error creating lobby:', error);
            alert('Failed to create lobby. Please try again.');
        });
}

function joinLobby() {
    const playerName = prompt('Enter your name:');
    const code = prompt('Enter the game code:');

    if (!socket) {
        console.error('Socket not initialized.');
        alert('Unable to connect to the server. Please try again.');
        return;
    }

    gameCode = code;
    socket.emit('joinLobby', { gameCode: code, playerName });
    showLobby(code);
}

socket.on('playerJoined', (updatedPlayers) => {
    players = updatedPlayers;
    updatePlayersList(players);
});

function updatePlayersList(players) {
    const playersList = document.getElementById('players-list');
    playersList.innerHTML = '';

    players.forEach(player => {
        const listItem = document.createElement('li');
        listItem.textContent = player.name;
        playersList.appendChild(listItem);
    });
}

function startGame() {
    if (!gameCode) {
        alert('Game code is missing. Please rejoin the lobby.');
        return;
    }

    socket.emit('startGame', gameCode);
    console.log('Game started by player.');
}

function leaveLobby() {
    socket.emit('leaveLobby', { gameCode, playerId: socket.id });
    document.getElementById('lobby-container').style.display = 'none';
    document.getElementById('start-container').style.display = 'block';
}

socket.on('gameStarted', (gameState) => {
    console.log('Game started!', gameState);
    document.getElementById('lobby-container').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    players = gameState.players;
    currentTurn = gameState.currentPlayer;
    currentPair = gameState.currentPair;
    document.getElementById('word-prompt').textContent = `Find a word containing: ${currentPair}`;
    document.getElementById('status').textContent = `${players[currentTurn].name}'s turn!`;
    renderPlayers(players);
});

socket.on('updateGameState', (gameState) => {
    players = gameState.players;
    currentTurn = gameState.currentPlayer;
    currentPair = gameState.currentPair;
    document.getElementById('word-prompt').textContent = `Find a word containing: ${currentPair}`;
    document.getElementById('status').textContent = `${players[currentTurn].name}'s turn!`;
    renderPlayers(players);
    const isCurrentPlayer = players[currentTurn].id === socket.id;
    document.getElementById('word-input').disabled = !isCurrentPlayer;
    document.querySelector('[onclick="submitWord()"]').style.display = isCurrentPlayer ? 'inline-block' : 'none';
    highlightCurrentPlayer();
});

socket.on('updateTime', (timeLeft) => {
    document.getElementById('timer').textContent = `Time left: ${timeLeft}s`;
});

socket.on('gameOver', ({ winner }) => {
    clearTimeout(timer);
    document.getElementById("game-container").style.display = "none";
    document.getElementById("winner-container").style.display = "block";
    document.getElementById("winner").textContent = `${winner} wins! 🎉`;
    document.getElementById("winner").classList.add("celebrate");
});

function submitWord() {
    const word = document.getElementById('word-input').value.toLowerCase();
    if (validWords.has(word)) {
        socket.emit('submitWord', { gameCode, word });
    } else {
        showMessage("wrong", "Invalid word or word already used!");
    }
}

socket.on('validWord', ({ word }) => {
    console.log(`Valid word: ${word}`);
    showMessage("correct", "Correct!");
    document.getElementById("word-input").value = '';
    nextPlayer();
});

socket.on('invalidWord', ({ word }) => {
    console.log(`Invalid word: ${word}`);
    showMessage("wrong", "Invalid word or word already used!");
});

function renderPlayers(playersList) {
    if (!playersList || playersList.length === 0) return;

    const playersContainer = document.getElementById('players');
    playersContainer.innerHTML = '';

    playersList.forEach(player => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'player';
        playerDiv.textContent = `${player.name} - Lives: ${player.lives}`;
        for (let i = 0; i < player.lives; i++) {
            const heart = document.createElement('img');
            heart.className = 'heart';
            heart.src = 'img/heart.png';
            heart.alt = '❤️';
            playerDiv.appendChild(heart);
        }
        playersContainer.appendChild(playerDiv);
    });
}

function highlightCurrentPlayer() {
    if (!players || players.length === 0 || currentTurn === undefined) return;

    const playerDivs = document.querySelectorAll('.player');
    playerDivs.forEach((div, index) => {
        if (index === currentTurn) {
            div.classList.add('active');
        } else {
            div.classList.remove('active');
        }
    });
}

function nextTurn() {
    if (players.length === 0) {
        alert("Game Over!");
        return;
    }

    if (players.length === 1) {
        declareWinner(players[0].name);
        return;
    }

    document.getElementById("word-prompt").textContent = `Find a word containing: ${currentPair}`;
    document.getElementById("status").textContent = `${players[currentTurn].name}'s turn!`;
    highlightCurrentPlayer();
}

function declareWinner(winner) {
    clearTimeout(timer);
    document.getElementById("game-container").style.display = "none";
    document.getElementById("winner-container").style.display = "block";
    document.getElementById("winner").textContent = `${winner} wins! 🎉`;
    document.getElementById("winner").classList.add("celebrate");
}

function showMessage(type, text) {
    const messageDiv = document.querySelector(`.message.${type}`);
    messageDiv.textContent = text;
    messageDiv.style.display = "block";
    setTimeout(() => {
        messageDiv.style.display = "none";
    }, 2000);
}

function nextPlayer() {
    currentTurn = (currentTurn + 1) % players.length;
    renderPlayers(players);
    nextTurn();
}

function loseLife(playerName) {
    const player = players.find(p => p.name === playerName);
    player.lives--;
    if (player.lives <= 0) {
        players = players.filter(p => p.name !== playerName);
    }
    socket.emit('updateGameState', { gameCode, players });
    nextPlayer();
}

function goBackToMenu() {
    clearTimeout(timer);
    document.getElementById("game-container").style.display = "none";
    document.getElementById("winner-container").style.display = "none";
    document.getElementById("start-container").style.display = "block";
    document.getElementById("winner").classList.remove("celebrate");
    players = [];
    currentTurn = 0;
    lives = {};
    usedWords = new Set();
}

function showHelp() {
    document.getElementById('help-modal').style.display = 'block';
}

function closeHelp() {
    document.getElementById('help-modal').style.display = 'none';
}

function showLobby(gameCode) {
    document.getElementById('start-container').style.display = 'none';
    document.getElementById('lobby-container').style.display = 'block';
    document.getElementById('lobby-code').querySelector('span').textContent = gameCode;
    socket.emit('checkHost', { gameCode });
}

socket.on('isHost', (isHost) => {
    document.getElementById('start-game-button').style.display = isHost ? 'block' : 'none';   
});

