"use strict";
const Symbol = require('es6-symbol');
const Tokenizer = require('./Tokenizer');

/**
 *
 * @type {Symbol}
 */
const OPERATOR_UNARY_MINUS = Symbol('-');

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
const unaryMinusDefinition = {
    [OPERATOR_UNARY_MINUS]: OPERATOR_TYPE_UNARY
};

const defaultConfig = {
    operators: [ // TODO: add more operators
        {
            '!': OPERATOR_TYPE_UNARY
        },
        unaryMinusDefinition,
        {
            '^': OPERATOR_TYPE_BINARY
        },
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

class Operator {
    
    constructor(value, type, precedence) {
        this.value = value;
        this.type = type;
        this.precedence = precedence;
    }
    toJSON() {
        return this.value;
    }
    toString() {
        return `${this.value}`;
    }
}

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
            
            Object.keys(operators).concat(Object.getOwnPropertySymbols(operators)).forEach((operator) => {

                this.operators[operator] = new Operator(operator, operators[operator], precedence);
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
     * @param {string|Symbol} operator
     * @param {[]} operands
     * @returns {*}
     */
    defaultEvaluator(operator, operands) {
        
        if (operator === OPERATOR_UNARY_MINUS) {
            operator = '-';
        }
        /**
         * This is a trick to avoid the problem of inconsistent comma usage in SQL.
         */
        if (operator === ',') {
            return [].concat(operands[0], operands[1]);
        }

        return {
            [operator]: operands
        };
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
        let lastOperator = undefined;
        let tokenCount = 0;
        let lastTokenWasOperatorOrLeftParenthesis = false;
        
        if (!evaluator) {
            evaluator = this.defaultEvaluator;
        }

        /**
         * The following mess is an implementation of the Shunting-Yard Algorithm: http://wcipeg.com/wiki/Shunting_yard_algorithm
         * See also: https://en.wikipedia.org/wiki/Shunting-yard_algorithm
         */
        this.tokenizer.tokenize(`(${sql})`, (token, surroundedBy) => {

            tokenCount++;

            /**
             * Read a token.
             */

            if (typeof token === 'string' && !surroundedBy) {

                let normalizedToken = token.toUpperCase();

                /**
                 * If the token is an operator, o1, then:
                 */
                if (this.operators[normalizedToken]) {

                    /**
                     * Hard-coded rule for between to ignore the next AND.
                     */
                    if (lastOperator === 'BETWEEN' && normalizedToken === 'AND') {
                        lastOperator = 'AND';
                        return;
                    }

                    /**
                     * If the conditions are right for unary minus, convert it.
                     */
                    if (normalizedToken === '-' && (tokenCount === 1 || lastTokenWasOperatorOrLeftParenthesis)) {
                        normalizedToken = OPERATOR_UNARY_MINUS;
                    }

                    /**
                     * While there is an operator token o2 at the top of the operator stack,
                     * and o1's precedence is less than or equal to that of o2,
                     * pop o2 off the operator stack, onto the output queue:
                     */
                    while (operatorStack[operatorStack.length - 1] && operatorStack[operatorStack.length - 1] !== '(' && this.compareOperators(normalizedToken, operatorStack[operatorStack.length - 1])) {

                        const operator = this.operators[operatorStack.pop()];
                        const operands = [];
                        let numOperands = operator.type;
                        while (numOperands--) {
                            operands.unshift(outputStream.pop());
                        }
                        outputStream.push(evaluator(operator.value, operands));
                    }

                    /**
                     * At the end of iteration push o1 onto the operator stack.
                     */
                    operatorStack.push(normalizedToken);
                    lastOperator = normalizedToken;

                    lastTokenWasOperatorOrLeftParenthesis = true;

                    /**
                     * If the token is a left parenthesis (i.e. "("), then push it onto the stack:
                     */
                } else if (token === '(') {

                    operatorStack.push(token);
                    lastTokenWasOperatorOrLeftParenthesis = true;

                    /**
                     * If the token is a right parenthesis (i.e. ")"):
                     */
                } else if (token === ')') {

                    /**
                     * Until the token at the top of the stack is a left parenthesis,
                     * pop operators off the stack onto the output queue.
                     */
                    while(operatorStack.length && operatorStack[operatorStack.length - 1] !== '(') {
                        
                        const operator = this.operators[operatorStack.pop()];
                        const operands = [];
                        let numOperands = operator.type;
                        while (numOperands--) {
                            operands.unshift(outputStream.pop());
                        }
                        
                        outputStream.push(evaluator(operator.value, operands));
                    }
                    /**
                     * Pop the left parenthesis from the stack, but not onto the output queue.
                     */
                    operatorStack.pop();
                    lastTokenWasOperatorOrLeftParenthesis = false;

                    /**
                     * Push everything else to the output queue.
                     */
                } else {
                    outputStream.push(token);
                    lastTokenWasOperatorOrLeftParenthesis = false;
                }

                /**
                 * Push explicit strings to the output queue.
                 */
            } else {
                outputStream.push(token);
                lastTokenWasOperatorOrLeftParenthesis = false;
            }
        });


        /**
         * While there are still operator tokens in the stack:
         */
        while (operatorStack.length) {

            const operatorValue = operatorStack.pop();

            /**
             * If the operator token on the top of the stack is a parenthesis, then there are mismatched parentheses.
             */
            if (operatorValue === '(') {
                throw new SyntaxError('Unmatched parenthesis.');
            }
            const operator = this.operators[operatorValue];
            const operands = [];
            let numOperands = operator.type;
            while (numOperands--) {
                operands.unshift(outputStream.pop());
            }

            /**
             * Pop the operator onto the output queue.
             */
            outputStream.push(evaluator(operator.value, operands));
        }
        
        return outputStream[0];
    }

    /**
     *
     * @param {string} sql
     * @returns {[]}
     */
    toArray(sql) {

        let expression = [];
        const expressionParentheses = [];

        this.tokenizer.tokenize(`(${sql})`, (token, surroundedBy) => {

            switch (token) {
                case '(':
                    expressionParentheses.push(expression.length);
                    break;
                case ')':
                    const precedenceParenthesisIndex = expressionParentheses.pop();

                    let expressionTokens = expression.splice(precedenceParenthesisIndex, expression.length);

                    while(expressionTokens && expressionTokens.constructor === Array && expressionTokens.length === 1) {
                        expressionTokens = expressionTokens[0];
                    }
                    expression.push(expressionTokens);
                    break;
                case '':
                    break;
                case ',':
                    break;
                default:
                    let operator = null;
                    if (!surroundedBy) {
                        operator = this.getOperator(token);
                    }
                    expression.push(operator ? operator : token);
                    break;
            }
        });

        while(expression && expression.constructor === Array && expression.length === 1) {
            expression = expression[0];
        }
        
        return expression;
    }

    /**
     * 
     * @returns {{operators: [{}], tokenizer: {shouldTokenize: string[], shouldMatch: string[], shouldDelimitBy: string[]}}}
     */
    static get defaultConfig() {
        return defaultConfig;
    }
    
    static get Operator() {
        return Operator;
    }
    
    static get OPERATOR_UNARY_MINUS() {
        return OPERATOR_UNARY_MINUS;
    }
}

/**
 *
 * @type {SqlWhereParser}
 */
module.exports = SqlWhereParser;
