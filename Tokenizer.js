"use strict";

const MODE_NONE = 'modeNone';
const MODE_DEFAULT = 'modeDefault';
const MODE_MATCH = 'modeMatch';

const sortTokens = (a, b) => {
    
    if (a.length > b.length) {
        return -1;
    }
    if (a.length < b.length) {
        return 1;
    }
    return 0;
};

const defaultConfig = {
    shouldTokenize: ['(', ')', ',', '*', '/', '%', '+', '-', '=', '!=', '<', '>', '<=', '>=', '!'],
    shouldMatch: ['"', "'", '`'],
    shouldDelimitBy: [' ', "\n", "\r", "\t"]
};


class TokenizerInstance {

    /**
     * 
     * @param {Tokenizer} tokenizer
     * @param {string} str
     * @param {function} forEachToken
     */
    constructor(tokenizer, str, forEachToken) {

        this.tokenizer = tokenizer;
        this.str = str;
        this.forEachToken = forEachToken;

        this.previousChr = '';
        this.toMatch = '';
        this.currentToken = '';
        this.modeStack = [MODE_NONE];
    }

    /**
     * 
     * @returns {string}
     */
    getCurrentMode() {

        return this.modeStack[this.modeStack.length - 1];
    }

    /**
     * 
     * @param {string} mode
     * @returns {Number}
     */
    setCurrentMode(mode) {

        return this.modeStack.push(mode);
    }

    /**
     * 
     * @returns {string}
     */
    completeCurrentMode() {
        
        const currentMode = this.getCurrentMode();
        
        if (currentMode === MODE_DEFAULT) {
            this.pushDefaultModeTokenizables();
        }

        if ((currentMode === MODE_MATCH && this.currentToken === '') || this.currentToken !== '') {
            this.push(this.currentToken);
        }
        this.currentToken = '';

        return this.modeStack.pop();
    }

    /**
     * 
     * @param {*} token
     */
    push(token) {

        let surroundedBy = '';
        if (this.getCurrentMode() !== MODE_MATCH) {
            switch(token.toLowerCase()) {
                case 'null':
                    token = null;
                    break;
                case 'true':
                    token = true;
                    break;
                case 'false':
                    token = false;
                    break;
                default:
                    if (isFinite(token)) {
                        token = Number(token);
                    }
                    break;
            }
        } else {
            surroundedBy = this.toMatch;
        }

        if (this.forEachToken) {
            this.forEachToken(token, surroundedBy);
        }
    }
    
    tokenize() {

        let index = 0;
        while(index < this.str.length) {

            this.consume(this.str.charAt(index++));
        }

        while (this.getCurrentMode() !== MODE_NONE) {

            this.completeCurrentMode();
        }
    }

    /**
     * 
     * @param {string} chr
     */
    consume(chr) {

        this[this.getCurrentMode()](chr);
        this.previousChr = chr;
    }

    /**
     * 
     * @param {string} chr
     * @returns {*}
     */
    [MODE_NONE](chr) {

        if (!this.tokenizer.matchMap[chr]) {

            this.setCurrentMode(MODE_DEFAULT);
            return this.consume(chr);
        }

        this.setCurrentMode(MODE_MATCH);
        return this.toMatch = chr;
    }

    /**
     * 
     * @param {string} chr
     * @returns {string}
     */
    [MODE_DEFAULT](chr) {

        if (this.tokenizer.delimiterMap[chr]) {

            return this.completeCurrentMode();
        }

        this.currentToken+=chr;

        return this.currentToken;
    }
    
    pushDefaultModeTokenizables() {

        let tokenizeIndex = 0;
        let lowestIndexOfTokenize = Infinity;
        let toTokenize = null;

        while(this.currentToken && tokenizeIndex < this.tokenizer.tokenizeList.length) {

            const tokenize = this.tokenizer.tokenizeList[tokenizeIndex++];
            const indexOfTokenize = this.currentToken.indexOf(tokenize);

            if (indexOfTokenize !== -1 && indexOfTokenize < lowestIndexOfTokenize) {

                lowestIndexOfTokenize = indexOfTokenize;
                toTokenize = tokenize;
            }
        }

        if (!toTokenize) {
            return;
        }

        if (lowestIndexOfTokenize > 0) {
            this.push(this.currentToken.substring(0, lowestIndexOfTokenize));
        }

        if (lowestIndexOfTokenize !== -1) {

            this.push(toTokenize);
            this.currentToken = this.currentToken.substring(lowestIndexOfTokenize + toTokenize.length);
            return this.pushDefaultModeTokenizables();
        }
    }

    /**
     * 
     * @param {string} chr
     * @returns {string}
     */
    [MODE_MATCH](chr) {

        if (chr === this.toMatch) {

            if (this.previousChr !== "\\") {
                return this.completeCurrentMode();
            }
            this.currentToken = this.currentToken.substring(0, this.currentToken.length - 1);
        }

        return this.currentToken+=chr;
    }
}

class Tokenizer {

    /**
     * 
     * @param {{shouldTokenize: string[], shouldMatch: string[], shouldDelimitBy: string[]}} [config]
     */
    constructor(config) {

        if (!config) {
            config = {};
        }

        config = Object.assign({}, config, defaultConfig);
        this.tokenizeList = [];
        this.tokenizeMap = {};
        this.matchList = [];
        this.matchMap = {};
        this.delimiterList = [];
        this.delimiterMap = {};

        config.shouldTokenize.sort(sortTokens).forEach((token) => {

            this.tokenizeList.push(token);
            this.tokenizeMap[token] = token;
        });

        config.shouldMatch.forEach((match) => {

            this.matchList.push(match);
            this.matchMap[match] = match;
        });

        config.shouldDelimitBy.forEach((delimiter) => {

            this.delimiterList.push(delimiter);
            this.delimiterMap[delimiter] = delimiter;
        });
    }
    
    tokenize(str, forEachToken) {

        const tokenizerInstance = new TokenizerInstance(this, str, forEachToken);
        return tokenizerInstance.tokenize();
    }

    /**
     * 
     * @returns {{shouldTokenize: string[], shouldMatch: string[], shouldDelimitBy: string[]}}
     */
    static get defaultConfig() {

        return defaultConfig;
    }
}

/**
 * 
 * @type {Tokenizer}
 */
module.exports = Tokenizer;