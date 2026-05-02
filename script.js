class PuzzleGame {
    constructor() {
        this.currentImage = null;
        this.currentImageName = null;
        this.gridSize = 4;
        this.pieces = [];
        this.correctOrder = [];
        this.draggedElement = null;
        this.startTime = null;
        this.timerInterval = null;
        this.currentTime = 0;
        this.isGameActive = false;
        this.authSystem = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadHighScores();
        this.displayHighScores();
        this.authSystem = new AuthSystem();
    }

    setupEventListeners() {
        document.getElementById('imageUpload').addEventListener('change', (e) => {
            this.handleImageUpload(e);
        });

        document.getElementById('gridSize').addEventListener('change', (e) => {
            this.gridSize = parseInt(e.target.value);
            if (this.currentImage) {
                this.createPuzzle();
            }
            this.displayHighScores();
        });

        document.getElementById('shuffleBtn').addEventListener('click', () => {
            this.shufflePieces();
        });

        document.getElementById('resetBtn').addEventListener('click', () => {
            this.resetPuzzle();
        });
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.currentImage = e.target.result;
            this.currentImageName = file.name;
            this.displayOriginalImage();
            this.createPuzzle();
            this.enableControls();
        };
        reader.readAsDataURL(file);
    }

    displayOriginalImage() {
        const originalContainer = document.getElementById('originalImage');
        originalContainer.innerHTML = `<img src="${this.currentImage}" alt="Original Image">`;
    }

    setPieceBackground(piece, correctIndex) {
        const row = Math.floor(correctIndex / this.gridSize);
        const col = correctIndex % this.gridSize;
        
        const backgroundX = -(col * (100 / (this.gridSize - 1)));
        const backgroundY = -(row * (100 / (this.gridSize - 1)));
        
        piece.style.backgroundImage = `url(${this.currentImage})`;
        piece.style.backgroundSize = `${this.gridSize * 100}% ${this.gridSize * 100}%`;
        piece.style.backgroundPosition = `${backgroundX}% ${backgroundY}%`;
        
        // Add a small number indicator for debugging
        piece.innerHTML = `<span style="position: absolute; top: 2px; left: 2px; background: rgba(0,0,0,0.7); color: white; font-size: 10px; padding: 1px 3px; border-radius: 2px;">${correctIndex}</span>`;
    }

    createPuzzle() {
        const puzzleGrid = document.getElementById('puzzleGrid');
        puzzleGrid.innerHTML = '';
        puzzleGrid.style.gridTemplateColumns = `repeat(${this.gridSize}, 1fr)`;

        this.pieces = [];
        this.correctOrder = [];

        const totalPieces = this.gridSize * this.gridSize;

        for (let i = 0; i < totalPieces; i++) {
            const piece = document.createElement('div');
            piece.className = 'puzzle-piece';
            piece.dataset.correctIndex = i;
            piece.dataset.currentBackgroundIndex = i;
            
            this.setPieceBackground(piece, i);
            this.setupPieceDragAndDrop(piece);
            
            puzzleGrid.appendChild(piece);
            this.pieces.push(piece);
            this.correctOrder.push(i);
        }

        this.shufflePieces();
        this.initTimer();
    }

    setupPieceDragAndDrop(piece) {
        piece.draggable = true;

        piece.addEventListener('dragstart', (e) => {
            this.draggedElement = piece;
            piece.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        piece.addEventListener('dragend', (e) => {
            piece.classList.remove('dragging');
            this.clearDropZones();
        });

        piece.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        piece.addEventListener('dragenter', (e) => {
            e.preventDefault();
            if (piece !== this.draggedElement) {
                piece.classList.add('drop-zone');
            }
        });

        piece.addEventListener('dragleave', (e) => {
            piece.classList.remove('drop-zone');
        });

        piece.addEventListener('drop', (e) => {
            e.preventDefault();
            if (piece !== this.draggedElement) {
                this.startTimerOnFirstMove();
                this.swapPieces(this.draggedElement, piece);
                this.clearDropZones();
                this.checkWinCondition();
            }
        });

        // Touch support for mobile
        piece.addEventListener('touchstart', (e) => {
            this.draggedElement = piece;
        });

        piece.addEventListener('click', (e) => {
            if (this.draggedElement && this.draggedElement !== piece) {
                this.startTimerOnFirstMove();
                this.swapPieces(this.draggedElement, piece);
                this.draggedElement.classList.remove('dragging');
                this.draggedElement = null;
                this.checkWinCondition();
            } else {
                this.draggedElement = piece;
                piece.classList.add('dragging');
            }
        });
    }

    swapPieces(piece1, piece2) {
        // Swap the background images instead of DOM positions
        const piece1BackgroundIndex = piece1.dataset.currentBackgroundIndex;
        const piece2BackgroundIndex = piece2.dataset.currentBackgroundIndex;
        
        // Update background indices
        piece1.dataset.currentBackgroundIndex = piece2BackgroundIndex;
        piece2.dataset.currentBackgroundIndex = piece1BackgroundIndex;
        
        // Update background images
        this.setPieceBackground(piece1, parseInt(piece2BackgroundIndex));
        this.setPieceBackground(piece2, parseInt(piece1BackgroundIndex));
    }

    clearDropZones() {
        this.pieces.forEach(piece => {
            piece.classList.remove('drop-zone');
        });
    }

    shufflePieces() {
        // Create array of background indices for shuffling
        const backgroundIndices = [];
        for (let i = 0; i < this.pieces.length; i++) {
            backgroundIndices.push(i);
        }
        
        // Fisher-Yates shuffle the background indices
        for (let i = backgroundIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [backgroundIndices[i], backgroundIndices[j]] = [backgroundIndices[j], backgroundIndices[i]];
        }
        
        // Apply shuffled backgrounds to pieces (DOM stays in order)
        this.pieces.forEach((piece, index) => {
            const backgroundIndex = backgroundIndices[index];
            piece.dataset.currentBackgroundIndex = backgroundIndex;
            this.setPieceBackground(piece, backgroundIndex);
        });

        this.hideWinMessage();
        this.initTimer();
    }

    resetPuzzle() {
        // Reset each piece to show its correct background
        this.pieces.forEach(piece => {
            const correctIndex = parseInt(piece.dataset.correctIndex);
            piece.dataset.currentBackgroundIndex = correctIndex;
            piece.classList.remove('correct');
            this.setPieceBackground(piece, correctIndex);
        });

        this.hideWinMessage();
        this.initTimer();
    }

    checkWinCondition() {
        if (!this.isGameActive) return; // Don't check if game is already finished
        
        // Define the correct solved order for each grid size
        const solvedOrders = {
            3: [0, 2, 1, 6, 8, 7, 3, 5, 4],
            4: [0, 3, 2, 1, 12, 15, 14, 13, 8, 11, 10, 9, 4, 7, 6, 5],
            5: [0, 4, 3, 2, 1, 20, 24, 23, 22, 21, 15, 19, 18, 17, 16, 10, 14, 13, 12, 11, 5, 9, 8, 7, 6]
        };
        
        const solvedOrder = solvedOrders[this.gridSize];
        
        let isComplete = true;
        let correctCount = 0;
        
        this.pieces.forEach((piece, index) => {
            const currentBackgroundIndex = parseInt(piece.dataset.currentBackgroundIndex);
            const expectedBackgroundIndex = solvedOrder[index];
            
            // Check if the piece shows the correct background for the solved state
            if (currentBackgroundIndex === expectedBackgroundIndex) {
                piece.classList.add('correct');
                correctCount++;
            } else {
                piece.classList.remove('correct');
                isComplete = false;
            }
        });

        if (isComplete && this.pieces.length > 0) {
            this.stopTimer();
            const finalTime = this.currentTime;
            setTimeout(() => {
                this.showWinMessage(finalTime);
                this.checkNewRecord(finalTime);
            }, 500);
        }
    }

    showWinMessage(time) {
        const winMessage = document.getElementById('winMessage');
        winMessage.classList.remove('hidden');
        document.getElementById('completionTime').textContent = `Time: ${this.formatTime(time)}`;
        this.createConfetti();
        
        // Add click to dismiss
        winMessage.onclick = () => {
            this.hideWinMessage();
        };
    }

    hideWinMessage() {
        document.getElementById('winMessage').classList.add('hidden');
        this.clearConfetti();
    }

    enableControls() {
        document.getElementById('shuffleBtn').disabled = false;
        document.getElementById('resetBtn').disabled = false;
    }

    initTimer() {
        this.stopTimer();
        this.currentTime = 0;
        this.isGameActive = false;
        this.updateTimerDisplay();
        document.getElementById('newRecord').classList.add('hidden');
    }

    startTimer() {
        if (this.isGameActive) return; // Already started
        this.startTime = Date.now();
        this.currentTime = 0;
        this.isGameActive = true;
        this.timerInterval = setInterval(() => {
            this.currentTime = Date.now() - this.startTime;
            this.updateTimerDisplay();
        }, 10);
    }

    startTimerOnFirstMove() {
        if (!this.isGameActive && this.currentImage) {
            this.startTimer();
        }
    }

    stopTimer() {
        this.isGameActive = false;
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }



    updateTimerDisplay() {
        document.getElementById('timer').textContent = this.formatTime(this.currentTime);
    }

    formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const centiseconds = Math.floor((ms % 1000) / 10);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
    }

    loadHighScores() {
        // Load global high scores or user-specific scores
        const currentUser = this.authSystem?.getCurrentUser();
        let storageKey = 'puzzleHighScores';
        
        if (currentUser) {
            storageKey = `puzzleHighScores_${currentUser.username}`;
        }
        
        const saved = localStorage.getItem(storageKey);
        this.highScores = saved ? JSON.parse(saved) : {
            '3': [], '4': [], '5': []
        };
    }

    saveHighScores() {
        const currentUser = this.authSystem?.getCurrentUser();
        let storageKey = 'puzzleHighScores';
        
        if (currentUser) {
            storageKey = `puzzleHighScores_${currentUser.username}`;
        }
        
        localStorage.setItem(storageKey, JSON.stringify(this.highScores));
    }

    checkNewRecord(time) {
        const difficulty = this.gridSize.toString();
        const scores = this.highScores[difficulty];
        
        const newRecord = {
            time: time,
            date: new Date().toLocaleDateString()
        };
        
        scores.push(newRecord);
        scores.sort((a, b) => a.time - b.time);
        
        const isNewBest = scores[0] === newRecord;
        
        if (scores.length > 5) {
            scores.length = 5;
        }
        
        this.saveHighScores();
        this.displayHighScores();
        
        if (isNewBest) {
            document.getElementById('newRecord').classList.remove('hidden');
        }

        // Save to user's puzzle history if logged in
        if (this.authSystem && this.authSystem.getCurrentUser()) {
            this.authSystem.addPuzzleSolution(this.gridSize, time, this.currentImageName);
        }
    }

    displayHighScores() {
        const difficulty = this.gridSize.toString();
        const scores = this.highScores[difficulty] || [];
        const container = document.getElementById('highScores');
        
        if (scores.length === 0) {
            container.innerHTML = '<div class="no-scores">No records yet</div>';
            return;
        }
        
        container.innerHTML = scores.map((score, index) => `
            <div class="score-entry ${index === 0 ? 'best-score' : ''}">
                <span class="rank">${index + 1}.</span>
                <span class="time">${this.formatTime(score.time)}</span>
                <span class="date">${score.date}</span>
            </div>
        `).join('');
    }

    createConfetti() {
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd', '#98d8c8', '#f7dc6f'];
        const confettiCount = 100;

        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.animationDelay = Math.random() * 3 + 's';
            confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
            confetti.style.setProperty('--bg-color', colors[Math.floor(Math.random() * colors.length)]);
            
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animation = 'confetti-fall linear forwards';
            confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
            confetti.style.animationDelay = Math.random() * 3 + 's';
            
            document.body.appendChild(confetti);
            
            // Remove confetti after animation
            setTimeout(() => {
                if (confetti.parentNode) {
                    confetti.parentNode.removeChild(confetti);
                }
            }, 8000);
        }
    }

    clearConfetti() {
        const confettiElements = document.querySelectorAll('.confetti');
        confettiElements.forEach(confetti => {
            if (confetti.parentNode) {
                confetti.parentNode.removeChild(confetti);
            }
        });
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new PuzzleGame();
});
