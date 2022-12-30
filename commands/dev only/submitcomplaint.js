const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, DiscordAPIError, Message } = require('discord.js');
const complaintRow = new ActionRowBuilder();
const green = '#00f035';
const red = '#f30000';


complaintRow.setComponents(
    new ButtonBuilder()
        .setCustomId('SUBMITCOMPLAINT')
        .setLabel('Submit Complaint')
        .setStyle(ButtonStyle.Danger) //Maybe change this to 'PRIMARY'
);


function submitComplaint(message, bot) {
    const complaint = message.content;
    const channel = bot.guilds.cache.get(bot.home_server).channels.cache.get('998899306671124501');

    const author = {
        name: "Selmer Bot",
        url: bot.inviteLink,
        iconURL: bot.user.displayAvatarURL()
    }

    const newEmbed = new EmbedBuilder()
          .setColor(red)
          .setTitle(`Submitted by _${message.author.username}#${message.author.discriminator} ${message.author}_ in *${message.guild}* (OPEN)`)
          .setAuthor(author)
          .setDescription(`Content: ${complaint}`)
          .setTimestamp();
        
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('DEBUGDONE')
                .setLabel('Done')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('DEBUGURGENT')
                .setLabel('Mark as Urgent')
                .setStyle(ButtonStyle.Danger),
        );

    channel.send({ embeds: [newEmbed], components: [row] });
}


function resolveComplaint(interaction) {
    if (interaction.customId == 'DEBUGDONE') {
        var embd = new EmbedBuilder(interaction.message.embeds[0]);
        embd.setColor(green);
        embd.title = embd.title.replace('(OPEN)', '(CLOSED)').replace('(URGENT)', '(CLOSED)');
        interaction.update({ embeds: [embd], components: [] });
        interaction.message.unpin();
    } else {
        var embd = new EmbedBuilder(interaction.message.embeds[0]);
        const row = new ActionRowBuilder();
        row.addComponents(
            new ButtonBuilder()
                .setCustomId('DEBUGDONE')
                .setLabel('Done')
                .setStyle(ButtonStyle.Success),
        );

        embd.title = embd.title.replace('(OPEN)', '(URGENT)');
        interaction.update({ embeds: [embd], components: [row] });
        const m = interaction.message.pin();
        // m.then((msg) => {
        //     msg.delete();
        // });
    }
}

module.exports = {
    name: 'Complaints',

    /**
     * @param {Message} message 
     */
    async addComplaintButton(bot, message) {
        try {
            function filter(reaction) {
                return (reaction.emoji.name == '✅');
            }
            message.react('✅').then(() => {
                message.awaitReactions({ filter, max: 1, time: 60000, errors: ['time'] })
                .then(collected => {
                    const reaction = collected.first();
                    submitComplaint(message, bot);
                })
                .catch(collected => { message.reactions.cache.get('✅').remove(); });
            });
        } catch (err) {
            console.error(err);
        }
            
    }, submitComplaint, resolveComplaint
}



/*
    const { addComplaintButton } = require('../dev only/submitcomplaint');
    addComplaintButton(bot, message);
*/