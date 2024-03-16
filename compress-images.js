//node compress-images.js

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

compressImages('enemies');
compressImages('locations');

function compressImages(folderName) {
    const inputFolder = `./img/uncompressed/${folderName}`;
    const outputFolder = `./img/${folderName}`;

    if (!fs.existsSync(outputFolder)) {
        fs.mkdirSync(outputFolder);
    }

    fs.readdirSync(inputFolder).forEach((file) => {
        const inputFilePath = path.join(inputFolder, file);

        // Check if the file name contains a number or "(original)" (case insensitive)
        if (!/\d/.test(file) && !/(original)/i.test(file) && !/(old)/i.test(file)) {
            const outputFilePath = path.join(outputFolder, `${path.basename(file, path.extname(file))}.jpg`);

            // Use sharp to convert PNG to JPG
            sharp(inputFilePath).jpeg().toFile(outputFilePath, (err) => {
                if (err) {
                    console.error(`Error processing ${file}: ${err.message}`);
                } else {
                    console.log(`Processed ${file}`);
                }
            });
        }
    });
}
