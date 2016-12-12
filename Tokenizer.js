"use strict";
const TokenizerAsync = require('./TokenizerAsync');

module.exports = class Tokenizer extends TokenizerAsync {
    
    constructor(toTokenize) {
        
        super({}, toTokenize);
        this.stack = [];
    }
    
    push(token) {
        this.stack.push(token);
    }
    
    tokenize(str) {
        
        let index = 0;
        while(index < str.length) {
         
            this.consume(str.charAt(index++));
        }
        
        return this.stack;
    }
};
