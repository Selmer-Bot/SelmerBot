const { Interaction, ApplicationCommandOptionType } = require('discord.js');
const { encrypt, decrypt } = require('../utils/encryption.js');

module.exports = {
    name: 'encryption',
    description: 'Have Selmer Bot encrypt or decrypt some data',
    /**
     * @param {Interaction} interaction
     */
    execute(interaction, Discord, Client, bot) {
        const command = interaction.options.data[0];
        if (command.name == "encrypt") {
            encrypt(command.options[0].value).then((data) => {
                const str = `Encrypted Data: \`${data.encryptedData}\`\n\nEncryption Key: \`${data.iv}\``;
                interaction.reply({content: str, ephemeral: true}).catch(() => {interaction.channel.send({content: str, ephemeral: true})});
            }).catch((err) => {
                console.error(err);
                message.channel.send("Uh oh! There's been an error! Please contact support \:[");
            });
        } else {
            const encData = command.options.filter((opt) => { return (opt.name == 'data'); })[0].value;
            const encKey = command.options.filter((opt) => { return (opt.name == 'key'); })[0].value;

            decrypt({encryptedData: encData, iv:encKey}).then((data) => {
                interaction.reply({content: `Your unencrypted data is: \`${data}\``, ephemeral: true}).catch(() => {
                    interaction.channel.send({content: `Your unencrypted data is: \`${data}\``, ephemeral: true});
                })
            }).catch((err) => {
                console.error(err);
                message.channel.send("Uh oh! There's been an error! Please contact support \:[");
            });
        }
    },
    options: [
        {name: 'encrypt', description: 'play a song', type: ApplicationCommandOptionType.Subcommand, options: [
            {name: 'data', description: "The stuff to encrypt", type: ApplicationCommandOptionType.String, required: true}
        ]},
        {name: 'decrypt', description: 'play a song', type: ApplicationCommandOptionType.Subcommand, options: [
            {name: 'data', description: "The encrypted data", type: ApplicationCommandOptionType.String, required: true},
            {name: 'key', description: "The encryption key", type: ApplicationCommandOptionType.String, required: true}
        ]},
    ]
}