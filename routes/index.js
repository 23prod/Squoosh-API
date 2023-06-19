const ImagePool = require('@squoosh/lib').ImagePool;
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const fsExtra = require('fs-extra');
const express = require('express');
const router = express.Router();
const imagePool = new ImagePool(4);

router.post('/', async function (req, res) {
  fsExtra.emptyDirSync('./img');
  fsExtra.emptyDirSync('./compressed');

  const savePath = "img/" + crypto.randomBytes(5).readUInt32LE(0) + "/";

  if (!fs.existsSync(savePath)) {
    fs.mkdirSync(savePath);
  }

  if (!req.files) {
    return res.status(400).json({ message: "You must send a file" })
  }

  const file = req.files.file;
  const filePath = savePath + file.name;
  let sizeDatas = null;
  if (req.body.data) {
    sizeDatas = JSON.parse(req.body.data);
    sizeDatas = JSON.parse(sizeDatas);
  }

  fs.writeFile(filePath, file.data, function(err) {
    console.log(err);
  });

  const outputImg = await compressImg(filePath, sizeDatas);
  return res.download(outputImg);
});

async function compressImg(imagePath, sizeDatas = null) {
  const image = imagePool.ingestImage(imagePath);

  await image.decoded;

  if (sizeDatas) {
    const preprocessOptions = {
      resize: {
        enabled: true,
        width: sizeDatas.width,
        height: sizeDatas.height,
      }
    };
    await image.preprocess(preprocessOptions);
  }

  const encodeOptions = {
    mozjpeg: {},
    jxl: {
      quality: 90,
    },
  };
  await image.encode(encodeOptions);

  const rawEncodedImage = (await image.encodedWith.mozjpeg).binary;

  const outputFile = path.basename(imagePath);
  const outputDir = 'compressed/' + crypto.randomBytes(5).readUInt32LE(0) + '/';

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  fs.writeFileSync(outputDir + outputFile, rawEncodedImage);
  return outputDir + outputFile;
}

module.exports = router;
