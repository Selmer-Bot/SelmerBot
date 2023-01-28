const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Interaction } = require('discord.js');

module.exports = {
    name: 'repo',
    description: 'See where Selmer bot\'s code is stored!',
    execute(interaction, Discord, Client, bot) {
        const embd = new EmbedBuilder()
        .setAuthor({ name: "Selmer Bot", url: bot.user.inviteLink, iconURL: bot.user.displayAvatarURL() })
        .setThumbnail("https://github.com/Selmer-Bot/selmer-bot-website/blob/main/assets/Selmer-icon.png?raw=true")    // .setThumbnail('https://repository-images.githubusercontent.com/460670550/43932b23-d795-4334-838f-f33ee8f795c4')
        .setDescription("Selmer Bot was created by ION606");

        const row = new ActionRowBuilder()
        .addComponents([
            new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setURL("https://github.com/Selmer-Bot/SelmerBot")
            .setLabel("Github Repo"),

            new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setURL("http://www.selmerbot.com/")
            .setLabel("Website"),

            new ButtonBuilder()
            .setStyle(ButtonStyle.Primary)
            .setLabel("Tutorial")
            .setCustomId("sbtutorial")
        ]);

        interaction.reply({ embeds: [embd], components: [row] });
    }, options: [],
    isDm: true
}