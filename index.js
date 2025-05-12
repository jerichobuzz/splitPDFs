import express from 'express';
import multer from 'multer';
import { PDFDocument } from 'pdf-lib';

const app = express();
const upload = multer();

// ✅ Add this to parse form-data correctly
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // just in case

// ✅ Use the exact field name 'data' from n8n
app.post('/split', upload.single('data'), async (req, res) => {
  try {
    console.log('Received file:', req.file);
    if (!req.file) {
      return res.status(400).send('No file received');
    }

    const originalPdf = await PDFDocument.load(req.file.buffer);
    const totalPages = originalPdf.getPageCount();
    const chunks = [];

    for (let i = 0; i < totalPages; i += 25) {
      const chunkDoc = await PDFDocument.create();
      const pageIndices = Array.from({ length: Math.min(25, totalPages - i) }, (_, j) => i + j);
      const pages = await chunkDoc.copyPages(originalPdf, pageIndices);
      pages.forEach(p => chunkDoc.addPage(p));

      const chunkBytes = await chunkDoc.save();
      const base64 = Buffer.from(chunkBytes).toString('base64');

      chunks.push({
        fileName: `chunk_${Math.floor(i / 25) + 1}.pdf`,
        data: base64
      });
    }

    res.json({ chunks });
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to split PDF');
  }
});

app.listen(3000, () => {
  console.log('PDF Split API running on port 3000');
});
