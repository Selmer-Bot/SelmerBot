const suits = ['clubs', 'diamonds', 'hearts', 'spades'];

//Note: Value does NOT INCLUDE THE SUIT
class Card {
    constructor(name, path) {
        this.name = name;
        this.path = path;
        var sName = name.split("_of_")[1].replace(".png", "");
        this.suit = suits.indexOf(sName);
        this.symbol = name.split('_')[0];

        if (Number.isInteger(Number(this.symbol))) {
            this.value = Number(this.symbol);
        } else {
            switch(this.symbol) {
                case "jack": this.value = 11; break;
                case "queen": this.value = 12; break;
                case "king": this.value = 13; break;
                case "ace":
                    this.value = 14;
                    this.isHigh = true;
                    break;

                default: console.log(`"${this.symbol}" what?`);
            }
        }
    }

    isHigh = false;
}

class Hand {
    /**
     * @param {String} userId 
     */
    constructor(userId = null) {
        this.user = userId;
    }

    cards = [];
    flushRoyal = false;
    flushStraight = false;
    four = [];
    full = false;
    flush = false;
    straight = false;
    three = [];
    pairs = [];
    high = null;
    pot = 0;
}

module.exports = { Card, Hand }