// Nodejs encryption with CTR
const crypto = require('crypto');
const algorithm = 'aes-256-cbc';
const key = Buffer.from(require('../../config.json').encKey, 'hex');
const iv = crypto.randomBytes(16);


function encrypt(text) {
    return new Promise((resolve, reject) => {
        try {
            let cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);
            let encrypted = cipher.update(text);
            encrypted = Buffer.concat([encrypted, cipher.final()]);
            resolve({ iv: iv.toString('hex'), encryptedData: encrypted.toString('hex') });
        } catch(err) {
            reject(err);
        }
    });
}


function decrypt(text) {
    return new Promise((resolve, reject) => {
        try {
            let iv = Buffer.from(text.iv, 'hex');
            let encryptedText = Buffer.from(text.encryptedData, 'hex');
            let decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), iv);
            let decrypted = decipher.update(encryptedText);
            decrypted = Buffer.concat([decrypted, decipher.final()]);
            resolve(decrypted.toString());
        } catch(err) {
            reject(err);
        }
    });
}


module.exports = {encrypt, decrypt}