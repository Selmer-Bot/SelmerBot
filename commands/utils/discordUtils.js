function intrep(interaction, mcontent, e) {
    interaction.reply({content: mcontent, ephemeral: e})
    .catch(() => {
        interaction.channel.send(mcontent);
    });
}

module.exports = {intrep}