//#region imports
const { Client, GatewayIntentBits, Partials, ActivityType, ChannelType, codeBlock } = require('discord.js');
const Discord = require('discord.js');
const { MongoClient, ServerApiVersion, GridFSBucket } = require('mongodb');
const fs = require('fs');
// const OpenAI = require('openai-api')
const { Configuration, OpenAIApi } = require("openai");
const Stripe = require('stripe');

const turnManager  = require('./commands/turnManager.js');
const { welcome } = require('./commands/admin/welcome.js');
const { handle_interaction, handleContext } = require('./commands/interactionhandler.js');
const { handle_dm } = require('./commands/dm_handler');
const { devCheck } = require('./commands/dev only/devcheck.js');
const { moderation_handler } = require('./commands/admin/moderation.js');
const { registerCommands } = require('./registerCommands.js');
const { backupLists, loadBotBackups } = require('./commands/dev only/backupBot.js');
const { setPresence } = require('./commands/dev only/setPresence.js');
const { exit } = require('process');
const {textToLevels} = require('./commands/Selmer Specific/msgLevels.js');
const scheduled = require('./commands/dev only/scheduled.js');
const handleNoPermissions = require('./commands/dev only/noPermissions.js');
//#endregion

const BASE_LVL_XP = 20;


//#region Token area

//Adding integration for development mode
let token;
let IDM = false;
let home_server;
let debug_channel;

let MLAIKEY;
let StripeAPIKey;
let youtubeAPIKey;

if (process.env.token != undefined) {
    //Use "setx NAME VALUE" in the local powershell terminal to set
    token = process.env.token;
    home_server = process.env.home_server;
    debug_channel = process.env.debug_channel;
    MLAIKEY = process.env.MLAIKEY;
    StripeAPIKey = process.env.StripeAPIKey;
    youtubeAPIKey = process.env.youtubeAPIKey;
} else {
    token = require('./config.json').token;
    home_server = require('./config.json').home_server;
    debug_channel = require('./config.json').debug_channel;

    MLAIKEY = require('./config.json').MLAIKEY;
    StripeAPIKey = require('./config.json').StripeAPIKey;
    youtubeAPIKey = require('./config.json').youtubeAPIKey;

    IDM = token.startsWith("OTI2NT");
}

//#endregion

const bot = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.MessageContent
    ],
    partials: [ Partials.Channel ]
});

const prefix = '!';
bot.prefix = new String;
bot.prefix = prefix;
bot.inDebugMode = IDM;
bot.home_server = home_server;
bot.debug_channel = debug_channel;
bot.inviteLink = 'https://discord.com/oauth2/authorize?client_id=944046902415093760&scope=applications.commands+bot&permissions=549755289087';
bot.youtubeAPIKey = youtubeAPIKey;

const configuration = new Configuration({
    apiKey: MLAIKEY,
});
bot.openai = new OpenAIApi(configuration);
bot.temptext = '';
bot.stripe = Stripe(StripeAPIKey);

//The first thing will be an audioPlayer(), the second a queue
bot.audioData = new Map();
bot.listeningparties = new Map();

bot.lockedChannels = new Map();

//#region MongoDB integration
//Development support
let mongouritemp;
if (process.env.MONGODB_URI) {
    mongouritemp = process.env.MONGODB_URI;
} else {
    mongouritemp = require('./config.json').mongooseURI;
}
const mongouri = mongouritemp;
bot.mongouri = mongouri;
const client = new MongoClient(mongouri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
bot.mongoconnection = client.connect();

//Error stuff
var preverr = "";
var errmsg;
var errTimes = 1;

//#endregion MongoDB Integration end


//#region PROCESS STUFF
loadBotBackups(bot, IDM);
process.on("SIGTERM", (signal) => {
    console.log(`Process ${process.pid} received a SIGTERM signal`);
    backupLists(bot, IDM);
    // process.exit(0);
    bot.user.setStatus('invisible');
});


process.on("SIGINT", (signal) => {
    console.log(`Process ${process.pid} has been interrupted`);
    backupLists(bot, IDM);
    // process.exit(0);
    bot.user.setStatus('invisible');
});


process.on('uncaughtException', async (signal) => {
    
    if (signal.rawError) {
        if (signal.rawError.message.toLowerCase() == 'missing permissions') {
            //handleNoPermissions(bot, signal.url, token);
            console.log(signal);
            return;
        }
    }
    else if (signal.rawError.message.toLowerCase() == 'unknown interaction') {
        return;
    }

    //Check if this was the last err and if so, ignore
    else if (preverr == signal.stack.toString()) {
        var tempmsg = errmsg.content;
        tempmsg.replaceAll(`{${errTimes}}`, `{${errTimes + 1}}`);
        errTimes++;

        errmsg.edit(tempmsg);
        return;
    }

    console.log(signal);

    if (bot.inDebugMode || !bot.isReady()) { return; }

    const guild = bot.guilds.cache.get(bot.home_server);
    const owner = guild.members.cache.get(guild.ownerId);
    preverr = signal.stack.toString();

    // owner.send(`${owner} SELMER BOT IS DOWN!!!`).then(() => {
        guild.channels.cache.get("1054550753982828624").send(`<@&944048889038774302> Selmer Bot is down!\n***ERROR STACK:***\n`).then(() => {
            guild.channels.cache.get("1054550753982828624").send(`\`\`\`${preverr}\`\`\`\nTHIS ERROR HAS OCCURED {1} TIMES IN A ROW`).then((msg) => {
                errmsg = msg;
                preverr = signal.stack.toString();
                // exit(12);
                bot.user.setStatus('dnd');
            });
        });
    // });
});

//#endregion


//#region set up bot commands

// const commandFiles = fs.readdirSync('./commands/').filter(file => file.endsWith('.js')); // Obsolete?

bot.commands = new Discord.Collection();
const forbiddenFolders = ['db', 'dev only']; //premium, 

fs.readdirSync('./commands')
  .forEach(dir => {
      if (!forbiddenFolders.includes(dir) && !dir.endsWith('.js')) {
        fs.readdirSync(`./commands/${dir}`)
        .filter(file => file.endsWith('.js'))
        .forEach(file => {
           const command = require(`./commands/${dir}/${file}`);
           if (command.name && command.description) {
                bot.commands.set(command.name.toLowerCase(), command);
           }
        });
      }
  });


//Set these two manually because all the seperate games can't be included in the command list (all managed by the 'game' file)
let temp_command = require("./commands/db/econ.js");
const { STATE } = require('./commands/db/econ.js');
const replies = require('./commands/Selmer Specific/replies.js');
const { intrep } = require('./commands/utils/discordUtils.js');
bot.commands.set('econ', temp_command);
temp_command = require('./commands/games/game.js');
bot.commands.set('game', temp_command);

//Everything in the API should be handled by specific handler functions
// const chat = require('./commands/premium/chat.js');
// bot.commands.set('chat', chat);
// const stripeCommands = require('./commands/premium/stripe.js');
// bot.commands.set('premium', stripeCommands);
// const 
// bot.commands.set('RSS', )

//#endregion


//#region bot.[anything] section

//XP Table section
let xp_collection = new Map();
let items;
var botIsReady = bot.inDebugMode;

bot.on('ready', async () => {
    const startTime = new Date().getTime();
    bot.user.setPresence({ activities: [{ name: 'Booting up, please hold!', type: ActivityType.Playing }], status: "idle" });
    
    replies(bot);
    scheduled(bot);

    registerCommands(bot).then(() => {
        //Make then copy the shop
        bot.mongoconnection.then(client => {
            const shop = client.db("main").collection("shop");
            shop.find().toArray(function(err, itemstemp) {
                if (err) throw err;

                items = [...itemstemp];
            });
        });

        //Note the xp numbers are a little wonky on levels 6, 8 and 13 (why though?)
        //See https://stackoverflow.com/questions/72212928/why-are-the-differences-between-my-numbers-inconsistent-sort-of-compund-interes
        for (let i = 1; i < 101; i ++) {
            // xp_collection.set(i, BASE_LVL_XP * .1);
            let amount = BASE_LVL_XP * (Math.ceil(Math.pow((1.1), (2 * i))) + i);
            xp_collection.set(i+1, amount);
        }


        bot.user.setPresence({ activities: [{ name: '/help', type: ActivityType.Playing }], status: "online" });
        if (!bot.inDebugMode) {
            console.log('SLEEMER BOT ONLINE!!!!! OH MY GOD OH MY GOD!!!');
        } else {
            console.log("Testing testing 1 2 5...");
        }


        //Add the money symbol
        let srv = bot.guilds.cache.get(bot.home_server).emojis.cache;
        emj = srv.find((g) => { return g.name == 'selmer_coin' });
        bot.currencysymbolmmain = `${emj}`;
    }).catch((err) => {
        console.log(err);
    }).finally(() => {
        botIsReady = true;
        console.log(`Setting up Slash Commands took ${(new Date().getTime() - startTime) / 1000} seconds to complete!`);
    });
}); 


//Button Section
bot.on('interactionCreate', async interaction => {
    const { commandName } = interaction;
    if (!botIsReady) {
        const errep = "The bot is still warming up. This is process can take up to 5 minutes. Please try again in a bit! \:(";
        return intrep(interaction, errep);
    }

    //Slash commands
    if (interaction.isChatInputCommand()) {
        const logable = ['kick', 'ban', 'unban', 'mute', 'unmute', 'timeout'];
        const econList = ["buy", 'shop', 'work', 'rank', 'inventory', 'balance', 'sell'];
        const adminList = ["setpresence", "setactivity"];

        if (commandName == "admin" && adminList.includes(interaction.options.data[0].name)) {
            if (interaction.user.id == bot.guilds.cache.get(bot.home_server).ownerId) {
                setPresence(bot, interaction);
            } else {
                return intrep(interaction, "HAHAHAHAHAHAHAHAHAHAHA\n\nno.", true);
            }
        } else if (logable.includes(commandName)) {
            moderation_handler(bot, interaction, commandName);
        } else if (econList.includes(commandName)) {
            bot.commands.get('econ').execute(bot, interaction, Discord, mongouri, items, xp_collection);
        } else if (commandName == 'game') {
            const command = interaction.options.data[0];
            bot.commands.get('game').execute(bot, interaction, command, Discord, mongouri, items, xp_collection);
        } else if (commandName == 'setup_embed') {
            const {generateMsg} = require('./commands/admin/easySetup.js')
            generateMsg(bot, interaction);
        } else if (bot.commands.has(commandName)) {
            bot.commands.get(commandName).execute(interaction, Discord, Client, bot);
        } else {
            intrep(interaction, "Unknown command detected!", true);
        }
    } else if (interaction.isContextMenuCommand()) {
        return handleContext(bot, interaction);
    } else {
        handle_interaction(interaction, mongouri, turnManager, bot, STATE, items, xp_collection);
    }
});



//Add the bot to a server setup
bot.on("guildCreate", guild => {
    if (guild.roles.cache.find((role) => { return (role.name == 'Selmer Bot Commands'); }) == undefined) {
        guild.roles.create({ name: 'Selmer Bot Commands' });
    }
    
    if (guild.roles.cache.find((role) => { return (role.name == 'Selmer Bot Calendar'); }) == undefined) {
        guild.roles.create({ name: 'Selmer Bot Calendar' });
    }
    

    //const role = guild.roles.cache.find((role) => role.name === 'Selmer Bot Mod'); // member.roles.cache.has('role-id-here');
    const server = bot.guilds.cache.get(guild.id);
    server.members.fetch(guild.ownerId).then(function(owner) {
        owner.send('Thank you for adding Selmer Bot to your server!\nPlease give people you want to have access to Selmer Bot\'s restricted commands the "_Selmer Bot Commands_" role and people you want to access set the calendar the "_Selmer Bot Calendar_" role');
        owner.send('To help set up Selmer Bot to work better with your server, use _/setup help_ in a channel Selmer Bot is in!');
    });

    //Set up the server
    bot.mongoconnection.then(client => {
        
        const dbo = client.db(guild.id).collection('SETUP');
        dbo.insertMany([{_id: 'WELCOME', 'welcomechannel': null, 'welcomemessage': null, 'welcomebanner': null, 'col': "#FFFFFF"}, {_id: 'LOG', 'keepLogs': false, 'logchannel': null, 'severity': 0},
        {_id: 'announcement', channel: null, role: null}, {_id: 'roles', commands: ["Selmer Bot Commands"], announcements: "Selmer Bot Calendar"}]);
        client.db(guild.id).collection('marriage').insertOne({partners: [], joint_amount: null, joint_toggled: false});
    });
});


bot.on("guildDelete", guild => {
    bot.mongoconnection.then((client) => {
        //Insufficient Permission????
        // db.dropDatabase();

        try {
            const db = client.db(guild.id);
            db.listCollections().forEach(function(x) { db.collection(x.name).drop(); });

            var times;
            const dbo = client.db('main').collection('reminderKeys');

            //ReminderKeys are all stored as userId, the reminders themselves are not
            dbo.findOne({userId: guild.id}).then((doc) => {
                if (!doc || !doc.times) { return; }

                times = doc.times;
                const tbo = client.db('main').collection('reminders');
                
                tbo.find({time: {$in: times}}).toArray((err, docs) => {
                        try {
                        for (let i = 0; i < docs.length; i ++) {
                            for (let j in docs[i]) {
                                if (!isNaN(j) && (docs[i][j].guildId == guild.id)) {
                                    delete docs[i][j];
                                    docs[i].amt --;
                                }
                            }

                            if (docs.amt > 0) {
                                tbo.replaceOne({ time: docs[i].time }, docs[i]);
                            } else {
                                tbo.deleteOne({ time: docs[i].time });
                            }
                        }
                    } catch (err) {
                        console.error(err);
                    }
                });
            });

            dbo.deleteOne({ userId: guild.id });
        } catch (err) {
            console.error(err);
        }
    })
});


//Welcome new members
bot.on('guildMemberAdd', async (member) => {
    if (member.guild.id == bot.home_server && !bot.inDebugMode) { return; }

    //Check for impartial data
    if (member.partial) { member = await member.fetch(); }

    const guild = bot.guilds.cache.get(member.guild.id);

    bot.mongoconnection.then(async (client) => {
        const dbo = client.db(member.guild.id).collection('SETUP');

        dbo.findOne({_id: 'WELCOME'}).then(async (doc) => {
            if (!doc) { return; }

            var welcomechannel;
            if (doc.welcomechannel == null) {
                welcomechannel = guild.channels.cache.find(channel => channel.name.toLowerCase() === 'welcome');
            } else {
                welcomechannel = guild.channels.cache.get(doc.welcomechannel)
            }

            if (welcomechannel == null) {
                return; // console.log('No welcome channel detected');
            }

            await welcome(member, welcomechannel, doc.welcomemessage, doc.welcomebanner, (doc.welcometextcolor) ? doc.welcometextcolor : "#FFFFFF");
        });

        const autoRoleDoc = await dbo.findOne({_id: "AUTOROLE"});
        if (!autoRoleDoc || !autoRoleDoc.roles) { return; }

        for (let roleId of autoRoleDoc.roles) {
            const role = guild.roles.cache.get(roleId);
            if (!role) continue;

            member.roles.add(role);
        }
    });
});


bot.on('messageCreate', (message) => {
    //DM SECTION
    if (message.channel.type == Discord.ChannelType.DM) {
        return handle_dm(message, bot);
    } else if (message.content.indexOf('!spam_collection') != -1) {
        //Handle spam collection/Dev commands
        return devCheck(message, bot);
    } else if (message.type === Discord.MessageType.ChannelPinnedMessage) {
        //Debug log stuff
        if (message.guild.id == bot.home_server && message.channel.id == bot.debug_channel) {
            message.delete();
        }
    }

    //Special case, testing server (still need the emojis and error logging)
    if (!bot.inDebugMode && message.guildId == bot.home_server) { return; }

    if (message.author.bot) { return; }

    if (message.mentions.has(bot.user.id)) {
        if (message.content == `<@${bot.user.id}>`) {
            return message.reply("What?");
        } else {
            // return replies(bot, message);
            const c = message.content.replace(`<@${bot.user.id}>`, "").toLowerCase().trim();
            var s = (bot.customReplyList.has(c)) ? bot.customReplyList.get(c) : "??????????";
            // default: s = "I'm not sure what that means! Please use `/help` for a comprehensive list of commands!\n\n_PS - If you want to make full use of the bot's AI capabilities, consider Selmer Bot Premium. See more at http://www.selmerbot.com/premium _";

            message.reply(s).catch(() => { message.channel.send(s); });
        }
    }

    if (message.content.startsWith(prefix)) {
        //Game section (too complicated to move to Slash Commands)
        //Note: Slash commands do not register as valid replies
        const args = message.content.slice(prefix.length).split(' ');
        const command = args.shift().toLowerCase();
        if (command == 'game' || command == 'accept') {
            bot.commands.get(command).execute(bot, message, args, command, Discord, mongouri, items, xp_collection);
        } else if (command == 'rss' && bot.inDebugMode) {
            const rss = require('./side projects/RSSHandlers/rssFeed.js');
            rss.execute(message, args, Discord, client, bot);
        } else {
            textToLevels(bot, message, xp_collection);
        }
    } else {
        //Use for the leveling-by-interaction system
        textToLevels(bot, message, xp_collection);
    }
});

//#endregion

//Last Line(s)
bot.login(token);