"use strict";

const Tokenizer = require('./Tokenizer');

/**
 *
 * @type {Symbol}
 */
const OPERATOR_UNARY_MINUS = Symbol('-'); // TODO: handle unary minus

/**
 *
 * @type {number}
 */
const OPERATOR_TYPE_UNARY = 1;

/**
 *
 * @type {number}
 */
const OPERATOR_TYPE_BINARY = 2;

/**
 *
 * @type {number}
 */
const OPERATOR_TYPE_TERNARY = 3;

/**
 *
 * @type {{operators: [{}], tokenizer: {shouldTokenize: string[], shouldMatch: string[], shouldDelimitBy: string[]}}}
 */
const defaultConfig = {
    operators: [ // TODO: add more operators
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
            'BETWEEN': OPERATOR_TYPE_TERNARY,
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

    /**
     *
     * @param {{operators: [{}], tokenizer: {shouldTokenize: string[], shouldMatch: string[], shouldDelimitBy: string[]}}} [config]
     */
    constructor(config) {

        if (!config) {
            config = {};
        }

        config = Object.assign({}, config, defaultConfig);

        /**
         *
         * @type {Tokenizer}
         */
        this.tokenizer = new Tokenizer(config.tokenizer);

        /**
         *
         * @type {{}}
         */
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

    /**
     *
     * @param {string} operator1
     * @param {string} operator2
     * @returns {boolean}
     */
    compareOperators(operator1, operator2) {

        return this.operators[operator2].precedence <= this.operators[operator1].precedence;
    }

    /**
     *
     * @param token
     * @returns {*}
     */
    getOperator(token) {

        if (typeof token === 'string') {
            return this.operators[token.toUpperCase()];
        }
        return null;
    }

    /**
     *
     * @param {{}} expression
     * @returns {*}
     */
    defaultEvaluator(expression) {

        if (expression[',']) {
            const result = [];
            return result.concat(expression[','][0], expression[','][1]);
        }
        return expression;
    }

    /**
     *
     * @param {string} sql
     * @param {function} [evaluator]
     * @returns {{}}
     */
    parse(sql, evaluator) {

        const operatorStack = [];
        const outputStream = [];
        let lastOperator = null;
        
        if (!evaluator) {
            evaluator = this.defaultEvaluator;
        }

        this.tokenizer.tokenize(`(${sql})`, (token, surroundedBy) => {

            if (typeof token === 'string' && !surroundedBy) {

                const upperCase = token.toUpperCase();

                if (this.operators[upperCase]) { // is an operator
                    
                    if (lastOperator === 'BETWEEN' && upperCase === 'AND') { // hard-coded rule for between
                        lastOperator = 'AND';
                        return;
                    }

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
                    lastOperator = upperCase;

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
     * @returns {{operators: [{}], tokenizer: {shouldTokenize: string[], shouldMatch: string[], shouldDelimitBy: string[]}}}
     */
    static defaultConfig() {
        return defaultConfig;
    }
}

module.exports = SqlWhereParser;

const start = Date.now();
const sql = 'A BETWEEN 1 AND 2 AND x = y';
const parser = new SqlWhereParser();
console.log(JSON.stringify(parser.parse(sql)));
console.log(Date.now() - start);
