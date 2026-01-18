# Invoice Extractor 📄

A web application that extracts invoice data from PDF files and exports the data to Excel.

## 🚀 Quick Start (No Installation!)

### Option 1: Use Online (Recommended for Everyone)
**Visit:** https://ronendavid.github.io/invoice-extractor/standalone.html

✨ Works instantly in any browser - no installation needed!

### Option 2: Download Local File
1. Download `standalone.html` from this repository
2. Double-click to open in your browser
3. Done! 🎉

### Option 3: Run Local Server (Advanced)
See installation instructions below

## Features

- ✅ Upload multiple PDF invoices
- ✅ Automatically extract invoice data:
  - Invoice Number
  - Invoice Date
  - Your Reference
  - Description of Charges (with individual line items)
  - Amount
  - Due On
  - Payable Upon Receipt
  - File Name
- ✅ View extracted data in a table
- ✅ Export all data to Excel (XLSX format)
- ✅ Works offline (after initial load)
- ✅ Privacy-first (all processing on your device)
- 🌍 Supports English & Hebrew

## Installation (Local Server)

### Prerequisites
- Node.js 18+
- Ghostscript (for PDF to image conversion)

### Steps

1. Navigate to the project directory:
```bash
cd invoice-extractor
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser:
```
http://localhost:3000
```

## Usage

### Web Version
1. Click "Choose PDF Files" to select one or more PDF invoices
2. The app will automatically extract data from each PDF
3. Review the extracted data in the table
4. Click "Export to Excel" to download all data as an Excel file

### Standalone HTML
- Same as above, but no server needed!
- Download the `standalone.html` file and open it in any browser

## How It Works

- **Backend**: Node.js with Express server
- **PDF Processing**: Extracts text from PDFs using pdf-parse
- **Data Extraction**: Uses regex patterns to find invoice data
- **Excel Export**: Generates XLSX files using ExcelJS
- **Frontend**: Simple HTML/CSS/JavaScript interface

## Notes

- The app uses pattern matching to extract invoice data, so accuracy depends on invoice format
- Make sure PDFs contain text (not scanned images)
- The server runs locally on port 3000
- Uploaded files are temporarily stored in the `uploads/` directory
- Exported Excel files are created in the `exports/` directory

## Requirements

- Node.js (v14 or higher)
- npm

## Troubleshooting

If you encounter issues:
1. Make sure Node.js is installed: `node --version`
2. Delete `node_modules` and run `npm install` again
3. Check that port 3000 is not in use
4. Ensure PDFs contain text (OCR not supported for scanned images)
