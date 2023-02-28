const { Interaction, ActionRowBuilder, ThreadChannel, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { CreateNewCollection, STATE } = require('../../db/econ');
const {Hand, Card} = require('./classes.js');
const wait = require('node:timers/promises').setTimeout;
const {Collection} = require('discord.js');

const deckMain = new Hand();
function setUpDeckMain() {
    const p = path.join(__dirname, '../../../assets/poker_cards');
    fs.readdirSync(p)
    .forEach(file => {
        if (file.indexOf('joker') == -1) {
            deckMain.cards.push(new Card(file, path.join(p, file)));
            // deckMain.set(file, path.join(p, file));
        }
    });
}
setUpDeckMain();


/**
 * @description Makes a copy of the main deck for a local game
 * @param {Hand} deckMain
 * @returns {Promise<Hand>}
 */
function make_copy(deckMain) {
    return new Promise((resolve, reject) => {
        try {
            const m = new Hand(null);
            m.cards = [...deckMain.cards];

            resolve(m);
        } catch (err) {
            reject(err);
        }
    });
}


/**
 * Shuffle a local deck
 * @param {Hand} inp
 * @returns {Promise<Hand>}
 */
function shuffle(inp) {
    // const arr = Array.from(inp).sort(() => Math.random() - 0.5);
    // return new Map(arr);

    return new Promise((resolve, reject) => {
        var arr = [...inp.cards];
        for (let i = arr.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    
        inp.cards = [...arr];
        resolve(inp);
    });
}


/**
 * @param {*} bot 
 * @param {*} client 
 * @param {Interaction} interaction 
 * @param {Array<Hand>} acceptedCards these are the player's decks
 * @param {Hand} gen this is the main deck
 * @param {ThreadChannel} thread
 */
async function deal(bot, client, interaction, acceptedCards, gen, thread) {
    thread.send("Shuffling cards....");
    await wait(3000);

    //Deal the cards, removing them from the main deck and adding them to each player
    thread.send("Dealing...");
    for (let t = 0; t < 2; t++) {
        for (let i = 0; i < acceptedCards.length; i++) {
            var l = gen.cards.length;
            acceptedCards[i].cards.push(gen.cards[l - 1]);
            gen.cards.pop();
        }
    }

    const gbo = client.db('B|S' + bot.user.id).collection(interaction.guildId);
    gbo.insertOne({game: "poker", players: acceptedCards, genDeck: gen, thread: thread.id, turn: 0, round: 0, anyRaises: false, highestBid: 0});
    await wait(2000);

    thread.send(`All cards delt! Your turn <@${acceptedCards[0].user}>`);
}


/**
 * @param {*} bot 
 * @param {Interaction} interaction 
 * @param {Array<String>} players 
 */
function postAccptMsg(bot, interaction, players) {
    const btnAccpt = new ButtonBuilder()
    .setCustomId(`pokerInviteAccpt|${interaction.user.id}`)
    .setStyle(ButtonStyle.Success)
    .setLabel("Accept Invite");
    
    const btnCancel = new ButtonBuilder()
    .setCustomId(`pokerInviteCancel|${interaction.user.id}`)
    .setStyle(ButtonStyle.Danger)
    .setLabel("Cancel Game");

    const row = new ActionRowBuilder()
    .addComponents([btnAccpt, btnCancel]);

    var txt = "";
    players.forEach((p) => {
        txt += `<@${p}>, `;
    });

    // txt = txt.substring(0, txt.length - 2);
    txt += `you have been invited to play ***poker*** by ${interaction.user}, click the button below to accept!\n\nInvites Remaining: \`${players.length}\``;

    interaction.channel.send({content: txt, components: [row]})
}


/**
 * @description This serves as the "game start" function
 * @param {*} bot 
 * @param {Interaction} interaction 
 */
function initialize(bot, interaction) {
    new Promise((resolve, reject) => {
        const opts = interaction.options.data[0].options;
        const players = new Array();

        bot.mongoconnection.then((client) => {
            const processed = opts.map(async (opt) => {
                try {
                    if (opt.user.bot) {
                        return reject("You can't add a bot to a game!");
                    } else if (opt.user.id == interaction.user.id) {
                        return reject("You're already in the game!");
                    }

                    const dbo = client.db(interaction.guildId).collection(opt.user.id);
                    await dbo.findOne({"game": {$exists: true}}).then((doc) => {
                        if (!doc) {
                            return CreateNewCollection(interaction, client, interaction.guildId, opt.user.id);
                        }
                        if (doc.game) {
                            return reject(`${opt.user} is already in a game!`);
                        }

                        players.push(opt.user.id);
                    });
                } catch(err) {/* This is to make sure double-rejections are handled */}
            });

            Promise.all(processed).then(() => {
                if (players.length == opts.length) {
                    resolve(players);
                }
            });
        });
    }).then((players) => {
        bot.mongoconnection.then(async (client) => {
            const gbo = client.db('B|S' + bot.user.id).collection(interaction.guildId);
            var newObj = {"PokerTemp": players.length, pending: players, accepted: [interaction.user.id]};
            
            gbo.insertOne(newObj);
            postAccptMsg(bot, interaction, players);
        });
    }).catch((err) => {
        interaction.reply(err).catch(() => {
            interaction.channel.send(err);
        });
    });
}


/**
 * @param {*} bot 
 * @param {Interaction} interaction 
 * @returns 
 */
function editAccptMsg(bot, interaction) {
    if (interaction.customId.indexOf("pokerInviteCancel") != -1) {
        if (interaction.user.id == interaction.customId.split('|')[1]) {
            return interaction.message.edit({content: `${interaction.user} has canceled a game of poker!`, components: []});
        } else {
            return interaction.reply({content: "You didn't start this game!", ephemeral: true});
        }
    }
    
    bot.mongoconnection.then(async (client) => {
        const gbo = client.db('B|S' + bot.user.id).collection(interaction.guildId);
        const uid = interaction.user.id;

        gbo.findOne({$or: [{accepted: uid}, {pending: uid}]}).then((doc) => {
            if (!doc) {
                return interaction.reply({content: "You're not part of this game!", ephemeral: true});
            }

            if (doc.pending.indexOf(interaction.user.id) == -1) {
                return interaction.reply({content: "You've already part of this game!", ephemeral: true});
            }

            gbo.updateOne({pending: uid}, { $push: { accepted: uid } }).then((conf) => {
                if (doc.pending.length - 1 > 0) {
                    interaction.reply("You've joined the game!");
                    var msgTemp = interaction.message.content;
                    const startInd = msgTemp.indexOf('`');
                    const endInd = msgTemp.indexOf('`', startInd + 1);
                    const num = msgTemp.substring(startInd + 1, endInd);

                    msgTemp = msgTemp.replace(`\`${num}\``, `\`${String(Number(num) - 1)}\``);
                    interaction.message.edit({content: msgTemp});

                    return gbo.updateOne({pending: uid}, { $pull: { pending: { $in: [ uid ] }} });
                }

                //Start the new game
                const accepted = doc.accepted;
                accepted.push(interaction.user.id);

                const acceptedCards = new Array();

                //#region Database initialization

                //Create the game collection and edit the player's games
                const db = client.db(interaction.guildId);
                const processed = accepted.map(async (pid) => {
                    acceptedCards.push(new Hand(pid));
                    const dbo = db.collection(pid);
                    dbo.updateOne( { "game": {$exists: true} }, { $set: { game: "poker", state: STATE.FIGHTING }});
                });

                Promise.all(processed).then(async () => {
                    const threadname = `${interaction.user.username} has started a game of poker with ${accepted.length} people!`;

                    var gen = await make_copy(deckMain);
                    gen = await shuffle(gen);
                    gbo.deleteOne({pending: interaction.user.id});

                    interaction.message.delete();
                    const thread = await interaction.channel.threads.create({
                        name: threadname,
                        // type: 'GUILD_PRIVATE_THREAD',
                        autoArchiveDuration: 60,
                        reason: `N/A`,
                    });

                    deal(bot, client, interaction, acceptedCards, gen, thread);
                });

                //#endregion Database initialization
            });
        });
    });
}


module.exports = {initialize, editAccptMsg}