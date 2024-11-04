const { MongoClient } = require('mongodb');
const axios = require('axios');
const sharp = require('sharp');
const crypto = require('crypto');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: 'pngcloud',
  api_key: '273747744149447',
  api_secret: '_djWPsLW8IgVvWtw1uF_J2Trehg'
});

async function processImage(document) {
  const { dwagain, _id } = document;

  try {
    // Perform the GET requests
    await axios.get(`https://topdata.freepnges.com/cleanpng_hits_process.php?id=${dwagain}&hl=imghits&type=download`);
    await axios.get(`https://topdata.freepnges.com/cleanpng_hits_process.php?id=${dwagain}&hl=imgdownloads&type=`);

    // Perform the POST request
    const postResponse = await axios.post('https://www.cleanpng.com/download-robot-verify/', null, {
      params: {
        dwagain: dwagain
      }
    });

    const { status, url, user_status } = postResponse.data;
    if (status !== 1) {
      console.error('Failed to verify download:', postResponse.data);
      return;
    }

    // Download the image
    const imageResponse = await axios.get(url, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(imageResponse.data);

    // Generate MD5 hash for the image
    const md5Hash = crypto.createHash('md5').update(imageBuffer).digest('hex');

    // Create image variants
    const originalPath = `original/${md5Hash}.png`;
    const largePath = `large/${md5Hash}.png`;
    const smallPath = `small/${md5Hash}.png`;

    // Upload images to Cloudinary
    const originalUpload = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream({ folder: 'original' }, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }).end(imageBuffer);
    });

    const largeBuffer = await sharp(imageBuffer).resize({ width: 900 }).toBuffer();
    const largeUpload = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream({ folder: 'large' }, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }).end(largeBuffer);
    });

    const smallBuffer = await sharp(imageBuffer).resize({ width: 400 }).toBuffer();
    const smallUpload = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream({ folder: 'small' }, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }).end(smallBuffer);
    });

    // Update MongoDB document with links
    const updatedLinks = {
      original: originalUpload.secure_url,
      large: largeUpload.secure_url,
      small: smallUpload.secure_url
    };

    const client = new MongoClient('mongodb://tyi.duckdns.org:32768');
    try {
      await client.connect();
      const db = client.db('db');
      const urlsCollection = db.collection('links');
      await urlsCollection.updateOne({ _id: _id }, { $set: { downloaded: updatedLinks } });
      console.log('Images processed and URLs updated successfully for document:', _id);
    } finally {
      await client.close();
    }
  } catch (error) {
    console.error(`Error processing document with dwagain: ${dwagain}`, error);
  }
}

async function processImages() {
  const client = new MongoClient('mongodb://tyi.duckdns.org:32768');

  try {
    await client.connect();
    const db = client.db('db');
    const urlsCollection = db.collection('links');

    const query = { dwagain: { $ne: null, $ne: 'no' }, downloaded: { $ne: null } };
    const cursor = urlsCollection.find(query);

    while (await cursor.hasNext()) {
      const document = await cursor.next();
      await processImage(document);
    }

  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    await client.close();
  }
}

processImages();
