"use strict";
const Tokenizer = require('./Tokenizer');

class ArrayIndex extends Number {}

const OPERATOR_TYPE_UNARY = (indexOfOperatorInExpression, expression) => {
    const operator = expression[indexOfOperatorInExpression];
    const operand = expression[indexOfOperatorInExpression + 1];
    if (operand !== undefined) {
        return [indexOfOperatorInExpression + 1];
    }
    throw new SyntaxError(`${operator.toUpperCase()}" requires an operand.`);
};

const OPERATOR_TYPE_BINARY = (indexOfOperatorInExpression, expression) => {

    const operator = expression[indexOfOperatorInExpression];
    const operand1 = expression[indexOfOperatorInExpression - 1];
    const operand2 = expression[indexOfOperatorInExpression + 1];
    
    if (operand1 !== undefined && operand2 !== undefined) {
        return [indexOfOperatorInExpression - 1, indexOfOperatorInExpression + 1];
    }

    throw new SyntaxError(`${operator.toUpperCase()} requires two operands.`);
};

const OPERATOR_TYPE_TERNARY_BETWEEN = (indexOfOperatorInExpression, expression) => {

    const AND = module.exports.isLiteral(expression[indexOfOperatorInExpression + 2]);
    const min = expression[indexOfOperatorInExpression + 1];
    const max =  expression[indexOfOperatorInExpression + 3];

    if ((typeof AND === 'string') && AND.toUpperCase() === 'AND' && min !== undefined && max !== undefined) {
        return [indexOfOperatorInExpression - 1, indexOfOperatorInExpression + 1, indexOfOperatorInExpression + 3];
    }
    throw new SyntaxError('"BETWEEN" syntax is "BETWEEN {min} AND {max}"')
};

const OPERATOR_TYPE_BINARY_IN = (indexOfOperatorInExpression, expression) => {

    const operand1 = expression[indexOfOperatorInExpression - 1];
    const operand2 = expression[indexOfOperatorInExpression + 1];

    if (operand1 !== undefined && operand2 !== undefined && operand2.constructor === Array) {
        return [indexOfOperatorInExpression - 1, new ArrayIndex(indexOfOperatorInExpression + 1)];
    }

    throw new SyntaxError('"IN" syntax is "IN({array})"')
};

const sortNumber = (a, b) => {
    return a - b;
};

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
            'NOT': OPERATOR_TYPE_UNARY
        },
        {
            'BETWEEN': OPERATOR_TYPE_TERNARY_BETWEEN,
            'IN': OPERATOR_TYPE_BINARY_IN,
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
        shouldDelimitBy: [' ', "\n", "\r", "\t"],
        forEachToken: () => {}
    }
};

module.exports = class SqlWhereParser {

    constructor(config) {

        if (!config) {
            config = {};
        }

        config = Object.assign({}, config, defaultConfig);
        
        this.operators = config.operators;
        this.tokenizer = new Tokenizer(config.tokenizer);
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
     * expressionTree - an array describing the SQL expressions. Useful for converting to object-based query languages, like Mongo, or ES.
     *
     * @param {string} sql - An SQL-like string
     * @returns {{}} results
     */
    parse(sql) {

        const expression = [];
        const expressionDisplay = [];

        const expressionParentheses = [];
        const expressionDisplayParentheses = [];
        let lastTokenValue = null;

        const tokens = this.tokenizer.tokenize(`(${sql})`, (token) => {

            switch (token.valueOf()) {
                case '(':
                    expressionParentheses.push(expression.length);
                    expressionDisplayParentheses.push(expressionDisplay.length);
                    break;
                case ')':
                    const precedenceParenthesisIndex = expressionParentheses.pop();
                    const displayParenthesisIndex = expressionDisplayParentheses.pop();

                    const expressionTokens = expression.splice(precedenceParenthesisIndex, expression.length);
                    const expressionDisplayTokens = expressionDisplay.splice(displayParenthesisIndex, expressionDisplay.length);

                    expression.push(this.setPrecedenceInExpression(expressionTokens));
                    expressionDisplay.push(this.constructor.reduceArray(expressionDisplayTokens));
                    break;
                case ',':

                    if (!expression[expression.length - 1] || expression[expression.length - 1].constructor !== Array) {
                        expression[expression.length - 1] = [expression[expression.length - 1]];
                    }
                    if (!expressionDisplay[expressionDisplay.length - 1] || expressionDisplay[expressionDisplay.length - 1].constructor !== Array) {
                        expressionDisplay[expressionDisplay.length - 1] = [expressionDisplay[expressionDisplay.length - 1]];
                    }
                    break;
                case '':
                    break;
                default:
                    if (lastTokenValue === ',') {

                        expression[expression.length - 1].push(token);
                        expressionDisplay[expressionDisplay.length - 1].push(token);
                    } else {
                        expression.push(token);
                        expressionDisplay.push(token);
                    }
                    break;
            }
            lastTokenValue = token.valueOf();
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

        let expressionTree = [];
        let tokenIndex = 0;
        
        while(!expressionTree.length && tokenIndex < expression.length) {

            const token = this.constructor.isLiteral(expression[tokenIndex]);

            if (typeof token === 'string') {

                const potentialOperator = token.toUpperCase();
                const getOperandIndexes = this.operatorsFlattened[potentialOperator];

                if (getOperandIndexes) {

                    const operands = [];
                    const operandIndexes = getOperandIndexes(tokenIndex, expression);
                    let operandIndexesIndex = 0;

                    while (operandIndexesIndex < operandIndexes.length) {
                        
                        const operandIndex = operandIndexes[operandIndexesIndex++];
                        if (operandIndex.constructor === ArrayIndex) {
                            let elementIndex = 0;
                            const arrayExpression = [];
                            
                            while (elementIndex < expression[operandIndex].length) {
                                arrayExpression.push(this.expressionTreeFromExpression(expression[operandIndex][elementIndex++]));
                            }
                            operands.push(arrayExpression);
                        } else {
                            operands.push(this.expressionTreeFromExpression(expression[operandIndex]));
                        }
                    }
                    expressionTree = [potentialOperator, operands];
                }
            }
            tokenIndex++;
        }

        return expressionTree;
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

                const token = this.constructor.isLiteral(expression[tokenIndex]);

                if (typeof token === 'string') {

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
        
        operator = this.constructor.isLiteral(operator);
        if (typeof operator !== 'string') {
            return null;
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

    static isLiteral(token) {
        
        return (token instanceof Tokenizer.Literal) ? token.valueOf() : false;
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
     * The IN operator is unique in that the second argument must be an array.
     * 
     * @returns {function()}
     * @constructor
     */
    static get OPERATOR_TYPE_BINARY_IN() {
        return OPERATOR_TYPE_BINARY_IN;
    }

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
     * Use this instead of a Number when defining your own operator types, if the operand should be an array.
     *
     * @returns {ArrayIndex}
     * @constructor
     */
    static get ArrayIndex() {
        return ArrayIndex;
    }
    
    static get Tokenizer() {
        return Tokenizer;
    }
    
    static get defaultConfig() {
        return defaultConfig;
    }
};

// const sql = 'city IN (A, B)';
// const parser = new module.exports();
// const parsed = parser.parse(sql);
// console.log(JSON.stringify(parsed));