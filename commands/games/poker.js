const { initialize, editAccptMsg } = require('./poker/initialize.js');
const { advanceGame, raise, raiseModal, match, createBettingButton, addCard } = require('./poker/turns.js');
const { quit } = require('./poker/quit.js');
const { showHand } = require('./poker/showHand.js');
const { getBalance } = require('../db/econ.js');


/*
    ROUND INSTRUCTIONS:
    rounds represent what stage of the game we're on
    round 0: all players recieve their cards
    round 1: bets
    round 2: three cards (the flop) are placed and are visible to everyone
    round 3: bets
    round 4: one card (the turn) is placed and is visible to everyone
    round 5: bets
    round 6: one card (the river) is placed and is visible to everyone
    round 7: bets
    round 8: all players show their hands and the winner is chosen


    BETTING HOLDING LOCATIONS
    every user.hand.pot containts their contribution to the genDeck.pot
*/


async function handle(bot, interaction, xp_collection) {
    const args = interaction.customId.split('|');

    //Check if the user is part of the game
    const client = await bot.mongoconnection;
    const gbo = client.db('B|S' + bot.user.id).collection(interaction.guildId);

    const doc = await gbo.findOne({"players.user": interaction.user.id});
    if (!doc || doc.thread != interaction.channel.id) {
        return interaction.reply({content: "You're not part of this game", ephemeral: true});
    } else if (doc.players[doc.turn].user != interaction.user) {
        return interaction.user.send(`Message from ${interaction.channel}: "It's not your turn!"`);
    }

    const dbo = client.db(interaction.guildId).collection(interaction.user.id);

    //Add a condition to the "quit" function that accounts for turns if the player quitting is going now
    if (args[2] == 'betbtn') {
        switch(args[3]) {
            case 'raise':
                raiseModal(bot, interaction);
                return;

            case 'hold': break;

            case 'match':
                match(bot, interaction, args);
                break;

            case 'fold':
                quit(bot, interaction, xp_collection);
                break;

            case 'check':
                getBalance(dbo, interaction);
                break;

            case 'show':
                showHand(bot, interaction, doc.players);
                break;

            default:
                return console.log(`UNKNOWN POKER COMMAND: ${args[2]} FROM ARGS: [${args.join(', ')}]`);

        }

        advanceGame(bot, interaction, args);
    } else if (args[2] == "raiseModal") {
        raise(bot, interaction, args);
    } else {
        advanceGame(bot, interaction);
    }
}


module.exports = {initialize, editAccptMsg, handle, quit}