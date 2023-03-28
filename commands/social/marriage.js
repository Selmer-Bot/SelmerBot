const { ApplicationCommandOptionType, Interaction, ActionRowBuilder, ButtonStyle, ButtonBuilder} = require('discord.js');
const { intrep } = require('../utils/discordUtils.js');


/**
 * @param {Interaction} interaction 
 */
function marry(bot, interaction, command) {
    // return console.log(command);
    const other = command.options.filter((opt) => { return (opt.name == "partner"); })[0].user;

    bot.mongoconnection.then((client) => {
        const user_dbo = client.db(interaction.guildId).collection(interaction.user.id);
        const other_dbo = client.db(interaction.guildId).collection(other.id);
        const gdbo = client.db(interaction.guildId).collection('marriage');

        user_dbo.findOne(({"rank": {$exists: true}})).then((udoc) => {
            if (udoc.social.marriage.married) {
                return intrep(interaction, `....You're already married to ${other}`);
            }

            other_dbo.findOne(({"rank": {$exists: true}})).then((odoc) => {
                if (odoc.social.marriage.married) {
                    return intrep(interaction, {content: "This user is already married!", ephemeral: true});
                }

                
                const filter = (response) => {
                    return (response.author.id == other.id && response.content.toLowerCase() == "i do");
                };
                
                interaction.reply({ content: `${interaction.user} has asked ${other} to marry them!\n*Reply with "I do" to this message within 5 minutes to accept!*`, fetchReply: true })
                .then(() => {
                    // wait for 5 minutes
                    const collector = interaction.channel.createMessageCollector({ filter, time: 300000, max: 1 });

                    collector.on('collect', m => {
                        const mDate = new Date();
                        // mDate.setHours(0);
                        // mDate.setMinutes(0);
                        // mDate.setSeconds(0);
                        // mDate.setMilliseconds(0);
                        const mtstamp = mDate.getTime(); ///1000;
                        
                        user_dbo.updateOne({"social": {$exists: true}}, {$set: {"social.marriage.married": true, "social.marriage.partner": other.id, "social.marriage.marriage_date": mtstamp}});
                        other_dbo.updateOne({"social": {$exists: true}}, {$set: {"social.marriage.married": true, "social.marriage.partner": interaction.user.id, "social.marriage.marriage_date": mtstamp}});
                        gdbo.insertOne({partners: [other.id, interaction.user.id], joint_amount: false, joint_toggled: false});

                        interaction.followUp(`${m.author} and ${interaction.user} are now married!`);
                        collector.stop();
                    });
                }).catch(() => { interaction.channel.send("Uh oh! There's been an error! Please contact support if the problem persists!"); });
            });
        });
    });
}


function splitAcct(user_dbo, other_dbo, amt) {
    const amtEach = Math.floor(amt / 2);
    user_dbo.findOne({"rank": {$exists: true}}).then((doc) => {
        user_dbo.updateOne({balance: {$exists: true}}, {$set: {balance: doc.balance + amtEach}});
    });

    other_dbo.findOne({"rank": {$exists: true}}).then((doc) => {
        other_dbo.updateOne({balance: {$exists: true}}, {$set: {balance: doc.balance + amtEach}});
    });
}


function divorce(bot, interaction, command) {
    bot.mongoconnection.then((client) => {
        const user_dbo = client.db(interaction.guildId).collection(interaction.user.id);

        user_dbo.findOne(({"rank": {$exists: true}})).then((udoc) => {
            if (!udoc.social.marriage.married) {
                return intrep(interaction, "But you're not even married....");
            }

            const other = interaction.guild.members.cache.get(udoc.social.marriage.partner);
            const other_dbo = client.db(interaction.guildId).collection(other.id);
            const gdbo = client.db(interaction.guildId).collection('marriage');

            user_dbo.updateOne({"social": {$exists: true}}, {$set: {"social.marriage.married": false, "social.marriage.partner": undefined, "social.marriage.marriage_date": undefined}});
            other_dbo.updateOne({"social": {$exists: true}}, {$set: {"social.marriage.married": false, "social.marriage.partner": undefined, "social.marriage.marriage_date": undefined}});
            
            // Deal with the joint account (if neccessary)
            gdbo.findOne({partners: { $all: [interaction.user.id, other.id]}}).then((doc) => {
                if (doc.joint_toggled) {
                    splitAcct(user_dbo, other_dbo, doc.joint_amount);
                }

                gdbo.deleteOne({partners: { $all: [interaction.user.id, other.id]}});
            });

            intrep(interaction, `${interaction.user} has divorced ${other}!`);
        });
    });
}


function status(bot, interaction, commandGen) {
    const command = commandGen.options[0];

    bot.mongoconnection.then((client) => {
        const user = (command) ? command.user : interaction.user;
        const dbo = client.db(interaction.guildId).collection(user.id);
        const mdb = client.db(interaction.guildId).collection('marriage');
        const symb = bot.currencysymbolmmain;

        dbo.findOne({"balance": {$exists: true}}).then((udoc) => {
            const other = interaction.guild.members.cache.get(udoc.social.marriage.partner);
            const mDate = new Date(udoc.social.marriage.marriage_date);
            var mTimeStamp = `<t:${Math.floor(mDate.getTime())}:R>`;

            const today = new Date();
            if (mDate.getDay() == today.getDay() && mDate.getMonth() == today.getMonth() && mDate.getFullYear() == today.getFullYear()) {
                mTimeStamp = "today";
            }

            mdb.findOne({partners: { $all: [interaction.user.id, other.id]}}).then((doc) => {
                if (user.id == interaction.user.id) {
                    if (!udoc.social.marriage.married) {
                        return intrep(interaction, "You aren't married!");
                    }

                    var txt = `You married ${other} ${mTimeStamp} on \`${mDate}\`.`;

                    if (doc.joint_toggled) {
                        txt += ` You have a joint bank account with a current balance of ${symb}${doc.joint_amount}`;
                    } else {
                        txt += " You do not share a bank account.";
                    }

                    intrep(interaction, {content: txt, ephemeral: true});
                } else if (udoc.social.marriage.partner == interaction.user.id) {
                    var txt = `${other} married you on \`${mDate}\`, ${mTimeStamp}.`;

                    if (doc.joint_toggled) {
                        txt += ` You have a joint bank account with a current balance of ${symb}${doc.joint_amount}`;
                    } else {
                        txt += " You do not share a bank account.";
                    }

                    intrep(interaction, {content: txt, ephemeral: true});
                } else if (udoc.private) {
                    return intrep(interaction, {content: "This user has their profile set to private!", ephemeral: true});
                } else {
                    intrep(interaction, {content: `${interaction.user} married ${other} ${mTimeStamp} on \`${mDate}\`.`, ephemeral: true});
                }
            });
        });
    });
}


function moveFunds(bot, interaction, commandGen) {
    const {name, value} = commandGen.options[0];
    const symb = bot.currencysymbolmmain;
    
    bot.mongoconnection.then((client) => {
        const db = client.db(interaction.guildId);
        const udb = db.collection(interaction.user.id);
        const mdb = db.collection('marriage');

        udb.findOne({"balance": {$exists: true}}).then((udoc) => {
            const other = interaction.guild.members.cache.get(udoc.social.marriage.partner);
            
            if (name == "deposit") {
                if (udoc.balance >= value) {
                    mdb.findOne({partners: {$all: [interaction.user.id, other.id]}}).then((doc) => {
                        if (!doc.joint_toggled) {
                            return intrep(interaction, "Please enable the joint account using `/marriage joint_account toggle`");
                        }

                        mdb.updateOne({partners: {$all: [interaction.user.id, other.id]}}, {$set: {joint_amount: doc.joint_amount + value}});
                        udb.updateOne({"balance": {$exists: true}}, {$set: {balance: udoc.balance - value}});

                        var toSend = {content: `You deposited ${symb}${value} into the joint account, which has a new balance of ${symb}${doc.joint_amount + value}`};
                        if (doc.private) {
                            toSend.ephemeral = true;
                        }
                        intrep(interaction, toSend);

                    });
                } else {
                    console.log(udoc.balance);
                    intrep(interaction, "Insufficient funds!");
                }
            } else {
                mdb.findOne({partners: {$all: [interaction.user.id, other.id]}}).then((doc) => {
                    if (!doc.joint_toggled) {
                        return intrep(interaction, "Please enable the joint account using `/marriage joint_account toggle`");
                    }

                    if (doc.joint_amount >= value) {
                        mdb.updateOne({partners: {$all: [interaction.user.id, other.id]}}, {$set: {joint_amount: doc.joint_amount - value}});
                        udb.updateOne({"balance": {$exists: true}}, {$set: {balance: udoc.balance + value}});

                        var toSend = {content: `You withdrew ${symb}${value} from the joint account, which has a remaining balance of ${symb}${doc.joint_amount - value}`};
                        if (udoc.private) {
                            toSend.ephemeral = true;
                        }
                        
                        iintrep(interaction, toSend);
                    } else {
                        intrep(interaction, "Insufficient funds!");
                    }
                });
            }
        });
    });
}


function account(bot, interaction, command) {
    if (command.options[0].name == "toggle") {
        const act = command.options[0].value;

        bot.mongoconnection.then((client) => {
            const db = client.db(interaction.guildId);
            const dbo = db.collection(interaction.user.id);
            const mdb = db.collection('marriage');
            
            dbo.findOne({"rank": {$exists: true}}).then((udoc) => {
                if (!udoc.social.marriage.married) {
                    return intrep(interaction, "You can only open a joint account if you're married!");
                }
    
                const other = interaction.guild.members.cache.get(udoc.social.marriage.partner);
    
                mdb.findOne({partners: { $all: [interaction.user.id, other.id]}}).then((mdoc) => {
                    if (act == "open") {
                        if (mdoc.joint_toggled) {
                            return intrep(interaction, "You already have a joint account!");
                        }
    
                        const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                            .setCustomId(`jacct|opn|${other.id}`)
                            .setLabel('Open Account')
                            .setStyle(ButtonStyle.Success)
                        );
    
                        const rep = {
                            content: `${other}, ${interaction.user} wants to ***open*** a joint account, click the button below to confirm!`,
                            components: [row]
                        }
                        intrep(interaction, rep);
                    } else {
                        if (!mdoc.joint_toggled) {
                            return intrep(interaction, "You don't have a joint account to close!");
                        }
    
                        const row = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                            .setCustomId(`jacct|cls|${other.id}`)
                            .setLabel('Close Account')
                            .setStyle(ButtonStyle.Success)
                        );
    
                        const rep = {
                            content: `${other}, ${interaction.user} wants to ***close*** a joint account, click the button below to confirm!`,
                            components: [row]
                        }
                        intrep(interaction, rep);
                    }
                });
            });
        });
    } else {
        moveFunds(bot, interaction, command);
    }
}


function handle(bot, interaction) {
    const opts = interaction.customId.split('|');
    if (opts[2] != interaction.user.id) {
        return interaction.channel.send({content: `You're not married to ${interaction.user}!`, ephemeral: true});
    }

    bot.mongoconnection.then((client) => {
        const db = client.db(interaction.guildId);
        const user_dbo = db.collection(interaction.user.id);

        user_dbo.findOne({"rank": {$exists: true}}).then((udoc) => {
            const other = interaction.guild.members.cache.get(udoc.social.marriage.partner);
            const other_dbo = client.db(interaction.guildId).collection(other.id);
            const mbo = db.collection('marriage');

            if (opts[1] == "opn") {
                mbo.updateOne({partners: { $all: [interaction.user.id, other.id]}}, {$set: {
                    joint_toggled: true, joint_amount: 0
                }});

                interaction.message.delete();
                interaction.channel.send(`${interaction.user} and ${other} have opened a joint back account!`);
            } else if (opts[1] == "cls") {
                mbo.findOne({partners: { $all: [interaction.user.id, other.id]}}).then((doc) => {
                    if (doc.joint_amount > 0) {
                        splitAcct(user_dbo, other_dbo, doc.joint_amount);
                    }
                    mbo.updateOne({partners: { $all: [interaction.user.id, other.id]}}, {$set: {
                        joint_amount: undefined, joint_toggled: false
                    }});

                    interaction.message.delete();
                    interaction.channel.send(`${interaction.user} and ${other} have closed their joint back account`);
                });
            }
        });
    });
}


module.exports = {
    name: 'marriage',
    description: 'Everything marriage!',
    /**
     * @param {Interaction} interaction 
     */
    execute(interaction, Discord, Client, bot) {
        const command = interaction.options.data[0];
        switch (command.name) {
            case "marry":
                marry(bot, interaction, command);
                break;

            case "divorce":
                divorce(bot, interaction, command);
                break;

            case "status":
                status(bot, interaction, command);
                break;

            case "joint_account":
                account(bot, interaction, command);
                break;
        
            default:
                break;
        }
    }, handle,
    options: [
        {name: 'marry', description: 'Marry a user', type: ApplicationCommandOptionType.Subcommand, options: [
            {name: 'partner', description: "The person to marry", type: ApplicationCommandOptionType.User, required: true}
        ]},
        {name: 'divorce', description: 'Divorce your current partner', type: ApplicationCommandOptionType.Subcommand, options: []},
        {name: 'status', description: 'Show a user\'s current relationship status', type: ApplicationCommandOptionType.Subcommand, options: [
            {name: 'partner', description: "The person who's status to check", type: ApplicationCommandOptionType.User, required: false}
        ]},
        {name: 'joint_account', description: 'open or close a joint account', type: ApplicationCommandOptionType.Subcommand, options: [
            {name: 'toggle', description: "what are you doing with the account?", type: ApplicationCommandOptionType.String, choices: [{name: 'open', value: 'open'}, {name: 'close', value: 'close'}], required: false},
            {name: 'deposit', description: "Deposit funds into the joint account", type: ApplicationCommandOptionType.Integer, required: false},
            {name: 'withdraw', description: "Withdraw funds from the joint account", type: ApplicationCommandOptionType.Integer, required: false}
        ]},
    ]
}