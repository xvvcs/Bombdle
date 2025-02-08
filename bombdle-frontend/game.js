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

const socket = io('http://localhost:3000');
let gameCode;

// Load words from words.txt
fetch('words.txt')
    .then(response => response.text())
    .then(text => {
        validWords = new Set(text.split('\n').map(word => word.trim().toLowerCase()));
    });

    function createLobby() {
        fetch('http://127.0.0.1:3000/create-lobby', { method: 'POST' })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then((data) => {
                const gameCode = data.gameCode;
                alert(`Lobby created! Share this code with your friends: ${gameCode}`);
                console.log('New game code created:', gameCode);
            })
            .catch(error => {
                console.error('Error creating lobby:', error);
                alert('Failed to create lobby. Please try again.');
            });
    }
    

function joinLobby() {
    const playerName = prompt('Enter your name:');
    const code = prompt('Enter the game code:');
    socket.emit('joinLobby', { gameCode: code, playerName });
}

socket.on('playerJoined', (players) => {
    console.log('Players in the lobby:', players);
    renderPlayers(players);
});

function startGame() {
    socket.emit('startGame', gameCode);
}

socket.on('gameStarted', (gameState) => {
    console.log('Game started!', gameState);
    players = gameState.players;
    currentTurn = gameState.currentTurn;
    lives = gameState.lives;
    document.getElementById('nickname-container').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    renderPlayers();
    nextTurn();
});

function submitWord() {
    const word = document.getElementById('word-input').value.toLowerCase();
    socket.emit('submitWord', { gameCode, word });
}

socket.on('validWord', ({ word }) => {
    console.log(`Valid word: ${word}`);
    showMessage("correct", "Correct!");
    document.getElementById("word-input").value = ''; // Clear the input field
    nextPlayer();
});

socket.on('invalidWord', ({ word }) => {
    console.log(`Invalid word: ${word}`);
    showMessage("wrong", "Invalid word or word already used!");
});

function renderPlayers(playersList) {
    const playersContainer = document.getElementById("players");
    playersContainer.innerHTML = '';
    playersList.forEach(player => {
        const playerDiv = document.createElement("div");
        playerDiv.className = "player";
        playerDiv.textContent = player.name;
        for (let i = 0; i < player.lives; i++) {
            const heart = document.createElement("img");
            heart.className = "heart";
            heart.src = "img/heart.png"; // Path to the heart icon image
            heart.alt = "❤️";
            playerDiv.appendChild(heart);
        }
        playersContainer.appendChild(playerDiv);
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
    
    currentPair = wordPairs[Math.floor(Math.random() * wordPairs.length)];
    document.getElementById("word-prompt").textContent = `Find a word containing: ${currentPair}`;
    document.getElementById("status").textContent = `${players[currentTurn].name}'s turn!`;
    highlightCurrentPlayer();
    resetTimer();
}

function declareWinner(winner) {
    clearTimeout(timer);
    document.getElementById("game-container").style.display = "none";
    document.getElementById("winner-container").style.display = "block";
    document.getElementById("winner").textContent = `${winner} wins! 🎉`;
    document.getElementById("winner").classList.add("celebrate");
}

function highlightCurrentPlayer() {
    const playerDivs = document.querySelectorAll(".player");
    playerDivs.forEach((div, index) => {
        if (index === currentTurn) {
            div.classList.add("active");
        } else {
            div.classList.remove("active");
        }
    });
}

function resetTimer() {
    clearTimeout(timer);
    let timeLimit = Math.floor(Math.random() * 5) + 5;
    timer = setTimeout(() => loseLife(players[currentTurn].name), timeLimit * 1000);
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
    renderPlayers(players); // Update the players' lives display
    nextTurn();
}

function loseLife(playerName) {
    const player = players.find(p => p.name === playerName);
    player.lives--;
    if (player.lives <= 0) {
        players = players.filter(p => p.name !== playerName);
    }
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