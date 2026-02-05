// Estado da aplicação
const state = {
    files: [],
    // Configurações de compressão otimizadas para PDFs de texto
    compression: {
        scale: 1.5,           // Escala de renderização (1.5 = boa qualidade para texto)
        imageQuality: 0.65,   // Qualidade JPEG (0.65 = bom balanço qualidade/tamanho)
        targetMaxKB: 200,     // Tamanho máximo desejado por arquivo
    }
};

// Elementos do DOM
const elements = {
    uploadArea: document.getElementById('uploadArea'),
    fileInput: document.getElementById('fileInput'),
    fileListContainer: document.getElementById('fileListContainer'),
    fileList: document.getElementById('fileList'),
    fileCount: document.getElementById('fileCount'),
    clearBtn: document.getElementById('clearBtn'),
    compressBtn: document.getElementById('compressBtn'),
    progressContainer: document.getElementById('progressContainer'),
    progressFill: document.getElementById('progressFill'),
    progressText: document.getElementById('progressText'),
    results: document.getElementById('results'),
    resultsSummary: document.getElementById('resultsSummary')
};

// Inicialização
function init() {
    setupEventListeners();
}

// Configurar event listeners
function setupEventListeners() {
    // Click na área de upload
    elements.uploadArea.addEventListener('click', () => {
        elements.fileInput.click();
    });

    // Seleção de arquivos
    elements.fileInput.addEventListener('change', handleFileSelect);

    // Drag and drop
    elements.uploadArea.addEventListener('dragover', handleDragOver);
    elements.uploadArea.addEventListener('dragleave', handleDragLeave);
    elements.uploadArea.addEventListener('drop', handleDrop);

    // Botões
    elements.clearBtn.addEventListener('click', clearFiles);
    elements.compressBtn.addEventListener('click', compressAndDownload);
}

// Handlers de drag and drop
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    elements.uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    elements.uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    elements.uploadArea.classList.remove('dragover');

    const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf');
    addFiles(files);
}

// Handler de seleção de arquivos
function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    addFiles(files);
    e.target.value = ''; // Reset para permitir selecionar o mesmo arquivo novamente
}

// Adicionar arquivos à lista
function addFiles(files) {
    const pdfFiles = files.filter(f => f.type === 'application/pdf');
    
    if (pdfFiles.length === 0) {
        alert('Por favor, selecione apenas arquivos PDF.');
        return;
    }

    // Verificar duplicatas e adicionar
    pdfFiles.forEach(file => {
        const isDuplicate = state.files.some(f => f.name === file.name && f.size === file.size);
        if (!isDuplicate) {
            state.files.push(file);
        }
    });

    updateUI();
}

// Remover arquivo da lista
function removeFile(index) {
    state.files.splice(index, 1);
    updateUI();
}

// Limpar todos os arquivos
function clearFiles() {
    state.files = [];
    hideResults();
    updateUI();
}

// Atualizar interface
function updateUI() {
    // Atualizar contador
    elements.fileCount.textContent = state.files.length;

    // Mostrar/esconder lista de arquivos
    if (state.files.length > 0) {
        elements.fileListContainer.classList.add('visible');
    } else {
        elements.fileListContainer.classList.remove('visible');
    }

    // Renderizar lista de arquivos
    elements.fileList.innerHTML = state.files.map((file, index) => `
        <li class="file-item">
            <div class="file-info">
                <span class="file-icon">📄</span>
                <div class="file-details">
                    <div class="file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</div>
                    <div class="file-size">${formatFileSize(file.size)}</div>
                </div>
            </div>
            <button class="remove-btn" onclick="removeFile(${index})" title="Remover arquivo">✕</button>
        </li>
    `).join('');

    // Habilitar/desabilitar botão de compressão
    elements.compressBtn.disabled = state.files.length === 0;
}

// Comprimir e baixar
async function compressAndDownload() {
    if (state.files.length === 0) return;

    showProgress();
    hideResults();

    const zip = new JSZip();
    const results = [];
    let totalOriginalSize = 0;
    let totalCompressedSize = 0;

    try {
        for (let i = 0; i < state.files.length; i++) {
            const file = state.files[i];
            totalOriginalSize += file.size;

            updateProgress(
                ((i / state.files.length) * 90),
                `Comprimindo: ${file.name} (${i + 1}/${state.files.length})`
            );

            const compressedPdf = await compressPDFAggressive(file);
            totalCompressedSize += compressedPdf.byteLength;

            results.push({
                name: file.name,
                originalSize: file.size,
                compressedSize: compressedPdf.byteLength
            });

            // Adicionar ao ZIP mantendo o nome original
            zip.file(file.name, compressedPdf);
        }

        updateProgress(95, 'Gerando arquivo ZIP...');

        // Gerar e baixar ZIP
        const zipBlob = await zip.generateAsync({ 
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 9 }
        });

        updateProgress(100, 'Concluído!');

        // Download do ZIP
        const timestamp = new Date().toISOString().slice(0, 10);
        saveAs(zipBlob, `pdfs_comprimidos_${timestamp}.zip`);

        // Mostrar resultados
        showResults(totalOriginalSize, totalCompressedSize, results);

        // Limpar sessão após download
        setTimeout(() => {
            clearFiles();
        }, 1000);

    } catch (error) {
        console.error('Erro na compressão:', error);
        alert('Ocorreu um erro durante a compressão. Por favor, tente novamente.\n\nDetalhes: ' + error.message);
    } finally {
        hideProgress();
    }
}

// Compressão agressiva - renderiza páginas como imagens e recria o PDF
async function compressPDFAggressive(file) {
    const arrayBuffer = await file.arrayBuffer();
    
    // Carregar PDF com pdf.js para renderização
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfJs = await loadingTask.promise;
    const numPages = pdfJs.numPages;

    // Criar novo PDF com pdf-lib
    const newPdfDoc = await PDFLib.PDFDocument.create();

    // Processar cada página
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdfJs.getPage(pageNum);
        const viewport = page.getViewport({ scale: state.compression.scale });

        // Criar canvas para renderização
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // Fundo branco
        context.fillStyle = 'white';
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Renderizar página no canvas
        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;

        // Converter para JPEG comprimido
        const imageDataUrl = canvas.toDataURL('image/jpeg', state.compression.imageQuality);
        const imageBytes = dataUrlToBytes(imageDataUrl);

        // Embutir imagem no novo PDF
        const jpgImage = await newPdfDoc.embedJpg(imageBytes);

        // Calcular dimensões da página (em pontos, 72 pontos = 1 polegada)
        const originalViewport = page.getViewport({ scale: 1 });
        const pageWidth = originalViewport.width * 0.75; // Converter para pontos
        const pageHeight = originalViewport.height * 0.75;

        // Adicionar página com a imagem
        const newPage = newPdfDoc.addPage([pageWidth, pageHeight]);
        newPage.drawImage(jpgImage, {
            x: 0,
            y: 0,
            width: pageWidth,
            height: pageHeight
        });

        // Limpar canvas da memória
        canvas.width = 0;
        canvas.height = 0;
    }

    // Salvar PDF comprimido
    let pdfBytes = await newPdfDoc.save({
        useObjectStreams: true
    });

    // Se ainda estiver acima do limite, tentar qualidade mais baixa
    const sizeKB = pdfBytes.byteLength / 1024;
    if (sizeKB > state.compression.targetMaxKB && numPages <= 3) {
        pdfBytes = await recompressWithLowerQuality(file, numPages);
    }

    return pdfBytes;
}

// Recomprimir com qualidade mais baixa se necessário
async function recompressWithLowerQuality(file, numPages) {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfJs = await loadingTask.promise;
    
    const newPdfDoc = await PDFLib.PDFDocument.create();
    
    // Usar configurações mais agressivas
    const lowerScale = 1.2;
    const lowerQuality = 0.5;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdfJs.getPage(pageNum);
        const viewport = page.getViewport({ scale: lowerScale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        context.fillStyle = 'white';
        context.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;

        const imageDataUrl = canvas.toDataURL('image/jpeg', lowerQuality);
        const imageBytes = dataUrlToBytes(imageDataUrl);

        const jpgImage = await newPdfDoc.embedJpg(imageBytes);

        const originalViewport = page.getViewport({ scale: 1 });
        const pageWidth = originalViewport.width * 0.75;
        const pageHeight = originalViewport.height * 0.75;

        const newPage = newPdfDoc.addPage([pageWidth, pageHeight]);
        newPage.drawImage(jpgImage, {
            x: 0,
            y: 0,
            width: pageWidth,
            height: pageHeight
        });

        canvas.width = 0;
        canvas.height = 0;
    }

    return await newPdfDoc.save({ useObjectStreams: true });
}

// Converter data URL para bytes
function dataUrlToBytes(dataUrl) {
    const base64 = dataUrl.split(',')[1];
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

// Utilitários de UI
function showProgress() {
    elements.progressContainer.classList.add('visible');
    elements.compressBtn.disabled = true;
}

function hideProgress() {
    elements.progressContainer.classList.remove('visible');
    elements.compressBtn.disabled = state.files.length === 0;
}

function updateProgress(percent, text) {
    elements.progressFill.style.width = `${percent}%`;
    elements.progressText.textContent = text;
}

function showResults(originalSize, compressedSize, results) {
    const compressionRate = ((1 - compressedSize / originalSize) * 100).toFixed(1);
    
    let detailsHtml = results.map(r => {
        const rate = ((1 - r.compressedSize / r.originalSize) * 100).toFixed(0);
        return `<small>${escapeHtml(r.name)}: ${formatFileSize(r.originalSize)} → ${formatFileSize(r.compressedSize)} (-${rate}%)</small>`;
    }).join('<br>');
    
    elements.resultsSummary.innerHTML = `
        <p><strong>Arquivos processados:</strong> ${results.length}</p>
        <p><strong>Tamanho original total:</strong> ${formatFileSize(originalSize)}</p>
        <p><strong>Tamanho comprimido total:</strong> ${formatFileSize(compressedSize)}</p>
        <p class="compression-rate">Redução total: ${compressionRate}%</p>
        <hr style="border-color: rgba(255,255,255,0.1); margin: 15px 0;">
        <div style="text-align: left; max-height: 150px; overflow-y: auto;">
            ${detailsHtml}
        </div>
    `;
    
    elements.results.classList.add('visible');
}

function hideResults() {
    elements.results.classList.remove('visible');
}

// Utilitários
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Iniciar aplicação
init();
