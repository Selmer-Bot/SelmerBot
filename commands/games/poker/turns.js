const { ModalBuilder, TextInputBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, ButtonBuilder, Interaction, ButtonStyle, EmbedBuilder } = require('discord.js');
const {Hand, Card} = require('./classes.js');


/**
 * @param {Hand} d
 * @returns {Promise<Hand>}
 */
function checkHand(d) {
    return new Promise((resolve, reject) => {
        try {
            const sorted = [...d.cards].sort((a, b) => (a.value > b.value));

            //Set the high card
            d.high = sorted[0];

            //Check for pairs
            var t = sorted[0].value;
            var inarow = [];
            for (let i = 0; i < sorted.length; i++) {
                if (sorted[i].value == t) {
                    inarow.push(i);
                } else {
                    if (inarow.length == 2) {
                        d.pairs.push([...inarow]);
                    } else if (inarow.length == 3 && d.three.length == 0) {
                        d.three = [...inarow];

                        if (sorted.length < 5) continue;
                        //Check for full house
                        if ((i == 2) && (sorted[2].value != sorted[3].value) && (sorted[3].value == sorted[4].value)) {
                            d.full = true;
                        }
                    } else if (inarow.length == 4 && d.four.length == 0) {
                        d.four = [...inarow];
                    }

                    inarow = [];
                    t = sorted[i].value;
                }
            }

            if (sorted.length < 5) { return resolve(d); }

            //Check for a Straight
            let j;
            for (j = 1; j < sorted.length; j++) {
                if (sorted[j - 1].value - sorted[j].value != 1) { break; }
            }

            d.straight = (j == 5);


            //Check for flushes
            var sortedSuits = [...d.cards].sort((a, b) => {
                if (a.suit != b.suit) { return(a.suit > b.suit); }
                return(a.value > b.value);
            });


            let run = [0];
            let currentSuit = sortedSuits[0].suit;
            var noGaps = true;
            
            //Checking using the ace as a high
            for (let i = 1; i < sortedSuits.length; i++) {
                if (sortedSuits[i].suit == currentSuit) {
                    run.push(i);
                    if (sortedSuits[i-1].value - sortedSuits[i].value != 1) {
                        noGaps = false;
                    }
                } else {
                    break;
                }
            }


            //This tests for a flush of ANY kind
            if (run.length == 5) {
                //Checking for a straight using the ace as a low
                if (sortedSuits[0].value == 14 && !noGaps) {
                    //Set the ace as low and re-sort
                    sortedSuits[0].value == 1;
                    sortedSuits = [...d.cards].sort((a, b) => {
                        if (a.suit != b.suit) { return(a.suit > b.suit); }
                        return(a.value > b.value);
                    });

                    //Check again
                    noGaps = true;
                    for (let i = 0; i < sortedSuits.length; i++) {
                        if (sortedSuits[i-1].value - sortedSuits[i].value != 1) {
                            noGaps = false;
                        }
                    }
                }

                //You have a straight/royal flush
                if (noGaps) {
                    if (sortedSuits[0].value == 14) {
                        d.flushRoyal = true;
                    } else {
                        d.flushStraight = true;
                    }
                } else {
                    d.flush = true;
                }
            }

            resolve(d);
        } catch(err) {
            reject(err);
        }
    });
}


/**
 * @description Advances the turn by 1 and returns the round number if all players have gone
 * @param {*} bot 
 * @param {Interaction} interaction 
 * @returns {Promise<{isNewRound: Boolean, round: Number, player: Hand}>}
 */
function changePlayersAndReturnStatus(bot, interaction) {
    const isBetRound = (doc) => {return(doc.round > 0 || doc.round % 2 != 0);}

    return new Promise((resolve, reject) => {
        bot.mongoconnection.then(async (client) => {
            const gbo = client.db('B|S' + bot.user.id).collection(interaction.guildId);
            const doc = await gbo.findOne({players: interaction.user.id});
            var turn = doc.turn;
            if (turn >= doc.players.length) { turn = -1; }

            //The round isn't over OR it's a betting round end and someone raised
            if (turn != -1 || (turn == -1 && isBetRound(doc) && doc.anyRaises)) {
                gbo.updateOne({players: interaction.user.id}, {$set: {turn: turn + 1}}).then(() => {
                    resolve({isNewRound: false, round: doc.round, player: doc.players[turn + 1]});
                });
            } else {
                //Begin the next round
                gbo.updateOne({players: interaction.user.id}, {$set: {turn: turn + 1, round: doc.round + 1}}).then(() => {
                    resolve({isNewRound: true, round: doc.round + 1, player: doc.players[0]});
                });
            }
        });
    });
}


/**
 * @param {*} bot 
 * @param {Interaction} interaction 
 */
function createBettingButton(bot, interaction) {
    const row = new ActionRowBuilder()
    .addComponents([
        new ButtonBuilder()
        .setCustomId(`poker|${interaction.channelId}|betbtn|raise`)
        .setLabel("RAISE")
        .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
        .setCustomId(`poker|${interaction.channelId}|betbtn|hold`)
        .setLabel("HOLD")
        .setStyle(ButtonStyle.Success),
        
        new ButtonBuilder()
        .setCustomId(`poker|${interaction.channelId}|betbtn|match`)
        .setLabel("MATCH")
        .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
        .setCustomId(`poker|${interaction.channelId}|betbtn|check`)
        .setLabel("CHECK BALANCE")
        .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
        .setCustomId(`poker|${interaction.channelId}|betbtn|fold`)
        .setLabel("FOLD")
        .setStyle(ButtonStyle.Danger)
    ]);

    bot.mongoconnection.then((client) => {
        const gbo = client.db('B|S' + bot.user.id).collection(interaction.guildId);
        gbo.findOne({"players.user": interaction.user.id}).then((doc) => {
            const embd = new EmbedBuilder()
            embd.setTitle("The current bets are")
            .setDescription(`The current highest bid is ${doc.highestBid}`);
            var betArr = new Array();

            for (i of doc.players) {
                const user = interaction.guild.members.cache.get(i.user);
                betArr.push({name: user.user.tag, value: String(i.pot)});
            }

            embd.addFields(betArr);
            embd.setTimestamp();

            interaction.channel.send({embeds: [embd], components: [row]});
        });
    });
}


//Remember to clear what the highest bud (raise) is when the betting round ends
function advanceGame(bot, interaction, args = null) {
    //This is a betting round
    if (args) {
        const command = args[2];
    }
}


function raiseModal(bot, interaction, extra = false) {
    const modal = new ModalBuilder();

    modal.setTitle('Choose an amount to raise by')
    .setCustomId(`poker|${interaction.channelId}|raiseModal`);

    const tempInp = new TextInputBuilder()
    .setCustomId("raiseamt")
    .setLabel((extra) ? "NUMBR" : "" + "amount to raise by")
    .setStyle('Short');

    modal.addComponents(new ActionRowBuilder().addComponents(tempInp));

    // Show the modal to the user
    interaction.showModal(modal);
}


async function match(bot, interaction, args) {
    const client = await bot.mongoconnection;
    const gbo = client.db('B|S' + bot.user.id).collection(interaction.guildId);
    const dbo = client.db(interaction.guildId).collection(interaction.user.id);

    const doc = await gbo.findOne({thread: args[1]});
    const udoc = await dbo.findOne({"balance": {$exists: true}});
    const player = doc.players.find((p) => (p.user == interaction.user.id));
    
    const highestRaise = doc.highestBid;

    if (udoc.balance < highestRaise) {
        return interaction.reply({content: `You need $${highestRaise} to match but you only have $${udoc.balance}!`, ephemeral: true});
    }

return;
    gbo.updateOne({thread: args[1]}, {$set: {"genDeck.pot": (doc.genDeck.pot + highestRaise)}});
    gbo.updateOne({ "players.user": interaction.user.id }, {$set: {"players.pot": (player.pot + highestRaise)}});
}


/**
 * @param {*} bot 
 * @param {Interaction} interaction 
 * @param {Array<String>} args 
 * @returns 
 */
async function raise(bot, interaction, args) {
    const raiseAmtStr = interaction.fields.getTextInputValue('raiseamt');

    if (Number.isNaN(Number(raiseAmtStr))) {
        return interaction.reply({content: "Please specify a number amount!", ephemeral: true});
    }

    const raiseAmt = Number(raiseAmtStr);

    const client = await bot.mongoconnection;
    const gbo = client.db('B|S' + bot.user.id).collection(interaction.guildId);
    const dbo = client.db(interaction.guildId).collection(interaction.user.id);
    const doc = await gbo.findOne({thread: args[1]});

    // const player = doc.players.find((p) => (p.user == interaction.user.id));
    const player = doc.players[doc.turn];
    const ogAmt = player.pot;

    const udoc = await dbo.findOne({"balance": {$exists: true}});
    if (udoc.balance < raiseAmt) {
        return interaction.reply({content: `You tried to raise by $${raiseAmt} but you only have $${udoc.balance}!`, ephemeral: true});
    }

    //Check if the amount raised is more than the current highest raise
    if (player.pot + raiseAmt < doc.highestBid) {
        return interaction.reply(`To raise you must add at least $${doc.highestBid}`);
    }

    //#region embed stuff
    const embd = new EmbedBuilder(interaction.message.embeds[0]);
    const field = embd.data.fields.find((u) => (u.name == interaction.user.tag));
    const ind = embd.data.fields.indexOf(field);

    embd.data.fields[ind].value = String(ogAmt + raiseAmt);
    embd.setDescription(`The current highest bid is ${doc.highestBid + raiseAmt}`)
    .setFooter({text: `${interaction.user.tag} raised by ${raiseAmt}`});
    //#endregion embed stuff

    interaction.message.edit({embeds: [embd]});
    interaction.deferUpdate();

    //Update the main pot and the user's pot
    gbo.updateOne({thread: args[1]}, {$set: {
        anyRaises: true, "genDeck.pot": (doc.genDeck.pot + raiseAmt), highestBid: doc.highestBid + raiseAmt
    }});
    gbo.updateOne({ "players.user": interaction.user.id }, {$set: {"players.pot": (ogAmt + raiseAmt)}});

    advanceGame(bot, interaction, args);
}


//BROKEN
function addCard(gbo, d, card) {
    gbo.updateOne({ "players.user": d.user }, { $push: { "players.cards": card } }).then((conf) => {
        gbo.updateOne({ pending: uid }, { $pull: { "genDeck": { $in: [card] } } });
    });
}


module.exports = {advanceGame, addCard, raise, raiseModal, match, createBettingButton}