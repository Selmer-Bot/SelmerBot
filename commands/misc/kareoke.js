const { ApplicationCommandOptionType } = require('discord.js');
const { intrep } = require('../utils/discordUtils');


module.exports ={
    name: 'kareoke',
    description: 'Sing your least-favorite song with your favorite person, me!',
    execute(interaction, Discord, Client, bot) {
        const arg = interaction.options.data[0].value;
        if (arg == "help") { return intrep(interaction, {content: "Please pick out a song at https://www.karaoke-lyrics.net/\nThe command should look like\n/kareoke [link_here]"}); }
        // interaction.deferReply();

        const axios = require('axios');
        const cheerio = require('cheerio')
        const url = interaction.options.data[0].value;

        axios(url)
        .then(response => {
            const html = response.data;
            const $ = cheerio.load(html);
            const lyrics = $('.para_row').text();
            breakbar = "---------------------------------------------";

            //Because the max char limit is 2k, break the text into 2k chunks

            if (lyrics.length > 1900) {
                interaction.channel.send(breakbar);
                for (let i = 1; i < lyrics.length / 1900; i++) {
                    interaction.channel.send(lyrics.substring((i - 1) * 1900, i * 1900));
                }
                interaction.channel.send(breakbar);
            } else {
                interaction.channel.send(breakbar + "\n" + lyrics + "\n" + breakbar);
            }
        })
        .catch((err) => {
            console.log(err);
            intrep(interaction, "Please provide a valid url from https://www.karaoke-lyrics.net/");
        });
    },
    options: [{name: 'url', description: 'the url of the song or "help"', type: ApplicationCommandOptionType.String, required: true}]
}

//TEST: https://www.karaoketexty.cz/texty-pisni/zoegirl/plain-170199