const {Message, Collection} = require('discord.js');


async function getReplies(bot) {
    const client = await bot.mongoconnection;
    const dbo = client.db('main').collection('replies');
    bot.customReplyList = new Collection();
    dbo.findOne({_id: 'normal'}).then((doc) => {
        for (i in doc) {
            bot.customReplyList.set(i, doc[i]);
        }
    });
}

module.exports = getReplies;