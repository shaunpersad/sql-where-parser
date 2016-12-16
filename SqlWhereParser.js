"use strict";
const Tokenizer = require('./Tokenizer');

const OPERATOR_TYPE_UNARY = (indexOfOperatorInExpression, tokens) => {
    const operator = tokens[indexOfOperatorInExpression];
    const operand = tokens[indexOfOperatorInExpression + 1];
    if (operand !== undefined) {
        return [indexOfOperatorInExpression + 1];
    }
    throw new SyntaxError(`${operator.toUpperCase()}" requires an operand.`);
};

const OPERATOR_TYPE_BINARY = (indexOfOperatorInExpression, tokens) => {

    const operator = tokens[indexOfOperatorInExpression];
    const operand1 = tokens[indexOfOperatorInExpression - 1];
    const operand2 = tokens[indexOfOperatorInExpression + 1];
    
    if (operand1 !== undefined && operand2 !== undefined) {
        return [indexOfOperatorInExpression - 1, indexOfOperatorInExpression + 1];
    }

    throw new SyntaxError(`${operator.toUpperCase()} requires two operands.`);
};

const OPERATOR_TYPE_TERNARY_BETWEEN = (indexOfOperatorInExpression, tokens) => {

    const AND = tokens[indexOfOperatorInExpression + 2];
    const min = tokens[indexOfOperatorInExpression + 1];
    const max =  tokens[indexOfOperatorInExpression + 3];

    if ((typeof AND === 'string' || AND instanceof String) && AND.toUpperCase() === 'AND' && min !== undefined && max !== undefined) {
        return [indexOfOperatorInExpression - 1, indexOfOperatorInExpression + 1, indexOfOperatorInExpression + 3];
    }
    throw new SyntaxError('"BETWEEN" syntax is "BETWEEN {min} AND {max}"')
};

const OPERATOR_TYPE_BINARY_IN = (indexOfOperatorInExpression, tokens) => {

    const operand1 = tokens[indexOfOperatorInExpression - 1];
    const operand2 = tokens[indexOfOperatorInExpression + 1];

    if (operand1 !== undefined && operand2 !== undefined && operand2.constructor === Array) {
        return [indexOfOperatorInExpression - 1, new LiteralIndex(indexOfOperatorInExpression + 1)];
    }

    throw new SyntaxError('"IN" syntax is "IN({array})"')
};

const sortNumber = (a, b) => {
    return a - b;
};

class LiteralIndex extends Number {}

module.exports = class SqlWhereParser {

    constructor() {

        const UNARY = this.constructor.OPERATOR_TYPE_UNARY;
        const BINARY = this.constructor.OPERATOR_TYPE_BINARY;
        const BETWEEN = this.constructor.OPERATOR_TYPE_TERNARY_BETWEEN;
        const IN = this.constructor.OPERATOR_TYPE_BINARY_IN;

        /**
         * Defines operator precedence.
         *
         * To change this, simply subclass SqlWhereParser.
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
                'AND': BINARY
            },
            {
                'OR': BINARY
            }
        ];

        this.operatorsFlattened = {};

        let precedenceIndex = 0;

        while (precedenceIndex < this.operators.length) {

            const operators = this.operators[precedenceIndex++];
            Object.assign(this.operatorsFlattened, operators);
        }
    }

    /**
     * Accepts an SQL-like string, parses it, and returns the results.
     *
     * results object:
     * tokens - the tokenized version of the SQL statement.
     * expression - the array form of the SQL statement, with the precedence explicitly defined by adding appropriate parentheses.
     * expressionDisplay - the array form of the SQL statement, using only parentheses found in the original SQL. Useful for displaying in front-end.
     * expressionTree - an array describing the SQL operations. Useful for converting to object-based query languages, like Mongo, or ES.
     *
     * @param {string} sql - An SQL-like string
     * @returns {{}} results
     */
    parse(sql) {

        const expression = [];
        const expressionDisplay = [];

        const expressionParentheses = [];
        const expressionDisplayParentheses = [];

        const tokens = this.constructor.tokenize(`(${sql})`, (token) => {

            switch (token) {
                case '(':
                    expressionParentheses.push(expression.length);
                    expressionDisplayParentheses.push(expressionDisplay.length);
                    break;
                case ')':
                    const precedenceParenthesisIndex = expressionParentheses.pop();
                    const displayParenthesisIndex = expressionDisplayParentheses.pop();

                    const expressionTokens = expression.splice(precedenceParenthesisIndex, expression.length);
                    const expresisonDisplayTokens = expressionDisplay.splice(displayParenthesisIndex, expressionDisplay.length);

                    expression.push(this.setPrecedenceInExpression(expressionTokens));
                    expressionDisplay.push(this.constructor.reduceArray(expresisonDisplayTokens));
                    break;
                case '':
                    break;
                default:
                    expression.push(token);
                    expressionDisplay.push(token);
                    break;
            }
        });
        
        return {
            tokens: tokens,
            expression: this.constructor.reduceArray(expression),
            expressionDisplay: this.constructor.reduceArray(expressionDisplay),
            expressionTree: this.expressionTreeFromExpression(this.constructor.reduceArray(expression))
        };
    }
    
    /**
     * Converts the expression array version of an SQL-like statement into an expression tree.
     *
     * @param {[]|*} expression
     * @returns {[]}
     */
    expressionTreeFromExpression(expression) {

        if (!expression || expression.constructor !== Array) {
            return expression;
        }

        let operation = [];
        let tokenIndex = 0;
        
        while(!operation.length && tokenIndex < expression.length) {

            const token = expression[tokenIndex];

            if (typeof token === 'string' || token instanceof String) {

                const potentialOperator = token.toUpperCase();
                const getOperandIndexes = this.operatorsFlattened[potentialOperator];

                if (getOperandIndexes) {

                    const operands = [];
                    const operandIndexes = getOperandIndexes(tokenIndex, expression);
                    let operandIndexesIndex = 0;
                    
                    while (operandIndexesIndex < operandIndexes.length) {
                        const operandIndex = operandIndexes[operandIndexesIndex++];

                        if (operandIndex.constructor === this.constructor.LiteralIndex) {
                            operands.push(expression[operandIndex]);
                        } else {
                            operands.push(this.expressionTreeFromExpression(expression[operandIndex]));
                        }
                    }
                    operation = [potentialOperator, operands];
                }
            }
            tokenIndex++;
        }

        return operation;
    }

    /**
     * Explicitly sets the precedence of the operators.
     *
     * This is a necessary step to build the expression tree.
     *
     * @param {[]} expression
     * @returns {[]}
     */
    setPrecedenceInExpression(expression) {

        if (!expression || expression.constructor !== Array) {
            return expression;
        }
        
        let operatorIndex = 0;
        
        while (operatorIndex < this.operators.length) {
            
            const operators = this.operators[operatorIndex++];

            let tokenIndex = 0;

            while(tokenIndex < expression.length) {

                const token = expression[tokenIndex];

                if (typeof token === 'string' || token instanceof String) {

                    const getOperandIndexes = operators[token.toUpperCase()];

                    if (getOperandIndexes) {

                        const operandIndexes = getOperandIndexes(tokenIndex, expression);
                        const indexesToRemove = [tokenIndex].concat(operandIndexes).sort(sortNumber);
                        tokenIndex = indexesToRemove[0];

                        expression[tokenIndex] = expression.splice(tokenIndex, indexesToRemove[indexesToRemove.length - 1] - tokenIndex + 1, null);
                    }
                }
                tokenIndex++;
            }
        }
        
        return this.constructor.reduceArray(expression);
    }

    /**
     * 
     * @param {String} operator
     * @returns {function|null}
     */
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

        return found ? found : null;
    }

    /**
     * Tokenizes an SQL-like string.
     *
     * @param {string} sql - the SQL-like string to tokenize.
     * @param {function} [iteratee] - an optional function that will be called for each token.
     * @returns {[]}
     */
    static tokenize(sql, iteratee) {

        const tokenizer = new Tokenizer();
        return tokenizer.tokenize(sql, iteratee);
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
     * Defines an operator of IN type.
     *
     * The IN operator is unique in that the second argument must be an array of literals.
     * This means that the token in second index should not be parsed in any way. Using the LiteralIndex class, this is possible.
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
     * @returns {LiteralIndex}
     * @constructor
     */

    /**
     * Defines an operator of BETWEEN type.
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
     * A subclass of Number that can be used to indicate that this particular expression should not be evaluated.
     * This is useful when your expression is an array of literals.
     * 
     * @returns {LiteralIndex}
     * @constructor
     */
    static get LiteralIndex() {
        return LiteralIndex;
    }

};