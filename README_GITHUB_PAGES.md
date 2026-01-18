# Invoice Extractor 📄

A standalone web application for extracting invoice data from PDF files using client-side OCR.

## Features

✨ **No Installation Required** - Works directly in your browser
🔒 **Privacy First** - All processing happens on your device
📊 **Smart Data Extraction** - Automatically extracts invoice fields
💾 **Excel Export** - Export results to Excel files
🌍 **Works Offline** - After initial page load

## How to Use

### Option 1: Online (Recommended)
Visit: **https://ronendavid.github.io/invoice-extractor/standalone.html**

### Option 2: Local File
1. Download `standalone.html` from the repository
2. Open it in your browser (double-click the file)
3. Start extracting!

## Supported Fields

- Invoice Number
- Invoice Date
- Your Reference (PO Number)
- Charge Items (Description + Amount)
- Total Amount
- Due Date
- Payable Upon Receipt

## Technology Stack

- **PDF Processing**: PDF.js
- **OCR**: Tesseract.js (supports English & Hebrew)
- **Excel Generation**: SheetJS (XLSX)
- **Languages**: English & Hebrew

## Supported Languages

- 🇺🇸 English
- 🇮🇱 Hebrew

## Project Structure

```
invoice-extractor/
├── standalone.html       # Standalone web app (no installation needed)
├── server.js            # Node.js backend (optional, for local use)
├── public/index.html    # Web interface (for backend)
└── package.json         # Dependencies
```

## System Requirements (for backend)

- Node.js 18+
- Ghostscript (for PDF to image conversion)
- Tesseract.js (included via npm)

## License

MIT

## Author

Ronen David

## Support

For issues or questions, please open an issue on GitHub.
