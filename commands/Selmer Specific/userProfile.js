const {ApplicationCommandOptionType} = require('discord.js');

module.exports = {
    name: "card",
    description: "Toggle profile visibility",
    execute(interaction, Discord, Client, bot) {
        bot.mongoconnection.then((client) => {
            const opt = interaction.options.data[0].value;
            client.db(interaction.guildId).collection(interaction.user.id).updateOne({"rank": {$exists: true}}, {$set: {"private": opt}});
            interaction.reply({content: `Visibility set to \`${(!opt) ? "Visible" : "Invisible"}\``});
        });
    },
    options: [{name: 'setprivate', description: 'Toggle profile visibility ON THIS SERVER', type: ApplicationCommandOptionType.Boolean, required: true}]
}