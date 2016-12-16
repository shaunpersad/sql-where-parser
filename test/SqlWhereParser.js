"use strict";

const should = require('should');
const SqlWhereParser = require('../SqlWhereParser');
const parser = new SqlWhereParser();

function equals(obj1, obj2) {
    
    if (JSON.stringify(obj1) !== JSON.stringify(obj2)) {
        throw new Error('The two objects are not the same.');
    }
}

describe('SqlWhereParser', function() {

    describe('What is it?', function() {

        it('SqlWhereParser parses the WHERE portion of an SQL string into many forms', function() {

            const sql = 'job = "developer" AND hasJob = true';
            const parser = new SqlWhereParser();
            const parsed = parser.parse(sql);

            // "parsed" is an object that looks like:
            // {
            //     "tokens": [ "(", "job", "=", "developer", "AND", "hasJob", "=", true, ")" ],
            //     "expression": [
            //         [
            //             "job",
            //             "=",
            //             "developer"
            //         ],
            //         "AND",
            //         [
            //             "hasJob",
            //             "=",
            //             true
            //         ]
            //     ],
            //     "expressionDisplay": [
            //         "job",
            //         "=",
            //         "developer",
            //         "AND",
            //         "hasJob",
            //         "=",
            //         true
            //     ],
            //     "expressionTree": [
            //         "AND",
            //         [
            //             [
            //                 "=",
            //                 [
            //                     "job",
            //                     "developer"
            //                 ]
            //             ],
            //             [
            //                 "=",
            //                 [
            //                     "hasJob",
            //                     true
            //                 ]
            //             ]
            //         ]
            //     ]
            // };
        });

        it('The "expression" result is an array where each sub-expression is explicitly grouped based on order of operations', function() {
            //     "expression": [
            //         [
            //             "job",
            //             "=",
            //             "developer"
            //         ],
            //         "AND",
            //         [
            //             "hasJob",
            //             "=",
            //             true
            //         ]
            //     ],
        });

        it('The "expressionDisplay" result uses only the original groupings, except for unnecessary groups', function() {
            //     "expressionDisplay": [
            //         "job",
            //         "=",
            //         "developer",
            //         "AND",
            //         "hasJob",
            //         "=",
            //         true
            //     ],
        });

        it('"expressionDisplay" is useful for mapping to the front-end, e.g. as HTML', function() {

            const sql = 'job = "developer" AND (hasJob = true OR age > null)';
            const parser = new SqlWhereParser();
            const parsed = parser.parse(sql);

            const toHtml = (expression) => {

                if (!expression || !(expression.constructor === Array)) {

                    const isOperator = parser.operatorType(expression);
                    if (isOperator) {
                        return `<strong class="operator">${expression}</strong>`;

                    }
                    return `<span class="operand">${expression}</span>`;
                }

                const html = expression.map((subExpression) => {

                    return toHtml(subExpression);
                });

                return `<div class="expression">${html.join('')}</div>`;
            };

            const html = toHtml(parsed.expressionDisplay);

            // "html" is now a string that looks like:
            // <div class="expression">
            //   <span class="operand">job</span><strong class="operator">=</strong><span class="operand">developer</span>
            //   <strong class="operator">AND</strong>
            //     <div class="expression">
            //       <span class="operand">hasJob</span><strong class="operator">=</strong><span class="operand">true</span>
            //       <strong class="operator">OR</strong>
            //       <span class="operand">age</span><strong class="operator">></strong><span class="operand">null</span>
            //     </div>
            // </div>
        });

        it(`The "expressionTree" result is an array where the first element is the operator, and the second element is an array of that operator's operands`, function() {

            //     "expressionTree": [
            //         "AND",
            //         [
            //             [
            //                 "=",
            //                 [
            //                     "job",
            //                     "developer"
            //                 ]
            //             ],
            //             [
            //                 "=",
            //                 [
            //                     "hasJob",
            //                     true
            //                 ]
            //             ]
            //         ]
            //     ]
        });

        it('"expressionTree" can be used to convert to other query languages, such as MongoDB or Elasticsearch', function() {

            const sql = 'job = "developer" AND (hasJob = true OR age > 17)';
            const parser = new SqlWhereParser();
            const parsed = parser.parse(sql);

            const toMongo = (expression) => {

                if (!expression || !(expression.constructor === Array)) {

                    return expression;
                }

                const operator = expression[0];
                const operands = expression[1];

                return map[operator](operands);
            };

            const map = {
                '=': (operands) => {
                    return {
                        [operands[0]]: toMongo(operands[1])
                    };
                },
                '>': (operands) => {
                    return {
                        [operands[0]]: {
                            $gt: toMongo(operands[1])
                        }
                    };
                },
                'AND': (operands) => {
                    return {
                        $and : operands.map(toMongo)
                    };
                },
                'OR': (operands) => {
                    return {
                        $or: operands.map(toMongo)
                    };
                }
            };

            const mongo = toMongo(parsed.expressionTree);

            // "mongo" is now an object that looks like:
            // {
            //   "$and": [
            //     {
            //       "job": "developer"
            //     },
            //     {
            //       "$or": [
            //         {
            //           "hasJob": true
            //         },
            //         {
            //           "age": {
            //             "$gt": 17
            //           }
            //         }
            //       ]
            //     }
            //   ]
            // }
        });

        it('If you wish to combine the tokens yourself, the "tokens" result is a flat array of the tokens as found in the original SQL string', function() {

            //     "tokens": [ "(", "job", "=", "developer", "AND", "hasJob", "=", true, ")" ],
        });
    });

    describe('Installation', function() {

        it('`npm install sql-where-parser`', function() {
            // or if in the browser: <script src="sql-where-parser/sql-where-parser.min.js"></script>
        });
    });


    describe('API', function() {

        describe('#parse(String: sql):Object', function() {

            it('returns a results object with tokens, expression, expressionDisplay, and expressionTree properties', function() {

                const parsed = parser.parse('');
                parsed.should.have.property('tokens').which.is.an.Array;
                parsed.should.have.property('expression').which.is.an.Array;
                parsed.should.have.property('expressionDisplay').which.is.an.Array;
                parsed.should.have.property('expressionTree').which.is.an.Array;

            });

            describe('results.tokens', function() {

                it('is an array containing the tokens of the SQL string (wrapped in parentheses)', function() {

                    const results = parser.parse('name = shaun');
                    results.tokens.should.be.an.Array;
                    equals(results.tokens, ['(', 'name', '=', 'shaun', ')']);
                });

                it('treats anything wrapped in single-quotes, double-quotes, and ticks as a single token', function() {

                    const results = parser.parse(`(name = shaun) and "a" = 'b(' or (\`c\` OR "d e, f")`);
                    results.tokens.should.be.an.Array;
                    equals(results.tokens, ['(', '(', 'name', '=', 'shaun', ')', 'and', 'a', '=', 'b(', 'or', '(', 'c', 'OR', 'd e, f', ')', ')']);
                });
            });

            describe('results.expression', function() {

                it('is the parsed SQL as an array', function() {

                    const parsed = parser.parse('name = shaun');

                    equals(parsed.expression, ['name', '=', 'shaun']);
                });

                it('does not care about spaces', function() {

                    const parsed = parser.parse('  name  =  shaun     ');

                    equals(parsed.expression, ['name', '=', 'shaun']);
                });

                it('strips out unnecessary parentheses', function() {

                    const parsed = parser.parse('(((name) = ((shaun))))');

                    equals(parsed.expression, ['name', '=', 'shaun']);
                });

                it('adds explicit groupings defined by the order of operations', function() {

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

                it('uses only the original groupings, except for unnecessary groups', function() {

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

                it('converts the expression into a tree', function() {

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

            it('returns a tree representation of the supplied expression array', function() {

                const syntaxTree = parser.expressionTreeFromExpression([]);
                syntaxTree.should.be.an.Array;
            });
        });

        describe('#setPrecedenceInExpression(Array|*: expression):Array', function() {

            it('takes an array of tokens and groups them explicitly, based on the order of operations', function() {

                const orderedTokens = parser.setPrecedenceInExpression(['a1', '=', 'a2', 'OR', 'b', 'AND', 'c', 'OR', 'd', 'LIKE', 'e', 'AND', 'f', '<', 'g']);

                equals(orderedTokens, [[["a1","=","a2"],"OR",["b","AND","c"]],"OR",[["d","LIKE","e"],"AND",["f","<","g"]]]);
            });
        });

        describe('#operatorType(String: operator):Function|null', function() {

            it("returns the operator's type (unary, binary, etc.)", function() {

                parser.operators.forEach((operators) => {

                    Object.keys(operators).forEach((operator) => {

                        const type = operators[operator];
                        parser.operatorType(operator).should.equal(type);
                        parser.operatorType(operator).should.be.a.Function;
                    });
                });
            });
        });

        describe('#operators:Array', function() {

            it('is the list of supported operators, ordered by precedence, and grouped by the same level of precedence', function() {
               
                parser.operators.should.be.an.Array;
                
                const operatorGroups = parser.operators.map((operators) => {

                    return Object.keys(operators);
                });
                
                equals(operatorGroups, [
                    ['*', '/', '%'],
                    ['+', '-'],
                    ['=', '!=', '<', '>', '<=', '>='],
                    ['NOT'],
                    ['BETWEEN', 'IN', 'IS', 'LIKE'],
                    ['AND'],
                    ['OR']
                ]);
            });

            it('can be added to or overwritten by subclassing SqlWhereParser into your own class', function() {

                class MySqlWhereParser extends SqlWhereParser {

                    constructor() {

                        const BINARY = SqlWhereParser.OPERATOR_TYPE_BINARY;
                        super();
                        this.operators[2]['<=>'] = BINARY; // Equal (Safe to compare NULL values)
                        this.operators[2]['<>'] = BINARY; // Not Equal
                    }
                }

                const mySqlParser = new MySqlWhereParser();
                const parsed = mySqlParser.parse('a <> b OR b <=> c');

                equals(parsed.expressionTree, [
                    'OR',
                    [
                        [
                            '<>',
                            [
                                'a',
                                'b'
                            ]
                        ],
                        [
                            '<=>',
                            [
                                'b',
                                'c'
                            ]
                        ]
                    ]
                ]);
            });
        });

        describe('#operatorsFlattened:Object', function() {

            it('is an object whose keys are the supported operators', function() {

                const operatorsFlattened = parser.operatorsFlattened;
                
                parser.operators.forEach((operators) => {
                    
                    Object.keys(operators).forEach((operator) => {
                       
                        operatorsFlattened[operator].should.equal(operators[operator]);
                    });
                });
            });
        });

        describe('.tokenize(String: sql[, Function: iteratee]):Array', function() {

            it('returns an array containing the tokens of the SQL string', function() {

                const tokens = SqlWhereParser.tokenize('name = shaun');
                tokens.should.be.an.Array;
                equals(tokens, ['name', '=', 'shaun']);
            });

            it('treats anything wrapped in single-quotes, double-quotes, and ticks as a single token', function() {

                const tokens = SqlWhereParser.tokenize(`(name = shaun) and "a" = 'b(' or (\`c\` OR "d e, f")`);
                tokens.should.be.an.Array;
                equals(tokens, ['(', 'name', '=', 'shaun', ')', 'and', 'a', '=', 'b(', 'or', '(', 'c', 'OR', 'd e, f', ')']);
            });

            it('can be supplied with an optional iteratee function, which is called when each token is ready', function() {

                const collectedTokens = [];
                const tokens = SqlWhereParser.tokenize('name = shaun', (token) => {
                    collectedTokens.push(token);
                });
                collectedTokens.should.be.an.Array;

                equals(tokens, collectedTokens);
            });

        });

        describe('.reduceArray(Array: arr):Array', function() {

            it('reduces unnecessarily nested arrays', function() {

                const arr = [[['hey', 'hi']]];
                const reducedArr = SqlWhereParser.reduceArray(arr);
                let passed = true;
                try {
                    equals(arr, reducedArr);
                    passed = false;
                } catch(e) {
                    equals(reducedArr, ['hey', 'hi']);
                }
                if (!passed) {
                    throw new Error('Did not reduce the array');
                }
            });
        });

        describe('.OPERATOR_TYPE_UNARY', function() {

            it('is a function(indexOfOperatorInExpression, expression) that returns an array containing the index of where the operand is in the expression', function() {

                const operand = ['a', 'AND', 'b'];
                const expression = ['NOT', operand];

                const getIndexes = SqlWhereParser.OPERATOR_TYPE_UNARY;
                const indexes = getIndexes(0, expression);
                const operandIndex = indexes[0];
                expression[operandIndex].should.equal(operand);
            });

            it('throws a syntax error if the operand is not found in the expression', function() {

                const expression = ['NOT'];
                const getIndexes = SqlWhereParser.OPERATOR_TYPE_UNARY;
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

            it('is a function(indexOfOperatorInExpression, expression) that returns an array of indexes of where the operands are in the expression', function() {

                const operand1 = ['a', 'AND', 'b'];
                const operand2 = ['c', 'OR', 'd'];

                const expression = [operand1, 'AND', operand2];

                const getIndexes = SqlWhereParser.OPERATOR_TYPE_BINARY;
                const indexes = getIndexes(1, expression);
                const operand1Index = indexes[0];
                const operand2Index = indexes[1];

                expression[operand1Index].should.equal(operand1);
                expression[operand2Index].should.equal(operand2);
            });

            it('throws a syntax error if any of the operands are not found in the expression', function() {

                let expression = ['AND'];
                let getIndexes = SqlWhereParser.OPERATOR_TYPE_BINARY;
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

            it('is a function(indexOfOperatorInExpression, expression) that returns an array of indexes of where the operands are in the expression', function() {

                const operand1 = 'field';
                const operand2 = [1, 2, 3];

                const expression = [operand1, 'IN', operand2];

                const getIndexes = SqlWhereParser.OPERATOR_TYPE_BINARY_IN;
                const indexes = getIndexes(1, expression);
                const operand1Index = indexes[0];
                const operand2Index = indexes[1];

                expression[operand1Index].should.equal(operand1);
                expression[operand2Index].should.equal(operand2);
            });

            it('throws a syntax error if any of the operands are not found in the expression', function() {

                let expression = ['IN'];
                let getIndexes = SqlWhereParser.OPERATOR_TYPE_BINARY_IN;
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

            it('throws a syntax error if the second operand is not an array', function() {

                const expression = ['field', 'IN', 'value'];
                const getIndexes = SqlWhereParser.OPERATOR_TYPE_BINARY_IN;
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

            it("provides a LiteralIndex as the array operand's index, to alert the parser that this operand is a literal and requires no further parsing", function() {

                const operand1 = 'field';
                const operand2 = [1, 2, 3];

                const expression = [operand1, 'IN', operand2];

                const getIndexes = SqlWhereParser.OPERATOR_TYPE_BINARY_IN;
                const indexes = getIndexes(1, expression);
                const operand1Index = indexes[0];
                const operand2Index = indexes[1];

                expression[operand1Index].should.equal(operand1);
                expression[operand2Index].should.equal(operand2);

                operand2Index.constructor.should.equal(SqlWhereParser.LiteralIndex);
            });
        });

        describe('.OPERATOR_TYPE_TERNARY_BETWEEN', function() {

            it('is a function(indexOfOperatorInExpression, expression) that returns an array of indexes of where the operands are in the expression', function() {

                const operand1 = 'field';
                const operand2 = 1;
                const operand3 = 5;

                const expression = [operand1, 'BETWEEN', operand2, 'AND', operand3];

                const getIndexes = SqlWhereParser.OPERATOR_TYPE_TERNARY_BETWEEN;
                const indexes = getIndexes(1, expression);
                const operand1Index = indexes[0];
                const operand2Index = indexes[1];
                const operand3Index = indexes[2];

                expression[operand1Index].should.equal(operand1);
                expression[operand2Index].should.equal(operand2);
                expression[operand3Index].should.equal(operand3);
            });

            it('throws a syntax error if any of the operands are not found in the expression', function() {

                let expression = ['BETWEEN'];
                let getIndexes = SqlWhereParser.OPERATOR_TYPE_TERNARY_BETWEEN;
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

            it('throws a syntax error if the BETWEEN does not include an AND in between the {min} and {max}', function() {

                let expression = ['a', 'BETWEEN', 1, 'OR', 2];
                let getIndexes = SqlWhereParser.OPERATOR_TYPE_TERNARY_BETWEEN;
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
});
