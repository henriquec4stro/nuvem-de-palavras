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


    // Paletas de cores predefinidas
    const colorPalettes = {
        vibrant: ['#ff6f61', '#ffb347', '#fdfd96', '#77dd77', '#aec6cf', '#9b9b9b', '#f7cac9', '#a2d5f2'],
        pastel: ['#fbb4ae', '#b3cde3', '#ccebc5', '#decbe4', '#fed9a6', '#ffffcc', '#e5d8bd', '#fddaec'],
        grayscale: ['#202020', '#404040', '#606060', '#808080', '#A0A0A0', '#C0C0C0', '#E0E0E0']
    };

    generateButton.addEventListener('click', handleGenerateCloud);

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
        const context = wordCloudCanvas.getContext('2d');
        context.clearRect(0, 0, wordCloudCanvas.width, wordCloudCanvas.height);
    }

    async function ensureFontIsLoaded(fontFamilyString) {
        const primaryFont = fontFamilyString.split(',')[0].trim().replace(/['"]/g, '');
        const genericFonts = ['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui'];
        if (primaryFont && !genericFonts.includes(primaryFont.toLowerCase())) {
            try {
                await document.fonts.load(`1em "${primaryFont}"`); // Aspas para fontes com espaços
                console.log(`Fonte ${primaryFont} carregada ou já disponível.`);
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
                const processedWords = textProcessingPipeline(rawText, maxWords);
                if (processedWords.length === 0) {
                    displayError("Nenhuma palavra significativa encontrada. Tente um texto diferente.");
                    showLoading(false);
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

    // Função cleanText MODIFICADA com console.log detalhados:
    function cleanText(text) {
        console.log("  >> cleanText - Texto Original para Limpeza:", text);
        let cleanedText = text.toLowerCase();
        console.log("  >> cleanText - Após toLowerCase:", cleanedText);

        // Regex para MANTER letras Unicode (incluindo acentuadas), números Unicode, espaços, hífens e apóstrofos.
        // E REMOVER todo o resto, substituindo por espaço.
        const regexKeepChars = /[^\\p{L}\\p{N}\\s'-]+/gu; // O 'u' é para Unicode
        cleanedText = cleanedText.replace(regexKeepChars, ' ');
        console.log("  >> cleanText - Após 1º replace (manter p{L},p{N},s,'-):", cleanedText);

        // Regex para REMOVER explicitamente dígitos e underscores, caso necessário.
        const regexRemoveDigitsUnderscores = /[0-9_]/g;
        cleanedText = cleanedText.replace(regexRemoveDigitsUnderscores, '');
        console.log("  >> cleanText - Após 2º replace (remover [0-9_]):", cleanedText);

        // Normaliza espaços múltiplos para um único espaço e remove espaços no início/fim.
        cleanedText = cleanedText.replace(/\s+/g, ' ').trim();
        console.log("  >> cleanText - Após normalizar espaços e trim (Resultado Final da Limpeza):", cleanedText);
        return cleanedText;
    }

    function tokenizeText(text) {
        return text.split(/\s+/).filter(word => word.length > 1); // Filtra palavras curtas
    }

    function filterStopWords(tokens, stopWordsList) {
        if (!Array.isArray(stopWordsList)) {
            console.warn("Lista de stop words não é um array. Nenhuma stop word será filtrada.");
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

    // Função com console.log para depuração (mantida da sua versão anterior):
    function textProcessingPipeline(rawText, maxWords) {
        console.log("--- INÍCIO DO PROCESSAMENTO ---");
        console.log("1. Texto Original Recebido:", rawText);

        const cleanedText = cleanText(rawText); // Esta cleanText agora tem logs internos
        console.log("2. Texto Após Limpeza (Resultado de cleanText):", cleanedText); // Log do resultado geral de cleanText

        const tokens = tokenizeText(cleanedText);
        console.log("3. Tokens Após Tokenização (tokenizeText):", tokens);

        const currentStopWords = typeof portugueseStopWords !== 'undefined' ? portugueseStopWords : [];
        console.log("4. Número de Stop Words na Lista Usada:", currentStopWords.length);
        if (currentStopWords.length > 0 && currentStopWords.length <= 20) {
            console.log("   (Exemplo de Stop Words:", currentStopWords.slice(0, 10).join(", ") + "...)");
        } else if (currentStopWords.length > 20) {
            console.log("   (A lista de stop words tem mais de 20 palavras, não será exibida completamente aqui)");
        }

        const filteredTokens = filterStopWords(tokens, currentStopWords);
        console.log("5. Tokens Após Filtro de Stop Words (filterStopWords):", filteredTokens);

        const frequencies = countFrequencies(filteredTokens);
        console.log("6. Frequências Contadas (countFrequencies):", frequencies);

        const sortedAndLimitedWords = sortAndLimitWords(frequencies, maxWords);
        console.log("7. Palavras Finais Para Nuvem (sortAndLimitWords):", sortedAndLimitedWords);
        console.log("--- FIM DO PROCESSAMENTO ---");

        return sortedAndLimitedWords;
    }

    function renderWordCloud(wordList, paletteKey, font) {
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
            WordCloud(wordCloudCanvas, options); // Mantive WordCloud (sem o 2) conforme nossa última correção
        } catch (e) {
            console.error("Erro ao renderizar com WordCloud:", e);
            displayError("Falha ao renderizar a nuvem. Verifique o console.");
        }
    }
});
