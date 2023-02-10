const https = require('https');
const xml2js = require('xml2js');
const concat = require('concat-stream');
const { Interaction, ApplicationCommandOptionType, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { mapToTableRecursive } = require('../utils/jsonFormatters.js');
const { isValidUrl } = require('../dev only/setPresence.js');

const parser = new xml2js.Parser();

function intrep(interaction, mcontent, e) {
    interaction.reply({content: mcontent, ephemeral: e})
    .catch(() => {
        interaction.channel.send(mcontent);
    });
}


async function addFeed(bot, interaction, options, mclient) {
    const dbo = mclient.db(interaction.guildId).collection("SETUP");
    const doc = await dbo.findOne({_id: "RSS"});

    if (!doc || doc.channel) {
        return intrep(interaction, "RSS Discord channel not specified!\nPlease use `/setup rss_channel`", true);
    }

    const url = options.find(o => o.name == 'url').value;
    const daily = options.find(o => o.name == 'daily').value;
    const roleOpt = options.find(o => o.name == 'role');
    const topt = options.find(o => o.name == 'time');

    const role = (roleOpt) ? roleOpt.role : { id: null };

    if (daily) {
        if (!topt || topt.value > 23 || topt.value < 0) {
            return intrep(interaction, "Please specify a time between 0 and 23", true);
        }

        const t = String(topt.value);
        const rso = mclient.db("RSS").collection(t);
        rso.insertOne({url: url, guild: interaction.guildId});
    }

    if (!doc.feeds) {
        dbo.insertOne({_id: "RSS", feeds: [{url: url, daily: daily, role: role.id, time: (topt) ? topt.value : null}]});
        return intrep(interaction, `Added \`${url}\` as a new feed!`);
    } else {
        const f = doc.feeds.find(r => r.url == url);
        if (f) { return intrep(interaction, `This url is already in your feed!`); }

        dbo.updateOne({_id: "RSS"}, {$push: { feeds: {url: url, daily: daily, role: role.id, time: (topt) ? topt.value : null} }});
        intrep(interaction, `Added \`${url}\` as a new feed!`);
    }
}


async function remFeed(bot, interaction, options, mclient) {
    const dbo = mclient.db(interaction.guildId).collection("SETUP");
    const doc = await dbo.findOne({_id: "RSS"});

    if (!doc) {
        dbo.insertOne({_id: "RSS", feeds: {}});
        return intrep(interaction, "This feed is not in your feeds!");
    } 

    const f = doc.feeds.find(r => r.url == options[0].value);
    if (!f) {
        return intrep(interaction, "This feed is not in your feeds!");
    }
    
    dbo.updateOne({_id: "RSS"}, { $pull: { feeds: { $in: [ f ] } } });

    if (f.daily) {
        const rso = mclient.db("RSS").collection(String(f.time));
        rso.deleteOne({url: f.url, guild: interaction.guildId});
    }


    intrep(interaction, `Removed \`${f.url}\` from your feeds!`, true);
}


async function displayFeeds(bot, interaction, options, mclient) {
    const dbo = mclient.db(interaction.guildId).collection("SETUP");
    const doc = await dbo.findOne({_id: "RSS"});

    const arr = Array.from(doc.feeds).map((obj) => {
        const roleObj = (obj.role) ? `<@&${obj.role}>` : "none";
        return [obj.url, new Map([[`daily: ${obj.daily}`, "null"], [`role: ${roleObj}`, "null"], [`Hour: ${obj.time}`]])];
    });
    
    const m = new Map(arr);
    const table = mapToTableRecursive(m);
    intrep(interaction, table[0], true);
}


async function parseFeed(url) {
    return new Promise((resolve, reject) => {
        parser.on('error', function(err) {
            reject(err);
        });

        https.get(url, function(resp) {
            resp.on('error', function(err) {
                return reject(err);
            });

            resp.pipe(concat(function(buffer) {
                var str = buffer.toString();
                parser.parseString(str, function(err, result) {
                    if (err) { return reject(err); }

                    return resolve(result);
                });
            }));
        });
    });
}


async function showFeedsMenu(bot, interaction, options, mclient) {
    //You'll need to replace these later (get data from listener)
    const url = options.find(o =>o.name == 'url').value;
    const todayOpt = options.find(o => o.name == 'today');
    const today = (todayOpt) ? todayOpt.value : false;

    const valid = isValidUrl(url);
    if (!url || !valid) { return intrep(interaction, "Please provide a valid ***RSS*** url!", true); }


    parseFeed(url).then((feed) => {
        const rsschannel = feed.rss.channel[0];

        const embd = new EmbedBuilder()
        .setTitle(rsschannel.title[0])
        .setDescription(rsschannel.description[0])
        .setURL(url)
        .addFields([
            { name: "only display today's feeds", value: String(today), inline: true }
        ]);

        const zeroDate = (d_str) => {
            const d = new Date(d_str);
            d.setHours(0);
            d.setMinutes(0);
            d.setSeconds(0);
            d.setMilliseconds(0);
            return d;
        }


        // return console.log(rsschannel.item[0], "\n\n", );
        const items = rsschannel.item.filter((item) => {
            const d = new Date(item.pubDate);
            return (!today || (d.getDate() == (new Date).getDate()));
        });


        const selMenu = new StringSelectMenuBuilder()
        .setCustomId('rss_menu')
        .setPlaceholder('Nothing selected')
        .addOptions(
            {
                label: 'All',
                description: 'Display all items',
                value: 'all',
            },
        )

        items.forEach(item => {
            const label = item.title[0];
            var desc = item.description[0];
            var val = item.link[0];

            if (desc.length > 90) {
                desc = desc.substring(0, 90);
                desc += ". . .";
            }

            if (val.length > 90) {
                val = val.substring(val.lastIndexOf("/"));
            }

            selMenu.addOptions({
                label: label,
                description: desc,
                value: val
            });
        });

        const row = new ActionRowBuilder()
        .addComponents(selMenu);

        interaction.channel.send({embeds: [embd], components: [row]});
    }).catch((err) => {
        console.log(err);
        intrep(interaction, `ERROR: ${err.message}`, true);
    });
}


const printItem = (item) => {
    console.log("=================================");
    for (i in item) {
        console.log(i, "=>", item[i]);
    }
    console.log("=================================");
}


async function showFeeds(bot, interaction, opt, url, today, channel = null) {
    const feed = await parseFeed(url);
    const rsschannel = feed.rss.channel[0];
    var items;
    var confmsg = "";

    if (opt == "all") {
        confmsg = "Showing today's feeds";
        items = rsschannel.item.filter((item) => {
            const d = new Date(item.pubDate);
            return (!today || (d.getDate() == (new Date).getDate()));
        });
    } else {
        confmsg = "Showing custom feeds feeds";
        items = rsschannel.item.filter((item) => {
            const d = new Date(item.pubDate);
            return ((!today || (d.getDate() == (new Date).getDate())) && item.link[0].indexOf(opt) != -1);
        });
    }

    if (items.length == 0) {
        if (channel) {
            channel.send("No feeds match! (could this be out of date?)");
        } else {
            intrep(interaction, "No feeds match! (could this be out of date?)", false);
        }

        return;
    }

    if (channel) channel.send(confmsg);
    else intrep(interaction, confmsg, true);

    const pingChannel = (channel) ? channel : interaction.channel;

    items.forEach((item) => {
        // printItem(item);
        
        const title = item.title[0];
        var desc = item.description[0];
        const imgURL = item.enclosure[0].$.url;

        if (desc.length > 90) {
            desc = desc.substring(0, 90);
            desc += ". . .";
        }

        const embd = new EmbedBuilder()
        .setTitle(title)
        .setDescription(desc)
        .setURL(item.link[0])
        .setThumbnail(imgURL);

        if (item.pubDate[0]) {
            embd.setTimestamp(new Date(item.pubDate[0]));
        }

        pingChannel.send({embeds: [embd]});
    });
}


async function handle(bot, interaction) {
    // console.log(interaction);
    const opt = interaction.values[0];    
    const { url, fields } = interaction.message.embeds[0];

    showFeeds(bot, interaction, opt, url, (fields[0].value == "true"));
}


async function fromSchedule(bot, guildId) {
    const guild = bot.guilds.cache.get(guildId);
    const client = await bot.mongoconnection;
    const dbo = client.db(guildId).collection("SETUP");
    const doc = await dbo.findOne({_id: "RSS"});
    
    if (!doc || !doc.feeds) {
        return;
    }

    const channel = guild.channels.cache.get(doc.channel);
    
    // Maybe ping the server owner?
    if (!channel) return;

    // has a lookup time of O(1)
    const roleList = {};
    
    doc.feeds.forEach((item) => {
        if (!roleList[item.role]) {
            channel.send(`<@&${item.role}>`);
            roleList[item.role] = true;
        }

        showFeeds(bot, null, "all", item.url, true, channel);
    });
}


/*
    single-user feeds not supported at the moment

    the collection "RSS" holds the keys to which pings happen when
    Note: These keys are checked HOURLY
*/


module.exports = {
    name: 'rss',
    description: 'Integrate your favorite RSS feeds into Selmer Bot',
    async execute(interaction, Discord, Client, bot) {
        if (!interaction.guildId) {
            return intrep(interaction, "RSS feeds are currently a server-only feature!", false);
        }

        const command = interaction.options.data[0];
        const { name, options } = command;
        const mclient = await bot.mongoconnection;

        switch (name) {
            case 'add':
                addFeed(bot, interaction, options, mclient);
                break;

            case 'remove':
                remFeed(bot, interaction, options, mclient);
                break;

            case 'display':
                displayFeeds(bot, interaction, options, mclient);
                break;

            case 'show':
                showFeedsMenu(bot, interaction, options, mclient);
                break;

            default: return intrep(interaction, `Unknown RSS command: \`${name}\``, true);
        }
    },
    handle,
    fromSchedule,
    options: [
        {name: 'add', description: 'play a song', type: ApplicationCommandOptionType.Subcommand, options: [
            {name: 'url', description: 'The URL to add to your feeds', type: ApplicationCommandOptionType.String, required: true},
            {name: 'daily', description: 'Display this feed in your daily digest', type: ApplicationCommandOptionType.Boolean, required: true},
            {name: 'time', description: 'The hour (0 - 23) in which to display the message', type: ApplicationCommandOptionType.Integer, required: false},
            {name: 'role', description: 'The role to ping for this feed', type: ApplicationCommandOptionType.Role, required: false}
        ]},
    
        {name: 'remove', description: 'remove an RSS feed from your feeds', type: ApplicationCommandOptionType.Subcommand, options: [
            {name: 'url', description: 'The URL to remove', type: ApplicationCommandOptionType.String, required: true},
        ]},
        
        {name: 'show', description: 'Display an RSS feed from your feeds', type: ApplicationCommandOptionType.Subcommand, options: [
            {name: 'url', description: 'The URL to show', type: ApplicationCommandOptionType.String, required: true},
            {name: 'today', description: 'Choose whether to only display today\'s feeds', type: ApplicationCommandOptionType.Boolean, required: false}
        ]},

        {name: 'display', description: 'display your RSS feeds as a list', type: ApplicationCommandOptionType.Subcommand},
    ],
    isDm: true
}