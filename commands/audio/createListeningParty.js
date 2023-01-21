const {Interaction, ApplicationCommandOptionType, ChannelType, PermissionsBitField } = require('discord.js');
const Discord = require('discord.js');

/**
 * @param {*} bot 
 * @param {Interaction} interaction 
 * @param {JSON} command 
 */
async function start(bot, interaction, command) {
    const opts = command.options;
    const listeners = [];
    listeners.push(interaction.user.id);

    if (opts.length > 1) {
        for (let i = 1; i < opts.length; i++) {
            listeners.push(opts[i].value);
        }
    }

    const isFirstPartInGuild = !bot.listeningparties.has(interaction.guildId);

    const num = (isFirstPartInGuild) ? 0 : bot.listeningparties.get(interaction.guildId).size();
    

    //create a new private audio channel
    const guild = interaction.guild;
    const role = await guild.roles.create({
        name: `lp_${num}`,
        color: '#808080',
        permissions: [PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.SendMessages] //['READ_MESSAGES', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY']
    });

    
    const channel = await guild.channels.create({
        name: `listening_party_${num}`,
        type: ChannelType.GuildVoice,
        permissionOverwrites: [
            {id: interaction.guildId, deny: [PermissionsBitField.Flags.ViewChannel]}
        ]
    });

    //Unecessary?
    const everyoneRole = interaction.guild.roles.cache.find((r) => (r.name == "@everyone"));
    channel.permissionOverwrites.create(everyoneRole, {
        CreateInstantInvite : false, ViewChannel: false, Connect: false, Speak: false
    });


    channel.permissionOverwrites.create(role.id, {
        ViewChannel: true, Connect: true, Speak: true, SendMessages: true
    });


    if (isFirstPartInGuild) {
        bot.listeningparties.set(interaction.guildId, new Map());
    }

    bot.listeningparties.get(interaction.guildId).set(channel.id, {role: role.id, listeners: listeners});

    listeners.forEach((lid) => {
        const member = guild.members.cache.get(lid);
        member.roles.add(role);
    });

    interaction.reply({content: `Listening Party #${num} started!`, ephemeral: true});
}


function getKey(bot, interaction) {
    return new Promise((resolve) => {
        for (i of bot.listeningparties.get(interaction.guildId)) {
            // find the current listeners party
            if (i[1].listeners.indexOf(interaction.user.id) != -1) {
                return resolve(i[0]);
            }
        }

        resolve(undefined);
    });
}


/**
 * @param {*} bot 
 * @param {Interaction} interaction 
 * @param {*} command 
 * @returns 
 */
async function add(bot, interaction, command) {
    const dne = !bot.listeningparties.has(interaction.guildId) || !bot.listeningparties.get(interaction.guildId).has(interaction.channel.id);
    if (dne) { return interaction.reply({content: "Please try this in the voice channel chat!", ephemeral: true}); }

    const user = command.options[0].user;

    //Find the chanenel based on which user used the interaction
    const key = await getKey(bot, interaction);

    const obj = bot.listeningparties.get(interaction.guildId).get(key);
    const role = interaction.guild.roles.cache.get(obj.role);
console.log(obj);
    obj[1].listeners.push(user.id);
    bot.listeningparties.get(interaction.guildId).set(key, obj);

    const member = interaction.guild.members.cache.get(user.id);
    member.roles.add(role);
    interaction.reply({content: `${member} added to the listening party!`, ephemeral: true});
}


/**
 * @param {*} bot 
 * @param {Interaction} interaction 
 * @param {*} command 
 * @returns 
 */
async function remove(bot, interaction, command) {
    const dne = !bot.listeningparties.has(interaction.guildId) || !bot.listeningparties.get(interaction.guildId).has(interaction.channel.id);
    if (dne) { return interaction.reply({content: "Please try this in the voice channel chat!", ephemeral: true}); }

    const user = command.options[0].user;
    const key = await getKey(bot, interaction);

    const obj = bot.listeningparties.get(interaction.guildId).get(key);
    
    //Check if the person removing the role was the one to start the party
    if (obj.listeners[0] != interaction.user.id) {
        return interaction.reply({content: "Only the person who started the thread can do this!", ephemeral: true});
    }

    obj[1].listeners = obj[1].listeners.filter((uid) => (uid != user.id));
    bot.listeningparties.get(interaction.guildId).set(key, newObj);

    const member = interaction.guild.members.cache.get(user.id);
    const role = interaction.guild.roles.cache.get(obj[1].role);
    member.roles.remove(role);

    interaction.reply(`Removed ${user} from the listening party!`);
}


/**
 * @param {*} bot 
 * @param {Interaction} interaction 
 * @returns 
 */
async function end(bot, interaction) {
    const dne = !bot.listeningparties.has(interaction.guildId) || !bot.listeningparties.get(interaction.guildId).has(interaction.channel.id);
    if (dne) { return interaction.reply({content: "Please try this in the voice channel chat!", ephemeral: true}); }

    const key = await getKey(bot, interaction);
    const obj = bot.listeningparties.get(interaction.guildId).get(key);
    const role = interaction.guild.roles.cache.get(obj[1].role);

    for (let i = 0; i < obj[1].listeners.length; i++) {
        let uid = obj[1].listeners[i];
        const member = interaction.guild.members.cache.get(uid);
        member.roles.remove(role);
    }

    interaction.guild.roles.delete(role);
    if (interaction.channel.id == obj[0]) {
        interaction.channel.delete();
    }
}


//#region these functions have been made obsolete by Discord Activities
function play(bot, interaction, command) {
    
}


function displayembed(bot, interaction) {

}
//#endregion


//Creates a new private voice channel and uses the channel chat for control commands
module.exports = {
    name: 'listening_party',
    description: 'Listen to something with friends in a private channel!',
    execute(interaction, Discord, Client, bot) {
        const command = interaction.options.data[0];

        switch(command.name) {
            case 'start': start(bot, interaction, command);
            break;

            case 'add': add(bot, interaction, command);
            break;

            case 'remove': remove(bot, interaction, command);
            break;

            case 'play': play(bot, interaction, command);
            break;

            case 'displayembed': displayembed(bot, interaction);
            break;

            case 'end': end(bot, interaction);
            break;

            default: console.log(`Invalid listening group command with the name "${command.name}"`);
        }
    },
    options: [
        {
            name: 'start',
            description: 'Start a new listening party',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                // {name: 'audio', description: 'The audio to play', type: ApplicationCommandOptionType.String, required: true},
                {name: 'listener_2', description: 'The second listener', type: ApplicationCommandOptionType.User, required: false},
                {name: 'listener_3', description: 'The third listener', type: ApplicationCommandOptionType.User, required: false},
                {name: 'listener_4', description: 'The fourth listener', type: ApplicationCommandOptionType.User, required: false},
                {name: 'listener_5', description: 'The fifth listener', type: ApplicationCommandOptionType.User, required: false},
                {name: 'listener_6', description: 'The sixth listener', type: ApplicationCommandOptionType.User, required: false},
                {name: 'listener_7', description: 'The seventh listener', type: ApplicationCommandOptionType.User, required: false},
                {name: 'listener_8', description: 'The eigth listener', type: ApplicationCommandOptionType.User, required: false},
                {name: 'listener_9', description: 'The ninth listener', type: ApplicationCommandOptionType.User, required: false},
                {name: 'listener_10', description: 'The tenth listener', type: ApplicationCommandOptionType.User, required: false},
            ]
        },
        {
            name: 'add',
            description: 'Add a new member to the listening party',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {name: 'user', description: 'The user to add', type: ApplicationCommandOptionType.User, required: true}
            ]
        },
        {
            name: 'remove',
            description: 'Remove a member from the listening party',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {name: 'user', description: 'The user to remove', type: ApplicationCommandOptionType.User, required: true}
            ]
        },
        {
            name: 'play',
            description: 'Play a new song/add it to queue',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {name: 'song', description: 'The song to play', type: ApplicationCommandOptionType.String, required: true}
            ]
        },
        {
            name: 'displayembed',
            description: 'Displays an embed with controls',
            type: ApplicationCommandOptionType.Subcommand,
            options: []
        }
    ]
}