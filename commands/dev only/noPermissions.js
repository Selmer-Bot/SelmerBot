const http = require('https');
const {Client} = require('discord.js')

/**
 * @param {Client} bot 
 * @param {String} url 
 */
async function handleNoPermissions(bot, url, token) {
    // var guildId = signal.url;
    // console.log(signal);

    // const startind = guildId.indexOf('channels/') + 9;
    // guildId = guildId.substring(startind, guildId.indexOf('/', startind));
    
    // const guild = bot.guilds.cache.get(guildId);

    const response = await fetch(url, {
        headers: {
            Authorization: "bot " + token
        },
        method: 'GET'
    });

    return console.log(response);

    const ownerTemp = await bot.guilds.cache.get(guildId).fetchOwner();
    
    ownerTemp.send(codeBlock("Selmer Bot is missing permissions!\nMy guess would be he doesn't have access to role management.....\n\nPlease try adding him again with correct permissions!"));
    guild.leave();
}


module.exports = handleNoPermissions;