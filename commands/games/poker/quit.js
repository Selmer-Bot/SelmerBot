//@ts-check
const { ChannelType, Interaction } = require('discord.js');
const { CreateNewCollection, STATE } = require('../../db/econ');
const { winGame } = require('../external_game_functions');


function quit(bot, interaction, xp_collection) {
    bot.mongoconnection.then((client) => {
        const gbo = client.db('B|S' + bot.user.id).collection(interaction.guildId);

        gbo.findOne({"players.user": interaction.user.id}).then((doc) => {
            var channelToDel = interaction.guild.channels.cache.get(doc.thread);
        
            // doc.players.forEach((player) => {
            //     const id = player.user;
            //     const dbo = client.db(interaction.guildId).collection(id);
            //     dbo.updateOne({"game": {$exists: true}}, { $set: { game: null, opponent: null, state: STATE.IDLE, 'hpmp.hp': doc.hpmp.maxhp, 'hpmp.mp': doc.hpmp.maxmp }});
            // });
            const db = client.db(interaction.guildId);
            const dbo = db.collection(interaction.user.id);

            dbo.findOne({"game": {$exists: true}}).then((udoc) => {
                dbo.updateOne({"game": {$exists: true}}, { $set: { game: null, opponent: null, state: STATE.IDLE, 'hpmp.hp': udoc.hpmp.maxhp, 'hpmp.mp': udoc.hpmp.maxmp }});

                if (doc.players.length > 2) {
                    gbo.updateOne({"players.user": interaction.user.id}, { $pull: {"players": {"user": interaction.user.id}} });
                } else {
                    //Delete the bot's record of the game
                    gbo.deleteOne({"players.user": interaction.user.id});

                    const wid = doc.players.filter((p) => (p.user != interaction.user.id))[0].user;
                    const wbo = client.db(interaction.guildId).collection(wid);
                    const winnings = doc.genDeck.pot;

                    // Updates the loser with XP
                    winGame(client, bot, db, dbo, xp_collection, interaction, channelToDel, false);

                    // Add the winnings/XP to the winner
                    winGame(client, bot, db, wbo, xp_collection, interaction, channelToDel);
                    wbo.findOne(({"game": {$exists: true}})).then((doc) => {
                        wbo.updateOne({"balance": {$exists: true}}, {$set: {"balance": doc.balance + winnings}});
                    });
                }
            });
        });
    });
}



/**
 * @description quits the game without making anyone win or lose, should be used in case of game-breaking errors
 * @param {*} bot 
 * @param {Interaction} interaction 
 */
function endGame(bot, interaction) {

    bot.mongoconnection.then((client) => {
        const db = client.db(interaction.guildId);
        const gbo = client.db('B|S' + bot.user.id).collection(interaction.guildId);

        gbo.findOne({"players.user": interaction.user.id}).then(async (doc) => {
            if (!interaction.guild) { return; }
            
            var channelToDel = interaction.guild.channels.cache.get(doc.thread);
            for (let i = 0; i < doc.players.length; i++) {
                const dbo = db.collection(doc.players[i].user);
                const udoc = await dbo.findOne({"game": {$exists: true}});
                dbo.updateOne({"game": {$exists: true}}, { $set: { game: null, opponent: null, state: STATE.IDLE, 'hpmp.hp': udoc.hpmp.maxhp, 'hpmp.mp': udoc.hpmp.maxmp }});
            }

            gbo.deleteOne({"players.user": interaction.user.id});

            if (channelToDel && channelToDel.type == ChannelType.PublicThread) {
                channelToDel.delete();
            } else {
                console.log(`err in the game in ${interaction.guildId} with user ${interaction.user.id} when deleting the following channel:\n\n`);
                console.log(channelToDel);
            }
        });
    });
}


module.exports = { quit, endGame }