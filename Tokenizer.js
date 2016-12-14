"use strict";

const MODE_NONE = 'modeNone';
const MODE_DEFAULT = 'modeDefault';
const MODE_MATCH = 'modeMatch';

module.exports = class Tokenizer {
    
    constructor(toTokenize) {

        this.toTokenize = toTokenize || ['(', ')'];

        this.matchers = {
            '"': '"',
            "'": "'",
            '`': '`'
        };

        this.delimiters = {
            ' ': ' ',
            "\n": "\n",
            "\r": "\r",
            "\t": "\t",
            ',': ','
        };

        this.previousChr = null;
        this.currentMatcher = null;
        this.currentToken = '';
        this.modeStack = [MODE_NONE];
        this.stack = [];
        this.iteratee = () => {};
    }

    get currentMode() {

        return this.modeStack[this.modeStack.length - 1];
    }

    set currentMode(mode) {

        this.modeStack.push(mode);
    }

    completeMode() {
        this.modeStack.pop();
    }
    
    push(token) {

        if (this.currentMode === MODE_DEFAULT) {
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
        }
        this.iteratee(token);
        this.stack.push(token);
    }
    
    tokenize(str, iteratee) {
        
        if (iteratee) {
            this.iteratee = iteratee;
        }
        
        let index = 0;
        while(index < str.length) {
         
            this.consume(str.charAt(index++));
        }
        
        return this.stack;
    }


    consume(chr) {

        this[this.currentMode](chr);
        this.previousChr = chr;
    }

    checkTokenEnd(pushes) {
        if (!pushes) {
            pushes = [];
        }

        const lastChr = this.currentToken.charAt(this.currentToken.length - 1);
        if (this.toTokenize.indexOf(lastChr) === -1) {
            return pushes;
        }

        pushes.push(lastChr);
        this.currentToken = this.currentToken.substring(0, this.currentToken.length - 1);
        return this.checkTokenEnd(pushes);
    }

    handleMultiplePushes(pushes) {

        for (let index = 0; index < pushes.length; index++) {
            this.push(pushes[index]);
        }
    }

    [MODE_NONE](chr) {

        if (this.toTokenize.indexOf(chr) !== -1) {
            return this.push(chr);
        }

        if (!this.matchers[chr]) {

            this.currentMode = MODE_DEFAULT;
            return this.consume(chr);
        }

        this.currentMode = MODE_MATCH;
        this.currentMatcher = chr;
    }

    [MODE_DEFAULT](chr) {

        if (this.toTokenize.indexOf(chr) !== -1) {

            if (this.currentToken.length) {

                this.push(this.currentToken);
                this.currentToken = '';
            }
            this.push(chr);
            return this.completeMode();
        }

        if (this.delimiters[chr]) {

            if (this.currentToken.length) {

                this.push(this.currentToken);
                this.currentToken = '';
            }
            return this.completeMode();
        }
        this.currentToken+=chr;
    }

    [MODE_MATCH](chr) {

        if (chr === this.currentMatcher) {

            if (this.previousChr === "\\") {

                this.currentToken = this.currentToken.substring(0, this.currentToken.length - 1);
            } else {
                this.push(this.currentToken);
                this.currentToken = '';
                this.completeMode();
                return;
            }
        }

        this.currentToken+=chr;
    }
};
