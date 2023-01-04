const { Interaction, codeBlock } = require('discord.js');

function roll(bot, interaction) {
    var txt = "";
    const opts = interaction.options.data[0].options;

    const type = opts.filter((opt) => { return (opt.name == "dice"); })[0].value;
    const num = opts.filter((opt) => { return (opt.name == "amount"); })[0].value;

    if (num > 50 || num < 1) {
        return interaction.reply({content: "Please choose a number between 0 and 50", ephemeral: true});
    }

    for (let i = 0; i < num; i ++) {
        txt += `Roll #${i + 1}: ${Math.floor(Math.random() * type + 1)}\n`;
    }

    const toSend = `Showing results for ***${num}d${type}*** rolls\n${codeBlock(txt)}`;
    interaction.reply(toSend).catch(() => {
        interaction.channel.send(toSend);
    });
}

module.exports = { roll }