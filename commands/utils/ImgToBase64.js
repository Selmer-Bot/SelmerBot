const fs = require('fs');
const path = require('path');


/**
 * @description Reads through a directory and converts all images to base64 strings
 * @returns {Promise<Map<String, Base64String>}
 * @param {String} dir The absolute path to the directory holding the files
 */
function ImgToBase64(dir) {
    fs.readdirSync(dir)
    .forEach(fileName => {
        const pathToFile = path.join(dir, fileName);
        fs.readFile(pathToFile, {encoding:'utf8'}, (err, data) => {
            if (err) { throw err; }

            const imgbfr = Buffer.from(data).toString('base64');
            console.log(imgbfr);
        });
    });
}

module.exports = {ImgToBase64}