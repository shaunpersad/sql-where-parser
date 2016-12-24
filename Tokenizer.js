"use strict";

const MODE_NONE = 'modeNone';
const MODE_DEFAULT = 'modeDefault';
const MODE_MATCH = 'modeMatch';

const defaultConfig = {
    shouldTokenize: ['(', ')', ',', '*', '/', '%', '+', '-', '=', '!=', '<', '>', '<=', '>='],
    shouldMatch: ['"', "'", '`'],
    shouldDelimitBy: [' ', "\n", "\r", "\t"],
    forEachToken: () => {}
};

class Literal {

    constructor(value) {
        this.value = value;
    }
    valueOf() {
        return this.value;
    }
    toJSON() {
        return this.value;
    }
    toString() {
        return `${this.value}`;
    }
}

module.exports = class Tokenizer {
    
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

        config.shouldTokenize.forEach((token) => {

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

        //console.log(this);
        this.setStack();
    }

    get currentMode() {

        return this.modeStack[this.modeStack.length - 1];
    }

    set currentMode(mode) {

        this.modeStack.push(mode);
    }

    setStack() {

        this.previousChr = null;
        this.toMatch = null;
        this.currentToken = '';
        this.modeStack = [MODE_NONE];
        this.stack = [];
    }

    completeCurrentMode() {

        if ((this.currentMode === MODE_MATCH && this.currentToken === '') || this.currentToken !== '') {
            this.push(this.currentToken);
        }
        this.currentToken = '';

        this.modeStack.pop();
    }
    
    push(token) {

        if (this.currentMode !== MODE_MATCH) {
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
            token = new Literal(token);
        }

        if (this.forEachToken) {
            this.forEachToken(token);
        }

        this.stack.push(token);
    }
    
    tokenize(str, forEachToken) {

        this.setStack();

        if (forEachToken) {
            this.forEachToken = forEachToken;
        }
        
        let index = 0;
        while(index < str.length) {
         
            this.consume(str.charAt(index++));
        }
        
        while (this.currentMode !== MODE_NONE) {

            this.completeCurrentMode();
        }
        
        return this.stack;
    }
    
    consume(chr) {

        this[this.currentMode](chr);
        this.previousChr = chr;
    }
    
    [MODE_NONE](chr) {

        if (!this.matchMap[chr]) {

            this.currentMode = MODE_DEFAULT;
            return this.consume(chr);
        }

        this.currentMode = MODE_MATCH;
        this.toMatch = chr;
    }

    [MODE_DEFAULT](chr) {

        if (this.delimiterMap[chr]) {

            return this.completeCurrentMode();
        }

        this.currentToken+=chr;

        let tokenizeIndex = 0;
        while(tokenizeIndex < this.tokenizeList.length) {
            const tokenize = this.tokenizeList[tokenizeIndex++];
            const suffixIndex = this.currentToken.indexOf(tokenize);
            if (suffixIndex !== -1) {
                this.currentToken = this.currentToken.substring(0, suffixIndex);
                this.completeCurrentMode();
                return this.push(tokenize);
            }
        }
    }

    [MODE_MATCH](chr) {

        if (chr === this.toMatch) {

            if (this.previousChr !== "\\") {
                return this.completeCurrentMode();
            }
            this.currentToken = this.currentToken.substring(0, this.currentToken.length - 1);
        }

        this.currentToken+=chr;
    }
    
    static get Literal() {
        return Literal;
    }
    
    static get defaultConfig() {
        return defaultConfig;
    }
};