const { ApplicationCommandOptionType } = require('discord.js');
const { trivia_categories } = require('./json/trivia_categories.json');

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
            {name: 'opponent', description: 'Play a game against someone else', type: ApplicationCommandOptionType.User, required: false}
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
        name: 'roll',
        description: 'Roll a die',
        type: ApplicationCommandOptionType.Subcommand,
        options: [
            {name: 'amount', description: 'The number of times to roll the die', type: ApplicationCommandOptionType.Integer, required: true},
            {name: 'dice', description: 'The type of die to roll', type: ApplicationCommandOptionType.Integer, choices: [
                {name: 'd4', value: 4}, {name: 'd6', value: 6}, {name: 'd8', value: 8}, {name: 'd10', value: 10}, {name: 'd12', value: 12}, {name: 'd20', value: 20}
            ], required: true},
        ]
    },

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
        options: [
            {name: 'user', description: "The user who's game to check (defaults to you)", type: ApplicationCommandOptionType.User, required: false}
        ]
    },

    {
        name: "hpmp",
        description: "Check your current game status",
        type: ApplicationCommandOptionType.Subcommand,
        options: []
    },
]