// File: app/static/js/app.js (V12.1 - Autoplay Logic Fixed)
document.addEventListener('DOMContentLoaded', () => {
    'use strict';

    // --- 1. STATE ---
    const state = {
        allWords: [],
        displayedWords: [],
        currentIndex: 0,
        favorites: new Set(JSON.parse(localStorage.getItem('wortschatz_favorites_bedrock')) || []),
        appMode: 'review',
        score: parseInt(localStorage.getItem('wortschatz_score_bedrock')) || 0,
        streak: parseInt(localStorage.getItem('wortschatz_streak_bedrock')) || 0,
        autoplay: {
            isPlaying: false,
            timerId: null,
            direction: 'forward',
            frontDuration: 3,
            backDuration: 5,
        }
    };

    // --- 2. DOM ELEMENTS ---
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
        autoplayControls: document.getElementById('autoplay-controls'),
        autoplayToggleBtn: document.getElementById('autoplay-toggle-btn'),
        autoplaySettings: document.getElementById('autoplay-settings'),
        autoplayDirForward: document.getElementById('autoplay-dir-forward'),
        autoplayDirBackward: document.getElementById('autoplay-dir-backward'),
        frontDurationInput: document.getElementById('front-duration'),
        backDurationInput: document.getElementById('back-duration'),
    };

    // --- 3. CORE LOGIC ---

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
            els.autoplayControls.classList.add('hidden');
            updateStatus(els.favoritesOnlyToggle.checked ? '没有收藏的词汇' : '词汇表为空, 请加载');
            return;
        }
        els.flashcardContainer.classList.remove('hidden');
        els.navigation.classList.remove('hidden');
        els.autoplayControls.classList.remove('hidden');
        els.statusBar.classList.add('hidden');

        const word = state.displayedWords[state.currentIndex];
        els.chineseMeaning.textContent = word.chinese;
        els.exampleSentence.textContent = word.example;
        els.cardCounter.textContent = `${state.currentIndex + 1} / ${state.displayedWords.length}`;
        els.germanWord.textContent = (state.appMode === 'review') ? word.german : '???';
        els.quizArea.classList.toggle('hidden', state.appMode === 'review');
        
        // [核心修复] 无论何种情况，渲染新卡片时都必须确保它是正面
        els.flashcard.classList.remove('is-flipped');
        
        if (state.appMode === 'quiz') els.answerInput.value = '';
        
        els.favoriteBtn.classList.toggle('active', state.favorites.has(word.id));
        loadImage(word.german);

        // 渲染完成后，如果正在自动播放，则启动定时器
        if (state.autoplay.isPlaying) {
            startAutoplayTimer();
        }
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
        if (direction === 'next' || direction === 'forward') {
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
        
        setTimeout(() => {
            navigate('next');
            els.submitAnswerBtn.disabled = false;
        }, 1500);
    }

    function showJumpInput() {
        if (document.getElementById('jump-to-input')) return;

        const currentCounter = els.cardCounter;
        const input = document.createElement('input');
        input.type = 'number';
        input.id = 'jump-to-input';
        input.value = state.currentIndex + 1;
        
        const handleJump = () => {
            const targetPage = parseInt(input.value, 10);
            input.replaceWith(currentCounter);
            
            if (!isNaN(targetPage) && targetPage > 0 && targetPage <= state.displayedWords.length) {
                state.currentIndex = targetPage - 1;
                renderCard();
                saveSession();
            } else {
                renderCard();
            }
        };

        input.addEventListener('blur', handleJump);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') input.blur();
        });

        currentCounter.replaceWith(input);
        input.focus();
        input.select();
    }

    function startAutoplayTimer() {
        clearTimeout(state.autoplay.timerId);

        const isFlipped = els.flashcard.classList.contains('is-flipped');
        const duration = (isFlipped ? state.autoplay.backDuration : state.autoplay.frontDuration) * 1000;

        state.autoplay.timerId = setTimeout(() => {
            if (!isFlipped) {
                // 如果在正面，则翻到背面，并重新启动定时器
                els.flashcard.classList.add('is-flipped');
                startAutoplayTimer(); // [核心修复] 重新调用自身以设置背面停留时间
            } else {
                // 如果在背面，则移动到下一个单词
                navigate(state.autoplay.direction);
            }
        }, duration);
    }

    function toggleAutoplay() {
        state.autoplay.isPlaying = !state.autoplay.isPlaying;
        
        const icon = state.autoplay.isPlaying ? 'pause' : 'play';
        els.autoplayToggleBtn.innerHTML = `<i data-feather="${icon}"></i>`;
        feather.replace();
        els.autoplayToggleBtn.classList.toggle('playing', state.autoplay.isPlaying);
        els.autoplaySettings.classList.toggle('collapsed', !state.autoplay.isPlaying);

        if (state.autoplay.isPlaying) {
            renderCard(); // 调用renderCard会确保卡片是正面，并启动第一个定时器
        } else {
            clearTimeout(state.autoplay.timerId);
        }
    }

    function saveAutoplaySettings() {
        const settings = {
            direction: state.autoplay.direction,
            frontDuration: state.autoplay.frontDuration,
            backDuration: state.autoplay.backDuration,
        };
        localStorage.setItem('wortschatz_autoplay_settings', JSON.stringify(settings));
    }

    function loadAutoplaySettings() {
        const saved = JSON.parse(localStorage.getItem('wortschatz_autoplay_settings'));
        if (saved) {
            state.autoplay.direction = saved.direction || 'forward';
            state.autoplay.frontDuration = saved.frontDuration || 3;
            state.autoplay.backDuration = saved.backDuration || 5;
        }
        els.frontDurationInput.value = state.autoplay.frontDuration;
        els.backDurationInput.value = state.autoplay.backDuration;
        els.autoplayDirForward.classList.toggle('active', state.autoplay.direction === 'forward');
        els.autoplayDirBackward.classList.toggle('active', state.autoplay.direction === 'backward');
    }

    function init() {
        const savedUrl = localStorage.getItem('wortschatz_url_bedrock');
        if (savedUrl) {
            els.sheetUrl.value = savedUrl;
            loadVocabulary();
        }
        updateStats();
        loadAutoplaySettings();
        
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
            if (state.favorites.has(word.id)) state.favorites.delete(word.id);
            else state.favorites.add(word.id);
            localStorage.setItem('wortschatz_favorites_bedrock', JSON.stringify(Array.from(state.favorites)));
            els.favoriteBtn.classList.toggle('active');
        });
        els.pronounceBtn.addEventListener('click', () => {
            const word = state.displayedWords[state.currentIndex];
            if (word) new Audio(`/api/tts/${encodeURIComponent(word.german)}`).play();
        });
        els.submitAnswerBtn.addEventListener('click', checkAnswer);
        els.answerInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') checkAnswer(); });
        els.cardCounter.addEventListener('click', showJumpInput);

        els.autoplayToggleBtn.addEventListener('click', toggleAutoplay);
        els.autoplayDirForward.addEventListener('click', () => {
            state.autoplay.direction = 'forward';
            els.autoplayDirForward.classList.add('active');
            els.autoplayDirBackward.classList.remove('active');
            saveAutoplaySettings();
        });
        els.autoplayDirBackward.addEventListener('click', () => {
            state.autoplay.direction = 'backward';
            els.autoplayDirBackward.classList.add('active');
            els.autoplayDirForward.classList.remove('active');
            saveAutoplaySettings();
        });
        els.frontDurationInput.addEventListener('change', () => {
            state.autoplay.frontDuration = parseInt(els.frontDurationInput.value) || 3;
            saveAutoplaySettings();
        });
        els.backDurationInput.addEventListener('change', () => {
            state.autoplay.backDuration = parseInt(els.backDurationInput.value) || 5;
            saveAutoplaySettings();
        });

        document.addEventListener('keydown', (e) => {
            if (document.activeElement.tagName === 'INPUT') return;
            switch (e.key) {
                case 'ArrowRight': navigate('next'); break;
                case 'ArrowLeft': navigate('prev'); break;
                case 'Enter': case ' ': e.preventDefault(); els.flashcard.classList.toggle('is-flipped'); break;
                case 'f': case 'F': els.favoriteBtn.click(); break;
                case 'p': case 'P': els.pronounceBtn.click(); break;
                case 'a': case 'A': toggleAutoplay(); break;
            }
        });

        feather.replace();
    }

    init();
});