"use strict";
const stream = require('stream');
const Transform = stream.Transform;
const Symbol = require('es6-symbol');

const MODE_NONE = Symbol('none');
const MODE_DEFAULT = Symbol('default');
const MODE_MATCH = Symbol('match');

module.exports = class TokenizerAsync extends Transform {

    constructor(options, toTokenize) {

        if (!options) {
            options = {};
        }

        options.decodeStrings = false;
        options.objectMode = true;

        super(options);

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

    _transform(chunk, enc, callback) {

        for (let i = 0, len = chunk.length; i < len; i++) {

            let charIndex = 0;
            while(charIndex < chunk[i].length) {

                this.consume(`${chunk[i]}`.charAt(charIndex++));
            }
        }
        callback();
    }

    _flush(callback) {

        if (this.currentToken.length) {
            let pushes = this.checkTokenEnd();
            this.push(this.currentToken);
            this.currentToken = '';
            this.handleMultiplePushes(pushes);
        }
        callback();
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
