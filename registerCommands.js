const {Client, ApplicationCommandOptionType, ApplicationCommandType, ContextMenuCommandBuilder} = require('discord.js');

/**
 * Registers all slash commands
 * @param {Client} bot 
 */
function registerCommands(bot) {
    return new Promise((resolve, reject) => {
        const commands = bot.application.commands;

        /*
            val: {
                name: 'code',
                description: "See where Selmer bot's code is stored! (you can also use _!repo_)",
                execute: [Function: execute]
            },

            key: code
        */

        //#region Slash Commands
        bot.commands.forEach((val, key) => {
            if ((val.options && val.name != 'econ') || val.isDm) {
                commands.create({
                    name: val.name,
                    description: val.description,
                    type: ApplicationCommandType.ChatInput,
                    options: val.options,
                    dm_permission: (val.isDm == true),
                });
            } else {
                // console.log(val, key);
                console.log(key);
            }
        });

        //Create the "econ" commands
        const econList = ["buy", 'shop', 'work', 'rank', 'inventory', 'balance', 'sell'];
        const econMain = require('./commands/db/econSlashOptions.js');

        econList.forEach((commandName) => {
            const command = econMain[`${commandName}`];
            commands.create({
                name: commandName,
                description: command.description,
                type: ApplicationCommandType.ChatInput,
                options: command.options || [],
                dm_permission: false,
            });
        });


        //Create the moderation commands
        //NOTE: The user needs to have kicking or banning permissions to use these
        const modList = ['lock', 'unlock', 'kick', 'ban', 'unban', 'mute', 'unmute'];
        for (let i = 0; i < modList.length; i++) {
            const opts = [
                {name: "user", description: `The user to ${modList[i]}`, type: ApplicationCommandOptionType.User, required: true},
                {name: "reason", description: "Why?", type: ApplicationCommandOptionType.String, required: false}
            ];

            commands.create({
                name: modList[i],
                description: `${modList[i]} a user`,
                type: ApplicationCommandType.ChatInput,
                options: opts,
                dm_permission: false,
                default_member_permissions: 6,
            });
            
            // .then((comm) => {
            //     comm.setDefaultMemberPermissions(Discord.PermissionFlagsBits.KickMembers | Discord.PermissionFlagsBits.BanMembers);
            // });
        }

        //Admin commands (Home Server only)
        const guild = bot.guilds.cache.get(bot.home_server);
        guild.commands.create({
            name: "admin",
            description: "admin commands",
            type: ApplicationCommandType.ChatInput,
            options: [
                {
                    name: "setpresence",
                    description: "Change the bot's presence",
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {name: "pres_text", description: "The new presence text", type: ApplicationCommandOptionType.String, required: true },
                        {name: "type", description: "The new presence text", type: ApplicationCommandOptionType.String, required: true, choices: [
                            {name: "LISTENING", value: "LISTENING"}, {name: "WATCHING", value: "WATCHING"}, {name: "COMPETING", value: "COMPETING"}, {name: "PLAYING", value: "PLAYING"}, { name: "STREAMING", value: "STREAMING"}
                        ]},
                        {name: 'display_name', description: "What to display instead of the stream's title", type: ApplicationCommandOptionType.String, required: false}
                    ],
                    dm_permission: false
                },
                {
                    name: "setactivity",
                    description: "Change the bot's activity",
                    type: ApplicationCommandOptionType.Subcommand,
                    options: [
                        {name: "type", description: "The new presence text", type: ApplicationCommandOptionType.String, required: true, choices: [
                            {name: "Do Not Disturb", value: "dnd"}, {name: "Idle", value: "idle"}, {name: "invisible", value: "invisible"}, {name: "online", value: "online"}
                        ]},
                    ],
                    dm_permission: false
                },
            ]
        });

        //Takes much longer, so it'll be the benchmark for when the Promise resolves
        //#region GAMES
        const gameOpts = require('./commands/games/gameCommandOptions.js');
        commands.create({
            name: 'game',
            description: 'Play one of Selmer Bot\'s games!', //NOT APPLICABLE USING SUB COMMAND GROUPS???
            // type: Constants.ApplicationCommandOptionTypes.SUB_COMMAND_GROUP,
            options: gameOpts,
            dm_permission: false
        }).then(() => {            
            // if (!bot.inDebugMode) { return resolve(true); }

            //#region Context Menus
            const cardCom = new ContextMenuCommandBuilder()
            .setDMPermission(false)
            .setName("View Card")
            .setType(ApplicationCommandType.User)

            commands.create(cardCom).then(() => { resolve(true); });
            
            //#endregion
        }).catch((err) => { reject(err); });

        //#endregion
        //#endregion
    });
}



module.exports = { registerCommands }