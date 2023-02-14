const schedule = require('node-schedule');
const rss = require('../premium/rss.js')

async function init(bot) {
    const client = await bot.mongoconnection;

    const rss_job = schedule.scheduleJob('0 * * * *', async () => { // run every hour at minute 1
        const dbo = client.db("RSS").collection(String((new Date()).getHours()));
        dbo.find().toArray((err, docs) => {
            docs.forEach(guildObj => {
                rss.fromSchedule(bot, guildObj.guild);
            });
        });
    });
}


module.exports = init;