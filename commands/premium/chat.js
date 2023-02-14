const { MongoClient, ServerApiVersion, ConnectionClosedEvent } = require('mongodb');
const { ApplicationCommandOptionType } = require('discord.js');
const { exit } = require('process');
const { checkResponses } = require('./wordlist.js');
const { encrypt, decrypt } = require('../utils/encryption.js');
const { intrep } = require('../utils/discordUtils.js');


//Error checking function (message deleted error fix, workaround already applied but...)
//message.channel.send("Oops, there's been an error, please contact support!");
async function messageExists(message) {
    return new Promise((resolve, reject) => {
        try {
            message.channel.messages.fetch(message.id)
            .then((fetchedMessage) => {
                resolve(true);
            })
            .catch((err) => {
                console.log(err);
                resolve(false);
            })
        } catch (err) { resolve(false); }

        resolve(true);
    });
}


async function getResponse(convo, bot) {
    try {
        const response = await bot.openai.createCompletion({
        model: "text-davinci-002",
        prompt: convo,
        temperature: 0.9,
        max_tokens: 150,
        top_p: 1,
        // frequency_penalty: 0,
        // presence_penalty: 0.6,
        frequency_penalty: 2,
        presence_penalty: 2,
        best_of: 10,
        
        stop: [" Human:", " AI:"],
      });

      return response;
    } catch (err) {
        console.error(err);
        return false;
    }
    
}

async function startConvo(bot, interaction) {
    const client = await bot.mongoconnection;
    const dbo = client.db("DM").collection(interaction.user.id);
    const doc = await dbo.findOne({'_id': {$exists: true}});
    if (doc != undefined) {
        return intrep(interaction, "You're already in a conversation");
    } else {
        encrypt('Human: Hello\nAI: Hello').then((startMsg) => {
            dbo.insertOne({convo: startMsg.encryptedData, iv: startMsg.iv});
            intrep(interaction, '-----Started Conversation-----\nuse _!endconvo_ to end the conversation!\n\n_Disclaimer: Your conversation data is stored for the duration of the conversation to help Selmer Bot better understand what you are saying *then deleted*_\n\n');
        }).catch((err) => {
            console.error(err);
            intrep("Uh oh! There's been an error! Please contact support \:[");
        });
    }
}

async function endConvo(bot, interaction) {
    const client = await bot.mongoconnection;
    const dbo = client.db("DM").collection(interaction.user.id);
    const doc = await dbo.findOne({'_id': {$exists: true}});
    if (!doc) {
        return intrep(interaction, 'You aren\'t currently in a conversation\nUse `/startconvo` to start one!');
    }
    dbo.drop();
    return intrep(interaction, '-----Ended Conversation-----\nSee you next time!');
}


async function convoManager(clientinp, bot, message) {

    //Just in case, make sure it can't be changed
    const client = clientinp;
    const dbo = client.db("DM").collection(message.author.id);

    const doc = await dbo.findOne({convo: {$exists: true}});
    if (!doc) { return message.reply('You aren\'t currently in a conversation\nUse `/startconvo` to start one!'); }

    //Checking Section
    const check = checkResponses(message.content, "I'm sorry, I can't do that");
    if (check != null) { return message.reply(check); }


    decrypt({iv: doc.iv, encryptedData: doc.convo}).then(async (convo) => {
        convo += `\nHuman: ${message.content}\n`;;

        //Get the response
        const r = await getResponse(convo, bot);

        if (!r) {
            return message.channel.send("Uh oh! There's been an error! Please contact support \:[");
        }

        let response = r.data.choices[0].text;

        convo += (response + '\n');

        encrypt(convo).then((writeData) => {
            dbo.updateOne(doc, {$set: {convo: writeData.encryptedData, iv: writeData.iv}});
            response = response.replaceAll('AI: ', '').replaceAll('AI:\n', '');

            //Very buggy so I'm adding this for now
            message.channel.send(response);

            //Note: Work with the following later
            /* messageExists(message).then((e) => {
                console.log(e);
                if (e) { return message.reply(response); }
                message.channel.send(response);
            }) */
        }).catch((err) => {
            console.error(err);
            message.channel.send("Uh oh! There's been an error! Please contact support \:[");
        });
    }).catch((err) => {
        console.error(err);
        message.channel.send("Uh oh! There's been an error! Please contact support \:[");
    });
}

//"Hello! discord_user:"
module.exports = {
    name: 'chat',
    description: 'chat',
    convoManager,
    async execute(interaction, Discord, Client, bot) {
        if (interaction.inGuild()) {
            return intrep(interaction, "Please DM Selmer bot to use this command!", true);
        }

        const client = await bot.mongoconnection;
        const dbo = client.db('main').collection('authorized');
        const doc = await dbo.findOne({ discordID: interaction.user.id });
        const member = bot.guilds.cache.get(bot.home_server).members.cache.get(interaction.user.id);

        //Only available to Selmer Bot devs, testers and "authorized" users
        const serverCheck =  member && (member.roles.cache.has('944048889038774302') || member.roles.cache.has('946610800418762792'));
        if (!doc && !serverCheck) {
            return message.reply("You have to be a premium subscriber to use this feature!");
        }


        switch(interaction.options.data[0].name) {
            case 'startconvo':
                startConvo(bot, interaction);
                break;
            
            case 'endconvo':
                endConvo(bot, interaction);
                break;
            
            default: return interaction.channel.send(`Unknown chat command "${interaction.options.data[0].name}"`);
        }
    },
    options: [
        {name: 'startconvo', description: 'Start a conversation with Selmer Bot!', type: ApplicationCommandOptionType.Subcommand, options: []},
        {name: 'endconvo', description: 'End your conversation with Selmer Bot!', type: ApplicationCommandOptionType.Subcommand, options: []}
    ],
    isDm: true
}