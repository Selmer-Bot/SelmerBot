const { checkRole } = require('./verify.js');
const { ApplicationCommandOptionType } = require('discord.js');
const { intrep } = require('../utils/discordUtils.js');

module.exports = {
    name: 'lock',
    description: 'Lock a channel',
    execute(interaction, Discord, Client, bot) {
        const arg = interaction.options.data[0];
        const guild = bot.guilds.cache.get(interaction.guildId);

        checkRole(bot, guild, interaction.user.id).then((isAllowed) => {
            if (isAllowed) {
                return intrep(interaction, 'Insufficient Permissions!', true);
            }

            var channel;
            if (arg) {
                channel = arg.channel;
            } else {
                channel = interaction.channel;
            }

            let role = interaction.guild.roles.cache.find(r => r.name === "@everyone");
            channel.permissionOverwrites.edit(role.id, {
                VIEW_CHANNEL: true,
                SEND_MESSAGES: false,
                READ_MESSAGE_HISTORY: true,
                ATTACH_FILES: false
            });

            intrep(interaction, `${channel} has been locked!`);
        });
    },
    options: [{name: 'channel', description: 'The channel to lock (defaults to current channel)', type: ApplicationCommandOptionType.Channel, required: false}]
}