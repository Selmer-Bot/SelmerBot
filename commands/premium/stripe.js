/*
-----WEBHOOKS ARE MONITORED AND PROCESSED HERE-----
https://selmer-bot-listener.ion606.repl.co
--------------------------------------------------
*/
//@ts-check

const { MongoClient, ServerApiVersion } = require('mongodb');
const { ActionRowBuilder, StringSelectMenuBuilder, ApplicationCommandOptionType } = require('discord.js');
const { addComplaintButton } = require('../dev only/submitcomplaint');


//Called from the dropdown menu
async function createSubscriptionManual(bot, interaction, id, priceID) {
    const stripe = bot.stripe;
    const mongouri = bot.mongouri;

    //Error Checking (unlikely, but just in case)
    if (!id) { console.log('....What? How?'); return interaction.editReply("Uh oh, something happened with the Stripe Discord ID check, please contact support!"); }

    // const client = new MongoClient(mongouri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
    new Promise(async function(resolve, reject) {
        bot.mongoconnection.then(async (client) => {
            // if (err) { return console.log(err); }

            const dbo = client.db('main').collection('authorized');
            await dbo.findOne({'discordID': id}).then(async (doc) => {
                var userID;

                if (doc != undefined) {
                    // client.close();
                    
                    reject(`An account with the tag <@${id}> already exists!`);
                } else {
                    const stripeUser = await stripe.customers.create({
                        metadata: { 'discordID': id }
                    });
                    userID = stripeUser.id;
                    
                    //Add to the database (I have to wait for the insertion)
                    await dbo.insertOne({stripeID: userID, discordID: id, paid: false, startDateUTC: null, tier: 0}).then(() => { /*client.close();*/ resolve(userID); });
                }
            });
        });

    }).then(async (userID) => {

        //Deal with the session
        const billingPortalSession = await stripe.billingPortal.sessions.create({
            customer: userID,
            return_url: "https://linktr.ee/selmerbot",
        });
        

        const session = await stripe.checkout.sessions.create(
        {
            payment_method_types: ["card"],
            line_items: [
                {
                    price: priceID,
                    quantity: 1,
                },
            ],
            customer: userID,
            mode: "subscription",
            success_url: billingPortalSession.url,
            cancel_url: "https://linktr.ee/selmerbot"
        });

        interaction.editReply({content: session.url, ephemeral: true});
    }).catch((err) => { 
        if (String(typeof(err)) == 'string') {
            interaction.editReply(err);
        } else {
            console.log(err);
            interaction.editReply("A Stripe error occured! Please click the ✅ to report this ASAP!");
            addComplaintButton(bot, interaction.message);
        }
     });
}


async function changeSubscriptionManual(bot, interaction) {
    const stripe = bot.stripe;
    const mongouri = bot.mongouri;
    const id = interaction.user.id;

    //Just in case
    if (!id) { return console.log('....What? How?'); }

    // const client = new MongoClient(mongouri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
    new Promise(async function(resolve, reject) {
        bot.mongoconnection.then(async (client) => {
            // if (err) { return console.log(err); }

            const dbo = client.db('main').collection('authorized');
            await dbo.findOne({'discordID': id}).then(async (doc) => {
                var userID;

                if (doc != undefined) {
                    userID = doc.stripeID;
                    resolve(userID);
                } else {
                    // reject(`No user with the ID of <@${interaction.user.id}>`);
                    reject(`You don't have Selmer Bot Premium, use \`/premium buy\` to get it!`);
                }
            });
        });

    }).then(async (userID) => {
        await stripe.billingPortal.sessions.create({
            customer: userID,
            return_url: "https://linktr.ee/selmerbot",
        }).then((session) => {
            interaction.reply({content: session.url, ephemeral: true}).catch(() => {
                interaction.channel.send({content: session.url, ephemeral: true});
            });
        })
    }).catch((err) => {
        if (String(typeof(err)) == 'string') {
            interaction.reply({content: err, ephemeral: true}).catch(() => {
                interaction.channel.send(err);
            });
        } else {
            console.log(err);
            interaction.channel.send("A Stripe error occured! Please click the ✅ to report this ASAP!");
            addComplaintButton(bot, interaction.message); //?????????
        }
    });
}


function createDropDown(bot, interaction) {  
  const stripe = bot.stripe;

  const pl = [];
  const vl = [];
  stripe.products.list({
    limit: 3,
  }).then((prod) => {
    prod.data.forEach((obj) => {
        const pricePromise = stripe.prices.retrieve(obj.default_price);
        var newObj = {label: obj.name, description: null, value: `${obj.default_price}`}
        pl.push(pricePromise);
        vl.push(newObj);
    });

    let n = Promise.all(pl);
    let i = 0;
    n.then((t) => {
        t.forEach(data => {
            let price = data.unit_amount/100;
            vl[i].description = `The $${price} tier`;
            i++;
        });


        const row = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId(`${interaction.user.id}|premium`)
                .setPlaceholder('Nothing selected')
                .addOptions(vl)
        );
    
        const rep = { content: `Please choose a tier`, components: [row], ephemeral: true };
        interaction.reply(rep).catch(() => {
            interaction.channel.send(rep);
        });
    });
  });
}


function handleInp(bot, interaction) {
    const inp = interaction.options.data[0];
    if (!inp || inp.value == 'help') {
      interaction.reply({content: 'Use `/premium buy` to get premium or use `/premium manage` to change or cancel your subscription\n\n_Disclaimer: Selmer Bot uses Stripe to manage payments. Read more at https://stripe.com/ _', ephemeral: true});
    } else if (inp.value == 'buy') {
      createDropDown(bot, interaction);
    } else if (inp.value == 'manage') {
      changeSubscriptionManual(bot, interaction);
    }
}


module.exports = {
    name: 'premium',
    description: 'everything payment',
    execute(interaction, Discord, Client, bot) {
        handleInp(bot, interaction);
    }, handleInp, createSubscriptionManual,
    options: [
        {name: 'option', description: 'What do you want to do?', type: ApplicationCommandOptionType.String, required: true, choices: [{name: 'help', value: 'help'}, {name: 'buy', value: 'buy'}, {name: 'manage', value: 'manage'}]}
    ],
    isDm: true
}