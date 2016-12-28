"use strict";
const Tokenizer = require('./Tokenizer');

const OPERATOR_UNARY_MINUS = Symbol('-');

const OPERATOR_TYPE_UNARY = 1;

const OPERATOR_TYPE_BINARY = 2;

const defaultConfig = {
    operators: [
        {
            '*': OPERATOR_TYPE_BINARY,
            '/': OPERATOR_TYPE_BINARY,
            '%': OPERATOR_TYPE_BINARY
        },
        {
            '+': OPERATOR_TYPE_BINARY,
            '-': OPERATOR_TYPE_BINARY
        },
        {
            '=': OPERATOR_TYPE_BINARY,
            '!=': OPERATOR_TYPE_BINARY,
            '<': OPERATOR_TYPE_BINARY,
            '>': OPERATOR_TYPE_BINARY,
            '<=': OPERATOR_TYPE_BINARY,
            '>=': OPERATOR_TYPE_BINARY
        },
        {
            ',': OPERATOR_TYPE_BINARY
        },
        {
            'NOT': OPERATOR_TYPE_UNARY
        },
        {
            'BETWEEN': OPERATOR_TYPE_BINARY,
            'IN': OPERATOR_TYPE_BINARY,
            'IS': OPERATOR_TYPE_BINARY,
            'LIKE': OPERATOR_TYPE_BINARY
        },
        {
            'AND': OPERATOR_TYPE_BINARY
        },
        {
            'OR': OPERATOR_TYPE_BINARY
        }
    ],
    tokenizer: {
        shouldTokenize: ['(', ')', ',', '*', '/', '%', '+', '-', '=', '!=', '<', '>', '<=', '>='],
        shouldMatch: ['"', "'", '`'],
        shouldDelimitBy: [' ', "\n", "\r", "\t"]
    }
};

class SqlWhereParser {

    constructor(config) {

        if (!config) {
            config = {};
        }

        config = Object.assign({}, config, defaultConfig);
        
        this.tokenizer = new Tokenizer(config.tokenizer);
        this.operators = {};
        
        config.operators.forEach((operators, precedence) => {
            
            Object.keys(operators).forEach((operator) => {
                
                this.operators[operator] = {
                    precedence: precedence,
                    type: operators[operator],
                    value: operator
                };
            });
        });
    }

    compareOperators(operator1, operator2) {

        return this.operators[operator2].precedence <= this.operators[operator1].precedence;
    }

    getOperator(token) {

        if (typeof token === 'string') {
            return this.operators[token.toUpperCase()];
        }
        return null;
    }

    defaultEvaluator(expression) {

        if (expression[',']) {
            const result = [];
            return result.concat(expression[','][0] || [], expression[','][1] || []);
        }
        return expression;
    }

    /**
     *
     * @param {string} sql
     * @param {function} evaluator
     * @returns {{}}
     */
    parse(sql, evaluator) {

        const operatorStack = [];
        const outputStream = [];
        
        if (!evaluator) {
            evaluator = this.defaultEvaluator;
        }

        this.tokenizer.tokenize(`(${sql})`, (token, surroundedBy) => {

            if (typeof token === 'string' && !surroundedBy) {

                const upperCase = token.toUpperCase();

                if (this.operators[upperCase]) { // is an operator

                    while (operatorStack[operatorStack.length - 1] && operatorStack[operatorStack.length - 1] !== '(' && this.compareOperators(upperCase, operatorStack[operatorStack.length - 1])) {

                        const operator = this.operators[operatorStack.pop()];
                        const operands = [];
                        let numOperands = operator.type;
                        while (numOperands--) {
                            operands.unshift(outputStream.pop());
                        }
                        outputStream.push(evaluator({
                            [operator.value]: operands
                        }));
                    }
                    operatorStack.push(upperCase);

                } else if (token === '(') {

                    operatorStack.push(token);

                } else if (token === ')') {

                    while(operatorStack[operatorStack.length - 1] !== '(') {
                        
                        const operator = this.operators[operatorStack.pop()];
                        const operands = [];
                        let numOperands = operator.type;
                        while (numOperands--) {
                            operands.unshift(outputStream.pop());
                        }
                        outputStream.push(evaluator({
                            [operator.value]: operands
                        }));
                    }
                    operatorStack.pop();
                } else {
                    outputStream.push(token);
                }
            } else {
                outputStream.push(token);
            }
        });

        while (operatorStack.length) {

            const operatorValue = operatorStack.pop();
            if (operatorValue === '(') {
                throw new SyntaxError('Unmatched parenthesis.');
            }
            const operator = this.operators[operatorValue];
            const operands = [];
            let numOperands = operator.type;
            while (numOperands--) {
                operands.unshift(outputStream.pop());
            }
            outputStream.push({
                [operator.value]: operands
            });
        }
        
        return outputStream.pop();
    }

    /**
     * 
     * @returns {{operators: *[], tokenizer: {shouldTokenize: string[], shouldMatch: string[], shouldDelimitBy: string[]}}}
     */
    static get defaultConfig() {
        return defaultConfig;
    }
    /**
     * Reduces a nested array recursively.
     *
     * @param {[]} arr
     * @returns {[]}
     */
    static reduceArray(arr) {
        
        while(arr && arr.constructor === Array && arr.length === 1) {
            arr = arr[0];
        }
        
        return arr;
    }
    
    static get Tokenizer() {
        return Tokenizer;
    }
}

module.exports = SqlWhereParser;

const sql = 'A = B and C IS NOT NULL';
const parser = new SqlWhereParser();
console.log(JSON.stringify(parser.parse(sql)));

