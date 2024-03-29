const { modHelp } = require('../admin/moderation.js');
const { ApplicationCommandOptionType } = require('discord.js');
const tuto = require('./tuto.js');
const { intrep } = require('../utils/discordUtils.js');


//CHANGE THIS TO FORMS?
module.exports ={
    name: "help",
    description: "Gets help for all of Selmer Bot's commands",
    execute(interaction, Discord, Client, bot) {

        const groups = new Map([['SBspec', ['arrow', 'extracredit', 'profile', 'quotes', 'code']], ['adminCommands', [ 'setup', 'lock', 'unlock', 'serverlock' ]]]);
        
        var spec = "";
        const opts = interaction.options.data;
        if (opts.length == 1) {
            if (opts[0].name == "command") {
                spec = opts[0].value;
                const ind = tuto.getPage((spec == 'econ') ? "shop" : spec);
                if (!ind) { return; }
                
                return tuto.execute(interaction, Discord, Client, bot, ind);
            } else {
                if (!opts[0].value) {
                    return tuto.execute(interaction, Discord, Client, bot);
                }
            }
        }
        else if (opts.length > 1) {
            //No need to format into a tuto as it's just the one command
            spec = opts.find((o) => o.name == 'comand').value;

            // Maybe have it jump to the page later
            // const asTuto = opts.find((o) => o.name == 'dump').value;
            // if (asTuto) {
            //     return tuto.execute(interaction, Discord, Client, bot);
            // }
        }
        else {
            return tuto.execute(interaction, Discord, Client, bot);
        }

        if (spec == 'econ') {
            let temp = "***Selmer Bot Commands (Econ):***\n";
            temp += bot.commands.get('econ').econHelp();
            temp += `\n\n(remember to use \`/\` before the command!)`;
            return intrep(interaction, { content: temp, ephemeral: true });

        } 
        else if (spec == 'game') {
            let temp = "***Selmer Bot Commands (Games):***\n";
            temp += bot.commands.get('game').allGames.join(", ");
            // temp += `\n\n_Note: due to how complicated this feature is, it will not be migrated to slash commands for now_`;
            temp += `\n\n(remember to use \'/\' before the command!)`;
            return intrep(interaction, { content: temp, ephemeral: true });
            
        }
        else if (spec == 'admin') {
            let temp = `__**Selmer Bot Admin Commands**__\n`
            Array.from(groups.get('adminCommands')).forEach(commName => {
                let comm = bot.commands.get(commName);
                temp += `${comm.name.toLowerCase()} - _${comm.description}_\n`;
            });

            temp += `__**Selmer Bot Moderation Commands**__\n`
            temp += modHelp();

            //Uses a different format, only the server owner can use it
            temp += '\n_setup_ - ***SERVER OWNER ONLY*** - use \`setup help\`\n';
            temp += `\n\n(remember to use \`/\` before the command!)`;

            return intrep(interaction, { content: temp, ephemeral: true });
        }

        let temp = "***Selmer Bot Commands:***\n";
        
        bot.commands.sort((a, b) => {if (a.name && b.name) { return a.name[0] < b.name[0]} else {return false;} });

        const noPostList = Array.from(groups.values()).flat();
        const sList = groups.get('SBspec');

        bot.commands.forEach((comm) => {
            if (comm.name != 'verify') {
                if (comm.name == 'econ') {
                    temp += `**econ** - use \`/help econ\`\n`;
                }
                else if (comm.name == 'game') {
                    temp += `**games** - use \`/help game\`\n`;
                }
                else {
                    if (comm.name && comm.description && !noPostList.includes(comm.name)) {
                        temp += `${comm.name.toLowerCase()} - _${comm.description}_\n`;
                    }
                }
            }
        });

        temp += '**admin/moderation commands** - use `/help admin`\n';
        
        //Selmer Specific
        temp += '\n__**Selmer\'s \\*Special\\* Commands**__\n'
        sList.forEach((commName) => {
            const comm = bot.commands.get(commName);
            if (comm && comm.name && comm.description) {
                temp += `${comm.name.toLowerCase()} - _${comm.description}_\n`;
            }
        })

        temp += `\n_(remember to use \`/\` before the command!)_`;

        intrep(interaction, { content: temp, ephemeral: true });
    },
    options: [
        {name: 'command', description: 'the section to look at', type: ApplicationCommandOptionType.String, required: false, choices: [
            { name: 'econ', value: 'econ' },
            { name: 'game', value: 'game' },
            {name: 'admin', value: 'admin'}
        ]},
        {name: 'dump', description: 'displays most commands as one long formatted message', type: ApplicationCommandOptionType.Boolean, required: false}
    ],
    isDm: true
}