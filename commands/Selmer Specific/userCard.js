const { Interaction, User } = require('discord.js');
const { CreateNewCollection } = require('../db/econ');
const sharp = require('sharp');
const fetch = require('node-fetch');


/**
 * @param {*} doc 
 * @returns {Promise<Buffer>}
 */
function generateCard(bot, doc, user) {
    return new Promise((resolve, reject) => {
        var txt = {stats: `Rank:${doc.rank}\txp:${doc.xp}\n`};
        txt.game = `Game:${doc.game || "N/A"}\tOpponent:${doc.opponent || "N/A"}\n`;

        bot.mongoconnection.then((client) => {
            client.db('main').collection('setup').findOne({'statCardMainBk': {$exists: true}}).then(async (doc) => {
                const width = 1024;
                const height = 500;
                
                const genInfo = `
                    <svg width="${width}" height="${height}">
                        <style>
                            .genContent { fill: #FFFFFF; font-size: 40px; font-weight: bold;}
                        </style>
                        <text x="50%" y="50%" text-anchor="middle" class="genContent" font-family='Didot'>${txt.stats}</text>
                    </svg>
                    `;
                
                const gameInfo = `
                    <svg width="${width}" height="${height}">
                        <style>
                            .gameContent { fill: #FFFFFF; font-size: 40px; font-weight: bold;}
                        </style>
                        <text x="50%" y="50%" text-anchor="middle" class="gameContent" font-family='Didot'>${txt.game}</text>
                    </svg>
                    `;

                const genTitle = `
                    <svg width="${width}" height="${height}">
                        <style>
                            .genTitle { fill: #FFFFFF; font-size: 55px; font-weight: bold;}
                        </style>
                        <text x="50%" y="50%" text-anchor="middle" class="genTitle" font-family='Didot'>${user.tag}'s Stats</text>
                    </svg>
                    `;

                const gameTitle = `
                    <svg width="${width}" height="${height}">
                        <style>
                            .genTitle { fill: #FFFFFF; font-size: 55px; font-weight: bold;}
                        </style>
                        <text x="50%" y="50%" text-anchor="middle" class="genTitle" font-family='Didot'>Game Stats</text>
                    </svg>
                    `

                const userData = `
                    <svg width="${width}" height="${height}">
                        <style>
                            .genTitle { fill: #FFFFFF; font-size: 55px; font-weight: bold;}
                        </style>
                        <text x="50%" y="50%" text-anchor="middle" class="genTitle" font-family='Didot'>${user.tag}'s Stats</text>
                    </svg>
                    `

                const r = 70;
                const circleShape = Buffer.from(`<svg><circle cx="${r}" cy="${r}" r="${r}" /></svg>`);
                var response, arrayBuffer;
                const genInfoBuffer = Buffer.from(genInfo);
                const gameInfoBuffer = Buffer.from(gameInfo);
                const genTitleBuffer = Buffer.from(genTitle);
                const gameTitleBuffer = Buffer.from(gameTitle);
                const userBuffer = Buffer.from(userData);

                response = await fetch(user.displayAvatarURL());
                arrayBuffer = await response.arrayBuffer();
                const iconBuffer = Buffer.from(arrayBuffer);

                var bkBuffer = Buffer.from(doc.statCardMainBk, 'base64');

                sharp(iconBuffer)
                .resize(230, 230)
                .composite([{
                    input: circleShape,
                    blend: 'dest-in'
                }])
                .toBuffer().then((iconBufferNew) => {
                    sharp(bkBuffer)
                        .resize(1024, 500)
                        .composite([
                        {
                            input: genTitleBuffer,
                            top: 15,
                            left: -10,
                        },
                        {
                            input: genInfoBuffer,
                            top: 60,
                            left: -10,
                        },
                        {
                            input: gameTitleBuffer,
                            top: 140,
                            left: -10,
                        },
                        {
                            input: gameInfoBuffer,
                            top: 185,
                            left: -10,
                        },
                        // {
                        //     input: userBuffer,
                        //     top: 0,
                        //     left: -100,
                        // },
                        {
                            input: iconBufferNew,
                            top: 0,
                            left: 1024/2 - 300/2,
                        },
                        ]).toBuffer((err, buffer) => {
                            if (err) { return reject(err); }

                            resolve(buffer);
                    });
                }).catch((err) => { reject(err); })
            });
        });
    });
}



/**
 * @param {Interaction} interaction 
 */
function showCard(bot, interaction) {
    const { targetUser } = interaction;

    if (targetUser.bot) {
        return interaction.reply({content: "This user is a bot!", ephemeral: true}).catch(() => {
            interaction.channel.send({content: "This user is a bot!", ephemeral: true});
        });
    }

    bot.mongoconnection.then((client) => {
        const dbo = client.db(interaction.guildId).collection(targetUser.id);

        dbo.findOne({rank: {$exists: true}}).then((doc) => {
            if (!doc) {
                return CreateNewCollection(interaction, client, interaction.guildId, targetUser.id);
            } else if (doc.private) {
                return interaction.reply({content: "This user has their profile set to private!", ephemeral: true}).catch(() =>{
                    interaction.channel.send({content: "This user has their profile set to private!", ephemeral: true})
                })
            }

            generateCard(bot, doc, targetUser).then((cardBuffer) => {
                interaction.reply({files: [cardBuffer]});
            }).catch((err) => { console.error(err); });
        });
    });
}


module.exports = { showCard }