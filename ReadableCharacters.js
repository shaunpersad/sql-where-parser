"use strict";
const stream = require('stream');
const Readable = stream.Readable;

module.exports = class ReadableCharacters extends Readable {

    constructor(str, options) {
        if (!options) {
            options = {};
        }
        options.decodeStrings = false;
        options.objectMode = true;
        super(options);

        this.str = str;
        this.currentIndex = 0;
    }

    _read() {

        if (this.currentIndex >= this.str.length) {
            return this.push(null);
        }
        
        return this.push(this.str.charAt(this.currentIndex++));
    }
};