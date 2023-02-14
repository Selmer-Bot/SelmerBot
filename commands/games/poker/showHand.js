const sharp = require('sharp');
const fetch = require('node-fetch');
const fs = require('fs');
const { Hand, Card } = require('./classes.js')


/**
 * @param {*} bot
 * @param {Hand} h
 */
async function showHand(bot, interaction, players) {
    const player = players.find((u) => (u.user == interaction.user.id));
    var h = player.cards;
    
    h = h.concat(player.cards);
    // h.push(h[0]);

    var response = await fetch('https://github.com/Selmer-Bot/SelmerBot/blob/main/assets/black_square.jpg?raw=true');
    var arrayBuffer = await response.arrayBuffer();
    const bkBuffer = Buffer.from(arrayBuffer);
    var bk = sharp(bkBuffer).resize(1500, 2000);

    /*
    { 150 }  [card1] { 500 } [card2]  { 150 }
    
    {75} [card3] {400} [card5] {400} [card4] {75}

    the background is [w=1500, h=2000]
    every card is [w=350, h=850]
    */

    // spacing_list = [150, 500, 150, 75, 400, 400, 75];
    spacing_list = [250, 850, 50, 550, 1050];

    const tempbufs = new Array();

    for (let i = 0; i < h.length; i++) {
        const card = h[i];
        const data = fs.readFileSync(card.path);
        if (!data) break;
        const cardBuffer = await sharp(data).resize({width: 400, height: 650, fit: sharp.fit.fill}).toBuffer();

        tempbufs.push({
            input: cardBuffer,
            top: (i >= 2) ? 1000 : 40,
            left: spacing_list[i],
        });
    }

    response = await fetch('https://github.com/Selmer-Bot/SelmerBot/blob/main/assets/white_square.jpg?raw=true');
    arrayBuffer = await response.arrayBuffer();
    const whitecardbuffer = Buffer.from(arrayBuffer);
    const whitecard = sharp(whitecardbuffer).resize({width: 400, height: 650});

    for (let i = h.length; i < 5; i++) {
        tempbufs.push({
            input: await whitecard.toBuffer(),
            top: (i >= 2) ? 1000 : 40,
            left: spacing_list[i],
        });
    }


    bk = bk.composite(tempbufs);
    bk.toBuffer((err, buffer) => {
        if (err) { return console.error(err); }

        // return console.log(buffer.byteLength * 0.000001);
        const sendObj = {files: [buffer], ephemeral: true};
        interaction.reply(sendObj).catch(() => {
            interaction.channel.send(sendObj);
        });
    });
}


module.exports = { showHand }