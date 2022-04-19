const Sequelize = require('sequelize');

/*
 * Make sure you are on at least version 5 of Sequelize! Version 4 as used in this guide will pose a security threat.
 * You can read more about this issue on the [Sequelize issue tracker](https://github.com/sequelize/sequelize/issues/7310).
 */

const sequelize = new Sequelize('database', 'username', 'password', {
	host: 'localhost',
	dialect: 'sqlite',
	logging: false,
	storage: 'database.sqlite',
	idle: 200000,
	aquire: 1000000,
});

const CurrencyShop = require('./models/CurrencyShop.js')(sequelize, Sequelize.DataTypes);
require('./models/Users.js')(sequelize, Sequelize.DataTypes);
require('./models/UserItems.js')(sequelize, Sequelize.DataTypes);

const force = process.argv.includes('--force') || process.argv.includes('-f');

sequelize.sync({ force }).then(async () => {
	const shop = [
		CurrencyShop.upsert({ name: 'Grapes', cost: 2, icon: '🍇', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Melon', cost: 5, icon: '🍈', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Watermelon', cost: 5, icon: '🍉', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Tangerine', cost: 3, icon: '🍊', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Lemon', cost: 3, icon: '🍋', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Banana', cost: 4, icon: '🍌', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Pineapple', cost: 4, icon: '🍍', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Mango', cost: 3, icon: '🥭', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Red Apple', cost: 3, icon: '🍎', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Green Apple', cost: 3, icon: '🍏', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Pear', cost: 3, icon: '🍐', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Peach', cost: 3, icon: '🍑', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Cherries', cost: 4, icon: '🍒', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Strawberry', cost: 3, icon: '🍓', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Blueberries', cost: 3, icon: '🫐', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Kiwi', cost: 3, icon: '🥝', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Tomato', cost: 4, icon: '🍅', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Olive', cost: 4, icon: '🫒', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Coconut', cost: 3, icon: '🥥', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Avocado', cost: 3, icon: '🥑', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Eggplant', cost: 10, icon: '🍆', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Potato', cost: 3, icon: '🥔', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Carrot', cost: 3, icon: '🥕', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Ear of Corn', cost: 3, icon: '🌽', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Hot Pepper', cost: 3, icon: '🌶️', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Bell Pepper', cost: 3, icon: '🫑', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Cucumber', cost: 3, icon: '🥒', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Leafy Green', cost: 3, icon: '🥬', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Broccoli', cost: 2, icon: '🥦', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Garlic', cost: 3, icon: '🧄', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Onion', cost: 3, icon: '🧅', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Mushroom', cost: 3, icon: '🍄', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Peanuts', cost: 4, icon: '🥜', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Chestnut', cost: 3, icon: '🌰', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Bread', cost: 5, icon: '🍞', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Croissant', cost: 7, icon: '🥐', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Baguette Bread', cost: 10, icon: '🥖', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Flatbread', cost: 9, icon: '🫓', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Pretzel', cost: 5, icon: '🥨', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Bagel', cost: 4, icon: '🥯', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Pancakes', cost: 5, icon: '🥞', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Waffle', cost: 5, icon: '🧇', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Cheese Wedge', cost: 3, icon: '🧀', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Meat on the Bone', cost: 5, icon: '🍖', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Checken Leg', cost: 5, icon: '🍗', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Cut of Meat', cost: 4, icon: '🥩', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Bacon', cost: 4, icon: '🥓', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Hamburger', cost: 5, icon: '🍔', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'French Fries', cost: 3, icon: '🍟', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Pizza', cost: 6, icon: '🍕', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Hot Dog', cost: 3, icon: '🌭', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Sandwich', cost: 3, icon: '🥪', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Taco', cost: 3, icon: '🌮', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Burrito', cost: 5, icon: '🌯', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Tamale', cost: 5, icon: '🫔', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Stuffed Flatbread', cost: 5, icon: '🥙', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Falafel', cost: 4, icon: '🧆', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Egg', cost: 3, icon: '🥚', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Hot Pot', cost: 12, icon: '🍲', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Fondue', cost: 8, icon: '🫕', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Green Salad', cost: 3, icon: '🥗', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Popcorn', cost: 3, icon: '🍿', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Butter', cost: 2, icon: '🧈', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Salt', cost: 2, icon: '🧂', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Canned Food', cost: 3, icon: '🥫', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Bento Box', cost: 7, icon: '🍱', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Rice Cracker', cost: 1, icon: '🍘', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Rice Ball', cost: 3, icon: '🍙', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Cooked Rice', cost: 3, icon: '🍚', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Curry Rice', cost: 4, icon: '🍛', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Ramen', cost: 4, icon: '🍜', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Spaghetti', cost: 5, icon: '🍝', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Roasted Sweet Potato', cost: 3, icon: '🍠', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Oden', cost: 3, icon: '🍢', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Sushi', cost: 4, icon: '🍣', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Fried Shrimp', cost: 3, icon: '🍤', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Fish Cake', cost: 3, icon: '🍥', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Moon Cake', cost: 3, icon: '🥮', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Dango', cost: 3, icon: '🍡', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Dumpling', cost: 3, icon: '🥟', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Fortune Cookie', cost: 3, icon: '🥠', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Oyster', cost: 4, icon: '🦪', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Ice Cream Cone', cost: 3, icon: '🍦', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Shaved Ice', cost: 3, icon: '🍧', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Ice Cream', cost: 3, icon: '🍨', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Doughnut', cost: 3, icon: '🍩', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Cookie', cost: 3, icon: '🍪', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Birthday Cake', cost: 7, icon: '🎂', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Shortcake', cost: 4, icon: '🍰', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Cupcake', cost: 3, icon: '🧁', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Pie', cost: 4, icon: '🥧', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Chocolate Bar', cost: 2, icon: '🍫', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Candy', cost: 1, icon: '🍬', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Lollipop', cost: 1, icon: '🍭', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Custard', cost: 3, icon: '🍮', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Honey Pot', cost: 3, icon: '🍯', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Baby Bottle', cost: 3, icon: '🍼', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Glass of Milk', cost: 3, icon: '🥛', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Coffee', cost: 3, icon: '☕', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Teapot', cost: 3, icon: '🫖', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Tea', cost: 3, icon: '🍵', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Sake', cost: 3, icon: '🍶', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Champagne', cost: 3, icon: '🍾', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Wine Glass', cost: 3, icon: '🍷', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Cocktail Glass', cost: 3, icon: '🍸', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Tropical Drink', cost: 3, icon: '🍹', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Beer Mug', cost: 3, icon: '🍺', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Tumbler', cost: 3, icon: '🥃', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Soda', cost: 3, icon: '🥤', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Bubble Tea', cost: 3, icon: '🧋', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Beverage Box', cost: 30, icon: '🧃', sect: 'Food' }),
		CurrencyShop.upsert({ name: 'Mate', cost: 3, icon: '🧉', sect: 'Food' }),
	];

	await Promise.all(shop);
	console.log('Database synced');

	sequelize.close();
}).catch(console.error);
