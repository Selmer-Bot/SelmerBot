// This is still being developed

const { verPremium } = require('../premium/verifyPremium.js');
const { ICalParser, VCalendar, VEvent, VTodo, VAlarm } = require('cozy-ical');
const { ApplicationCommandOptionType } = require('discord.js');
const { getEvents } = require('./reminders.js');

async function formatEvents(interaction, docs) {

    var cal = new VCalendar({
        organization: 'Selmer Bot',
        title: `${interaction.user.username}$${interaction.user.discriminator}'s Selmer Bot Calendar`
    });

    const d = new Date();
    const vevent = new VEvent({
        stampDate: d,
        startDate: d,
        endDate: d,
        description: "desc",
        location: "loc",
        uid: null
        // uid: "3615" //IS THIS NECESSARY??????
    });

    //Implement alarms later
    vevent.addAlarm({
        action: VAlarm.DISPLAY_ACTION,
        trigger: "-P3D",
        description: 'alarm for todo',
        summary: 'john',
        attendees: []
    });

    cal.add(vevent);

    cal.toString();
}


function getAndFormatEvents(bot, interaction, isGuild, id) {
    getEvents(bot, interaction, id, 0, isGuild, false, true).then((data) => {
        console.log(data);
    }).catch((err) => {
        //This is a custom message
        if (err[0]) {
            interaction.reply(err);
        } else {
            console.log(err);
            interaction.reply("Uh oh, there's been an error!");
        }
    });
}


module.exports = {
    name: 'export_events',
    description: 'Save your reminders in an ics file',
    async execute(interaction, Discord, Client, bot) {
        const isGuild = interaction.options.data[0].value;

        const id = (isGuild) ? interaction.guildId : interaction.user.id;

         //Check if the user has premium
         await verPremium(bot, interaction.user.id).then(() => {
            getAndFormatEvents(bot, interaction, isGuild, id);
         }).catch(() => {
            interaction.reply("You have to be a premium subscriber to use this feature!");
        });
    },
    options: [
        {name: 'is_guild', description: 'Is this export for your reminders or guild reminders?', type: ApplicationCommandOptionType.Boolean, required: true},
    ]
}