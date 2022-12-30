const { ApplicationCommandOptionType } = require('discord.js');
const { trivia_categories } = require('./trivia_categories.json');

module.exports = [
    {
        name: "trivia",
        description: 'Start a game of Trivia',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
        {name: 'difficulty', description: 'The question difficulty OR "help"', type: ApplicationCommandOptionType.String, required: true, choices: [{name: 'easy', value: 'easy'}, {name: 'medium', value: 'medium'}, {name: 'hard', value: 'hard'}]},
        {name: 'category', description: 'The trivia Category', type: ApplicationCommandOptionType.Integer, required: false, choices: trivia_categories},
        {name: 'time', description: 'Set the round length (in seconds)', type: ApplicationCommandOptionType.Integer, required: false},
    ]},

    {
        name: "battle",
        description: 'Start a game of Batte',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
        {name: 'opponent', description: 'Who do you want to battle against?', type: ApplicationCommandOptionType.User, required: true},
    ]},

    {
        name: "minesweeper",
        description: "Start a game of Minesweeper",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
            {name: 'difficulty', description: 'Set the diffficulty', type: ApplicationCommandOptionType.String, required: true, choices: [{name: 'easy', value: 'easy'}, {name: 'medium', value: 'medium'}, {name: 'hard', value: 'hard'}]},
            // {name: 'opponent', description: 'Play a game against someone else', type: ApplicationCommandOptionType.User, required: false}
        ]
    },

    {
        name: "tictactoe",
        description: 'Start a game of TicTacToe',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
        {name: 'opponent', description: 'Who do you want to play against?', type: ApplicationCommandOptionType.User, required: true},
    ]},

    {
        name: "quit",
        description: "Quit your current game",
        type: ApplicationCommandOptionType.Subcommand,
        options: []
    },

    {
        name: "status",
        description: "Check your current game status",
        type: ApplicationCommandOptionType.Subcommand,
        options: []
    },

    {
        name: "hpmp",
        description: "Check your current game status",
        type: ApplicationCommandOptionType.Subcommand,
        options: []
    },
]