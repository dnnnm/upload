const express = require('express');
const multer = require('multer');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');

// Set storage engine
const storage = multer.diskStorage({
  destination: './public/uploads/',
  filename: function (req, file, callback) {
    //callback(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    callback(null, file.originalname)
  },
});

// Init upload
const upload = multer({
  storage,
  limits: { fileSize: 100000000 },
  fileFilter: function (req, file, callback) {
    checkFileType(file, callback);
  },
}).single('myFile');

let imageUpload = null;

// Check file type
const checkFileType = (file, callback) => {
  // Allowed extensions
  const fileTypes = /jpeg|jpg|png|gif|json|html|js|docx|doc|pdf|txt|xls|xlsx|csv/;

  // Check extension
  const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());

  // Check MIME Type
  const mimeType = fileTypes.test(file.mimetype);

  if (mimeType && extname) {
    const imageTypes = /jpeg|jpg|png|gif/;
    imageUpload = imageTypes.test(path.extname(file.originalname).toLowerCase()) ? true : false;
    return callback(null, true);
  } else {
    return callback('Error: Unpermitted File type');
  }
};

// Init app
const app = express();

// EJS view engine
app.set('view engine', 'ejs');

// Static folder
app.use(express.static('./public'));

const msg = '';

// Routes
app.get('/', (req, res) => res.render('index', { msg }));

// Post files and images
app.post('/upload', (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      res.status(400).json({ error: err }); // Mengirim respon error dalam format JSON
    } else {
      if (req.file === undefined) {
        res.status(400).json({ error: 'Error No file uploaded' }); // Mengirim respon error dalam format JSON
      } else {
        if (!imageUpload) {
          const jsonResponse = {
            msg: 'File uploaded successfully',
            file: {
              originalname: req.file.originalname,
              encoding: req.file.encoding,
              mimetype: req.file.mimetype,
              destination: req.file.destination,
              filename: req.file.filename,
              path: req.file.path,
              size: req.file.size
            }
          };
          res.set('Content-Type', 'application/json');
          res.send(JSON.stringify(jsonResponse, null, 2)); // Mengirim respon berhasil dalam format JSON dengan indentasi
        } else {
          console.log(req.file);
          const imgToDatabase = fs.readFileSync(req.file.path);
          const encode_image = imgToDatabase.toString('base64');

          // Define a JSON object for the image attributes for saving to database
          const finalImg = {
            contentType: req.file.mimetype,
            image: new Buffer.from(encode_image, 'base64'),
            imageName: req.file.originalname.replace(/ /g, '%20'),
          };

          // Simpan data ke file JSON
          const dbPath = './data/database.json';
          const data = fs.readFileSync(dbPath, 'utf8');
          const jsonData = JSON.parse(data);

          if (!jsonData.imageUploadTest) {
            jsonData.imageUploadTest = [];
          }

          jsonData.imageUploadTest.push(finalImg);

          fs.writeFileSync(dbPath, JSON.stringify(jsonData));

          console.log('saved to database');

          const jsonResponse = {
            msg: 'Image uploaded successfully',
            file: {
              originalname: req.file.originalname,
              encoding: req.file.encoding,
              mimetype: req.file.mimetype,
              destination: req.file.destination,
              filename: req.file.filename,
              path: req.file.path,
              size: req.file.size
            }
          };
          res.set('Content-Type', 'application/json');
          res.send(JSON.stringify(jsonResponse, null, 2)); // Mengirim respon berhasil dalam format JSON dengan indentasi
        }
      }
    }
  });
});

// Get images from database
// All photos array
app.get('/photos', (req, res) => {
  const dbPath = './data/database.json';
  const data = fs.readFileSync(dbPath, 'utf8');
  const jsonData = JSON.parse(data);

  const imageUrls = jsonData.imageUploadTest.map((element) => `http://localhost:3000/photo/${element.imageName}`);

  res.render('photos', { imageUrls });
});

// Get individual photo
app.get('/photo/:name', (req, res) => {
  const imageName = req.params.name.replace(/ /g, '%20');
  const dbPath = './data/database.json';
  const data = fs.readFileSync(dbPath, 'utf8');
  const jsonData = JSON.parse(data);

  const image = jsonData.imageUploadTest.find((element) => element.imageName === imageName);

  if (image) {
    console.log(image.image);
    res.contentType('image/jpeg');
    res.send(image.image);
  } else {
    console.log('No image available');
    res.send('No image available');
  }
});

const PORT = 25458;

app.listen(PORT, () => console.log(`App started on port ${PORT}...`));
