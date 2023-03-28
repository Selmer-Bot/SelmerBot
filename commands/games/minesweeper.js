const { ActionRowBuilder, ButtonBuilder, ButtonStyle, Interaction } = require('discord.js');
const { winGame, loseGame, equipItem } = require('./external_game_functions.js');
const wait = require('node:timers/promises').setTimeout;
const { STATE } = require('../db/econ.js');
const { intrep } = require('../utils/discordUtils.js');

function startGame(bot, channel, interaction, solo) {
    var args;

    if (solo) {
        const opts = interaction.options.data[0].options;
        const diff = opts.filter((opt) => { return(opt.name == 'difficulty'); });
        args = [null, diff[0].value];
    } else {
        args = interaction.customId.split('|');
    }

    const optDiff = args[1];
    let componentlist = [];
    var diff;

    if (optDiff == 'easy') {
        diff = 0;
    } else if (optDiff == 'medium') {
        diff = 0.1;
    } else if (optDiff == 'hard') {
        diff = 0.2;
    } else {
        diff = 0;
    }

    for (let i = 0; i < 5; i ++) {
        const row = new ActionRowBuilder();

        for (let j = 0; j < 5; j ++) {
            //customId = (spot in row)|(spot in column)
            const btn = new ButtonBuilder();
            const isbmb = (Math.random() > (0.70 - diff));

            if (isbmb) {
                btn.setCustomId(`mswpr|${i}|${j}|t`);
            } else {
                btn.setCustomId(`mswpr|${i}|${j}|f`);
            }
            
            btn.setLabel('?')
            .setStyle(ButtonStyle.Secondary)
            row.addComponents(btn);
        }

        //Add the row to the list of rows
        componentlist.push(row);
    }

    if (solo) {
        intrep(interaction, `${interaction.user} has started a solo game of Minesweeper!`);
    }

    channel.send({ content: `SCORE: \`0\`\nTILES LEFT: \`25\``, components: componentlist });
}


function gameOver(interaction, won = false) {
    var components = interaction.message.components;

    return new Promise((resolve, reject) => {
        for (i in components) {
            for (j in components[i].components) {
                var tempBtn = ButtonBuilder.from(components[i].components[j]);
                if (components[i].components[j].customId.split("|")[3] === 't') {
                    tempBtn.setLabel("💣");
                    tempBtn.setStyle(ButtonStyle.Danger);
                } else {
                    tempBtn.setLabel("5");
                    tempBtn.setStyle(ButtonStyle.Success);
                }

                components[i].components[j] = tempBtn.setDisabled(true);
            }
        }

        if (won) {
            resolve(components);
        } else {
            interaction.message.edit({ components: components });
        }
    });
}


/**
 * @param {Interaction} interaction 
 */
async function changeBoard(bot, interaction, xp_collection) {
    interaction.deferUpdate();
    const id = interaction.customId.split('|');

    //"mswpr|y|x|<t/f>|[user]"
    const col = id[1];
    const row = id[2];
    const isbmb = (id[3] === 't');

    bot.mongoconnection.then(async (client) => {
        const gbo = client.db('B|S' + bot.user.id).collection(interaction.guildId);

        gbo.findOne({$or: [{0: interaction.user.id}, {1: interaction.user.id}]}).then(async (doc) => {
            if (!doc['1']) {
                if (interaction.user.id != doc['0']) {
                    interaction.user.send(`Message from a Minesweeper game in <#${interaction.channel.id}>: ***This is a solo game!***`);
                    return; // interaction.reply({ content: "It's not your turn!", ephemeral: true }); //Can only reply once
                } else if (doc['0'] != interaction.user.id && doc['1'] != interaction.user.id) {
                    interaction.user.send(`Message from a Minesweeper game in <#${interaction.channel.id}>: ***You're not part of this game!***`);
                    return;
                }
            }

            var components = interaction.message.components;
            var btn = components[col].components[row];

            if (isbmb) {
                gameOver(interaction);
                bot.mongoconnection.then((client) => {
                    const gbo = client.db('B|S' + bot.user.id).collection(interaction.guildId);
                    gbo.findOne({$or: [{0: interaction.user.id}, {1: interaction.user.id}]}).then((doc) => {
                        if (!doc['1']) {
                            client.db(interaction.guildId).collection(interaction.user.id).updateOne(
                                { game: {$exists: true} }, { $set: { game: null, state: STATE.IDLE } });
                        } else {
                            const dbo = client.db(interaction.guildId).collection(doc['0']);
                            dbo.updateOne({"game": {$exists: true}}, { $set: { game: null, opponent: null, state: STATE.IDLE}});

                            const other_dbo = client.db(interaction.guildId).collection(doc['1']);
                            other_dbo.updateOne({"game": {$exists: true}}, { $set: { game: null, opponent: null, state: STATE.IDLE}});
                        }

                        client.db('B|S' + bot.user.id).collection(interaction.guildId).deleteOne({$or: [{0: interaction.user.id}, {1: interaction.user.id}]});
                    })
                });
                const channel = bot.channels.cache.get(interaction.message.channel.parentId);
                channel.send(`${interaction.user} found a bomb in Minesweeper!`);
                interaction.channel.send(`\`Thread closing \`<t:${Math.floor((new Date()).getTime()/1000) + 10}:R>`);
                
                await wait(10000);
                interaction.channel.delete();
            } else {
                const btnNew = ButtonBuilder.from(btn)
                .setDisabled(true)
                .setLabel("1")
                .setStyle(ButtonStyle.Success)
                // btn.setDisabled(true);
                // btn.label = "1";
                // btn.style = "SUCCESS";
                components[col].components[row] = btnNew;

                let content = interaction.message.content;
                let score = Number(content.split('`')[1]);
                let tLeft = Number(content.split('`')[3]);

                //Win the game (just clicked the last tile)
                if (tLeft <= 1) {
                    gameOver(interaction, true).then(async (newComp) => {
                        interaction.message.edit({ content: `GAME WON!!!\nSCORE: \`${score + 1}\``, components: newComp });
                        const channel = bot.channels.cache.get(interaction.message.channel.parentId);

                        const gbo = client.db('B|S' + bot.user.id).collection(interaction.guildId);
                        gbo.findOne({$or: [{0: interaction.user.id}, {1: interaction.user.id}]}).then(async (doc) => {
                            if (doc['1']) {
                                const other = interaction.guild.members.cache.get(doc['1']);
                                channel.send(`${interaction.user} and ${other} won a game of Minesweeper with a score of ${score + 1}!`);
                            } else {
                                channel.send(`${interaction.user} won a game of Minesweeper with a score of ${score + 1}!`);
                            }
                            interaction.channel.send(`\`Thread closing\` <t:${Math.floor((new Date()).getTime()/1000) + 8}:R>`);
                            
                            await wait(7000);
                            // interaction.channel.delete();

                            if (doc['1']) {
                                const db = client.db(interaction.guildId);

                                const dbo = db.collection(interaction.user.id);
                                winGame(client, bot, db, dbo, xp_collection, interaction.message, interaction.channel);

                                const other_dbo = db.collection(interaction.user.id);
                                winGame(client, bot, db, other_dbo, xp_collection, interaction.message, interaction.channel, false);
                            } else {
                                const db = client.db(interaction.guildId);
                                const dbo = db.collection(interaction.user.id);
                                winGame(client, bot, db, dbo, xp_collection, interaction.message, true);
                            }
                        });
                    });
                } else {
                    interaction.message.edit({ content: `SCORE: \`${score + 1}\`\nTILES LEFT: \`${tLeft - 1}\``, components: components });
                }
            }
        });
    });
}


function checkAndStartGame(bot, interaction, channel, solo = false) {
    bot.mongoconnection.then(client => {
        const db = client.db(interaction.guildId);
        const dbo = db.collection(interaction.user.id);
        dbo.findOne({game: {$exists: true}}).then((doc) => {
            try {
                if (solo) {
                    if (doc.game != null) {
                        return intrep(interaction, "You're already in a game!");
                    }

                    dbo.updateOne({ "game": {$exists: true} }, { $set: { game: "minesweeper", state: STATE.FIGHTING }});
                }

                startGame(bot, channel, interaction, solo);
            } catch (err) {
                console.log(err);
                const { addComplaintButton } = require('../dev only/submitcomplaint.js');
                addComplaintButton(bot, interaction.message);
            }
        });
    });
}


function handle(bot, interaction, args, channel = null, isStart = true, xp_collection = null, solo = true) {
    if (isStart) {
        checkAndStartGame(bot, interaction, channel, solo);
    } else {
        //Player checking done in changeBoard
        changeBoard(bot, interaction, xp_collection);
    }
}


module.exports = { handle }