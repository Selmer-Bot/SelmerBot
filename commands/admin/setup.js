//@ts-check
const { MongoClient, ServerApiVersion } = require('mongodb');
const { ApplicationCommandOptionType } = require('discord.js');
const { CreateNewCollection } = require("../db/econ");
const { checkRole } = require('./verify.js');
const fetch = require('node-fetch');
const help = require('../Selmer Specific/help.js');
const { intrep } = require('../utils/discordUtils');


/**
 * 
 * @param {*} bot 
 * @param {*} interaction 
 * @param {*} role 
 * @returns 
 */
function checkIfRoleHigher(bot, interaction, role) {
    const guild = interaction.guild;
    const myRolePost = guild?.members.cache.get(bot.user.id)?.roles.highest.position;
    const otherRolePos = guild?.roles.cache.get(role.id).position;

    if (otherRolePos >= myRolePost) {
        intrep(interaction, "I don't have permissions to grant this role!", true);
          return false;
      }

      return true;
}


async function execute(interaction, Discord, Client, bot) {
    const server = interaction.guildId;
    const owner = interaction.guild.members.cache.get(interaction.guild.ownerId);
    const args = interaction.options.data[0].options;

    if (interaction.user.id != interaction.guild.ownerId) {
        return intrep(interaction, 'Only the server owner can do this!', true);
    }

    bot.mongoconnection.then(async (client) => {
        //Initialize
        CreateNewCollection(interaction, client, server, owner.user.id);

        const db = client.db(server);
        const dbo = db.collection('SETUP');

        if (args.length < 1) { return intrep(interaction, "Please chose a valid option", true); }

        for (let i = 0; i < args.length; i++) {
            try {
                const command = interaction.options.data[i].name;
                
                if (command == 'logs') {
                    const subCommand = args[i].name;

                    if (subCommand == 'keep_logs') {
                        let keeplogs = args[i].value;
    
                        dbo.updateOne({ _id: 'LOG'}, {$set: {keepLogs: keeplogs}});
    
                        intrep(interaction, `Toggled log keeping to ${keeplogs}. Please use _!setup log_channel_ to choose the log channel`, true);
                    }
                    else if (subCommand == 'log_channel') {
                        const channel = args[i].channel;
                        if (!channel) { return intrep(interaction, 'The specified channel does not exist!', true); }
    
                        dbo.updateOne({_id: 'LOG'}, {$set: {logchannel: `${channel.id}`}});
                        intrep(interaction, `Made ${channel} the new Selmer Bot Logs channel!`, true);
                    }
                    else if (subCommand == 'log_severity') {
                        const tier = args[i].value;
                        const l = ['none', 'low', 'medium', 'high'];
                        if (!l.includes(tier)) { return intrep(interaction, "Please select an existing tier ('none', 'low', 'medium', 'high')", true); }
    
                        dbo.updateOne({_id: 'LOG'}, {$set: {severity: tier}})
    
                        intrep(interaction, `Severity updated to ${tier}`, true);
                    }
                }
                else if (command == "announcement") {
                    const subCommand = args[i].name;

                    if (subCommand == 'ping_role') {
                        const role = args[i].value;
                        // if (message.mentions.roles.first() == undefined) {
                        //     return message.reply("Please mention a role (_!setup announcement\\_role **@role**_)\n_Note: Selmer Bot does NOT ping the @everyone role_");
                        // }
                        // const role = message.mentions.roles.first().id;
                        dbo.updateOne({_id: 'announcement'}, { $set: { 'role': role.id } });
    
                        intrep(interaction, `Role updated to ${role}`, true);
                    }
                    else if (subCommand == "ping_channel") {
                        const channel = args[i].channel;
                        if (!channel) { return intrep(interaction, 'The specified channel does not exist!', true); }
    
                        dbo.updateOne({_id: 'announcement'}, { $set: { 'channel': channel.id } });
                        intrep(interaction, `Channel set to ${channel}`, true);
                    }
                }
                else if (command == "mod_role") {
                    const subCommand = args[i].name;

                    if (subCommand == "add_mod_role") {
                        dbo.findOne({_id: "roles"}).then((doc) => {
                            const role = args[i].value;
                            if (!doc.commands.includes(role)) {
                                dbo.updateOne({_id: "roles"}, { $push: { commands: role } });
                                interaction.reply({ content: "Role added!", ephemeral: true });
                            } else {
                                interaction.reply({ content: "This role is already a command role!", ephemeral: true });
                            }
                        });
                    }
                    else if (subCommand == "remove_mod_role") {
                        dbo.updateOne({_id: "roles"}, { $pull: { commands: { $in: [ args[i].value ] }} });
                        interaction.reply({ content: "Role removed!", ephemeral: true });
                    }
                }
                else if (command == "welcome") {
                    const subCommand = args[i].name;

                    if (subCommand == 'welcome_channel') {
                        const channel = args[i].channel;
    
                        dbo.updateOne({welcomechannel: {$exists: true}}, {$set: {welcomechannel: `${channel.id}`}});
                        intrep(interaction, `Set ${channel} as the new welcome channel`, true)
                    }
                    else if (subCommand == 'welcome_message') {
                        const msg = args[i].value;
    
                        if (msg.length > 30 || msg.length < 1) { return intrep(interaction, 'Please specify a welcome message between 0 and 30 characters!', true); }
                        dbo.updateOne({welcomemessage: {$exists: true}}, {$set: {welcomemessage: msg}})
                    }
                    else if (subCommand == "welcome_banner") {
                        const attachement_url = args[i].attachment.attachment;
                        const response = await fetch(attachement_url);
                        const arrayBuffer = await response.arrayBuffer();
                        const imgbfr = Buffer.from(arrayBuffer);
                        dbo.updateOne({_id: 'WELCOME'}, {$set: {welcomebanner: imgbfr.toString('base64')}});
                        intrep(interaction, `Banner updated to ${attachement_url}`, true);
                    }
                    else if (subCommand == "welcome_text_color") {
                        const reg = /^#[0-9A-F]{6}$/i;
                        const newCol = args[i].value;
                        if (reg.test(newCol)) {
                            dbo.updateOne({_id: 'WELCOME'}, {$set: {welcometextcolor: newCol}});
                            intrep(interaction, `Color updated to ${newCol} (https://www.color-hex.com/color/${newCol.substring(1)})`, true);
                        } else {
                            intrep(interaction, "Please chose a valid hex color\nYou can find colors here: https://www.color-hex.com/");
                        }
                    }
                }
                else if (command == "auto_role") {
                    if (!checkIfRoleHigher(bot, interaction, args[i].role)) return;

                    if (args[i].name == "add") {
                        dbo.findOne({_id: "AUTOROLE"}).then((doc) => {
                            const role = args[i].value;
                            if (!doc) {
                                dbo.insertOne({_id: "AUTOROLE", roles: [role] });
                            } else if (!doc.roles.includes(role)) {
                                dbo.updateOne({_id: "AUTOROLE"}, { $push: { roles: role } });
                                interaction.reply({ content: "Role added!", ephemeral: true });
                            } else {
                                interaction.reply({ content: "This role is already a command role!", ephemeral: true });
                            }
                        });
                    } else {
                        dbo.updateOne({_id: "AUTOROLE"}, { $pull: { roles: { $in: [ args[i].value ] }} });
                        interaction.reply({ content: "Role removed!", ephemeral: true });
                    }
                }
                else if (command == "leveling") {
                    const subCommand = args[i].name;

                    if (subCommand == "toggle_leveling") {
                        const tog = args[i].value;
                        console.log(tog);
                        dbo.updateOne({_id: 'LEVELING'}, {$set: {enabled: tog}});
                        intrep(interaction, "Turned leveling " + ((tog) ? "ON" : "OFF"), true);
                    }
                    else if (subCommand == "leveling_banner") {
                        const level_banner = args[i].attachment.attachment;
                        const response = await fetch(level_banner);
                        const arrayBuffer = await response.arrayBuffer();
                        const imgbfr = Buffer.from(arrayBuffer);
                        dbo.updateOne({_id: 'LEVELING'}, {$set: {card: imgbfr.toString('base64')}});
                        intrep(interaction, `Updated leveling banner to ${level_banner}`, true);
                    }
                    else if (subCommand == "leveling_text") {
                        dbo.updateOne({_id: 'LEVELING'}, {$set: {text: args[i].value}});
                        intrep(interaction, `Updated leveling text to ${args[i].value}`, true);
                    }
                    else if (subCommand == "leveling_color") {
                        const reg = /^#[0-9A-F]{6}$/i;
                        const newCol = args[i].value;
                        if (reg.test(newCol)) {
                            dbo.updateOne({_id: 'LEVELING'}, {$set: {col: newCol}});
                            intrep(interaction, `Color updated to ${newCol} (https://www.color-hex.com/color/${newCol.substring(1)})`, true);
                        } else {
                            interaction.reply("Please chose a valid hex color\nYou can find colors here: https://www.color-hex.com/");
                        }
                    }
                }
                else if (command == "help") {
                    if (args[i].value) {
                        help.execute(interaction, Discord, Client, bot);
                    } else {
                        intrep(interaction, 'https://docs.selmerbot.com/setup', true);
                    }
                }
                else if (command == "rss_channel") {
                    const channel = args[i].value;
                    const rssDoc = await dbo.findOne({_id: "RSS"});
                    if (!rssDoc) {
                        dbo.insertOne({_id: "RSS", feeds: []});
                        return intrep(interaction, `RSS feed channel updated to <#${channel}>`, true);
                    }

                    dbo.updateOne({_id: "RSS"}, {$set: {channel: channel}}).then(() => {
                        intrep(interaction, `RSS feed channel updated to <#${channel}>`, true);
                    }).catch(() => {
                        intrep(interaction, "Uh oh! There's been an error!", true);
                    });
                }
                else {
                    console.log(interaction.options.data[i].name);
                    intrep(interaction, "Please chose a valid option", true);
                }
                /* Made obsolete by the change to Slash Commands

                else if (command == 'help') {
                    let temp;
                    const subcat = args[i].value;
                    if (args[1] == 'welcome') {
                        temp = 'Use _/setup welcome\\_channel [channel name]_ to set the welcome channel and _/setup welcome\\_message [message]_ to set a welcome message/\n';
                    } else if (args[1] == 'logs') {
                        temp = 'To enable logging, use the command _/setup keep\\_logs true_ and _/setup log\\_channel_ [channel name] to set the logging channel/\n';
                        temp += 'Use _/setup keep\\_logs false_ to disable logging and _/setup log\\_severity [none, low, medium, high]_ to set the threshold\n';
                        temp += '__Severities:__\n*none* - unmute, unban\n*low* - mute\n*medium* - kick\n*high* - ban\nEvery tier also includes all notifs for ***higher*** tiers (AKA _/setup log\\_severity none_ will log everything from every severity)\n';
                    } else if (args[1] == 'announcement') {
                        temp = "To pick the announcement channel, use _/setup announcement\\_channel_\nTo pick the announcement role, use _/setup announcement\\_role_";
                    } else { temp = 'Use _/setup Please use the following format: _/setup help [welcome, logs, announcement]_\nExample: _/setup help welcome_'; }

                    intrep(interaction, temp, true);
                }*/
            } catch (err) {
                console.error(err);
            }
        }
    });
}



module.exports = {
    name: 'setup',
    description: 'Set up server features',
    execute,
    options: [
        {name: 'welcome', description: 'Set welcome options', type: ApplicationCommandOptionType.Subcommand, options: [
            {name: 'welcome_channel', description: 'Sets the channel for welcome messages', type: ApplicationCommandOptionType.Channel },
            {name: 'welcome_message', description: 'Use {un}, {ud}, {ut}, and {sn} for username, user descriminator, user tag, and server name', type: ApplicationCommandOptionType.String },
            {name: 'welcome_banner', description: 'Sets the welcome banner', type: ApplicationCommandOptionType.Attachment},
            {name: 'welcome_text_color', description: 'Sets the welcome banner text color', type: ApplicationCommandOptionType.String}
        ]},

        {name: 'auto_role', description: 'Add or remove an auto role', type: ApplicationCommandOptionType.Subcommand, options: [
            {name: 'add', description: 'Add a new welcome role', type: ApplicationCommandOptionType.Role},
            {name: 'remove', description: 'Remove a new welcome role', type: ApplicationCommandOptionType.Role}
        ]},

        {name: 'logs', description: 'Set logging options', type: ApplicationCommandOptionType.Subcommand, options: [
            {name: 'keep_logs', description: 'Toggles logging', type: ApplicationCommandOptionType.Boolean },
            {name: 'log_channel', description: 'Sets the logging channel', type: ApplicationCommandOptionType.Channel },
            {name: 'log_severity', description: 'Sets the logging Severity (logs this/lower tiers)', type: ApplicationCommandOptionType.String, choices: [{name: 'none', value: 'none'}, {name: 'low', value: 'low'}, {name: 'medium', value: 'medium'}, {name: 'high', value: 'high'}] }
        ]},

        {name: 'announcements', description: 'Set announcement options', type: ApplicationCommandOptionType.Subcommand, options: [
            {name: 'ping_role', description: 'Sets the role to be pinged for reminders', type: ApplicationCommandOptionType.Role},
            {name: 'ping_channel', description: 'Sets the channel for reminders', type: ApplicationCommandOptionType.Channel},
        ]},

        {name: 'mode_role', description: 'Add or remove Selmer Bot mod roles', type: ApplicationCommandOptionType.Subcommand, options: [
            {name: 'add_mod_role', description: 'Make a role into an admin role for Selmer Bot, able to execute ALL Selmer Bot commands', type: ApplicationCommandOptionType.Role},
            {name: 'remove_mod_role', description: 'Remove a Selmer Bot moderation role', type: ApplicationCommandOptionType.Role},
        ]},
        
        {name: 'leveling', description: 'Set leveling options', type: ApplicationCommandOptionType.Subcommand, options: [
            {name: 'toggle_leveling', description: 'Enable or Disable the leveling system', type: ApplicationCommandOptionType.Boolean},
            {name: 'leveling_banner', description: 'Set the card background for the leveling system', type: ApplicationCommandOptionType.Attachment},
            {name: 'leveling_text', description: 'Use {un}, {ud}, {ut}, {sn}, and {r} for username, descriminator, user tag, server name, and rank', type: ApplicationCommandOptionType.String},
            {name: 'leveling_color', description: 'Set the card text color for the leveling system', type: ApplicationCommandOptionType.String},
        ]},
        
        {name: 'rss', description: 'change rss channel/settings', type: ApplicationCommandOptionType.Subcommand, options: [
            {name: 'rss_channel', description: 'Set the channel to send RSS pings to', type: ApplicationCommandOptionType.Channel}
        ]},
        
        {name: 'help', description: 'in-app?', type: ApplicationCommandOptionType.Subcommand, options: [
            {name: 'in_app', description: 'Show a help embed in app?', type: ApplicationCommandOptionType.Boolean}
        ]}
    ]
}