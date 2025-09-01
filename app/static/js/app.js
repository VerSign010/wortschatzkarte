// File: app/static/js/app.js (V11.1 - With Jump-to-Word)
document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // --- 1. STATE: The single source of truth ---
    const state = {
        allWords: [],
        displayedWords: [],
        currentIndex: 0,
        favorites: new Set(JSON.parse(localStorage.getItem('wortschatz_favorites_bedrock')) || []),
        appMode: 'review',
        score: parseInt(localStorage.getItem('wortschatz_score_bedrock')) || 0,
        streak: parseInt(localStorage.getItem('wortschatz_streak_bedrock')) || 0,
    };

    // --- 2. DOM ELEMENTS: Direct, simple, and reliable ---
    const els = {
        sheetUrl: document.getElementById('sheet-url'),
        loadBtn: document.getElementById('load-btn'),
        scoreDisplay: document.getElementById('score-display'),
        streakDisplay: document.getElementById('streak-display'),
        modeSwitches: document.querySelectorAll('input[name="mode"]'),
        favoritesOnlyToggle: document.getElementById('favorites-only-toggle'),
        statusBar: document.getElementById('status-bar'),
        flashcardContainer: document.getElementById('flashcard-container'),
        flashcard: document.getElementById('flashcard'),
        imageContainer: document.getElementById('image-container'),
        germanWord: document.getElementById('german-word'),
        chineseMeaning: document.getElementById('chinese-meaning'),
        exampleSentence: document.getElementById('example-sentence'),
        quizArea: document.getElementById('quiz-area'),
        answerInput: document.getElementById('answer-input'),
        submitAnswerBtn: document.getElementById('submit-answer-btn'),
        pronounceBtn: document.getElementById('pronounce-btn'),
        favoriteBtn: document.getElementById('favorite-btn'),
        navigation: document.getElementById('navigation'),
        prevBtn: document.getElementById('prev-btn'),
        nextBtn: document.getElementById('next-btn'),
        cardCounter: document.getElementById('card-counter'),
        feedbackOverlay: document.getElementById('feedback-overlay'),
    };

    // --- 3. CORE LOGIC: Functions that do one thing well ---

    function updateStatus(message, isError = false) {
        els.statusBar.textContent = message;
        els.statusBar.style.color = isError ? '#dc3545' : '#6c757d';
        els.statusBar.classList.remove('hidden');
    }

    function updateStats() {
        els.scoreDisplay.innerHTML = `<i data-feather="star"></i> ${state.score}`;
        els.streakDisplay.innerHTML = `<i data-feather="zap"></i> ${state.streak}`;
        feather.replace();
    }

    async function loadImage(word) {
        els.imageContainer.innerHTML = `<i data-feather="image"></i>`;
        feather.replace();
        try {
            const response = await fetch(`/api/image?query=${encodeURIComponent(word)}`);
            const data = await response.json();
            if (data.url) els.imageContainer.innerHTML = `<img src="${data.url}" alt="${word}">`;
        } catch (error) { console.error('Image loading error:', error); }
    }

    function renderCard() {
        if (state.displayedWords.length === 0) {
            els.flashcardContainer.classList.add('hidden');
            els.navigation.classList.add('hidden');
            updateStatus(els.favoritesOnlyToggle.checked ? '没有收藏的词汇' : '词汇表为空, 请加载');
            return;
        }
        els.flashcardContainer.classList.remove('hidden');
        els.navigation.classList.remove('hidden');
        els.statusBar.classList.add('hidden');

        const word = state.displayedWords[state.currentIndex];
        els.chineseMeaning.textContent = word.chinese;
        els.exampleSentence.textContent = word.example;
        els.cardCounter.textContent = `${state.currentIndex + 1} / ${state.displayedWords.length}`;
        els.germanWord.textContent = (state.appMode === 'review') ? word.german : '???';
        els.quizArea.classList.toggle('hidden', state.appMode === 'review');
        els.flashcard.classList.remove('is-flipped');
        if (state.appMode === 'quiz') els.answerInput.value = '';
        
        els.favoriteBtn.classList.toggle('active', state.favorites.has(word.id));
        loadImage(word.german);
    }

    function filterAndNavigate() {
        state.displayedWords = els.favoritesOnlyToggle.checked 
            ? state.allWords.filter(w => state.favorites.has(w.id)) 
            : state.allWords;
        state.currentIndex = 0;
        renderCard();
        saveSession();
    }

    function navigate(direction) {
        if (state.displayedWords.length === 0) return;
        const len = state.displayedWords.length;
        if (direction === 'next') {
            state.currentIndex = (state.currentIndex + 1) % len;
        } else {
            state.currentIndex = (state.currentIndex - 1 + len) % len;
        }
        renderCard();
        saveSession();
    }

    async function loadVocabulary() {
        const url = els.sheetUrl.value.trim();
        if (!url) return updateStatus('请输入链接', true);
        updateStatus('正在加载...');
        els.loadBtn.disabled = true;
        try {
            const response = await fetch(`/api/vocabulary?url=${encodeURIComponent(url)}`);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || '无法获取数据');
            state.allWords = data;
            localStorage.setItem('wortschatz_url_bedrock', url);
            loadSession();
        } catch (e) {
            updateStatus(`加载失败: ${e.message}`, true);
        } finally {
            els.loadBtn.disabled = false;
        }
    }

    function saveSession() {
        const session = { currentIndex: state.currentIndex, favoritesOnly: els.favoritesOnlyToggle.checked };
        localStorage.setItem('wortschatz_session_bedrock', JSON.stringify(session));
    }

    function loadSession() {
        const session = JSON.parse(localStorage.getItem('wortschatz_session_bedrock'));
        if (session) els.favoritesOnlyToggle.checked = session.favoritesOnly;
        
        state.displayedWords = els.favoritesOnlyToggle.checked 
            ? state.allWords.filter(w => state.favorites.has(w.id)) 
            : state.allWords;

        state.currentIndex = (session && session.currentIndex < state.displayedWords.length) ? session.currentIndex : 0;
        renderCard();
    }

    async function checkAnswer() {
        const word = state.displayedWords[state.currentIndex];
        const userAnswer = els.answerInput.value.trim();
        if (!word || !userAnswer) return;
        
        els.submitAnswerBtn.disabled = true;
        const isCorrect = userAnswer.toLowerCase() === word.german.toLowerCase();
        
        if (isCorrect) { state.score += 10; state.streak++; } else { state.streak = 0; }
        localStorage.setItem('wortschatz_score_bedrock', state.score);
        localStorage.setItem('wortschatz_streak_bedrock', state.streak);
        updateStats();
        
        els.germanWord.textContent = word.german;
        els.flashcard.classList.remove('is-flipped');
        
        // Visual feedback can be added here if desired
        
        setTimeout(() => {
            navigate('next');
            els.submitAnswerBtn.disabled = false;
        }, 1500);
    }

    function showJumpInput() {
        if (document.getElementById('jump-to-input')) return; // Prevent multiple inputs

        const currentCounter = els.cardCounter;
        const input = document.createElement('input');
        input.type = 'number';
        input.id = 'jump-to-input';
        input.value = state.currentIndex + 1;
        
        const handleJump = () => {
            const targetPage = parseInt(input.value, 10);
            // Restore the span element before doing anything else
            input.replaceWith(currentCounter);
            
            if (!isNaN(targetPage) && targetPage > 0 && targetPage <= state.displayedWords.length) {
                state.currentIndex = targetPage - 1; // Convert 1-based page to 0-based index
                renderCard();
                saveSession();
            }
        };

        input.addEventListener('blur', handleJump);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                input.blur(); // Trigger the blur event to handle the jump
            }
        });

        currentCounter.replaceWith(input);
        input.focus();
        input.select();
    }

    // --- 4. INITIALIZATION & EVENT LISTENERS ---

    function init() {
        // Load saved state
        const savedUrl = localStorage.getItem('wortschatz_url_bedrock');
        if (savedUrl) {
            els.sheetUrl.value = savedUrl;
            loadVocabulary();
        }
        updateStats();

        // Setup all event listeners
        els.loadBtn.addEventListener('click', loadVocabulary);
        els.flashcard.addEventListener('click', (e) => {
            if (!e.target.closest('.card-actions')) els.flashcard.classList.toggle('is-flipped');
        });
        els.prevBtn.addEventListener('click', () => navigate('prev'));
        els.nextBtn.addEventListener('click', () => navigate('next'));
        els.favoritesOnlyToggle.addEventListener('change', filterAndNavigate);
        els.modeSwitches.forEach(sw => sw.addEventListener('change', (e) => {
            state.appMode = e.target.value;
            filterAndNavigate();
        }));
        els.favoriteBtn.addEventListener('click', () => {
            const word = state.displayedWords[state.currentIndex];
            if (!word) return;
            if (state.favorites.has(word.id)) {
                state.favorites.delete(word.id);
            } else {
                state.favorites.add(word.id);
            }
            localStorage.setItem('wortschatz_favorites_bedrock', JSON.stringify(Array.from(state.favorites)));
            els.favoriteBtn.classList.toggle('active');
        });
        els.pronounceBtn.addEventListener('click', () => {
            const word = state.displayedWords[state.currentIndex];
            if (word) new Audio(`/api/tts/${encodeURIComponent(word.german)}`).play();
        });
        els.submitAnswerBtn.addEventListener('click', checkAnswer);
        els.answerInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') checkAnswer();
        });
        els.cardCounter.addEventListener('click', showJumpInput);

        feather.replace();
    }

    init();
});