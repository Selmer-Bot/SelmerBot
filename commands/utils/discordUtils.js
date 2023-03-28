function intrep(interaction, mcontent, e) {
    if (typeof mcontent == 'string') {
        interaction.reply({content: mcontent, ephemeral: e})
        .catch(() => {
            interaction.channel.send(mcontent);
        });
    }
    else {
        interaction.reply(mcontent)
        .catch(() => {
            interaction.channel.send(mcontent);
        });
    }
}

module.exports = {intrep}