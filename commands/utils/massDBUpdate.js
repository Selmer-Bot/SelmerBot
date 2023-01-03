function insertForEveryUser(bot) {
    bot.mongoconnection.then((client) => {
        bot.guilds.cache.forEach((guild) => {
            client.db(guild.id).listCollections().toArray(function (err, cols) {
                cols.forEach((col) => {
                    // only users
                    if (!Number.isNaN(Number(col.name))) {
                        client.db(guild.id).collection(col.name).updateOne({"rank": {$exists: true}}, {$set: {"social": {"marriage": {married: false, partner: null, marriage_date: null, carryover: false}}}});
                        client.db(guild.id).collection('marriage').insertOne({partners: [], joint_amount: null, joint_toggled: false});
                    }
                })
            });
        });
    });
}


module.exports = {insertForEveryUser}