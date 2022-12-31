function insertForEveryUser(bot) {
    bot.mongoconnection.then((client) => {
        bot.guilds.cache.forEach((guild) => {
            client.db(guild.id).listCollections().toArray(function (err, cols) {
                cols.forEach((col) => {
                    // only users
                    if (!Number.isNaN(Number(col.name))) {
                        client.db(guild.id).collection(col.name).updateOne({"rank": {$exists: true}}, {$set: {"private": false}});
                    }
                })
            });
        });
    });
}


module.exports = {insertForEveryUser}