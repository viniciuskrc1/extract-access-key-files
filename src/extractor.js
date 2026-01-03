const pdf = require('pdf-parse');

// Text variations for "CHAVE DE ACESSO"
const ACCESS_KEY_VARIATIONS = [
    'chave de acesso',
    'chave acesso',
    'chaveacesso',
    'CHAVE DE ACESSO',
    'Chave de Acesso',
    'Chave De Acesso'
];

// Search constants
const MIN_LINE_LENGTH = 20;
const MAX_LINES_AFTER_KEY = 10;
const MAX_LINES_COMBINED = 5;
const EXPECTED_KEY_LENGTH = 48;
const MIN_KEY_LENGTH = 44;
const SAMPLE_TEXT_LENGTH = 500;

// Pattern for formatted access key: 12 groups of 4 digits separated by space
const FORMATTED_KEY_PATTERN = /(\d{4}\s+){11}\d{4}/;

/**
 * Extracts access key from PDF file
 * @param {Buffer} pdfBuffer - PDF file as buffer
 * @returns {Promise<string|null>} - Access key or null if not found
 */
async function extractAccessKey(pdfBuffer) {
    try {
        const data = await pdf(pdfBuffer);
        const text = data.text;
        
        logSampleText(text);
        
        const lines = text.split(/\r?\n/);
        const accessKeyLineIndex = findAccessKeyLine(lines);
        
        if (accessKeyLineIndex >= 0) {
            const result = searchInLinesAfterKey(lines, accessKeyLineIndex);
            if (result) {
                return result;
            }
        }
        
        // Try to find "CHAVE DE ACESSO" with various variations in the full text
        for (const variation of ACCESS_KEY_VARIATIONS) {
            const pattern = new RegExp(
                `(?i)${escapeRegex(variation)}\\s*:?\\s*[^0-9]{0,200}?(\\d{44}\\s?\\d{4}|\\d{48})`,
                'i'
            );
            const match = text.match(pattern);
            if (match && match[1]) {
                const cleaned = cleanAccessKeyNumber(match[1]);
                if (cleaned && cleaned.length >= MIN_KEY_LENGTH) {
                    console.log(`Chave encontrada usando variação: ${variation}`);
                    return cleaned;
                }
            }
        }
        
        // Try other search patterns
        const result = searchWithPatterns(text);
        if (result) {
            return result;
        }
        
        console.log('Nenhuma chave encontrada no PDF');
        return null;
    } catch (error) {
        console.error('Erro ao processar PDF:', error);
        throw error;
    }
}

function extractTextFromPDF(data) {
    return data.text;
}

function logSampleText(text) {
    if (text.length > 0) {
        const sample = text.length > SAMPLE_TEXT_LENGTH 
            ? text.substring(0, SAMPLE_TEXT_LENGTH) 
            : text;
        console.log('Amostra do texto extraído:', sample);
    }
}

function findAccessKeyLine(lines) {
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.toUpperCase().includes('CHAVE') && line.toUpperCase().includes('ACESSO')) {
            console.log(`Linha encontrada com 'CHAVE DE ACESSO' (índice ${i}): ${line}`);
            logNextLines(lines, i);
            return i;
        }
    }
    return -1;
}

function logNextLines(lines, accessKeyLineIndex) {
    console.log('Próximas 10 linhas após \'CHAVE DE ACESSO\':');
    for (let j = 1; j <= MAX_LINES_AFTER_KEY && (accessKeyLineIndex + j) < lines.length; j++) {
        console.log(`  [${accessKeyLineIndex + j}] ${lines[accessKeyLineIndex + j].trim()}`);
    }
}

function searchInLinesAfterKey(lines, accessKeyLineIndex) {
    // Search line by line
    for (let i = 1; i <= MAX_LINES_AFTER_KEY && (accessKeyLineIndex + i) < lines.length; i++) {
        const line = lines[accessKeyLineIndex + i].trim();
        
        if (line.length < MIN_LINE_LENGTH) {
            continue;
        }
        
        const result = extractKeyFromLine(line, accessKeyLineIndex + i);
        if (result) {
            return result;
        }
    }
    
    // Search in combined lines
    return searchInCombinedLines(lines, accessKeyLineIndex);
}

function extractKeyFromLine(line, lineNumber) {
    const digitsOnly = line.replace(/[^0-9]/g, '');
    
    if (digitsOnly.length === EXPECTED_KEY_LENGTH) {
        console.log(`✓ Chave encontrada na linha ${lineNumber}: ${line}`);
        console.log(`  Chave limpa: ${digitsOnly}`);
        return digitsOnly;
    }
    
    if (digitsOnly.length >= MIN_KEY_LENGTH && digitsOnly.length <= EXPECTED_KEY_LENGTH) {
        console.log(`✓ Chave encontrada na linha ${lineNumber}: ${line}`);
        console.log(`  Chave limpa: ${digitsOnly}`);
        return digitsOnly;
    }
    
    // Search for formatted pattern: 12 groups of 4 digits
    const formattedMatch = line.match(FORMATTED_KEY_PATTERN);
    if (formattedMatch) {
        const formatted = formattedMatch[0];
        const cleaned = formatted.replace(/\s+/g, '');
        if (cleaned.length === EXPECTED_KEY_LENGTH) {
            console.log(`✓ Chave encontrada (formato formatado) na linha ${lineNumber}: ${line}`);
            return cleaned;
        }
    }
    
    return null;
}

function searchInCombinedLines(lines, accessKeyLineIndex) {
    const searchArea = [];
    for (let i = 1; i <= MAX_LINES_COMBINED && (accessKeyLineIndex + i) < lines.length; i++) {
        searchArea.push(lines[accessKeyLineIndex + i]);
    }
    
    const searchText = searchArea.join(' ');
    
    // Exact pattern: 12 groups of 4 digits
    const exactMatch = searchText.match(FORMATTED_KEY_PATTERN);
    if (exactMatch) {
        const found = exactMatch[0];
        const cleaned = found.replace(/\s+/g, '');
        if (cleaned.length === EXPECTED_KEY_LENGTH) {
            console.log('✓ Chave encontrada (padrão exato de 12 grupos)!');
            return cleaned;
        }
    }
    
    // Flexible search
    const normalizedSearch = searchText.replace(/[^0-9\s]/g, '');
    const flexiblePattern = /([\d\s]{50,100})/;
    const flexibleMatch = normalizedSearch.match(flexiblePattern);
    if (flexibleMatch) {
        const candidate = flexibleMatch[1];
        const digitsOnly = candidate.replace(/\s+/g, '');
        if (digitsOnly.length === EXPECTED_KEY_LENGTH) {
            console.log('✓ Chave encontrada (busca flexível)!');
            return digitsOnly;
        }
    }
    
    return null;
}

function searchWithPatterns(text) {
    // Search with variations of "CHAVE DE ACESSO"
    for (const variation of ACCESS_KEY_VARIATIONS) {
        const pattern = new RegExp(
            `(?i)${escapeRegex(variation)}\\s*:?\\s*[^0-9]{0,200}?(\\d{44}\\s?\\d{4}|\\d{48})`,
            'i'
        );
        const match = text.match(pattern);
        if (match && match[1]) {
            const cleaned = cleanAccessKeyNumber(match[1]);
            if (cleaned && cleaned.length >= MIN_KEY_LENGTH) {
                console.log(`Chave encontrada usando variação: ${variation}`);
                return cleaned;
            }
        }
    }
    
    // Pattern for 48 consecutive digits
    const generic48Digits = /\b(\d{48})\b/;
    const genericMatch = text.match(generic48Digits);
    if (genericMatch && genericMatch[1]) {
        const cleaned = cleanAccessKeyNumber(genericMatch[1]);
        if (cleaned && cleaned.length === EXPECTED_KEY_LENGTH) {
            console.log('Chave encontrada usando padrão GENERIC_48_DIGITS');
            return cleaned;
        }
    }
    
    // Pattern for long numbers (44+ digits)
    const longNumberPattern = /(\d{44,})/;
    const longMatch = text.match(longNumberPattern);
    if (longMatch && longMatch[1] && longMatch[1].length >= MIN_KEY_LENGTH) {
        const cleaned = cleanAccessKeyNumber(longMatch[1]);
        if (cleaned && cleaned.length >= MIN_KEY_LENGTH) {
            if (cleaned.length > EXPECTED_KEY_LENGTH) {
                return cleaned.substring(0, EXPECTED_KEY_LENGTH);
            }
            console.log('Chave encontrada usando padrão de número longo');
            return cleaned;
        }
    }
    
    return null;
}

function cleanAccessKeyNumber(accessKey) {
    const cleaned = accessKey.replace(/\s+/g, '').replace(/[^0-9]/g, '');
    
    if (cleaned.length === EXPECTED_KEY_LENGTH) {
        return cleaned;
    } else if (cleaned.length > EXPECTED_KEY_LENGTH) {
        return cleaned.substring(0, EXPECTED_KEY_LENGTH);
    } else if (cleaned.length >= MIN_KEY_LENGTH) {
        return cleaned;
    }
    
    return null;
}

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { extractAccessKey };

