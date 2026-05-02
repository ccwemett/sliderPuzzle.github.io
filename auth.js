class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.users = {};
        this.init();
    }

    init() {
        this.loadUsers();
        this.ensureModalsHidden();
        this.setupEventListeners();
        this.checkCurrentSession();
    }

    ensureModalsHidden() {
        // Make sure modals are properly hidden on startup
        const profileModal = document.getElementById('profileModal');
        const authModal = document.getElementById('authModal');
        
        if (profileModal) {
            profileModal.classList.add('hidden');
            profileModal.style.display = 'none';
        }
        
        if (authModal) {
            authModal.style.display = 'none';
        }
    }

    setupEventListeners() {
        // Wait for DOM elements to be available
        const requiredElements = [
            'loginTab', 'signupTab', 'loginBtn', 'signupBtn', 
            'logoutBtn', 'profileBtn', 'guestLoginBtn'
        ];
        
        const allElementsExist = requiredElements.every(id => document.getElementById(id));
        if (!allElementsExist) {
            console.warn('Some DOM elements not ready, retrying...');
            setTimeout(() => this.setupEventListeners(), 100);
            return;
        }

        // Auth tab switching
        document.getElementById('loginTab').addEventListener('click', () => {
            this.switchTab('login');
        });
        
        document.getElementById('signupTab').addEventListener('click', () => {
            this.switchTab('signup');
        });

        // Form submissions
        document.getElementById('loginBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        document.getElementById('signupBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.handleSignup();
        });

        // Header controls
        document.getElementById('logoutBtn').addEventListener('click', () => {
            this.handleLogout();
        });

        document.getElementById('profileBtn').addEventListener('click', () => {
            this.showProfileModal();
        });

        document.getElementById('guestLoginBtn').addEventListener('click', () => {
            this.showAuthModal();
        });

        // Profile modal controls
        const closeProfileBtn = document.getElementById('closeProfile');
        const saveProfileBtn = document.getElementById('saveProfile');
        const profileModal = document.getElementById('profileModal');
        const authModal = document.getElementById('authModal');

        if (closeProfileBtn) {
            closeProfileBtn.addEventListener('click', () => {
                this.hideProfileModal();
            });
        }

        if (saveProfileBtn) {
            saveProfileBtn.addEventListener('click', () => {
                this.saveProfileChanges();
            });
        }

        // Close profile modal when clicking outside of it
        if (profileModal) {
            profileModal.addEventListener('click', (e) => {
                if (e.target === profileModal) {
                    this.hideProfileModal();
                }
            });
        }

        // Close auth modal when clicking outside of it
        if (authModal) {
            authModal.addEventListener('click', (e) => {
                if (e.target === authModal) {
                    this.hideAuthModal();
                }
            });
        }

        // Profile customization
        this.setupProfileCustomization();

        // Keyboard event handling
        document.getElementById('loginPassword').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });

        document.getElementById('confirmPassword').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSignup();
        });

        // Escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const profileModal = document.getElementById('profileModal');
                const authModal = document.getElementById('authModal');
                
                if (profileModal && !profileModal.classList.contains('hidden')) {
                    this.hideProfileModal();
                }
                if (authModal && authModal.style.display !== 'none') {
                    this.hideAuthModal();
                }
            }
        });
    }

    setupProfileCustomization() {
        // Avatar selection
        document.querySelectorAll('.avatar-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
            });
        });

        // Theme selection
        document.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                this.applyTheme(option.dataset.theme);
            });
        });
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.auth-tab').forEach(tab => tab.classList.remove('active'));
        document.getElementById(tabName + 'Tab').classList.add('active');

        // Update forms
        document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
        document.getElementById(tabName + 'Form').classList.add('active');

        // Clear error messages
        this.clearErrors();
    }

    handleLogin() {
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!username || !password) {
            this.showError('loginError', 'Please fill in all fields');
            return;
        }

        if (this.users[username] && this.users[username].password === password) {
            this.currentUser = this.users[username];
            localStorage.setItem('currentUser', username);
            this.showMainInterface();
            this.clearForms();
            this.hideAuthModal();
        } else {
            this.showError('loginError', 'Invalid username or password');
        }
    }

    handleSignup() {
        const username = document.getElementById('signupUsername').value.trim();
        const email = document.getElementById('signupEmail').value.trim();
        const password = document.getElementById('signupPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Validation
        if (!username || !email || !password || !confirmPassword) {
            this.showError('signupError', 'Please fill in all fields');
            return;
        }

        if (username.length < 3) {
            this.showError('signupError', 'Username must be at least 3 characters');
            return;
        }

        if (password.length < 6) {
            this.showError('signupError', 'Password must be at least 6 characters');
            return;
        }

        if (password !== confirmPassword) {
            this.showError('signupError', 'Passwords do not match');
            return;
        }

        if (this.users[username]) {
            this.showError('signupError', 'Username already exists');
            return;
        }

        // Create new user
        const newUser = {
            username,
            email,
            password,
            avatar: '👤',
            theme: 'default',
            joinDate: new Date().toISOString(),
            puzzleHistory: [],
            totalSolved: 0,
            bestTime: null,
            totalPlayTime: 0
        };

        this.users[username] = newUser;
        this.currentUser = newUser;
        localStorage.setItem('currentUser', username);
        this.saveUsers();
        this.showMainInterface();
        this.clearForms();
        this.hideAuthModal();
    }

    handleLogout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        this.showMainInterfaceAsGuest();
    }

    checkCurrentSession() {
        const savedUsername = localStorage.getItem('currentUser');
        if (savedUsername && this.users[savedUsername]) {
            this.currentUser = this.users[savedUsername];
            this.showMainInterface();
        } else {
            // Show main interface without login by default
            this.showMainInterfaceAsGuest();
        }
    }

    showAuthModal() {
        document.getElementById('authModal').style.display = 'flex';
    }

    hideAuthModal() {
        document.getElementById('authModal').style.display = 'none';
    }

    showMainInterface() {
        document.getElementById('userHeader').style.display = 'flex';
        document.getElementById('displayUsername').textContent = this.currentUser.username;
        document.getElementById('userAvatar').textContent = this.currentUser.avatar;
        document.getElementById('puzzleHistorySection').style.display = 'block';
        
        // Show logged in user controls
        document.getElementById('profileBtn').style.display = 'inline-block';
        document.getElementById('logoutBtn').style.display = 'inline-block';
        document.getElementById('guestLoginBtn').style.display = 'none';
        
        // Apply user's theme
        this.applyTheme(this.currentUser.theme);
        
        // Update puzzle statistics
        this.updatePuzzleStats();
    }

    showMainInterfaceAsGuest() {
        // Hide auth modal and show basic interface
        this.hideAuthModal();
        
        // Show guest header with login option
        document.getElementById('userHeader').style.display = 'flex';
        document.getElementById('displayUsername').textContent = 'Guest Player';
        document.getElementById('userAvatar').textContent = '👤';
        document.getElementById('puzzleHistorySection').style.display = 'none';
        
        // Show guest controls
        document.getElementById('profileBtn').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'none';
        document.getElementById('guestLoginBtn').style.display = 'inline-block';
        
        // Apply default theme
        this.applyTheme('default');
    }

    hideMainInterface() {
        document.getElementById('userHeader').style.display = 'none';
        document.getElementById('puzzleHistorySection').style.display = 'none';
        
        // Reset to default theme
        this.applyTheme('default');
    }

    showProfileModal() {
        const modal = document.getElementById('profileModal');
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        this.populateProfileData();
    }

    hideProfileModal() {
        const modal = document.getElementById('profileModal');
        modal.classList.add('hidden');
        modal.style.display = 'none';
    }

    populateProfileData() {
        const user = this.currentUser;
        
        // Set selected avatar
        document.querySelectorAll('.avatar-option').forEach(option => {
            option.classList.toggle('selected', option.dataset.avatar === user.avatar);
        });

        // Set selected theme
        document.querySelectorAll('.theme-option').forEach(option => {
            option.classList.toggle('selected', option.dataset.theme === user.theme);
        });

        // Update statistics
        document.getElementById('profileTotalSolved').textContent = user.totalSolved;
        document.getElementById('profileBestTime').textContent = user.bestTime ? this.formatTime(user.bestTime) : '-';
        document.getElementById('profileAvgTime').textContent = this.getAverageTime();
        document.getElementById('memberSince').textContent = new Date(user.joinDate).toLocaleDateString();

        // Update recent puzzles
        this.displayRecentPuzzles();
    }

    saveProfileChanges() {
        const selectedAvatar = document.querySelector('.avatar-option.selected')?.dataset.avatar || '👤';
        const selectedTheme = document.querySelector('.theme-option.selected')?.dataset.theme || 'default';

        this.currentUser.avatar = selectedAvatar;
        this.currentUser.theme = selectedTheme;

        // Update UI
        document.getElementById('userAvatar').textContent = selectedAvatar;
        this.applyTheme(selectedTheme);

        this.saveUsers();
        this.hideProfileModal();
    }

    applyTheme(theme) {
        document.body.className = theme !== 'default' ? `${theme}-theme` : '';
    }

    addPuzzleSolution(gridSize, time, imageName) {
        if (!this.currentUser) return;

        const puzzleRecord = {
            gridSize,
            time,
            imageName: imageName || 'Custom Image',
            date: new Date().toISOString(),
            difficulty: this.getDifficultyName(gridSize)
        };

        this.currentUser.puzzleHistory.unshift(puzzleRecord);
        this.currentUser.totalSolved++;
        this.currentUser.totalPlayTime += time;

        if (!this.currentUser.bestTime || time < this.currentUser.bestTime) {
            this.currentUser.bestTime = time;
        }

        // Keep only last 50 records
        if (this.currentUser.puzzleHistory.length > 50) {
            this.currentUser.puzzleHistory = this.currentUser.puzzleHistory.slice(0, 50);
        }

        this.saveUsers();
        this.updatePuzzleStats();
    }

    updatePuzzleStats() {
        if (!this.currentUser) return;

        document.getElementById('totalSolved').textContent = this.currentUser.totalSolved;
        document.getElementById('averageTime').textContent = this.getAverageTime();
    }

    getAverageTime() {
        if (!this.currentUser || this.currentUser.totalSolved === 0) return '-';
        
        const avgMs = this.currentUser.totalPlayTime / this.currentUser.totalSolved;
        return this.formatTime(avgMs);
    }

    displayRecentPuzzles() {
        const container = document.getElementById('recentPuzzles');
        const puzzles = this.currentUser.puzzleHistory.slice(0, 5);

        if (puzzles.length === 0) {
            container.innerHTML = '<div class="no-puzzles">No puzzles solved yet. Start playing to see your history!</div>';
            return;
        }

        container.innerHTML = puzzles.map(puzzle => `
            <div class="puzzle-entry">
                <div>
                    <strong>${puzzle.difficulty}</strong> - ${puzzle.imageName}
                </div>
                <div>
                    <span class="time">${this.formatTime(puzzle.time)}</span>
                    <span class="date">${new Date(puzzle.date).toLocaleDateString()}</span>
                </div>
            </div>
        `).join('');
    }

    getDifficultyName(gridSize) {
        const difficulties = {
            3: 'Easy (3x3)',
            4: 'Medium (4x4)',
            5: 'Hard (5x5)'
        };
        return difficulties[gridSize] || `${gridSize}x${gridSize}`;
    }

    formatTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const centiseconds = Math.floor((ms % 1000) / 10);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
    }

    showError(elementId, message) {
        document.getElementById(elementId).textContent = message;
    }

    clearErrors() {
        document.getElementById('loginError').textContent = '';
        document.getElementById('signupError').textContent = '';
    }

    clearForms() {
        document.querySelectorAll('.auth-form input').forEach(input => input.value = '');
        this.clearErrors();
    }

    loadUsers() {
        const saved = localStorage.getItem('puzzleUsers');
        this.users = saved ? JSON.parse(saved) : {};
    }

    saveUsers() {
        localStorage.setItem('puzzleUsers', JSON.stringify(this.users));
    }

    getCurrentUser() {
        return this.currentUser;
    }
}
