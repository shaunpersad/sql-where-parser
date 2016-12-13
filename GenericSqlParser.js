"use strict";
const Tokenizer = require('./Tokenizer');

const OPERATOR_TYPE_UNARY = (index) => {
    return index + 1;
};
const OPERATOR_TYPE_BINARY = (index) => {
    return [index - 1, index + 1];
};
const OPERATOR_TYPE_TERNARY_BETWEEN = (index) => {
    return [index - 1, index + 1, index + 3];
};
const OPERATOR_TYPE_BINARY_IN = (index) => {
    return [index - 1, new NoParseIndex(index + 1)];
};

const sortNumber = (a, b) => {
    return a - b;
};

class NoParseIndex extends Number {}

module.exports = class GenericSqlParser {

    constructor() {

        const UNARY = this.constructor.OPERATOR_TYPE_UNARY;
        const BINARY = this.constructor.OPERATOR_TYPE_BINARY;
        const BETWEEN = this.constructor.OPERATOR_TYPE_TERNARY_BETWEEN;
        const IN = this.constructor.OPERATOR_TYPE_BINARY_IN;

        /**
         * Defines operator precedence.
         *
         * To change this, simply subclass GenericSqlParser.
         *
         * @type {*[]}
         */
        this.operators = [
            {
                '*': BINARY,
                '/': BINARY,
                '%': BINARY
            },
            {
                '+': BINARY,
                '-': BINARY
            },
            {
                '=': BINARY,
                '!=': BINARY,
                '<': BINARY,
                '>': BINARY,
                '<=': BINARY,
                '>=': BINARY
            },
            {
                'NOT': UNARY
            },
            {
                'BETWEEN': BETWEEN,
                'IN': IN,
                'IS': BINARY,
                'LIKE': BINARY
            },
            {
                'AND': BINARY,
                'OR': BINARY
            }
        ];
    }

    /**
     * Accepts an SQL-like string, parses it, and returns the results.
     *
     * results object:
     * logicalArray - the array form of the SQL statement, with the precedence explicitly defined by adding appropriate parentheses.
     * displayArray - the reduced array form of the SQL statement, removing unnecessary parentheses. Useful for displaying in front-end.
     * syntaxTree - an object describing the SQL operations. Useful for converting to object-based query languages, like Mongo, or ES.
     *
     * @param {string} sql - An SQL-like string
     * @returns {{}} results
     */
    parse(sql) {
        
        const results = this.sqlToArrays(`(${sql})`);
        results.syntaxTree = this.logicalArrayToSyntaxTree(results.logicalArray);
        
        return results;
    }

    sqlToArrays(sql) {

        const stack = [];
        const literalStack = [];

        const parenthesesStack = [];
        const literalParenthesesStack = [];
        
        const tokenizer = new Tokenizer();
        const tokens = tokenizer.tokenize(sql);
        
        tokens.forEach((token) => {

            switch (token) {
                case '(':
                    parenthesesStack.push(stack.length);
                    literalParenthesesStack.push(literalStack.length);
                    break;
                case ')':
                    const parenthesisIndex = parenthesesStack.pop();
                    const literalParenthesisIndex = literalParenthesesStack.pop();

                    const tokens = stack.splice(parenthesisIndex, stack.length);
                    const literalTokens = literalStack.splice(literalParenthesisIndex, literalStack.length);

                    stack.push(this.setPrecedence(tokens));
                    literalStack.push(this.constructor.reduceArray(literalTokens));
                    break;
                case '':
                    break;
                default:
                    stack.push(token);
                    literalStack.push(token);
                    break;
            }
        });
        
        return {
            logicalArray: this.constructor.reduceArray(stack),
            displayArray: this.constructor.reduceArray(literalStack)
        };
    }
    
    /**
     * Converts the logicalArray version of an SQL-like statement into an Abstract Syntax Tree.
     *
     * https://en.wikipedia.org/wiki/Abstract_syntax_tree
     *
     * @param {[]|*} logicalArray
     * @returns {{}}
     */
    logicalArrayToSyntaxTree(logicalArray) {

        if (logicalArray.constructor !== Array) {
            return logicalArray;
        }

        const operation = {};

        this.operators.forEach((operators) => {

            let index = 0;

            while(index < logicalArray.length) {

                let token = logicalArray[index];

                if (typeof token === 'string' || token instanceof String) {

                    const potentialOperator = token.toUpperCase();
                    const operands = operators[potentialOperator];

                    if (operands) {

                        const operandIndexes = operands(index);

                        switch (operandIndexes.constructor) {

                            case Array:
                                operation[potentialOperator] = operandIndexes.map((operandIndex) => {

                                    if (operandIndex.constructor === this.constructor.NoParseIndex) {
                                        return logicalArray[operandIndex];
                                    }
                                    return this.logicalArrayToSyntaxTree(logicalArray[operandIndex]);
                                });
                                break;

                            case this.constructor.NoParseIndex:
                                operation[potentialOperator] = logicalArray[operandIndexes];
                                break;
                            
                            default:
                                operation[potentialOperator] = this.logicalArrayToSyntaxTree(logicalArray[operandIndexes]);
                                break;
                        }
                    }
                }
                index++;
            }
        });

        return operation;
    }

    /**
     * Explicitly sets the precedence of the operators.
     *
     * This is a necessary step to build the Abstract Syntax Tree.
     *
     * @param tokens
     * @returns {*}
     */
    setPrecedence(tokens) {

        const newTokens = [].concat(tokens);
        
        this.operators.forEach((operators) => {

            let index = 0;
            
            while(index < newTokens.length) {
                
                let token = newTokens[index];

                if (typeof token === 'string' || token instanceof String) {

                    const operands = operators[token.toUpperCase()];

                    if (operands) {

                        let operandIndexes = operands(index);
                        if (operandIndexes.constructor !== Array) {
                            operandIndexes = [operandIndexes];
                        }
                        const indexesToRemove = [index].concat(operandIndexes).sort(sortNumber);
                        const newToken = indexesToRemove.map((index) => {

                            return newTokens[index];
                        });
                        
                        index = indexesToRemove.shift();

                        indexesToRemove.reverse().forEach((indexToRemove) => {

                            newTokens.splice(indexToRemove, 1);
                        });
                        newTokens[index] = newToken;
                    }
                }
                index++;
            }
        });
        
        return this.constructor.reduceArray(newTokens);
    }

    operatorType(operator) {
        
        if (!(typeof operator === 'string' || operator instanceof String)) {
            return false;
        }

        let precedenceIndex = 0;
        let found = false;

        operator = operator.toUpperCase();

        while(!found && precedenceIndex < this.operators.length) {

            const operators = Object.keys(this.operators[precedenceIndex]);
            let operatorIndex = 0;

            while (!found && operatorIndex < operators.length) {

                if (operators[operatorIndex] === operator) {
                    found = this.operators[precedenceIndex][operator];
                    break;
                }
                operatorIndex++;
            }
            precedenceIndex++;
        }

        return found ? found : false;
    }

    /**
     * Reduces a nested array recursively.
     *
     * @param {[]} arr
     * @returns {[]}
     */
    static reduceArray(arr) {

        let newArr = [].concat(arr);
        
        while(newArr.constructor === Array && newArr.length === 1) {
            newArr = newArr[0];
        }
        
        return newArr;
    }
    
    /**
     * Defines an operator of unary type.
     *
     * It is a function that returns the indexes of the operator's single operand.
     *
     * @returns {function()}
     * @constructor
     */
    static get OPERATOR_TYPE_UNARY() {
        return OPERATOR_TYPE_UNARY;
    }

    /**
     * Defines an operator of binary type.
     *
     * It is a function that returns the indexes of the operator's two operands.
     *
     * @returns {function()}
     * @constructor
     */
    static get OPERATOR_TYPE_BINARY() {
        return OPERATOR_TYPE_BINARY;
    }

    /**
     * Defines an operator of between type.
     *
     * The BETWEEN operator is unique in where its operands are, so it requires defining a new type,
     * which is a function that returns the indexes of the operator's three operands.
     *
     * @returns {function()}
     * @constructor
     */
    static get OPERATOR_TYPE_TERNARY_BETWEEN() {
        return OPERATOR_TYPE_TERNARY_BETWEEN;
    }

    /**
     * Defines an operator of between type.
     *
     * The IN operator is unique in that the second argument must be an array.
     * This means that the token in second index should not be parsed in any way. Using the NoParseIndex class, this is possible.
     * @returns {function()}
     * @constructor
     */
    static get OPERATOR_TYPE_BINARY_IN() {
        return OPERATOR_TYPE_BINARY_IN;
    }

    /**
     * A replacement for a Number, to indicate that that index should not be parsed.
     *
     * It is used
     *
     * @returns {NoParseIndex}
     * @constructor
     */
    static get NoParseIndex() {
        return NoParseIndex;
    }

};