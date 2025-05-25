// Variáveis de Zoom Globais
let currentZoom = 1.0;
const ZOOM_STEP = 0.15;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3.0;

document.addEventListener('DOMContentLoaded', () => {
    const textInput = document.getElementById('textInput');
    const maxWordsInput = document.getElementById('maxWords');
    const colorPaletteSelect = document.getElementById('colorPalette');
    const fontStyleSelect = document.getElementById('fontStyle');
    const generateButton = document.getElementById('generateCloudButton');
    const wordCloudCanvas = document.getElementById('wordCloudCanvas');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorMessageElement = document.getElementById('errorMessage');
    const wordCloudContainer = document.getElementById('wordCloudContainer');

    const zoomInButton = document.getElementById('zoomInButton');
    const zoomOutButton = document.getElementById('zoomOutButton');
    const zoomResetButton = document.getElementById('zoomResetButton');

    const frequencyListSection = document.getElementById('frequencyListSection');
    const wordFrequencyListElement = document.getElementById('wordFrequencyGrid');

    const colorPalettes = {
        vibrant: ['#ff6f61', '#ffb347', '#fdfd96', '#77dd77', '#aec6cf', '#9b9b9b', '#f7cac9', '#a2d5f2'],
        pastel: ['#fbb4ae', '#b3cde3', '#ccebc5', '#decbe4', '#fed9a6', '#ffffcc', '#e5d8bd', '#fddaec'],
        grayscale: ['#202020', '#404040', '#606060', '#808080', '#A0A0A0', '#C0C0C0', '#E0E0E0']
    };

    function applyZoom() {
        wordCloudCanvas.style.transform = `scale(${currentZoom})`;
    }

    zoomInButton?.addEventListener('click', () => {
        currentZoom = Math.min(currentZoom + ZOOM_STEP, MAX_ZOOM);
        applyZoom();
    });

    zoomOutButton?.addEventListener('click', () => {
        currentZoom = Math.max(currentZoom - ZOOM_STEP, MIN_ZOOM);
        applyZoom();
    });

    zoomResetButton?.addEventListener('click', () => {
        currentZoom = 1.0;
        applyZoom();
    });

    function showLoading(isLoading) {
        loadingIndicator.style.display = isLoading ? 'block' : 'none';
        errorMessageElement.style.display = 'none';
        frequencyListSection.style.display = 'none';
        [generateButton, textInput, maxWordsInput, colorPaletteSelect, fontStyleSelect].forEach(el => el.disabled = isLoading);
    }

    function displayError(message) {
        errorMessageElement.textContent = message;
        errorMessageElement.style.display = 'block';
        currentZoom = 1.0;
        applyZoom();
        const context = wordCloudCanvas.getContext('2d');
        if (context) context.clearRect(0, 0, wordCloudCanvas.width, wordCloudCanvas.height);
        wordFrequencyListElement.innerHTML = '';
        frequencyListSection.style.display = 'none';
    }

    async function ensureFontIsLoaded(fontFamilyString) {
        const primaryFont = fontFamilyString.split(',')[0].trim().replace(/['"]/g, '');
        const genericFonts = ['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui'];
        if (primaryFont && !genericFonts.includes(primaryFont.toLowerCase())) {
            try {
                await document.fonts.load(`1em "${primaryFont}"`);
            } catch (err) {
                console.warn(`Falha ao carregar a fonte ${primaryFont}:`, err);
            }
        }
    }

    generateButton.addEventListener('click', handleGenerateCloud);

    async function handleGenerateCloud() {
        const rawText = textInput.value;
        const maxWords = parseInt(maxWordsInput.value, 10);
        const selectedPaletteKey = colorPaletteSelect.value;
        const selectedFont = fontStyleSelect.value;

        if (!rawText.trim()) {
            displayError("Por favor, insira um texto para gerar a nuvem.");
            return;
        }
        if (isNaN(maxWords) || maxWords <= 0) {
            displayError("Por favor, insira um número válido para o máximo de palavras.");
            return;
        }

        showLoading(true);
        await ensureFontIsLoaded(selectedFont);
        await new Promise(resolve => setTimeout(resolve, 50));

        try {
            const processedWords = textProcessingPipeline(rawText, maxWords, false);
            if (processedWords.length === 0) {
                displayError("Nenhuma palavra significativa encontrada. Tente um texto diferente.");
                return;
            }

            renderWordCloud(processedWords, selectedPaletteKey, selectedFont);
            displayFrequencyList(processedWords, 10);

        } catch (error) {
            console.error("Erro ao gerar nuvem:", error);
            displayError("Ocorreu um erro inesperado. Verifique o console.");
        } finally {
            showLoading(false);
        }
    }

    function cleanText(text, enableLogs = false) {
        if (enableLogs) console.log("Texto original:", text);
        let cleanedText = text.toLowerCase();
        cleanedText = cleanedText.replace(/[^a-záéíóúàèìòùâêîôûãõç\s]/gi, ' ');
        return cleanedText.replace(/\s+/g, ' ').trim();
    }

    function tokenizeText(text) {
        return text.split(/\s+/).filter(word => word.length > 1);
    }

    function filterStopWords(tokens, stopWordsList) {
        const stopWordsSet = new Set((stopWordsList || []).map(word => word.toLowerCase()));
        return tokens.filter(token => !stopWordsSet.has(token.toLowerCase()));
    }

    function countFrequencies(tokens) {
        const frequencyMap = new Map();
        tokens.forEach(token => {
            frequencyMap.set(token, (frequencyMap.get(token) || 0) + 1);
        });
        return Array.from(frequencyMap);
    }

    function sortAndLimitWords(wordFrequencies, maxWords) {
        return wordFrequencies
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
            .slice(0, maxWords);
    }

    function textProcessingPipeline(rawText, maxWords, enableDetailedLogsCleanText = false) {
        const cleanedText = cleanText(rawText, enableDetailedLogsCleanText);
        const tokens = tokenizeText(cleanedText);
        const currentStopWords = typeof portugueseStopWords !== 'undefined' ? portugueseStopWords : [];
        const filteredTokens = filterStopWords(tokens, currentStopWords);
        const frequencies = countFrequencies(filteredTokens);
        return sortAndLimitWords(frequencies, maxWords);
    }

    function displayFrequencyList(wordArray, topN = 10) {
        if (!wordFrequencyListElement || !frequencyListSection) return;

        wordFrequencyListElement.innerHTML = '';
        if (!wordArray || wordArray.length === 0) {
            frequencyListSection.style.display = 'none';
            return;
        }

        frequencyListSection.style.display = 'block';

        const topWords = wordArray.slice(0, topN);

        topWords.forEach(([word, count], index) => {
            const card = document.createElement('div');
            card.className = 'word-card';

            card.innerHTML = `
                <div class="word">${word}</div>
                <div class="count">${count} ${count === 1 ? 'vez' : 'vezes'}</div>
                <div class="rank">#${index + 1}</div>
            `;

            wordFrequencyListElement.appendChild(card);
        });
    }

    function renderWordCloud(wordList, paletteKey, font) {
        currentZoom = 1.0;
        applyZoom();

        wordCloudCanvas.width = wordCloudContainer.offsetWidth || 600;
        wordCloudCanvas.height = wordCloudContainer.clientHeight > 50 ? wordCloudContainer.clientHeight : 400;

        const context = wordCloudCanvas.getContext('2d');
        if (!context) {
            displayError("Erro ao obter contexto do canvas.");
            return;
        }
        context.clearRect(0, 0, wordCloudCanvas.width, wordCloudCanvas.height);

        let colorOption;
        if (paletteKey === 'random-dark' || paletteKey === 'random-light') {
            colorOption = paletteKey;
        } else if (colorPalettes[paletteKey]) {
            const selectedColors = colorPalettes[paletteKey];
            let colorIndex = 0;
            colorOption = () => selectedColors[colorIndex++ % selectedColors.length];
        } else {
            colorOption = 'random-dark';
        }

        const options = {
            list: wordList,
            gridSize: Math.max(2, Math.round(12 * wordCloudCanvas.width / 1024)),
            weightFactor: size => Math.max(4, Math.pow(size, 0.60) * (wordCloudCanvas.width / 120)),
            fontFamily: font,
            color: colorOption,
            backgroundColor: '#FFFFFF',
            rotateRatio: 0.3,
            rotationSteps: 2,
            shape: 'circle',
            minSize: Math.max(1, Math.round(wordCloudCanvas.width / 200)),
            drawOutOfBound: false,
            shrinkToFit: true,
            hover: (item, dimension, event) => {
                if (item && event.target) {
                    event.target.title = `${item[0]} (${item[1]} ${item[1] === 1 ? 'vez' : 'vezes'})`;
                }
            },
            click: (item) => {
                if (item) alert(`${item[0]} (ocorrências: ${item[1]})`);
            }
        };

        try {
            WordCloud(wordCloudCanvas, options);
        } catch (e) {
            console.error("Erro ao renderizar com WordCloud:", e);
            displayError("Falha ao renderizar a nuvem.");
        }
    }

    // 🔓 Expor a função para testes no console
    window.displayFrequencyList = displayFrequencyList;
});
