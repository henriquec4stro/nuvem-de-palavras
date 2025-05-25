document.addEventListener('DOMContentLoaded', () = {
     Seletores do DOM
    const textInput = document.getElementById('textInput');
    const maxWordsInput = document.getElementById('maxWords');
    const colorPaletteSelect = document.getElementById('colorPalette');
    const fontStyleSelect = document.getElementById('fontStyle');
    const generateButton = document.getElementById('generateCloudButton');
    const wordCloudCanvas = document.getElementById('wordCloudCanvas');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorMessageElement = document.getElementById('errorMessage');

     Paletas de cores predefinidas
    const colorPalettes = {
        vibrant ['#ff6f61', '#ffb347', '#fdfd96', '#77dd77', '#aec6cf', '#9b9b9b', '#f7cac9', '#a2d5f2'],
        pastel ['#fbb4ae', '#b3cde3', '#ccebc5', '#decbe4', '#fed9a6', '#ffffcc', '#e5d8bd', '#fddaec'],
        grayscale ['#202020', '#404040', '#606060', '#808080', '#A0A0A0', '#C0C0C0', '#E0E0E0']
    };

    generateButton.addEventListener('click', handleGenerateCloud);

    function showLoading(isLoading) {
        if (isLoading) {
            loadingIndicator.style.display = 'block';
            errorMessageElement.style.display = 'none';  Esconde mensagens de erro ao carregar
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
         Limpar a nuvem de palavras em caso de erro para não mostrar uma antiga
        const context = wordCloudCanvas.getContext('2d');
        context.clearRect(0, 0, wordCloudCanvas.width, wordCloudCanvas.height);
    }

    async function ensureFontIsLoaded(fontFamilyString) {
        const primaryFont = fontFamilyString.split(',').trim().replace([']g, '');
         Verifica se não é uma fonte genérica padrão
        const genericFonts = ['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui'];
        if (!genericFonts.includes(primaryFont.toLowerCase())) {
            try {
                 Tenta carregar a fonte com um tamanho e texto de amostra
                await document.fonts.load(`1em ${primaryFont}`);
                console.log(`Fonte ${primaryFont} carregada ou já disponível.`);
            } catch (err) {
                console.warn(`Falha ao carregar a fonte ${primaryFont}`, err);
                 Prosseguir com a fonte de fallback definida no CSS ou pela biblioteca
                 O usuário pode receber um aviso visual de que a fonte não carregou
            }
        }
    }

    async function handleGenerateCloud() {
        const rawText = textInput.value;
        const maxWords = parseInt(maxWordsInput.value, 10);
        const selectedPaletteKey = colorPaletteSelect.value;
        const selectedFont = fontStyleSelect.value;

        if (!rawText.trim()) {
            displayError(Por favor, insira um texto para gerar a nuvem.);
            return;
        }
        if (isNaN(maxWords) 
 maxWords = 0) {
            displayError(Por favor, insira um número válido para o máximo de palavras.);
            return;
        }

        showLoading(true);
        errorMessageElement.style.display = 'none';

         Garante que a fonte selecionada está carregada
        await ensureFontIsLoaded(selectedFont);

         Usar setTimeout para permitir que a UI atualize (mostrar o loading)
         antes de iniciar o processamento pesado.
        setTimeout(() = {
            try {
                const processedWords = textProcessingPipeline(rawText, maxWords);
                if (processedWords.length === 0) {
                    displayError(Nenhuma palavra significativa encontrada após o processamento. Tente um texto diferente ou ajuste as configurações.);
                    showLoading(false);
                    return;
                }
                renderWordCloud(processedWords, selectedPaletteKey, selectedFont);
            } catch (error) {
                console.error(Erro ao gerar nuvem, error);
                displayError(Ocorreu um erro inesperado ao gerar a nuvem. Verifique o console para mais detalhes.);
            } finally {
                showLoading(false);
            }
        }, 50);  Pequeno delay para garantir a atualização da UI
    }

    function cleanText(text) {
        let cleanedText = text.toLowerCase();  [5]
         Regex para remover pontuações, mas tentando preservar hífensapóstrofos intra-palavra e acentos.
         Remove pontuações no iníciofim de palavras ou isoladas.
         Mantém letras (incluindo acentuadas p{L}), números (p{N}), espaços (s), hífens e apóstrofos.
        cleanedText = cleanedText.replace([^p{L}p{N}s'-]+gu, ' ');  [6]
        cleanedText = cleanedText.replace([0-9]g, '');  Remove números [7, 8]
        cleanedText = cleanedText.replace(s+g, ' ').trim();  Normaliza espaços múltiplos para um único espaço
        return cleanedText;
    }

    function tokenizeText(text) {
        return text.split(s+).filter(word = word.length  1);  Filtra palavras vazias e com 1 caractere [5]
    }

    function filterStopWords(tokens, stopWordsList) {  [9]
        const stopWordsSet = new Set(stopWordsList.map(word = word.toLowerCase()));
        return tokens.filter(token =!stopWordsSet.has(token.toLowerCase()));
    }

    function countFrequencies(tokens) {  [10]
        const frequencyMap = new Map();
        tokens.forEach(token = {
            frequencyMap.set(token, (frequencyMap.get(token) 
 0) + 1);
        });
        return Array.from(frequencyMap);  Converte para array de [palavra, frequência]
    }

    function sortAndLimitWords(wordFrequencies, maxWords) {
         Ordena por frequência (decrescente), depois alfabeticamente como desempate
        wordFrequencies.sort((a, b) = {
            if (b[1] === a[1]) {  Se frequências são iguais
                return a.localeCompare(b);  Ordena alfabeticamente (a é a palavra)
            }
            return b[1] - a[1];  Ordena por frequência (b[1] é a frequência)
        });
        return wordFrequencies.slice(0, maxWords);
    }

    function textProcessingPipeline(rawText, maxWords) {
        const cleanedText = cleanText(rawText);
        const tokens = tokenizeText(cleanedText);
         'portugueseStopWords' é definido em stopwords-pt.js e deve estar globalmente acessível
        const filteredTokens = filterStopWords(tokens, portugueseStopWords);
        const frequencies = countFrequencies(filteredTokens);
        const sortedAndLimitedWords = sortAndLimitWords(frequencies, maxWords);
        return sortedAndLimitedWords;
    }

    function renderWordCloud(wordList, paletteKey, font) {  [11, 12]
        const canvasElement = document.getElementById('wordCloudCanvas');
        const container = document.getElementById('wordCloudContainer');

         Ajustar o tamanho do canvas ao seu container
         Isso é importante para responsividade e para que wordcloud2.js calcule o layout corretamente
        canvasElement.width = container.offsetWidth;
        canvasElement.height = container.offsetHeight;

        const context = canvasElement.getContext('2d');
        context.clearRect(0, 0, canvasElement.width, canvasElement.height);

        let colorOption;
        if (paletteKey === 'random-dark' 
 paletteKey === 'random-light') {
            colorOption = paletteKey;  Usa as keywords da biblioteca
        } else if (colorPalettes[paletteKey]) {
            const selectedColors = colorPalettes[paletteKey];
            let colorIndex = 0;
            colorOption = () = {  Função para ciclar pelas cores [13, 14, 15, 16]
                const color = selectedColors[colorIndex % selectedColors.length];
                colorIndex++;
                return color;
            };
        } else {
            colorOption = 'random-dark';  Paleta padrão de fallback
        }

        const options = {
            list wordList,
            gridSize Math.max(4, Math.round(16  canvasElement.width  1024)),  Ajusta gridSize, mínimo de 4 [11]
            weightFactor (size) = {  'size' aqui é a frequência da palavra
                  Escalonamento para dar mais variação visual aos tamanhos
                  Math.pow(size, 0.7) ajuda a não ter palavras pequenas demais ou grandes demais
                  O multiplicador (ex 5) ajusta o tamanho geral.
                  Este valor pode precisar de ajuste dependendo da faixa de frequências.
                return Math.pow(size, 0.65)  (canvasElement.width  200);  Ajustado para ser mais responsivo ao tamanho do canvas
            },
            fontFamily font,  [11, 17]
            color colorOption,  [11, 17]
            backgroundColor '#FFFFFF',
            rotateRatio 0.3,  Proporção de palavras rotacionadas [11]
            rotationSteps 2,  0 ou 90 graus (0  90 ou 1  90)
            shape 'circle',  Formato padrão, pode ser 'cardioid', 'diamond', etc. [11, 17]
            minSize Math.max(2, canvasElement.width  150),  Tamanho mínimo da fonte, responsivo [11]
            drawOutOfBound false,  Não desenha palavras fora da área
            shrinkToFit true,  Tenta encaixar todas as palavras [11]
            hover (item, dimension, event) = {  Exemplo de interatividade no hover
                if (item) {
                    const hoverBox = document.getElementById('wordCloudCanvas-hover-box');  Se você tiver um elemento para isso
                    if (hoverBox) {
                        hoverBox.textContent = `${item} ${item[1]}`;
                         Posicionar hoverBox perto do cursor (requer mais lógica de posicionamento)
                    }
                }
            },
             click (item, dimension, event) = {  Exemplo de interatividade no clique [11]
                 if (item) {
                     alert(`${item} ${item[1]}`);
                 }
             }
        };

        try {
            WordCloud(canvasElement, options);  [12]
        } catch (e) {
            console.error(Erro na biblioteca WordCloud, e);
            displayError(Ocorreu um erro ao tentar renderizar a nuvem de palavras com a biblioteca.);
        }
    }
});