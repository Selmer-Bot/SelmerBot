//@ts-check
const { addxp, STATE, BASE } = require("./econ.js");
const turnManger = require('../turnManager.js');


//#region game lose/win
function loseGame(user_dbo, xp_collection, message, bot = null) {
    return new Promise(function(resolve, reject) {
    user_dbo.find({"game": {$exists: true}}).toArray(function(err, docs){
        const doc = docs[0];
        if (doc == undefined) { return message.reply("Oops! There's been an error! Please contact support if this problem persists!"); }
        if (doc.game == null) { return message.reply("You're not even in a game and you're trying to quit! Sad..."); }

        //If this function was called from "winGame", return
        if (doc.opponent) {
            //If remove some money (looting) [maybe implement a "friendly" game setting later with no looting]
            var addbal = doc.rank * 2;
            if (doc.balance - addbal < 5) { addbal = addbal - doc.balance; }
            if (doc.balance > 5) {
                user_dbo.updateOne(doc, { $set: { balance: doc.balance - addbal}});
            }
        } else { message.channel.delete(); }

        //Update the player's xp
        addxp(message, user_dbo, Math.ceil((BASE.XP * doc.rank)/2),xp_collection)
        user_dbo.updateOne({"game": {$exists: true}}, { $set: { game: null, opponent: null, state: STATE.IDLE, 'hpmp.hp': doc.hpmp.maxhp, 'hpmp.mp': doc.hpmp.maxmp }});

        resolve(addbal);
    });
});

}


function winGame(client, bot, db, user_dbo, xp_collection, message) {
    user_dbo.find({"game": {$exists: true}}).toArray(function(err, docs){
        const doc = docs[0];
        
        //Check for an opponent
        if (doc.opponent != null) {
            let other = db.collection(doc.opponent);
            let promise_temp = loseGame(other, xp_collection, message);
            
            promise_temp.then(function(result) {
                var amt_taken = result;
                user_dbo.updateOne({'balance': {$exists: true}}, { $set: { balance: doc.balance + amt_taken}});
            });
        }

        //Delete the bot's record of the game
        client.db('B|S' + bot.user.id).collection(user_dbo.s.namespace.db.substr(0, user_dbo.s.namespace.db.length - 6)).drop();
        

        //Update the player with xp
        user_dbo.updateOne({"game": {$exists: true}}, { $set: { game: null, opponent: null, state: STATE.IDLE, xp: doc.xp + (BASE.XP * doc.rank), 'hpmp.hp': doc.hpmp.maxhp, 'hpmp.mp': doc.hpmp.maxmp }});

        message.channel.delete();
    });
}


module.exports = { winGame, loseGame }