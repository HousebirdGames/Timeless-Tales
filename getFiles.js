//node getFiles.js

const fs = require('fs');
const path = require('path');

function getFiles(dirPath, callback) {
    fs.readdir(dirPath, function (err, files) {
        if (err) return callback(err);

        files.forEach(function (file) {
            let fullPath = path.join(dirPath, file);
            fs.stat(fullPath, function (err, fileInfo) {
                if (err) return callback(err);
                if (fileInfo.isDirectory()) {
                    getFiles(fullPath, callback);
                } else {
                    callback(undefined, fullPath);
                }
            });
        });
    });
}

if (fs.existsSync('file-list.txt')) {
    fs.unlinkSync('file-list.txt');
}

getFiles('.', function (err, filePath) {
    if (err) throw err;
    let formattedPath = `'/timeless-tales/${filePath.replace(/\\/g, '/')}',\n`;
    fs.appendFileSync('file-list.txt', formattedPath);
});