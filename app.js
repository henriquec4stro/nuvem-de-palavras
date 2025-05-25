// Variáveis de Zoom Globais (ou no escopo do DOMContentLoaded se preferir, mas mais simples aqui por agora)
let currentZoom = 1.0;
const ZOOM_STEP = 0.15;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3.0;

document.addEventListener('DOMContentLoaded', () => {
    // Seletores do DOM
    const textInput = document.getElementById('textInput');
    const maxWordsInput = document.getElementById('maxWords');
    const colorPaletteSelect = document.getElementById('colorPalette');
    const fontStyleSelect = document.getElementById('fontStyle');
    const generateButton = document.getElementById('generateCloudButton');
    const wordCloudCanvas = document.getElementById('wordCloudCanvas');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorMessageElement = document.getElementById('errorMessage');
    const wordCloudContainer = document.getElementById('wordCloudContainer');

    // Seletores para botões de zoom
    const zoomInButton = document.getElementById('zoomInButton');
    const zoomOutButton = document.getElementById('zoomOutButton');
    const zoomResetButton = document.getElementById('zoomResetButton');


    // Paletas de cores predefinidas
    const colorPalettes = {
        vibrant: ['#ff6f61', '#ffb347', '#fdfd96', '#77dd77', '#aec6cf', '#9b9b9b', '#f7cac9', '#a2d5f2'],
        pastel: ['#fbb4ae', '#b3cde3', '#ccebc5', '#decbe4', '#fed9a6', '#ffffcc', '#e5d8bd', '#fddaec'],
        grayscale: ['#202020', '#404040', '#606060', '#808080', '#A0A0A0', '#C0C0C0', '#E0E0E0']
    };

    generateButton.addEventListener('click', handleGenerateCloud);

    // Função para aplicar o zoom no canvas
    function applyZoom() {
        if (wordCloudCanvas) {
            wordCloudCanvas.style.transform = `scale(${currentZoom})`;
        }
    }

    // Event Listeners para os botões de zoom
    if (zoomInButton) {
        zoomInButton.addEventListener('click', () => {
            if (currentZoom < MAX_ZOOM) {
                currentZoom = parseFloat((currentZoom + ZOOM_STEP).toFixed(2));
                if (currentZoom > MAX_ZOOM) currentZoom = MAX_ZOOM; // Garante que não ultrapasse
                applyZoom();
            }
        });
    }

    if (zoomOutButton) {
        zoomOutButton.addEventListener('click', () => {
            if (currentZoom > MIN_ZOOM) {
                currentZoom = parseFloat((currentZoom - ZOOM_STEP).toFixed(2));
                if (currentZoom < MIN_ZOOM) currentZoom = MIN_ZOOM; // Garante que não seja menor
                applyZoom();
            }
        });
    }

    if (zoomResetButton) {
        zoomResetButton.addEventListener('click', () => {
            currentZoom = 1.0;
            applyZoom();
        });
    }


    function showLoading(isLoading) {
        if (isLoading) {
            loadingIndicator.style.display = 'block';
            errorMessageElement.style.display = 'none';
            generateButton.disabled = true;
            textInput.disabled = true;
            maxWordsInput.disabled = true;
            colorPaletteSelect.disabled = true;
            fontStyleSelect.disabled = true;
        } else {
            loadingIndicator.style.display = 'none';
            generateButton.disabled = false;
            textInput.disabled = false;
            maxWordsInput.disabled = false;
            colorPaletteSelect.disabled = false;
            fontStyleSelect.disabled = false;
        }
    }

    function displayError(message) {
        errorMessageElement.textContent = message;
        errorMessageElement.style.display = 'block';
        
        currentZoom = 1.0; // Reseta o zoom em caso de erro
        applyZoom();       // Aplica o zoom resetado visualmente

        if (wordCloudCanvas.width > 0 && wordCloudCanvas.height > 0) {
            const context = wordCloudCanvas.getContext('2d');
            if (context) {
                context.clearRect(0, 0, wordCloudCanvas.width, wordCloudCanvas.height);
            }
        }
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
        errorMessageElement.style.display = 'none';

        await ensureFontIsLoaded(selectedFont);

        setTimeout(() => {
            try {
                // Removendo os logs internos da textProcessingPipeline para produção,
                // mas mantendo os da cleanText se ainda precisar depurar a limpeza
                const processedWords = textProcessingPipeline(rawText, maxWords, false); // Passando 'false' para desativar logs internos
                
                if (processedWords.length === 0) {
                    displayError("Nenhuma palavra significativa encontrada. Tente um texto diferente.");
                    // showLoading(false); // Removido pois já está no finally
                    return;
                }
                renderWordCloud(processedWords, selectedPaletteKey, selectedFont);
            } catch (error) {
                console.error("Erro ao gerar nuvem:", error);
                displayError("Ocorreu um erro inesperado. Verifique o console.");
            } finally {
                showLoading(false);
            }
        }, 50);
    }

    function cleanText(text, enableLogs = false) { // Adicionado parâmetro para logs
        if(enableLogs) console.log("  >> cleanText - Texto Original para Limpeza:", text);
        let cleanedText = text.toLowerCase();
        if(enableLogs) console.log("  >> cleanText - Após toLowerCase:", cleanedText);

        const regexKeepBasicChars = /[^a-z0-9\s'\-àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]+/g;
        cleanedText = cleanedText.replace(regexKeepBasicChars, ' ');
        if(enableLogs) console.log("  >> cleanText - Após 1º replace (regexKeepBasicChars):", cleanedText);
        
        const regexRemoveDigits = /[0-9]+/g;
        cleanedText = cleanedText.replace(regexRemoveDigits, '');
        if(enableLogs) console.log("  >> cleanText - Após 2º replace (remover [0-9]):", cleanedText);

        cleanedText = cleanedText.replace(/\s+/g, ' ').trim();
        if(enableLogs) console.log("  >> cleanText - Após normalizar espaços e trim (Resultado Final da Limpeza):", cleanedText);
        return cleanedText;
    }

    function tokenizeText(text) {
        return text.split(/\s+/).filter(word => word && word.length > 1);
    }

    function filterStopWords(tokens, stopWordsList) {
        if (!Array.isArray(stopWordsList)) {
            if (typeof portugueseStopWords !== 'undefined' && !Array.isArray(portugueseStopWords)) {
                 console.warn("Lista de stop words (portugueseStopWords) não é um array. Nenhuma stop word será filtrada.");
            }
            return tokens;
        }
        const stopWordsSet = new Set(stopWordsList.map(word => word.toLowerCase()));
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
        wordFrequencies.sort((a, b) => {
            if (b[1] === a[1]) {
                return a[0].localeCompare(b[0]);
            }
            return b[1] - a[1];
        });
        return wordFrequencies.slice(0, maxWords);
    }

    function textProcessingPipeline(rawText, maxWords, enableDetailedLogs = false) { // Adicionado parâmetro para logs
        if(enableDetailedLogs) console.log("--- INÍCIO DO PROCESSAMENTO ---");
        if(enableDetailedLogs) console.log("1. Texto Original Recebido:", rawText);

        const cleanedText = cleanText(rawText, enableDetailedLogs); // Passa o flag de logs
        if(enableDetailedLogs) console.log("2. Texto Após Limpeza (Resultado de cleanText):", cleanedText);

        const tokens = tokenizeText(cleanedText);
        if(enableDetailedLogs) console.log("3. Tokens Após Tokenização (tokenizeText):", tokens);

        const currentStopWords = typeof portugueseStopWords !== 'undefined' ? portugueseStopWords : [];
        if(enableDetailedLogs) console.log("4. Número de Stop Words na Lista Usada:", currentStopWords.length);
        // Removido log de exemplo de stopwords para diminuir poluição do console em produção
        
        const filteredTokens = filterStopWords(tokens, currentStopWords);
        if(enableDetailedLogs) console.log("5. Tokens Após Filtro de Stop Words (filterStopWords):", filteredTokens);

        const frequencies = countFrequencies(filteredTokens);
        if(enableDetailedLogs) console.log("6. Frequências Contadas (countFrequencies):", frequencies);

        const sortedAndLimitedWords = sortAndLimitWords(frequencies, maxWords);
        if(enableDetailedLogs) console.log("7. Palavras Finais Para Nuvem (sortAndLimitWords):", sortedAndLimitedWords);
        if(enableDetailedLogs) console.log("--- FIM DO PROCESSAMENTO ---");

        return sortedAndLimitedWords;
    }

    function renderWordCloud(wordList, paletteKey, font) {
        currentZoom = 1.0; // Reseta o zoom
        applyZoom();       // Aplica o zoom resetado visualmente

        if (wordCloudContainer.offsetWidth > 0) {
            wordCloudCanvas.width = wordCloudContainer.offsetWidth;
            wordCloudCanvas.height = wordCloudContainer.clientHeight > 50 ? wordCloudContainer.clientHeight : 400;
        } else {
            wordCloudCanvas.width = 600; // Fallback
            wordCloudCanvas.height = 400; // Fallback
        }

        const context = wordCloudCanvas.getContext('2d');
        context.clearRect(0, 0, wordCloudCanvas.width, wordCloudCanvas.height);

        let colorOption;
        if (paletteKey === 'random-dark' || paletteKey === 'random-light') {
            colorOption = paletteKey;
        } else if (colorPalettes[paletteKey]) {
            const selectedColors = colorPalettes[paletteKey];
            let colorIndex = 0;
            colorOption = () => {
                const color = selectedColors[colorIndex % selectedColors.length];
                colorIndex++;
                return color;
            };
        } else {
            colorOption = 'random-dark';
        }

        const options = {
            list: wordList,
            gridSize: Math.max(2, Math.round(12 * wordCloudCanvas.width / 1024)),
            weightFactor: (size) => {
                let newSize = Math.pow(size, 0.60) * (wordCloudCanvas.width / 120);
                return Math.max(4, newSize);
            },
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
                if (item) {
                    // event.target.title = item[0] + ': ' + item[1];
                }
            },
            click: (item, dimension, event) => {
                if (item) {
                    alert(`${item[0]} (ocorrências: ${item[1]})`);
                }
            }
        };

        try {
            WordCloud(wordCloudCanvas, options);
        } catch (e) {
            console.error("Erro ao renderizar com WordCloud:", e);
            displayError("Falha ao renderizar a nuvem. Verifique o console.");
        }
    }
});
