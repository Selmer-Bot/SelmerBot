// const { update } = require('apt');
const { codeBlock, Interaction, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const { CLIENT_ODBC } = require('mysql/lib/protocol/constants/client');
const { time } = require('@discordjs/builders');
const { welcome } = require('../admin/welcome.js');
const { intrep } = require('../utils/discordUtils.js');

let currencySymbol = '$';

//Declair an "enum" to help with BASE calculations
const BASE = {
    PAY: 5,
    HP: 5,
    MP: 10,
    XP: 5
}

const STATE = {
    IDLE: 0,
    FIGHTING: 1,
    DEFENDING: 2,
    PRONE: 3,
    WAITING: 4 //For items ONLY
}
//Note that leveling up to the next level takes 10% more xp than the previous one


//#region functions

function isNum(arg) {
    return (!isNaN(arg) && Number.isSafeInteger(Number(arg)));
};


function CreateNewCollection(interaction, client, serverId, id, opponent = null, game = null) {
    const db = client.db(String(serverId));
    const dbo = db.collection(id);

    db.listCollections({name: id})
    .next(function(err, collinfo) {
        if (!collinfo) {
            var txtInserted = "You didn't have a place in my databases, so I created one for you!\nPlease try your command again!\n\n";
            txtInserted += "_PS - Your profile is currently set to `public`. This means that others can view your rank, xp and what game you're playing ***in this server***.";
            txtInserted += " To set your profile to private use `/card setPrivate`_";

            let hp_mp = {maxhp: BASE.HP, hp: BASE.HP, maxmp: BASE.MP, mp: BASE.MP}
            dbo.insertOne({
                balance: 10, rank: 1, lastdayworked: 0, xp: 0, private: false,
                hpmp: hp_mp, game: game, gamesettings: {battle: {class: 'none', ultimate: true}}, opponent: opponent, state: STATE.IDLE, equipped: { weapons: {main: null, secondary: null}, items: {}},
                social: {marriage: {married: false, partner: undefined, marriage_date: undefined, carryover: false}}
            });

            intrep(interaction, { content: txtInserted, ephemeral: true });
        }
    });
}



/**
 * @param {Interaction} interaction
 * @returns 
 */
function addxp(bot, interaction, dbo, amt, xp_list, noPing = false) {
    if (!isNum(amt)) { return console.log("This isn't a number...."); }

    dbo.find({"balance": {$exists: true}}).toArray(function(err, doc) {
        if (!String(doc)) { return console.log("ERROR!\nThis account does not exist!"); }

        temp = doc[0];
        let rank = temp.rank + 1; //The table starts at rank 0, the user starts at rank 1
        const txp =  amt; /*temp.xp + amt; // This part was used before the xp check was made in the 'work' function */

        //If the rank is less than 100, you can still advance
        if (rank < 101) {
            let needed = xp_list.get(rank);
            if (txp >= needed) {
                //Get to the max level possible with the current xp (may skip)
                while (txp >= needed) {
                    rank ++;
                    needed = xp_list.get(rank);
                }
                rank --; //Maybe?

                let newhp;
                if (newhp < 200) {
                    newhp = BASE.HP * rank;
                } else {
                    newhp = temp.hpmp.hp + 50;
                }

                let newmp = temp.mp + 5;
                
                dbo.updateOne({balance: temp.balance, rank: temp.rank, lastdayworked: temp.lastdayworked}, { $set: { rank: rank, hpmp: {maxhp: newhp, maxmp: newmp}, xp: txp }});

                var user;
                if (interaction.user) {
                    user = interaction.user;
                } else {
                    // This is a message
                    user = interaction.author;
                }

                if (bot) {
                    bot.mongoconnection.then((client) => {
                        const sbo = client.db(interaction.guildId).collection('SETUP');
                        sbo.findOne({_id: 'LEVELING'}).then((doc) => {
                            if (!doc || !doc.card) {
                                return interaction.channel.send('Congradulations <@' + user.id + '> for reaching rank ' + String(rank) + '!');
                            }
                            const member = interaction.guild.members.cache.get((interaction.user) ? interaction.user.id : interaction.member.id);

                            welcome(member, interaction.channel, doc.text, doc.card, doc.col, true, String(rank));
                        });
                    });
                } else {
                    interaction.channel.send('Congradulations <@' + user.id + '> for reaching rank ' + String(rank) + '!');
                }
            }
        } else {
            if (!noPing) {
                intrep(interaction, "You've already reached max level!");
            }
        }

        dbo.updateOne({balance: temp.balance}, { $set: { xp: txp}});
    });
}


async function getBalance(dbo, interaction) {
    const doc = await dbo.findOne({"balance": {$exists: true}});
    if (!doc) { return intrep(interaction, "Uh oh, you don't seem to be in my databases! Please try initializing first using `/inventory`"); }

    return intrep(interaction, {content: `<@${interaction.user.id}>, your current balance is ${currencySymbol}${doc.balance}`, ephemeral: true});
}


function rank(dbo, interaction, xp_list) {
    dbo.find({"balance": {$exists: true}}).toArray(function(err, doc) {
        if (!String(doc)) { return console.log("ERROR!\nThis account does not exist!"); }

        let next = doc[0].rank + 1;
        let needed = xp_list.get(next);
        
        const tempmsg = `<@${interaction.user.id}> you are currently at rank ${next-1} and have ${doc[0].xp}xp. You need ${needed - doc[0].xp} more xp to get to rank ${next}`;
        intrep(interaction, {content: tempmsg, ephemeral: true});
    });
}


//Changes one type of currency for another
function convertCurrency(id, amt, dbo) {
    
}


function checkAndUpdateBal(dbo, item, interaction, amt) {
    return new Promise(function(resolve, reject) {
        dbo.find({"balance": {$exists: true}}).toArray(b = function(err, doc) {
            if (!String(doc)) {
                intrep(interaction,"Your account doesn't exist, please contact the mods for support");
                return false;
            }

            const icost = amt * item.cost;
            if (doc[0].balance < icost) {
                intrep(interaction, {content: "Insufficient funds!", ephemeral: true});
                resolve(false);
            } else {
                let temp = doc[0];
                dbo.updateOne({balance: temp.balance, rank: temp.rank, lastdayworked: temp.lastdayworked}, { $set: { balance: doc[0].balance -= icost }});
                intrep(interaction, `You have bought ${item.name} for ${currencySymbol}${icost}!`);
                resolve(true);
            }
        });
    });
}


function buy(bot, interaction, dbo, shop, xp_list) {
    const args = interaction.options.data;

    //REAPPLY THIS TO OTHER FUNCTIONS
    let query = args.filter((arg) => { return (arg.name == 'item'); })[0].value;
    let amt = args.filter((arg) => { return (arg.name == 'amount'); })[0].value;
    let item = shop.filter(function (item) { return item.name.toLowerCase() == query.toLowerCase(); })[0];

    if (!String(item)) { return intrep(interaction, "This item does not exist!"); }

    checkAndUpdateBal(dbo, item, interaction, amt).then((success) => {
        //The message is handled in the CheckAndUpdateBal() function
        if (!success) { return }

        var newObj = { name: item.name, cost: item.cost, icon: item.icon, sect: item.sect};

        addxp(bot, interaction, dbo, Math.ceil(item.cost * 1.2), xp_list);
        
        dbo.find(newObj, {$exists: true}).toArray(function(err, doc) {
            if(String(doc)) {
                let newnum = doc[0].num + amt;
                dbo.updateOne({ name: item.name }, {$set: {num: newnum}});
            } else {
                item.num = amt;
                // dbo.insertOne({ name: item.name, cost: item.cost, icon: item.icon, sect: item.sect, num: Number(args[0])}); //Causes "cyclic dependancy"
                dbo.insertOne(item);
                dbo.updateOne(item, { $set: {num: amt }});
            }
        });
    })
};


//FIXME
function sell(bot, id, interaction, dbo, shop, xp_list) {
    const args = interaction.options.data;
    const query = args.filter((arg) => { return (arg.name == 'item'); })[0].value;
    var num = args.filter((arg) => { return (arg.name == 'amount'); })[0].value;

    let item = shop.filter(function (titem) { return titem.name.toLowerCase() == query.toLowerCase(); });
    if (!String(item)) {
        return intrep(interaction, "This item does not exist!");
    }

    item[0] = {name: item[0].name, cost: item[0].cost, icon: item[0].icon, sect: item[0].sect};

    let functional_item = item[0];

    dbo.find(functional_item, {$exists: true}).toArray(function(err, doc) {
        if(String(doc)) {

            //Make sure you don't sell more than you have
            if (num < doc[0].num) {
                let newNum = doc[0].num - num;
                dbo.updateOne({ name: item[0].name }, {$set: {num: newNum}});
            } else {
                num = doc[0].num;
                dbo.deleteOne({ name: item[0].name });
            }

            //Update the balance
            let amountSoldFor = functional_item.cost * num;

            dbo.find({"balance": {$exists: true}}).toArray(function(err, doc) { 
                let currentBal = doc[0].balance;
                dbo.updateOne({"balance": {$exists: true}}, { $set: { balance: currentBal + amountSoldFor }});
            });

            addxp(bot, interaction, dbo, Math.ceil(functional_item.cost * 1.2), xp_list);

            intrep(interaction, `You've sold ${num} ${String(functional_item.name)} for ${currencySymbol}${amountSoldFor}`);
        } else {
            intrep(interaction, `You've sold ${num} ${String(functional_item.name)} for ${currencySymbol}${amountSoldFor}`);
        }
    });
}


function work(bot, dbo, interaction, xp_list) {
    let fulldate = new Date();
    let date = fulldate.getDate();
    dbo.find({"lastdayworked": {$exists: true}}).toArray(function(err, doc) {
        if (!String(doc)) {
            return intrep(interaction, "Your account doesn't exist, please contact the mods for support");
        }
        if (doc[0].lastdayworked == date) {//date
            intrep(interaction, "You've already worked today, try again tomorrow!");
        } else {
            //Amount to be paid
            let amt = 0;
            amt = (BASE.PAY * doc[0].rank);
            let xp_earned = doc[0].xp + Math.ceil(amt*1.5);

            //Update the amount to the new TOTAL balance
            dbo.updateOne({"balance": {$exists: true}}, { $set: { balance: doc[0].balance + amt, lastdayworked: date }});

            addxp(bot, interaction, dbo, xp_earned, xp_list);
            intrep(interaction, `<@${interaction.user.id}> worked and earned ${currencySymbol}${amt} and ${xp_earned} xp!`);
        }
    });
}


function printInventory(dbo, interaction) {
    let tempstring = "";
    dbo.find().toArray(function(err, docs){
        docs.forEach(val => {
            if (!val.balance && val.name != undefined) {
                tempstring += String(val.num) + " " + val.name + " (" + val.icon + ")\n";
            }
        });

        if (tempstring == "") { tempstring += "You have nothing in your inventory!"; }
        intrep(interaction, tempstring);
    });
}


function getShop(interaction, items, bot, fromBtn = false) {
    var args;
    var type;
    let ind = 1;

    if (!fromBtn) {
        args = interaction.options.data;
        type = args.filter((arg) => { return (arg.name == 'type'); })[0].value.toLowerCase();  

        if (args.length > 1) {
            const amt = args.filter((arg) => { return (arg.name == 'page'); })[0].value;
            if (amt < (items.length / 9)) {
                ind = Number(amt);
            } else {
                return intrep(interaction, "That number is too large");
            }
        }
    } else {
        const opts = interaction.customId.split('|');
        type = opts[1];
        ind = Number(opts[2]);
        
    }

    const items2 = items.filter(function(f) { return (f.sect.toLowerCase() == type) }).slice((ind - 1)*10, (ind - 1)*10+10);
    const newText = codeBlock(items2.map(i => `${i.icon} (${i.name}): $${i.cost}`).join('\n')); //${currencySymbol} doesn't owrk for some reason

    const row = new ActionRowBuilder();
    //Make sure the index is never < 1
    const prevbtn = new ButtonBuilder()
        .setLabel('⬅️')
        .setStyle(ButtonStyle.Secondary);

    if (ind - 1 <= 0) {
        prevbtn.setCustomId(`shop|${type}|0`)
        prevbtn.setDisabled(true);
    } else {
        prevbtn.setCustomId(`shop|${type}|${ind - 1}`);
    }

    const nextbtn = new ButtonBuilder()
        .setLabel('➡️')
        .setStyle(ButtonStyle.Secondary);

    if (ind >= Math.floor(items.length/9) - 1) {
        nextbtn.setCustomId(`shop|${type}|${items.length}`);
        nextbtn.setDisabled(true);
    } else {
        nextbtn.setCustomId(`shop|${type}|${ind + 1}`);
    }

    row.addComponents(prevbtn, nextbtn);

    if (!fromBtn) {
        intrep(interaction, {content: newText, components: [row]});
    } else {
        intrep(interaction, {content: newText, components: [row]});
    }
}


function econHelp() {
    let l = ["buy", 'shop', 'work', 'rank', 'inventory', 'balance', 'sell'];
    
    return l.join(", ");
}
//#endregion

//Main Code
module.exports = {
    name: 'econ',
    description: 'ECON',
    async execute(bot, interaction, Discord, mongouri, items, xp_list) {
        //Set Discord vars
        const id = interaction.user.id;
        const server = interaction.guildId;
        const command = interaction.commandName;

        // const client = new MongoClient(mongouri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
        // if (client.writeConcern || client.writeConcern) { 
        //     client.close();
        //     return message.reply("Something went wrong with the database, please try again later and contact support if this problem persists!");
        //  }


        bot.mongoconnection.then(async (client) => {

            //Initialize if necessary
            CreateNewCollection(interaction, client, server, id);
            
            const db = client.db(String(server));
            const dbo = db.collection(id);

            currencySymbol = bot.currencysymbolmmain;

            //Command Area
            if(command == 'init') {
                //Add security check here
                // init.execute(bot, message, args, command, dbo, Discord, connect);
                return;
            } else if (command == 'buy') {
                buy(bot, interaction, dbo, items, xp_list);
            } else if (command == 'shop') {
                getShop(interaction, items, bot);
            } else if (command == 'work') {
                work(bot, dbo, interaction, xp_list);
            } else if (command == 'rank') {
                rank(dbo, interaction, xp_list);
            } else if (command == 'inventory') {
                printInventory(dbo, interaction);
            } else if (command == 'balance') {
                getBalance(dbo, interaction);
            } else if (command == 'sell') {
                sell(bot, id, interaction, dbo, items, xp_list);
            } else {
                intrep(interaction, `${command} is not a command`);
            }
                
        });
    },

    //Battle Updating stuff
    addxp, checkAndUpdateBal, CreateNewCollection, econHelp, getShop, getBalance, BASE, STATE,
    options: []
}