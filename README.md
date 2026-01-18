# Invoice Extractor

A simple web application that extracts invoice data from PDF files and exports the data to Excel.

## Features

- Upload multiple PDF invoices
- Automatically extract invoice data:
  - Invoice Number
  - Invoice Date
  - Your Reference
  - Description of Charges
  - Amount
  - Due On
  - Payable Upon Receipt
  - File Name
- View extracted data in a table
- Export all data to Excel (XLSX format)

## Installation

1. Navigate to the project directory:
```bash
cd invoice-extractor
```

2. Install dependencies:
```bash
npm install
```

## Usage

1. Start the server:
```bash
npm start
```

2. Open your browser and go to:
```
http://localhost:3000
```

3. Click "Choose PDF Files" to select one or more PDF invoices

4. The app will automatically extract data from each PDF

5. Review the extracted data in the table

6. Click "Export to Excel" to download all data as an Excel file

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
