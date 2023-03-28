const { intrep } = require("../utils/discordUtils");

module.exports = {
    name: "test",
    description: "HI SELMER",
    execute(interaction, Discord, Client, bot) {
        intrep(interaction, "HI SELMER!!!");
    },
    options: []
}