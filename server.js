import express from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';
import Tesseract from 'tesseract.js';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;

// Create directories if they don't exist
const uploadsDir = path.join(__dirname, 'uploads');
const exportsDir = path.join(__dirname, 'exports');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
}

app.use(cors());
app.use(express.static('public'));

// Configure multer for file uploads
const upload = multer({ dest: uploadsDir });

// Extract text from PDF using OCR if needed
async function extractTextFromPDF(filePath) {
    try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);

        // If we got text, return it
        if (data.text && data.text.trim().length > 20) {
            console.log('Text extracted from PDF (direct)');
            return data.text;
        }

        // If PDF has no text, try OCR
        console.log('PDF has no readable text, attempting OCR...');
        return await extractTextUsingOCR(filePath);
    } catch (error) {
        console.error('Error in extractTextFromPDF:', error);
        throw error;
    }
}

// Extract text using Tesseract OCR - convert PDF to image using Ghostscript
async function extractTextUsingOCR(pdfFilePath) {
    let worker = null;
    let imageFilePath = null;
    try {
        console.log('Starting OCR process...');
        console.log('Converting PDF to PNG using Ghostscript...');

        // Use Ghostscript to convert PDF to PNG
        const imageName = path.join(uploadsDir, `invoice_${Date.now()}.png`);

        try {
            // Use Ghostscript to convert PDF to PNG
            const gsCmd = `"C:\\Program Files\\gs\\gs10.06.0\\bin\\gswin64c.exe" -q -dNOPAUSE -dBATCH -sDEVICE=png16m -r300 -sOutputFile="${imageName}" "${pdfFilePath}"`;
            console.log('Running Ghostscript command...');
            execSync(gsCmd, { timeout: 60000 });
            imageFilePath = imageName;
            console.log('Successfully converted PDF to image');
        } catch (err) {
            console.log('Ghostscript conversion failed:', err.message);
            throw new Error('Failed to convert PDF: ' + err.message);
        }

        if (!fs.existsSync(imageFilePath)) {
            throw new Error('Failed to create image from PDF');
        }

        console.log('PDF converted to image:', imageFilePath);

        // Use Tesseract to read the image
        const { createWorker } = Tesseract;
        worker = await createWorker(['eng', 'heb']);

        console.log('OCR Worker created, recognizing image...');
        const ocrResult = await worker.recognize(imageFilePath);
        const text = ocrResult.data.text;

        console.log('OCR completed, text length:', text.length);

        // Clean up image file
        if (imageFilePath && fs.existsSync(imageFilePath)) {
            fs.unlinkSync(imageFilePath);
        }

        return text;
    } catch (error) {
        console.error('OCR Error:', error.message);
        // Clean up image file if it exists
        if (imageFilePath && fs.existsSync(imageFilePath)) {
            try {
                fs.unlinkSync(imageFilePath);
            } catch (e) {
                console.error('Error cleaning up image:', e.message);
            }
        }
        throw new Error('Could not extract text from PDF: ' + error.message);
    } finally {
        if (worker) {
            try {
                await worker.terminate();
            } catch (e) {
                console.error('Error terminating worker:', e.message);
            }
        }
    }
}

// Parse invoice data from text
function parseInvoiceData(text) {
    const data = {};

    // Log the extracted text for debugging
    console.log('===== EXTRACTED TEXT FROM PDF =====');
    console.log(text.substring(0, 1000)); // Log first 1000 characters
    console.log('===== END TEXT =====\n');

    // Try multiple patterns for Invoice Number (handle OCR errors like "roveieNo" instead of "invoiceNo")
    let invoiceNoMatch = text.match(/[ri]o[vi]ei[ce]No\.\s*\|\s*(\d{4,})/i);
    if (!invoiceNoMatch) invoiceNoMatch = text.match(/invoice\s*(?:no\.?|number|#)[:\s]+(\d{4,})/i);
    if (!invoiceNoMatch) invoiceNoMatch = text.match(/inv\.?\s*[:\s]*(\d{4,})/i);
    if (!invoiceNoMatch) invoiceNoMatch = text.match(/חשבונית\s*[#:]?\s*([0-9\-]{4,})/i);
    // Look for number after "PO BOX" or similar patterns if not found
    if (!invoiceNoMatch) {
        let numberAfterPattern = text.match(/(?:P\.?O\.?\s+)?BOX\s+\d+\s+(\d{4,})/i);
        if (numberAfterPattern) invoiceNoMatch = numberAfterPattern;
    }
    // Pattern: 5-6 digit numbers that appear with a date (common invoice number format: XXXXXX DATE)
    if (!invoiceNoMatch) {
        let candidateNumbers = text.match(/(\d{5,6})\s+\d{1,2}\/\d{1,2}\/\d{2,4}/);
        if (candidateNumbers) invoiceNoMatch = candidateNumbers;
    }
    data.invoiceNo = invoiceNoMatch ? invoiceNoMatch[1].trim() : '';

    // Try multiple patterns for Invoice Date
    let dateMatch = text.match(/invoiceDate\s*\|\s*(\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4})/i);
    if (!dateMatch) dateMatch = text.match(/(?:invoice\s+)?date[:\s]+(\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4})/i);
    if (!dateMatch) dateMatch = text.match(/תאריך[:\s]+(\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4})/i);
    if (!dateMatch) {
        // Look for date in format MM/DD/YYYY near the top of document
        let allDates = text.match(/\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4}/g);
        if (allDates && allDates.length > 0) dateMatch = [null, allDates[0]];
    }
    data.invoiceDate = dateMatch ? dateMatch[1].trim() : '';



    // Description of Charges - extract line items separately with amounts
    let chargeItems = [];
    let descMatch = text.match(/description\s+of\s+charges([\s\S]*?)(?:due\s+on|payable|DUE\s+ON|PAYABLE|$)/i);
    if (descMatch) {
        let lines = descMatch[1]
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0 && !line.match(/^amount$/i) && !line.match(/^\|/));

        // Parse each line to separate description from amount
        lines.forEach(line => {
            // Match lines that have a description followed by a number
            let match = line.match(/^(.+?)\s+([\d,]+\.\d{2})$/);
            if (match) {
                chargeItems.push({
                    description: match[1].trim(),
                    amount: match[2].trim()
                });
            }
        });
    }

    // Store charge items in data
    data.chargeItems = chargeItems;
    // Also keep description for backward compatibility
    data.description = chargeItems.map(item => `${item.description}: ${item.amount}`).join('; ').slice(0, 300);

    // Amount - look for dollar amounts, prioritize the final total
    let amountMatch = text.match(/\$\s*([\d,]+\.\d{2})(?=\s*$|\s*\n\s*$)/m);
    if (!amountMatch) amountMatch = text.match(/total\s+due[:\s]*\$?\s*([\d,]+\.\d{2})/i);
    if (!amountMatch) amountMatch = text.match(/payable.*?\$\s*([\d,]+\.\d{2})/i);
    if (!amountMatch) amountMatch = text.match(/([\d,]+\.\d{2})\s*$/m);
    data.amount = amountMatch ? amountMatch[1].trim() : '';

    // Due On - look for specific patterns
    let dueMatch = text.match(/due\s+on[:\s]+(\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4})/i);
    if (!dueMatch) dueMatch = text.match(/payment\s+due[:\s]+(\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4})/i);
    if (!dueMatch) dueMatch = text.match(/תאריך\s+תשלום[:\s]+(\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4})/i);
    if (!dueMatch && /\d{1,2}\/\d{1,2}/.test(text)) {
        // Look for second date if we can't find explicit "due" label
        let dates = text.match(/\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4}/g);
        if (dates && dates.length > 1) {
            dueMatch = [null, dates[dates.length - 1]];
        }
    }
    data.dueOn = dueMatch ? dueMatch[1].trim() : '';

    // Payable Upon Receipt
    data.payableUponReceipt = /payable\s+upon\s+receipt|payment\s+due\s+upon\s+receipt|מיד עם קבלה/i.test(text) ? 'Yes' : 'No';

    console.log('Parsed data:', data);
    return data;
}

// Upload and process PDF
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        console.log('Upload request received');

        if (!req.file) {
            console.log('No file in request');
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log('File received:', req.file.originalname);
        const fileName = req.file.originalname;
        const filePath = req.file.path;

        // Extract text from PDF
        console.log('Extracting text from PDF...');
        const pdfText = await extractTextFromPDF(filePath);
        console.log('Text extracted, length:', pdfText.length);

        // Parse invoice data
        const invoiceData = parseInvoiceData(pdfText);
        invoiceData.fileName = fileName;

        // Clean up uploaded file
        fs.unlinkSync(filePath);

        console.log('Sending response:', invoiceData);
        res.json(invoiceData);
    } catch (error) {
        console.error('Error processing PDF:', error.message);
        console.error('Stack:', error.stack);
        if (req.file) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (e) {
                console.error('Error deleting file:', e);
            }
        }
        res.status(500).json({ error: 'Error processing PDF: ' + error.message });
    }
});

// Export to Excel
app.post('/api/export', express.json(), async (req, res) => {
    try {
        const invoices = req.body;

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Invoices');

        // Find max number of charge items across all invoices
        let maxChargeItems = 0;
        invoices.forEach(invoice => {
            if (invoice.chargeItems && invoice.chargeItems.length > maxChargeItems) {
                maxChargeItems = invoice.chargeItems.length;
            }
        });

        // Build headers dynamically based on charge items
        const headers = ['File Name', 'Invoice No.', 'Invoice Date', 'Total Amount', 'Due On', 'Payable Upon Receipt'];

        // Add columns for each charge item (description and amount)
        for (let i = 0; i < maxChargeItems; i++) {
            headers.push(`Charge ${i + 1} Description`);
            headers.push(`Charge ${i + 1} Amount`);
        }

        worksheet.addRow(headers);

        // Style header
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };

        // Add data rows
        invoices.forEach(invoice => {
            const row = [
                invoice.fileName || '',
                invoice.invoiceNo || '',
                invoice.invoiceDate || '',
                invoice.amount || '',
                invoice.dueOn || '',
                invoice.payableUponReceipt || ''
            ];

            // Add charge items
            if (invoice.chargeItems) {
                invoice.chargeItems.forEach(item => {
                    row.push(item.description || '');
                    row.push(item.amount || '');
                });
            }

            // Fill empty cells if this invoice has fewer charge items
            const chargeItemCount = invoice.chargeItems ? invoice.chargeItems.length : 0;
            for (let i = chargeItemCount; i < maxChargeItems; i++) {
                row.push('');
                row.push('');
            }

            worksheet.addRow(row);
        });

        // Adjust column widths
        worksheet.columns.forEach(column => {
            column.width = 25;
        });

        // Generate file
        const fileName = `invoices_${new Date().getTime()}.xlsx`;
        const filePath = path.join(exportsDir, fileName);

        await workbook.xlsx.writeFile(filePath);

        res.download(filePath, fileName, (err) => {
            if (err) {
                console.error('Error downloading file:', err);
            }
            // Clean up file after download
            fs.unlinkSync(filePath);
        });
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        res.status(500).json({ error: 'Error exporting to Excel: ' + error.message });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// Error handling for uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

app.listen(PORT, () => {
    console.log(`Invoice Extractor app running at http://localhost:${PORT}`);
    console.log(`Upload directory: ${uploadsDir}`);
    console.log(`Export directory: ${exportsDir}`);
});
