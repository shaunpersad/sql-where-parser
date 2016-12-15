"use strict";

const should = require('should');
const GenericSqlParser = require('../GenericSqlParser');
const parser = new GenericSqlParser();

function equals(obj1, obj2) {
    
    if (JSON.stringify(obj1) !== JSON.stringify(obj2)) {
        throw new Error('The two objects are not the same.');
    }
}

describe('GenericSqlParser', function() {

    describe('#parse(String: sql):Object', function() {

        it('returns a results object with tokens, expression, expressionDisplay, and expressionTree properties.', function() {

            const parsed = parser.parse('');
            parsed.should.have.property('tokens').which.is.an.Array;
            parsed.should.have.property('expression').which.is.an.Array;
            parsed.should.have.property('expressionDisplay').which.is.an.Array;
            parsed.should.have.property('expressionTree').which.is.an.Array;

        });

        describe('results.tokens', function() {
           
            it('is an array containing the tokens of the SQL string (wrapped in parentheses).', function() {
                
                const results = parser.parse('name = shaun');
                results.tokens.should.be.an.Array;
                equals(results.tokens, ['(', 'name', '=', 'shaun', ')']);
            });
            
            it('treats anything wrapped in single-quotes, double-quotes, and ticks as a single token.', function() {

                const results = parser.parse(`(name = shaun) and "a" = 'b(' or (\`c\` OR "d e, f")`);
                results.tokens.should.be.an.Array;
                equals(results.tokens, ['(', '(', 'name', '=', 'shaun', ')', 'and', 'a', '=', 'b(', 'or', '(', 'c', 'OR', 'd e, f', ')', ')']);
            });
        });
        
        describe('results.expression', function() {

            it('is the parsed SQL as an array.', function() {

                const parsed = parser.parse('name = shaun');
                
                equals(parsed.expression, ['name', '=', 'shaun']);
            });

            it('does not care about spaces.', function() {

                const parsed = parser.parse('  name  =  shaun     ');
                
                equals(parsed.expression, ['name', '=', 'shaun']);
            });

            it('strips out unnecessary parentheses.', function() {

                const parsed = parser.parse('(((name) = ((shaun))))');

                equals(parsed.expression, ['name', '=', 'shaun']);
            });

            it('adds explicit groupings defined by the order of operations.', function() {

                const parsed = parser.parse('name = shaun AND job = developer AND (gender = male OR type = person AND location IN (NY, America) AND hobby = coding)');

                /**
                 * Original.
                 */
                'name = shaun AND job = developer AND (gender = male OR type = person AND location IN (NY, America) AND hobby = coding)';
                /**
                 * Perform equals.
                 */
                '(name = shaun) AND (job = developer) AND ((gender = male) OR (type = person) AND location IN (NY, America) AND (hobby = coding))';
                /**
                 * Perform IN
                 */
                '(name = shaun) AND (job = developer) AND ((gender = male) OR (type = person) AND (location IN (NY, America)) AND (hobby = coding))';
                /**
                 * Perform AND
                 */
                '(((name = shaun) AND (job = developer)) AND ((gender = male) OR (((type = person) AND (location IN (NY, America))) AND (hobby = coding))))';

                equals(parsed.expression, [
                    [
                        [
                            "name",
                            "=",
                            "shaun"
                        ],
                        "AND",
                        [
                            "job",
                            "=",
                            "developer"
                        ]
                    ],
                    "AND",
                    [
                        [
                            "gender",
                            "=",
                            "male"
                        ],
                        "OR",
                        [
                            [
                                [
                                    "type",
                                    "=",
                                    "person"
                                ],
                                "AND",
                                [
                                    "location",
                                    "IN",
                                    [
                                        "NY",
                                        "America"
                                    ]
                                ]
                            ],
                            "AND",
                            [
                                "hobby",
                                "=",
                                "coding"
                            ]
                        ]
                    ]
                ]);
            });
        });

        describe('results.expressionDisplay', function() {
            
            it('uses only the original groupings, except for unnecessary groups.', function() {
        
                const parsed = parser.parse('(name = shaun AND job = developer AND ((gender = male OR type = person AND location IN (NY, America) AND hobby = coding)))');

                equals(parsed.expressionDisplay, [
                    "name",
                    "=",
                    "shaun",
                    "AND",
                    "job",
                    "=",
                    "developer",
                    "AND",
                    [
                        "gender",
                        "=",
                        "male",
                        "OR",
                        "type",
                        "=",
                        "person",
                        "AND",
                        "location",
                        "IN",
                        [
                            "NY",
                            "America"
                        ],
                        "AND",
                        "hobby",
                        "=",
                        "coding"
                    ]
                ]);
            });
        });
        
        describe('results.expressionTree', function() {
        
            it('converts the expression into a tree.', function() {
           
                const parsed = parser.parse('name = shaun AND job = developer AND (gender = male OR type = person AND location IN (NY, America) AND hobby = coding)');

                /**
                 * Original.
                 */
                'name = shaun AND job = developer AND (gender = male OR type = person AND location IN (NY, America) AND hobby = coding)';
                /**
                 * Perform equals.
                 */
                '(name = shaun) AND (job = developer) AND ((gender = male) OR (type = person) AND location IN (NY, America) AND (hobby = coding))';
                /**
                 * Perform IN
                 */
                '(name = shaun) AND (job = developer) AND ((gender = male) OR (type = person) AND (location IN (NY, America)) AND (hobby = coding))';
                /**
                 * Perform AND
                 */
                '(((name = shaun) AND (job = developer)) AND ((gender = male) OR (((type = person) AND (location IN (NY, America))) AND (hobby = coding))))';
                
                equals(parsed.expressionTree, [
                    'AND',
                    [
                        [
                            'AND',
                            [
                                [
                                    '=',
                                    [
                                        'name',
                                        'shaun'
                                    ]
                                ],
                                [
                                    '=',
                                    [
                                        'job',
                                        'developer'
                                    ]
                                ]
                            ]
                        ],
                        [
                            'OR',
                            [
                                [
                                    '=',
                                    [
                                        'gender',
                                        'male'
                                    ]
                                ],
                                [
                                    'AND',
                                    [
                                        [
                                            'AND',
                                            [
                                                [
                                                    '=',
                                                    [
                                                        'type',
                                                        'person'
                                                    ]
                                                ],
                                                [
                                                    'IN',
                                                    [
                                                        'location',
                                                        [
                                                            'NY',
                                                            'America'
                                                        ]
                                                    ]
                                                ]
                                            ]
                                        ],
                                        [
                                            '=',
                                            [
                                                'hobby',
                                                'coding'
                                            ]
                                        ]
                                    ]
                                ]
                            ]
                        ]
                    ]
                ]);
            });
        });
    });
    
    describe('#expressionTreeFromExpression(Array|*: expression):Array', function() {
       
        it('returns a tree representation of the supplied expression array.', function() {
    
            const syntaxTree = parser.expressionTreeFromExpression([]);
            syntaxTree.should.be.an.Array;
        });
    });
    
    describe('#setPrecedenceInExpression(Array|*: expression):Array', function() {
    
        it('takes an array of tokens and groups them explicitly, based on the order of operations.', function() {
    
            const orderedTokens = parser.setPrecedenceInExpression(['a1', '=', 'a2', 'OR', 'b', 'AND', 'c', 'OR', 'd', 'LIKE', 'e', 'AND', 'f', '<', 'g']);
            
            equals(orderedTokens, [[["a1","=","a2"],"OR",["b","AND","c"]],"OR",[["d","LIKE","e"],"AND",["f","<","g"]]]);
        });
    });
    
    describe('#operatorType(String: operator):Function|null', function() {

        it("returns the operator's type (unary, binary, etc.).", function() {

            parser.operators.forEach((operators) => {

                Object.keys(operators).forEach((operator) => {

                    const type = operators[operator];
                    parser.operatorType(operator).should.equal(type);
                    parser.operatorType(operator).should.be.a.Function;
                });
            });
        });
    });
    
    describe('.tokenize(String: sql[, Function: iteratee]):Array', function() {

        it('returns an array containing the tokens of the SQL string.', function() {

            const tokens = GenericSqlParser.tokenize('name = shaun');
            tokens.should.be.an.Array;
            equals(tokens, ['name', '=', 'shaun']);
        });

        it('treats anything wrapped in single-quotes, double-quotes, and ticks as a single token.', function() {

            const tokens = GenericSqlParser.tokenize(`(name = shaun) and "a" = 'b(' or (\`c\` OR "d e, f")`);
            tokens.should.be.an.Array;
            equals(tokens, ['(', 'name', '=', 'shaun', ')', 'and', 'a', '=', 'b(', 'or', '(', 'c', 'OR', 'd e, f', ')']);
        });

        it('can be supplied with an optional iteratee function, which is called when each token is ready.', function() {
           
            const collectedTokens = [];
            const tokens = GenericSqlParser.tokenize('name = shaun', (token) => {
                collectedTokens.push(token);
            });
            collectedTokens.should.be.an.Array;
            
            equals(tokens, collectedTokens);
        });

    });
    
    describe('.reduceArray(Array: arr):Array', function() {

        it('reduces unnecessarily nested arrays.', function() {
            
            const arr = [[['hey', 'hi']]];
            const reducedArr = GenericSqlParser.reduceArray(arr);
            let passed = true;
            try {
                equals(arr, reducedArr);
                passed = false;
            } catch(e) {
                equals(reducedArr, ['hey', 'hi']);
            }
            if (!passed) {
                throw new Error('Did not reduce the array.');
            }
        });
    });
    
    describe('.OPERATOR_TYPE_UNARY', function() {

        it('is a function(indexOfOperatorInExpression, expression) that returns an array containing the index of where the operand is in the expression.', function() {

            const operand = ['a', 'AND', 'b'];
            const expression = ['NOT', operand];

            const getIndexes = GenericSqlParser.OPERATOR_TYPE_UNARY;
            const indexes = getIndexes(0, expression);
            const operandIndex = indexes[0];
            expression[operandIndex].should.equal(operand);
        });
        
        it('throws a syntax error if the operand is not found in the expression.', function() {

            const expression = ['NOT'];
            const getIndexes = GenericSqlParser.OPERATOR_TYPE_UNARY;
            let passed = true;
            try {
                const indexes = getIndexes(0, expression);
                passed = false;
            } catch(e) {
                e.should.be.instanceOf(SyntaxError);
            }
            if (!passed) {
                throw new Error('Did not throw a syntax error');
            }
        });
    });

    describe('.OPERATOR_TYPE_BINARY', function() {

        it('is a function(indexOfOperatorInExpression, expression) that returns an array of indexes of where the operands are in the expression.', function() {

            const operand1 = ['a', 'AND', 'b'];
            const operand2 = ['c', 'OR', 'd'];

            const expression = [operand1, 'AND', operand2];

            const getIndexes = GenericSqlParser.OPERATOR_TYPE_BINARY;
            const indexes = getIndexes(1, expression);
            const operand1Index = indexes[0];
            const operand2Index = indexes[1];

            expression[operand1Index].should.equal(operand1);
            expression[operand2Index].should.equal(operand2);
        });

        it('throws a syntax error if any of the operands are not found in the expression.', function() {

            let expression = ['AND'];
            let getIndexes = GenericSqlParser.OPERATOR_TYPE_BINARY;
            let passed = true;
            try {
                const indexes = getIndexes(0, expression);
                passed = false;
            } catch(e) {
                e.should.be.instanceOf(SyntaxError);
            }
            if (!passed) {
                throw new Error('Did not throw a syntax error');
            }


            expression = ['a', 'AND'];
            try {
                const indexes = getIndexes(1, expression);
                passed = false;
            } catch(e) {
                e.should.be.instanceOf(SyntaxError);
            }
            if (!passed) {
                throw new Error('Did not throw a syntax error');
            }

            expression = ['AND', 'b'];
            try {
                const indexes = getIndexes(0, expression);
                passed = false;
            } catch(e) {
                e.should.be.instanceOf(SyntaxError);
            }
            if (!passed) {
                throw new Error('Did not throw a syntax error');
            }
        });
    });

    describe('.OPERATOR_TYPE_BINARY_IN', function() {

        it('is a function(indexOfOperatorInExpression, expression) that returns an array of indexes of where the operands are in the expression.', function() {

            const operand1 = 'field';
            const operand2 = [1, 2, 3];

            const expression = [operand1, 'IN', operand2];

            const getIndexes = GenericSqlParser.OPERATOR_TYPE_BINARY_IN;
            const indexes = getIndexes(1, expression);
            const operand1Index = indexes[0];
            const operand2Index = indexes[1];

            expression[operand1Index].should.equal(operand1);
            expression[operand2Index].should.equal(operand2);
        });

        it('throws a syntax error if any of the operands are not found in the expression.', function() {

            let expression = ['IN'];
            let getIndexes = GenericSqlParser.OPERATOR_TYPE_BINARY_IN;
            let passed = true;
            try {
                const indexes = getIndexes(0, expression);
                passed = false;
            } catch(e) {
                e.should.be.instanceOf(SyntaxError);
            }
            if (!passed) {
                throw new Error('Did not throw a syntax error');
            }


            expression = ['a', 'IN'];
            try {
                const indexes = getIndexes(1, expression);
                passed = false;
            } catch(e) {
                e.should.be.instanceOf(SyntaxError);
            }
            if (!passed) {
                throw new Error('Did not throw a syntax error');
            }

            expression = ['IN', [1, 2]];
            try {
                const indexes = getIndexes(0, expression);
                passed = false;
            } catch(e) {
                e.should.be.instanceOf(SyntaxError);
            }
            if (!passed) {
                throw new Error('Did not throw a syntax error');
            }
        });

        it('throws a syntax error if the second operand is not an array.', function() {

            const expression = ['field', 'IN', 'value'];
            const getIndexes = GenericSqlParser.OPERATOR_TYPE_BINARY_IN;
            let passed = true;
            try {
                const indexes = getIndexes(0, expression);
                passed = false;
            } catch(e) {
                e.should.be.instanceOf(SyntaxError);
            }
            if (!passed) {
                throw new Error('Did not throw a syntax error');
            }
        });

        it("provides a LiteralIndex as the array operand's index, to alert the parser that this operand is a literal and requires no further parsing.", function() {

            const operand1 = 'field';
            const operand2 = [1, 2, 3];

            const expression = [operand1, 'IN', operand2];

            const getIndexes = GenericSqlParser.OPERATOR_TYPE_BINARY_IN;
            const indexes = getIndexes(1, expression);
            const operand1Index = indexes[0];
            const operand2Index = indexes[1];

            expression[operand1Index].should.equal(operand1);
            expression[operand2Index].should.equal(operand2);

            operand2Index.constructor.should.equal(GenericSqlParser.LiteralIndex);
        });
    });
    
    describe('.OPERATOR_TYPE_TERNARY_BETWEEN', function() {

        it('is a function(indexOfOperatorInExpression, expression) that returns an array of indexes of where the operands are in the expression.', function() {

            const operand1 = 'field';
            const operand2 = 1;
            const operand3 = 5;

            const expression = [operand1, 'BETWEEN', operand2, 'AND', operand3];

            const getIndexes = GenericSqlParser.OPERATOR_TYPE_TERNARY_BETWEEN;
            const indexes = getIndexes(1, expression);
            const operand1Index = indexes[0];
            const operand2Index = indexes[1];
            const operand3Index = indexes[2];

            expression[operand1Index].should.equal(operand1);
            expression[operand2Index].should.equal(operand2);
            expression[operand3Index].should.equal(operand3);
        });

        it('throws a syntax error if any of the operands are not found in the expression.', function() {

            let expression = ['BETWEEN'];
            let getIndexes = GenericSqlParser.OPERATOR_TYPE_TERNARY_BETWEEN;
            let passed = true;
            try {
                const indexes = getIndexes(0, expression);
                passed = false;
            } catch(e) {
                e.should.be.instanceOf(SyntaxError);
            }
            if (!passed) {
                throw new Error('Did not throw a syntax error');
            }


            expression = ['a', 'BETWEEN'];
            try {
                const indexes = getIndexes(1, expression);
                passed = false;
            } catch(e) {
                e.should.be.instanceOf(SyntaxError);
            }
            if (!passed) {
                throw new Error('Did not throw a syntax error');
            }

            expression = ['a', 'BETWEEN', 1, 'AND'];
            try {
                const indexes = getIndexes(1, expression);
                passed = false;
            } catch(e) {
                e.should.be.instanceOf(SyntaxError);
            }
            if (!passed) {
                throw new Error('Did not throw a syntax error');
            }
        });

        it('throws a syntax error if the BETWEEN does not include an AND in between the {min} and {max}.', function() {

            let expression = ['a', 'BETWEEN', 1, 'OR', 2];
            let getIndexes = GenericSqlParser.OPERATOR_TYPE_TERNARY_BETWEEN;
            let passed = true;
            try {
                const indexes = getIndexes(0, expression);
                passed = false;
            } catch(e) {
                e.should.be.instanceOf(SyntaxError);
            }
            if (!passed) {
                throw new Error('Did not throw a syntax error');
            }
        });
        
    });
    
    describe('.LiteralIndex', function() {
        
    });
});
